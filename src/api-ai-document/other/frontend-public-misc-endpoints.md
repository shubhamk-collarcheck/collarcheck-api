
# Frontend / Public Misc Endpoints — top-company, enquiries, sitemap, data-deletion

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Auth:** `Authorization` middleware (JWT `uid`) where noted · optional `X-Company`  
> **Status:** Implemented in this repo (consent intentionally omitted)

Public (and one auth-gated) home/contact/career endpoints used by the marketing/web frontend. Responses keep the same JSON shapes and message strings as the legacy clients expect.

**Content-Type:** `application/json`, `application/x-www-form-urlencoded`, or `multipart/form-data` (field-only via `multer().none()` on enquiry routes)  
**HTTP:** Almost always **200** with `status: true|false` for business/validation errors (not 4xx), except **401** from JWT middleware.

---

## Node file map

| Layer | Path |
|-------|------|
| Routes | `src/routes/home.route.ts`, `contact.route.ts`, `career.route.ts`, `general.route.ts` (sitemap), `root.route.ts` (data-deletion) |
| Mounts | `src/app.ts` → `/wapi/home`, `/wapi/contact`, `/wapi/career`, `/wapi/general`, `/wapi` |
| Controller | `src/controllers/frontend.controller.ts` |
| Service | `src/services/frontend.service.ts` |
| Repository | `src/repositery/frontend.repositery.ts` |
| Types | `src/types/frontend.types.ts` |
| Schema | `src/db/schema.ts` (`cyb_user`, `cyb_user_experience`, `cyb_user_experience_rating`, `cyb_company_job`, `cyb_job_meta`, `cyb_enquiries`, `cyb_career_enquiries`, `cyb_setting`, `cyb_follow`, geo/lookup tables) |
| Email queue | `src/utils/sqs.ts` → worker `SEND_EMAIL` |

---

## Routes Summary

| # | Method | Full path | Route file | Handler | Auth | Impl |
|---|--------|-----------|------------|---------|------|------|
| 1 | GET | `/wapi/general/consent` | — | — | Public | **Not implemented** (no product contract; Express **404**) |
| 2 | GET | `/wapi/home/top-company` | `home.route.ts` | `getTopCompany` | **JWT** | Yes |
| 3 | POST | `/wapi/contact/save-enquiry` | `contact.route.ts` | `saveEnquiry` | Public | Yes |
| 4 | POST | `/wapi/career/save-enquiry` | `career.route.ts` | `saveCareerEnquiry` | Public | Yes |
| 5 | GET | `/wapi/general/sitemap` | `general.route.ts` | `sitemap` | Public | Yes |
| 6 | POST | `/wapi/data-deletion` | `root.route.ts` | `dataDeletion` | Public | Yes (stub) |
| 7 | GET | `/wapi/data-deletion` | `root.route.ts` | `dataDeletion` | Public | Yes (stub; same handler) |

---

## Global response quirks (match clients)

| Key | When used |
|-----|-----------|
| `status` | Boolean on most handlers |
| `messages` | Validation errors; catch blocks (plural) |
| `message` | Success / insert failures (singular) — **not** always `messages` |
| `data` | Payload; `null` on enquiry success/fail |
| No envelope | `data-deletion` returns raw Meta-style object (`url`, `confirmation_code`) |

---

# 1. GET `/wapi/general/consent`

### Status
**Not implemented.** No route is registered. Calling it returns Express **404**.

### Why
There is no agreed product contract (privacy/cookie/GDPR payload) in the codebase or clients. Do **not** invent response keys until product defines them.

### If/when product defines it
Add `generalRoute.get("/consent", …)` under `general.route.ts` and document the JSON here.

---

# 2. GET `/wapi/home/top-company`

### Route
```
GET /wapi/home/top-company
```

### Auth
**JWT required** (`Authorization` middleware).  
Acting user: `req.auth.id` (JWT user; `X-Company` may swap to company id).

### Query parameters

