# Debug Guide — company/allapplication & company/dashboard (Node)

**Purpose:** Contract source-of-truth for the Node CollarCheck API. Frontend depends on these keys and messages — **do not rename**.

**Layering (see root `AGENTS.md`):**

```
routes → controllers → services → repositery → db
```

No Drizzle in services. No redundant `Number()` after Zod / typed repositery rows.

| Layer | Files |
|-------|--------|
| Routes | `src/routes/company.route.ts` |
| Controllers | `src/controllers/company-review.controller.ts` (`allApplication`), `src/controllers/company-employee-request.controller.ts` (`dashboard`) |
| Services | `src/services/company-review.service.ts`, `src/services/company-employee-request.service.ts` |
| Repositery | `src/repositery/company-review.repositery.ts`, `src/repositery/company-employee-request.repositery.ts` |
| Types | `src/types/company-review.types.ts`, `src/types/company-employee-request.types.ts` |
| Auth | `src/middlewares/Authorization.ts` — use **`req.auth.id`** (X-Company) |

| Route | Auth | Handler | Returns |
|-------|------|---------|---------|
| `GET /wapi/company/allapplication` | JWT | `allApplication` | Applicants for one **job** |
| `GET /wapi/company/dashboard` | JWT | `dashboard` | Company home widgets |

---

## Global envelope

| Case | HTTP | Body |
|------|------|------|
| Success allapplication | **200** | `{ status: true, messages: "Application", job_title, data, totalCounts }` |
| Success dashboard | **200** | `{ status: true, data }` ← **no `messages`** |
| Company not found (dashboard) | **200** | `{ status: false, messages: "Company not found!" }` |
| Collab job denied / exception (allapplication) | **200** | `{ status: false, messages: "Access denied" }` |
| Menu permission (dashboard, if enforced) | **403** | `{ status: false, message }` singular |
| Auth fail | **401** | filter-dependent |

---

## Auth / identity

```text
req.auth.id       = JWT user, or company when X-Company set
req.auth.user_id  = original JWT user
```

All company-scoped queries use **`req.auth.id`**.

---

## Pagination (page number, not SQL offset)

```text
limit  = query.limit || default   // allapplication 50, dashboard 10
page   = query.offset || 0
sqlOffset = (page <= 1) ? 0 : (page * limit - limit)
```

Zod: `limit` / `offset` under `query` with `z.coerce.number()` — already numbers in service.

---

# 1. GET `/wapi/company/allapplication`

**Zod:** `allApplicationQuerySchema`  
| Param | Required | Notes |
|-------|----------|--------|
| `job` | **no** | Optional. If set: first comma segment → number. SQL filters `app.job` only when present |
| `keyword` | no | |
| `limit` | no | default **50** |
| `offset` | no | **page** number, default 0 |

Valid: `?limit=5`, `?job=123&limit=50&offset=1`, `?job=123,999`

### Logic

```text
1. actingUserId = req.auth.id
2. collabRows for user_id=actingUserId
3. if collab non-empty:
     companyIds / jobIds from collab
     if job set AND job not in jobIds → Access denied
   else companyId = actingUserId
4. isVerify = user_verified(actingUserId) → sort DESC if true else ASC
5. list + count (job filter only if job provided)
6. job_title = '' when no job
7. map cards (name key = fname)
```

### Applicant card — locked keys

`id`, `job` (title string), `job_slug`, `user_id`, `individual_id`, **`fname`** (full name), `email`, `phone`, `city_name`, `state_name`, `country_name`, `profile`, `slug`, `company_name`, `designation_name`, `present_address`, `profile_description`, **`date`**, `resume`, `resumeName`, `expected_salary`, `notice_period` (FK id), `notice_date`, **`isVerified`**, `rating: { rating, noofrecord }`, `userRating`, `on_explore`, `on_immediate`, `on_notice`

### SQL notes

- Table `cyb_application`; PHP does **not** filter `app.is_deleted` / `app.status` here  
- Join job + user + location + current company + designation  
- Owner: `cj.company = actingUserId`; collab: `cj.company IN (...)`  

---

# 2. GET `/wapi/company/dashboard`

**Zod:** `companyDashboardQuerySchema` — `limit` default 10, `offset` page  

### Success data keys (locked)

| Key | Notes |
|-----|--------|
| `postedJobs` | active jobs |
| `applications` | apps on company active jobs |
| `currentEmployies` | typo preserved; distinct still-working |
| `followRequests` | always `[]` |
| `messages` | unviewed inbox count |
| `employementRequestList` | typo **employement**; pending `approved=0` |
| `percentage` | `{ total, uncomplete, complete, incomplete }` |
| `allApplicationList` | company-wide apps; name key = **`name`** |
| `mostAppliedJob` | `applicants`, `job_title`, `id`, `modify_date`, location names |

### Name field difference

| Endpoint | Full name key |
|----------|----------------|
| allapplication | **`fname`** |
| dashboard.allApplicationList | **`name`** |

### Dashboard app sort

`isVerify` not set → **ORDER BY app.id ASC** (PHP).

### Pending employment

DB filter **`approved = 0`** (not 3). PHP “filter 3” maps to pending 0.

---

## Quick curl

```bash
TOKEN=...
BASE=http://localhost:3000

curl -sS "$BASE/wapi/company/allapplication?job=123&limit=50&offset=1" \
  -H "Authorization: Bearer $TOKEN" | jq '{status,messages,job_title,totalCounts,sample:.data[0]}'

curl -sS "$BASE/wapi/company/dashboard?limit=10&offset=1" \
  -H "Authorization: Bearer $TOKEN" | jq '{status,keys:(.data|keys),posted:.data.postedJobs,apps:.data.applications}'
```

---

## Fixes applied (this pass)

| Bug | Fix |
|-----|-----|
| Used `user_id` instead of acting `id` | `req.auth.id` |
| Zod schemas not nested under `query` | Fixed for validateData |
| `offset` as SQL offset | Page → sqlOffset formula |
| allapplication 403 on deny | HTTP **200** + Access denied |
| Missing joins (location, company, designation, job_slug) | Full select in repositery |
| Filtered `app.is_deleted` / status | Removed for PHP parity |
| `rating: { avgRating }` | `{ rating, noofrecord }` |
| Hardcoded `isVerified: false` | `user_verified(applicant)` |
| Dashboard empty stubs | Stats, apps list, most-applied, % |
| Pending `approved=3` | **`approved=0`** |
| Dashboard name key same as allapplication | `name` vs `fname` |
| SQL in wrong layer / dynamic imports | Repositery + static imports |

---

## Not fully ported yet (optional later)

- `checkMenuAccess` menu id 1 → 403 (stub: not enforced)
- Full `show_exploring` privacy for exploring badges
- `employementRequestList.rating` review objects + `updateHistory` full history
- `employment_status` from latest rating `added_by`

Core list/count/envelope contracts match the locked shapes above.
