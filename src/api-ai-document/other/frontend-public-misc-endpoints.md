
# Frontend / Public Misc Endpoints — consent, top-company, enquiries, sitemap, data-deletion

AI porting guide for home/contact/career public (and one auth-gated) Frontend APIs plus a missing consent route. Goal: a new stack must return the **same JSON shapes and message strings** so web/mobile clients keep working.

**Base path:** `/wapi`  
**Content-Type:** `application/json` (or form-urlencoded / multipart; handlers use `getVar`)  
**HTTP:** Almost always **200** with `status: true|false` (business errors are not 4xx), except auth filter (401) and missing handlers (404).

---

## Routes Summary

| # | Method | Route | Handler | Auth | Status |
|---|--------|-------|---------|------|--------|
| 1 | GET | `general/consent` | `GeneralApi::consent` | Public | **Missing method → 404** |
| 2 | GET | `home/top-company` | `Frontend::get_top_company` | **JWT Auth** | Implemented |
| 3 | POST | `contact/save-enquiry` | `Frontend::save_enquiry` | Public | Implemented |
| 4 | POST | `career/save-enquiry` | `Frontend::save_career_enquiry` | Public | Implemented |
| 5 | GET | `general/sitemap` | `Frontend::sitemap` | Public | Implemented |
| 6 | POST | `data-deletion` | `Frontend::data_deletion` | Public | Implemented (stub) |
| 7 | GET | `data-deletion` | `Frontend::data_deletion` | Public | Implemented (stub; same handler as #6) |

**Source:** `app/Config/Routes.php` (approx. lines 332–338), `app/Controllers/Frontend.php`, `app/Controllers/GeneralApi.php` (consent not present).

---

## Global response quirks (copy exactly)

| Key | When used |
|-----|-----------|
| `status` | Boolean on most handlers |
| `messages` | Validation errors; catch blocks (plural) |
| `message` | Success / some failures (singular) — **not** always `messages` |
| `data` | Payload or `null` on enquiry success/fail |
| No envelope | `data-deletion` returns raw Facebook-style object (`url`, `confirmation_code`) |

Most handlers use `return json_encode(...)` or `echo json_encode(...)` (not always `$this->response->setJSON()`).

---

# 1. GET `/wapi/general/consent`

### Route
```
GET /wapi/general/consent
```

### Auth
Public (no `Auth` filter on route).

### Status today
**404 — Method `GeneralApi::consent` does not exist.**

Route is registered:

```php
$routes->get('wapi/general/consent', 'GeneralApi::consent');
```

There is **no** `function consent()` (or similar) in `GeneralApi.php` or elsewhere under `app/`.

### Expected behavior (inferred only)
Likely intended to return privacy / cookie / GDPR consent copy or flags for the web client. No table, request params, or response shape can be recovered from this codebase.

### Porting notes
- Either implement a real consent endpoint and document the contract when product defines it, or remove the route.
- Do **not** invent response keys until a client or product spec exists.
- Related UI/copy may live only on the frontend; backend may have been planned and never shipped.

### Suggested error if called against old API
Framework **404** (method not found), not a JSON `{ status: false }` body.

---

# 2. GET `/wapi/home/top-company`

### Route
```
GET /wapi/home/top-company
```

### Auth
**JWT required** (`['filter' => 'Auth']`).  
Acting user: `$this->request->id` (JWT user; `X-Company` may swap to company id per global auth rules).

### Handler
`Frontend::get_top_company` → `UserModel::get_top_company($filter)`

### Query parameters

| Param | Source | Required | Default | Notes |
|-------|--------|----------|---------|-------|
| `limit` | GET | No | `10` | Page size |
| `offset` | GET | No | `0` | **Page number**, not SQL offset. Converted as: `page <= 1 → 0`, else `page * limit - limit` |

Example: `?limit=10&offset=2` → SQL offset `10` (second page).

### Business / SQL logic (`UserModel::get_top_company`)

Companies (`user.user_type = 2`) that:

| Condition | Detail |
|-----------|--------|
| Active claimed company | `status = 1`, `claim_status = 1` |
| Min experience rows | `COUNT(DISTINCT cyb_user_experience) >= 5` |
| Min reviews | `COUNT(DISTINCT cyb_user_experience_rating) >= 2` |
| Min active jobs | `COUNT(DISTINCT cyb_company_job where status=1, is_deleted=0) >= 1` |
| Exclude self employment | If acting user loaded: `ue.user != {viewerId}` |
| Order | `experienceCount DESC` |
| Joins | cities, state, country, industries, turnover, company_size |

**Total count:** same filters with `limit` unset → `countAllResults(false)` (integer).

### Per-row enrichment (controller loop)

For each company row:

1. Build display fields (name, geo, industry, size, turnover, distance, slug, profile URL).
2. `profile` = `S3_PREFIX + profile` if profile set, else `social_image`.
3. `is_verified` = `UserModel::user_verified(companyId)`.
4. `followData` = `UserModel::get_total_follower_count(companyId)` → typically `{ following, follower }`.
5. `following` from `get_check_follow_status(viewerId, companyId)`:
   - If follow row exists: `{ "requestSend": true, "requestApproved": status==1 }`
   - Else: `{ "requestSend": false, "requestApproved": false }`
6. `exploreTalent` = `1` if any `company_job` with `company = id, status = 1, is_deleted = 0`, else `0`.

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
- `distance` is `round(distance, 1)` or `0` if empty (model may not always select distance; often `0`).
- `totalCounts` is an **integer** count of matching companies (not an array).

### Error response (exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

### Auth failure
**401** from `Auth` filter (framework-dependent body). Not a soft `{ status: false }` from this method.

### Porting checklist
- [ ] JWT required
- [ ] Page math: `offset` query = page index, not raw SQL offset
- [ ] Same HAVING thresholds (≥5 experiences, ≥2 reviews, ≥1 job)
- [ ] Enrich each row with verify / follow / exploreTalent
- [ ] Response keys: `message`, `data`, `totalCounts`

---

# 3. POST `/wapi/contact/save-enquiry`

### Route
```
POST /wapi/contact/save-enquiry
```

### Auth
Public (no filter).

### Handler
`Frontend::save_enquiry`

### Validation rules

| Field | Rules | Required |
|-------|-------|----------|
| `firstName` | `trim\|htmlspecialchars\|required` | **Yes** |
| `email` | `trim\|htmlspecialchars\|required\|valid_email` | **Yes** |
| `message` | `trim\|htmlspecialchars` | No |
| `phone` | `trim\|htmlspecialchars\|numeric\|max_length[15]\|min_length[10]` | No (but if sent, must pass numeric/length) |
| `lastName` | (none) | No |
| `company` | (none) | No |

### DB write
```
INSERT INTO enquiries
  (firstName, lastName, email, phone, company, message, create_date)
VALUES (...)
```

`create_date` = `Y-m-d H:i:s` (also used in email template).

### Side effects
On successful insert:

1. Load site settings via `websetting()` (`config_name`, `contact_email`, etc.).
2. Build email subject: `'New Enquiry From ' . config_name . ' contact page'`.
3. Body: view `email/enquiry_template` with name, email, phone, company, message, create_date, wconfig.
4. Push SQS job: `SqsService->push('SEND_EMAIL', { mail, action: 'save enquiries' })`  
   To-address: `strtolower(wconfig['contact_email'])`.

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
> Uses **`message`** (singular). Emitted via `echo json_encode`.

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
> Validation uses **`messages`** (plural). CI4 labels: Name, Email, message, Phone. Errors joined with commas from `implode(',', $this->validator->getErrors())`.

### Porting checklist
- [ ] Table: `enquiries`
- [ ] Required: firstName, email only
- [ ] Notify ops email async (queue) with same subject wording
- [ ] Success/error key is `message`; validation key is `messages`

---

# 4. POST `/wapi/career/save-enquiry`

### Route
```
POST /wapi/career/save-enquiry
```

### Auth
Public (no filter).

### Handler
`Frontend::save_career_enquiry`

Nearly identical to contact enquiry (#3), with these differences:

| Aspect | Contact (#3) | Career (#4) |
|--------|--------------|-------------|
| Table | `enquiries` | `career_enquiries` |
| Email subject | `... contact page` | `... career page` |
| SQS `action` | `save enquiries` | `save career enquiries` |
| Request / validation / response strings | Same | Same |

### Validation rules
Same as #3: required `firstName`, `email`; optional `message`, `phone` (with numeric rules), `lastName`, `company`.

### DB write
```
INSERT INTO career_enquiries
  (firstName, lastName, email, phone, company, message, create_date)
VALUES (...)
```

### Success / failure / validation
Same JSON as #3:

```json
{ "status": true, "data": null, "message": "Enquiry Sent Successfully" }
```
```json
{ "status": false, "data": null, "message": "Something getting wrong please retry" }
```
```json
{ "status": false, "messages": "<validation errors>" }
```

### Porting checklist
- [ ] Separate table `career_enquiries` (do not reuse `enquiries`)
- [ ] Subject/action strings say **career**, not contact
- [ ] Same client-facing messages as contact form

---

# 5. GET `/wapi/general/sitemap`

### Route
```
GET /wapi/general/sitemap
```

### Auth
Public (no filter).

### Handler
`Frontend::sitemap` → `FrontModel` slug helpers.

### Query parameters

| Param | Required | Values | Behavior |
|-------|----------|--------|----------|
| `type` | No | omitted / empty, `company`, `user`, `job`, `meta` | Controls which lists are included |

If `type` is empty **or** equals a given key, that list is loaded:

| Condition | Key in `data` | Model method | Source |
|-----------|---------------|--------------|--------|
| empty or `company` | `companyList` | `get_company_slug()` | `user` where `status=1`, `user_type=2`, `is_deleted=0` → `slug` only |
| empty or `user` | `userList` | `get_user_slug()` | `user` where `status=1`, `user_type=1`, `is_deleted=0` → `slug` only |
| empty or `job` | `jobList` | `get_job_slug()` | `company_job` where `status=1`, `is_deleted=0` → `slug` only |
| empty or `meta` | `metaJobList` | `get_job_meta_slug()` | `job_meta` where `status=1` → `job_slug` only |

- No `type` → all four lists present.
- `type=company` → only `companyList`.
- Unknown `type` (e.g. `foo`) → `data` is empty object/array (no lists filled).

Cache blocks in source are **commented out** (always live DB).

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
- Rows are objects with a single slug field (CI result objects), not bare strings.
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

### Porting checklist
- [ ] Optional `type` filter with OR-empty semantics
- [ ] Four independent list keys; meta uses `job_slug`
- [ ] Only active, non-deleted entities (per filters above)
- [ ] No auth

---

# 6–7. POST|GET `/wapi/data-deletion`

### Routes
```
POST /wapi/data-deletion
GET  /wapi/data-deletion
```

Both map to the same handler: `Frontend::data_deletion`.

### Auth
Public.

### Purpose
Facebook (Meta) **Data Deletion Request Callback** style endpoint. Current implementation is a **hardcoded stub**, not a real signed-request verifier or account wipe.

### Actual runtime behavior (as coded)

1. Ignores real request body/query for business logic.
2. Hardcodes:
   - `$signed_request = 'collarcheck';` (not `$_POST['signed_request']`)
   - `$user_id = 1` (not from request)
3. Generates random 5-digit id: `rand(11111, 99999)`.
4. Builds status URL: `https://www.collarcheck.com/deletion?id={id}`.
5. Returns JSON (no `status` envelope):

```json
{
  "url": "https://www.collarcheck.com/deletion?id=48392",
  "confirmation_code": 48392
}
```

(`confirmation_code` is the same random int as in the URL.)

### Dead / unused code in the same function
Nested helpers exist but are **never called** by the live path:

- `parse_signed_request($signed_request)` — would split `sig.payload`, HMAC-SHA256 with app secret `ee6b742fe94a66d11430073d58764cef`, base64url decode.
- `base64_url_decode($input)`.

No DB delete of user data is performed. No audit row is written.

### Porting notes (important)

| Option | Guidance |
|--------|----------|
| **Byte-compatible stub** | Return `{ url, confirmation_code }` with random code and fixed base URL so Meta/console checks pass. |
| **Real Meta callback** | Read `signed_request` from POST, verify HMAC with app secret, schedule deletion for Facebook user id, store confirmation code, return status URL. Secret in source is sensitive — move to env. |
| **Privacy compliance** | Wire actual user anonymization / hard-delete + status page at `/deletion?id=`. |

Do **not** assume this endpoint currently deletes anything in MySQL.

### Auth / validation
None. Always returns the stub JSON for both GET and POST.

---

## Side-effect summary

| Endpoint | Writes DB | Email / queue | Auth |
|----------|-----------|---------------|------|
| `general/consent` | — (404) | — | Public |
| `home/top-company` | Read only | — | JWT |
| `contact/save-enquiry` | `enquiries` INSERT | SQS `SEND_EMAIL` | Public |
| `career/save-enquiry` | `career_enquiries` INSERT | SQS `SEND_EMAIL` | Public |
| `general/sitemap` | Read only | — | Public |
| `data-deletion` | None | None | Public |

---

## Tables referenced

| Table | Endpoints |
|-------|-----------|
| `user` | top-company, sitemap (company/user slugs) |
| `cyb_user_experience` | top-company thresholds |
| `cyb_user_experience_rating` | top-company thresholds |
| `cyb_company_job` / `company_job` | top-company, exploreTalent, job slugs |
| `cities`, `state`, `country`, `industries`, `turnover`, `company_size` | top-company joins |
| `job_meta` | sitemap meta |
| `enquiries` | contact save |
| `career_enquiries` | career save |
| (site settings helper) | `websetting()` for enquiry email target |

---

## Node / new-stack response compatibility matrix

| Endpoint | Success keys | Error keys |
|----------|--------------|------------|
| top-company | `status`, `message`, `data[]`, `totalCounts` | `status`, `messages` |
| contact enquiry | `status`, `data`, `message` | validation: `messages`; insert fail: `message` |
| career enquiry | same as contact | same as contact |
| sitemap | `status`, `message`, `data` | `status`, `messages` |
| data-deletion | `url`, `confirmation_code` only | n/a (always success-shaped stub) |
| consent | n/a | HTTP 404 today |