| Param | Required | Default | Notes |
|-------|----------|---------|-------|
| `limit` | No | `10` | Page size |
| `offset` | No | `0` | **Page number**, not SQL offset. Converted as: `page <= 1 → 0`, else `page * limit - limit` |

Example: `?limit=10&offset=2` → SQL offset `10` (second page).  
Helper: `pageToSqlOffset()` in `frontend.service.ts`.

### Business logic (`getTopCompanyService` → `frontendRepositery`)

Companies (`cyb_user.user_type = 2`) that:

| Condition | Detail |
|-----------|--------|
| Active claimed company | `status = 1`, `claim_status = 1`, `is_deleted = 0` |
| Min experience rows | `COUNT(DISTINCT cyb_user_experience) >= 5` |
| Min reviews | `COUNT(DISTINCT cyb_user_experience_rating) >= 2` |
| Min active jobs | `COUNT(DISTINCT cyb_company_job where status=1, is_deleted=0) >= 1` |
| Exclude self employment | If viewer loaded: experience join `user != viewerId` |
| Order | `experienceCount DESC` |
| Joins | `cyb_cities`, `cyb_state`, `cyb_country`, `cyb_industries`, `cyb_turnover`, `cyb_company_size` |

**Total count:** same filters → integer `totalCounts`.

### Per-row enrichment

For each company row:

1. Display fields (name, geo, industry, size, turnover, distance, slug, profile URL).
2. `profile` = `S3_PREFIX + profile` if profile set, else `social_image`.
3. `is_verified` = `user_verified(companyId)` from `users.service.ts`.
4. `followData` = `{ following, follower }` from `cyb_follow` counts (`status = 1`).
5. `following` from viewer→company follow row:
   - If row exists: `{ "requestSend": true, "requestApproved": status==1 }`
   - Else: `{ "requestSend": false, "requestApproved": false }`
6. `exploreTalent` = `1` if any active non-deleted job, else `0`.

### Success response
```json
{
  "status": true,
  "message": "top company list",
  "data": [
    {
      "id": 50,
      "profile": "https://cdn.example.com/uploads/profile/x.jpg",
      "name": "Acme Corp ",
      "city_name": "Mumbai",
      "individual_id": "C50",
      "state_name": "Maharashtra",
      "country_name": "India",
      "experienceCount": 12,
      "city": "Mumbai",
      "slug": "acme-corp",
      "turnover_name": "1-10 Cr",
      "company_size_name": "51-200",
      "industry_name": "IT",
      "distance": 0,
      "is_verified": true,
      "followData": {
        "following": 10,
        "follower": 200
      },
      "following": {
        "requestSend": false,
        "requestApproved": false
      },
      "exploreTalent": 1
    }
  ],
  "totalCounts": 42
}
```

Notes:

- Success uses **`message`** (singular), not `messages`.
- `name` is `fname + ' ' + lname` (trailing space if `lname` empty).
- `city` duplicates `city_name`.
- `distance` is currently always `0` (no geo calc in Node port).
- `totalCounts` is an **integer**.

### Error response (exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

### Auth failure
**401** from `Authorization` middleware.

### Checklist
- [x] JWT required
- [x] Page math: `offset` query = page index
- [x] HAVING thresholds (≥5 experiences, ≥2 reviews, ≥1 job)
- [x] Enrich each row with verify / follow / exploreTalent
- [x] Response keys: `message`, `data`, `totalCounts`

---

# 3. POST `/wapi/contact/save-enquiry`

### Route
```
POST /wapi/contact/save-enquiry
```

### Auth
Public.

### Handler chain
`formData (multer.none)` → `saveEnquiry` → `saveEnquiryService`

Validation is **soft** inside the service (not `validateData` 400) so clients get HTTP **200** + `{ status: false, messages }`.

### Body fields

| Field | Required | Rules |
|-------|----------|-------|
| `firstName` | **Yes** | non-empty → message `"The Name field is required."` |
| `email` | **Yes** | valid email → `"The Email field must contain a valid email address."` |
| `message` | No | string |
| `phone` | No | if present: digits only, length 10–15 |
| `lastName` | No | string |
| `company` | No | string |

### DB write
```
INSERT INTO cyb_enquiries
  (firstName, lastName, email, phone, company, message, create_date)
VALUES (...)
```

`create_date` = `Y-m-d H:i:s`.

### Side effects
On successful insert:

1. Load site settings from `cyb_setting` (`getWebSettings()`), keys like `config_name`, `contact_email`.
2. Fallback contact target: `process.env.CONTACT_EMAIL`.
3. Subject: `New Enquiry From {config_name} contact page`.
4. Queue SQS `SEND_EMAIL` with inline HTML body and `action: "save enquiries"`.
5. Email queue failures are logged only (insert already succeeded).

### Request example
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "9876543210",
  "company": "Acme",
  "message": "Need a demo"
}
```

### Success response
```json
{
  "status": true,
  "data": null,
  "message": "Enquiry Sent Successfully"
}
```

### Insert failure
```json
{
  "status": false,
  "data": null,
  "message": "Something getting wrong please retry"
}
```

### Validation failure
```json
{
  "status": false,
  "messages": "The Name field is required.,The Email field must contain a valid email address."
}
```
> Uses **`messages`** (plural). Errors joined with commas.

### Checklist
- [x] Table: `cyb_enquiries`
- [x] Required: firstName, email only
- [x] Notify ops email async (SQS) with contact-page subject wording
- [x] Success/error key is `message`; validation key is `messages`

---

# 4. POST `/wapi/career/save-enquiry`

### Route
```
POST /wapi/career/save-enquiry
```

### Auth
Public.

### Handler
`saveCareerEnquiry` → `saveCareerEnquiryService`

Nearly identical to contact enquiry (#3):

| Aspect | Contact (#3) | Career (#4) |
|--------|--------------|-------------|
| Table | `cyb_enquiries` | `cyb_career_enquiries` |
| Email subject | `... contact page` | `... career page` |
| SQS `action` | `save enquiries` | `save career enquiries` |
| Request / validation / response strings | Same | Same |

### Checklist
- [x] Separate table `cyb_career_enquiries`
- [x] Subject/action strings say **career**
- [x] Same client-facing messages as contact form

---

# 5. GET `/wapi/general/sitemap`

### Route
```
GET /wapi/general/sitemap
```

### Auth
Public.

### Handler
`sitemap` → `sitemapService` → slug helpers on `frontendRepositery`.

### Query parameters

| Param | Required | Values | Behavior |
|-------|----------|--------|----------|
| `type` | No | omitted / empty, `company`, `user`, `job`, `meta` | Controls which lists are included |

If `type` is empty **or** equals a given key, that list is loaded:

| Condition | Key in `data` | Source |
|-----------|---------------|--------|
| empty or `company` | `companyList` | `cyb_user` where `status=1`, `user_type=2`, `is_deleted=0` → `{ slug }` |
| empty or `user` | `userList` | `cyb_user` where `status=1`, `user_type=1`, `is_deleted=0` → `{ slug }` |
| empty or `job` | `jobList` | `cyb_company_job` where `status=1`, `is_deleted=0` → `{ slug }` |
| empty or `meta` | `metaJobList` | `cyb_job_meta` where `status=1` → `{ job_slug }` |

- No `type` → all four lists present.
- `type=company` → only `companyList`.
- Unknown `type` (e.g. `foo`) → `data` is empty object (no lists filled).

Always live DB (no cache layer).

### Success response (all types)
```json
{
  "status": true,
  "message": "list",
  "data": {
    "companyList": [
      { "slug": "acme-corp" }
    ],
    "userList": [
      { "slug": "jane-doe" }
    ],
    "jobList": [
      { "slug": "software-engineer-acme" }
    ],
    "metaJobList": [
      { "job_slug": "software-engineer-mumbai" }
    ]
  }
}
```

Notes:

- Success uses **`message`**: `"list"`.
- Rows are objects with a single slug field, not bare strings.
- Meta list field is **`job_slug`**, not `slug`.

### Partial example (`?type=job`)
```json
{
  "status": true,
  "message": "list",
  "data": {
    "jobList": [
      { "slug": "backend-dev-xyz" }
    ]
  }
}
```

### Error response (exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

### Checklist
- [x] Optional `type` filter with OR-empty semantics
- [x] Four independent list keys; meta uses `job_slug`
- [x] Only active, non-deleted entities
- [x] No auth

---

# 6–7. POST|GET `/wapi/data-deletion`

### Routes
```
POST /wapi/data-deletion
GET  /wapi/data-deletion
```

Both map to `dataDeletion` → `dataDeletionService`.

### Auth
Public.

### Purpose
Facebook (Meta) **Data Deletion Request Callback** style endpoint. Current implementation is a **hardcoded stub**, not a real signed-request verifier or account wipe.

### Runtime behavior

1. Ignores request body/query for business logic.
2. Generates random 5-digit id: `11111–99999`.
3. Status URL base: `process.env.DATA_DELETION_STATUS_URL` or `https://www.collarcheck.com/deletion`.
4. Returns JSON **without** `status` envelope:

```json
{
  "url": "https://www.collarcheck.com/deletion?id=48392",
  "confirmation_code": 48392
}
```

(`confirmation_code` is the same random int as in the URL.)

### Porting / product notes

| Option | Guidance |
|--------|----------|
| **Byte-compatible stub** (current) | Return `{ url, confirmation_code }` so Meta/console checks pass. |
| **Real Meta callback** | Read `signed_request` from POST, verify HMAC with app secret from env, schedule deletion, store confirmation code. |
| **Privacy compliance** | Wire actual user anonymization / hard-delete + status page at `/deletion?id=`. |

This endpoint does **not** delete anything in MySQL today.

---

## Side-effect summary

| Endpoint | Writes DB | Email / queue | Auth |
|----------|-----------|---------------|------|
| `general/consent` | — (404) | — | Public |
| `home/top-company` | Read only | — | JWT |
| `contact/save-enquiry` | `cyb_enquiries` INSERT | SQS `SEND_EMAIL` | Public |
| `career/save-enquiry` | `cyb_career_enquiries` INSERT | SQS `SEND_EMAIL` | Public |
| `general/sitemap` | Read only | — | Public |
| `data-deletion` | None | None | Public |

---

## Tables referenced

| Table | Endpoints |
|-------|-----------|
| `cyb_user` | top-company, sitemap (company/user slugs) |
| `cyb_user_experience` | top-company thresholds |
| `cyb_user_experience_rating` | top-company thresholds |
| `cyb_company_job` | top-company, exploreTalent, job slugs |
| `cyb_cities`, `cyb_state`, `cyb_country`, `cyb_industries`, `cyb_turnover`, `cyb_company_size` | top-company joins |
| `cyb_follow` | top-company followData / following |
| `cyb_job_meta` | sitemap meta |
| `cyb_enquiries` | contact save |
| `cyb_career_enquiries` | career save |
| `cyb_setting` | enquiry email target (`contact_email`, `config_name`) |

---

## Env vars (enquiry + data-deletion)

| Var | Used by | Notes |
|-----|---------|-------|
| `S3_PREFIX` | top-company profile URLs | Optional |
| `CONTACT_EMAIL` | enquiry notify fallback | Used if `cyb_setting` has no `contact_email` |
| `AWS_SQS_URL` / AWS creds | enquiry email queue | Required for email side effect |
| `DATA_DELETION_STATUS_URL` | data-deletion stub | Default `https://www.collarcheck.com/deletion` |

---

## Response compatibility matrix

| Endpoint | Success keys | Error keys |
|----------|--------------|------------|
| top-company | `status`, `message`, `data[]`, `totalCounts` | `status`, `messages` |
| contact enquiry | `status`, `data`, `message` | validation: `messages`; insert fail: `message` |
| career enquiry | same as contact | same as contact |
| sitemap | `status`, `message`, `data` | `status`, `messages` |
| data-deletion | `url`, `confirmation_code` only | n/a (always success-shaped stub) |
| consent | n/a | HTTP 404 |
