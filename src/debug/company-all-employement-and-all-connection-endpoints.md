
# Debug Guide — company/all-employement & company/all-connection

**Purpose:** Contract source-of-truth for debugging a Node.js reimplementation against the legacy CodeIgniter 4 API. Frontend already depends on these response keys and message strings — **do not rename keys**.

**Authoritative source:** PHP controllers/models below (prefer this file over summary tables in `api-ai-document/` when they conflict).

## Node implementation map (shipped)

| Layer | Files |
|-------|--------|
| Routes | `src/routes/company.route.ts` — `GET /all-connection`, `GET /all-employement` |
| Controllers | `src/controllers/company.controller.ts` — `allConnection`, `allEmployment` |
| Services | `src/services/company.service.ts` — `allConnectionService`, `allEmploymentService` |
| Repositery | `src/repositery/company.repositery.ts` (+ review/skill/employee for ratings) |
| Types | `src/types/company.types.ts` — `allConnectionQuerySchema` |
| Node docs | `src/api-ai-document/company/company-endpoints.md` §4–5 |

| Route | Auth | Node handler | What it returns |
|-------|------|--------------|-----------------|
| `GET /wapi/company/all-connection` | **JWT** + menu **5** | `allConnection` | Paginated **current + past** approved employees |
| `GET /wapi/company/all-employement` | **JWT** + menu **6** | `allEmployment` | Full employment list + `newUpdateList` |

| Route | Auth | PHP Controller | What it returns |
|-------|------|----------------|-----------------|
| `GET /wapi/company/all-connection` | **JWT** + menu **5** | `CompanyApi::allConnection` | Paginated **current + past** approved employees (connection cards) |
| `GET /wapi/company/all-employement` | **JWT** + menu **6** | `CompanyApi::companyWiseEmploymentDetails` | Full company employment verification list + basic-update queue |

**Source files:**
- `app/Controllers/CompanyApi.php` — `companyWiseEmploymentDetails` (~1320), `allConnection` (~1716)
- `app/Models/MainModel.php` — `getAllCollections` (~281) — connections list/count
- `app/Models/UserModel.php` — `get_company_experience_list` (~130), `get_basic_experience_update_list` (~1379), `get_skill` (~255), `get_certificate` (~190), `get_rating` (~325), `get_employment_status` (~687), `get_employment_history` (~3160), `get_update_experience` (~5745), `user_verified` (~3247), `get_user_rating` (~2968), `getoverallprofileScore` (~6055)
- `app/Libraries/traits/ExploringTrait.php` — `show_exploring` (~12)
- `app/Helpers/general_helper.php` — `checkMenuAccess`
- `app/Filters/Authenticate.php` — JWT + optional `X-Company`
- Routes: `app/Config/Routes.php` company group `['filter' => 'Auth']` (~143–145)

**Base path:** `/wapi`  
**Auth:** `Authorization: Bearer <jwt>`  
**Acting company:** JWT user, or company from `X-Company: {companyId}` → `$this->request->id`. Original JWT user is `$this->request->user_id`. Company `user_type` is `$this->request->user_type`.

> **Node bug magnet #1:** Confusing these two.  
> - **all-connection** = approved workers only (`approved=1`), split current/past, paginated, rich social card.  
> - **all-employement** (typo path) = **all** `user_experience` rows for the company (pending + approved + rejected if present), **no** query pagination, plus `newUpdateList`.

> **Node bug magnet #2:** “Fixing” the path spelling to `all-employment`. Live route is **`all-employement`** (missing second **e** in employment).

---

## Global envelope

| Case | Endpoint | HTTP | Body shape |
|------|----------|------|------------|
| Success connection | all-connection | **200** | `{ "status": true, "messages": "Company Connection", "data": { ... } }` |
| Success employment | all-employement | **200** | `{ "status": true, "messages": "Employement History", "data": [...], "newUpdateList": [...] }` |
| Menu denied | both | **403** | `{ "status": false, "message": "<permission text>" }` ← **`message` singular** |
| Exception | both | **200** | `{ "status": false, "messages": "Access denied" }` ← **`messages` plural** |
| Auth fail | both | **401** | filter-dependent |
| Empty company id (employment only) | all-employement | **200?** | `$response` never assigned if `user_id` empty — PHP notice / empty body; do not invent a clean error |

> **Node bug magnet #3:** Using `messages` on 403. Permission path uses **`message`** (same pattern as company dashboard). Success strings: **"Company Connection"** vs **"Employement History"** (typo **Employement**).

---

## Auth / identity (both)

```text
JWT → user row
If header X-Company present and company exists (status=1, is_deleted=0):
  request.id        = company.id          ← $companyId / $user_id for these endpoints
  request.user_id   = JWT user.id         ← $login_user_id for checkMenuAccess
  request.user_type = company.user_type   (2)
Else:
  request.id = request.user_id = JWT user
  request.user_type = JWT user.user_type
```

Permission only runs when **`user_type == 2`**:

| Endpoint | Menu id | Call |
|----------|---------|------|
| all-connection | **5** | `checkMenuAccess(login_user_id, companyId, 5)` |
| all-employement | **6** | `checkMenuAccess(login_user_id, companyId, 6)` |

If `user_type != 2` (e.g. individual JWT without `X-Company`), permission is **skipped** and the query still runs against `request.id` (usually wrong — FE should always act as company).

---

## Shared: exploring flags

Same pattern as dashboard / allapplication:

```text
on_explore_user_flag = truthy user.on_explore ? 1 : 0

if on_explore_user_flag == 1:
  on_explore = show_exploring(employeeUserId, companyId) ? 1 : 0
else:
  on_explore = 0

if on_explore == 1:
  on_immediate = user.on_immediate ? 1 : 0
  on_notice    = user.on_notice ? 1 : 0
else:
  on_immediate = 0
  on_notice    = 0
```

`show_exploring` respects privacy (`exploring_option` / hide current company / hide colleagues / blocklists). Details: `ExploringTrait` and `debug/employee-save-exploring-endpoint.md`.

---

## Shared: profile image

```text
profile = non-empty user.profile
  ? env(S3_PREFIX) + user.profile
  : user.social_image          // often raw URL; no S3 prefix
```

---

# 1. GET `/wapi/company/all-connection`

**Handler:** `CompanyApi::allConnection` (~1716)  
**Auth:** JWT + menu **5** when `user_type == 2`  
**Method:** GET (no method check in body)

### Query params

| Param | Source | Default | Notes |
|-------|--------|---------|-------|
| `keyword` | GET/POST var (`getVar`) | empty | Name words OR `individual_id` (see SQL) |
| `sort_by` | GET/POST var | empty | `1` fname ASC, `2` fname DESC, `3` experience create_date ASC, else create_date DESC if set; if empty → `ue.id DESC` |
| `limit` | GET only | **10** | Page size |
| `offset` | GET only | **0** | **Page number**, not SQL OFFSET |

```text
page   = offset query (default 0)
limit  = limit query (default 10)
sqlOffset = page <= 1 ? 0 : page * limit - limit
```

| `offset` query | SQL `LIMIT offset,limit` |
|----------------|--------------------------|
| missing / 0 / 1 | `LIMIT 0, 10` |
| 2 | `LIMIT 10, 10` |
| 3 | `LIMIT 20, 10` |

> **Node bug magnet #4:** Treating `offset` as SQL offset. It is **1-based page** (with 0 and 1 both meaning first page).

```http
GET /wapi/company/all-connection?limit=10&offset=1&keyword=John&sort_by=4
Authorization: Bearer <jwt>
X-Company: <companyId>
```

### Logic (debug checklist)

```text
1. companyId = request.id
   login_user_id = request.user_id
   user_type = request.user_type

2. IF user_type == 2:
     permission = checkMenuAccess(login_user_id, companyId, 5)
     IF denied → HTTP 403 { status:false, message }

3. keyword = trim(getVar('keyword'))
   sort_by = getVar('sort_by')
   limit / page / sqlOffset as above

4. currentEmployee = MainModel.getAllCollections(companyId, keyword, sort_by, type=1, limit, sqlOffset)
   pastEmployee    = MainModel.getAllCollections(companyId, keyword, sort_by, type=NULL, limit, sqlOffset)
   // type=1 → still_working=1; else → still_working=0
   // BOTH require approved=1, ue.status=1, is_deleted=0, us.status=1, us.is_deleted=0
   // GROUP BY us.id

5. ids = []
   FOR each currentEmployee row:
     ids.push(row.id)
     map connection card (wishlist forced empty → in_wishlist always false)
     allcompanycurrent.push(card)

6. FOR each pastEmployee row:
     IF row.id already in ids → skip (prefer current)
     wishlist = AdminModel.fs('company_wishlist', { status:1, company:companyId, user:row.id })
     map card + worked_till_date + in_wishlist from wishlist
     allcompanypast.push(card)

7. data.current_count = count(allcompanycurrent)   // page length, NOT total
   data.current      = allcompanycurrent
   data.past_count    = count(allcompanypast)      // page length after dedupe
   data.past          = allcompanypast

8. data.currentEmployeeCount = getAllCollections(..., type=1) WITHOUT limit
   → returns getNumRows() integer (total matching current users)
   data.pastEmployeeCount = getAllCollections(..., type falsy) WITHOUT limit
   → total past users

9. return { status:true, messages:"Company Connection", data }
```

### SQL — `MainModel::getAllCollections`

Raw SQL uses **`cyb_`** table prefix in source:

```sql
SELECT us.*,
       ue.company AS emp_company,
       ue.id AS experience_id,
       ue.still_working,
       ue.approved,
       ue.create_date AS connectiondate,
       ue.joining_date,
       ue.worked_till_date,
       ds.name AS designation,
       us.modify_date AS last_modify_date,
       us.create_date AS account_create_date
FROM cyb_user AS us
INNER JOIN cyb_user_experience AS ue ON ue.user = us.id
INNER JOIN cyb_designation AS ds ON ue.designation = ds.id
WHERE ue.company = :companyId
  -- type=1 (current):
  AND ue.approved = 1 AND ue.still_working = 1 AND ue.status = 1
  AND ue.is_deleted = 0 AND us.is_deleted = 0 AND us.status = 1
  -- type≠1 (past):
  -- AND ue.approved = 1 AND ue.still_working = 0 AND ue.status = 1
  -- AND ue.is_deleted = 0 AND us.is_deleted = 0 AND us.status = 1
  AND us.is_deleted = 0   -- duplicated in PHP
  -- optional keyword:
  -- AND ( (CONCAT(us.fname,' ',us.lname) LIKE '%word%' OR ...)
  --       OR us.individual_id LIKE '%individual_id%' )
GROUP BY us.id
ORDER BY ...   -- see sort_by
LIMIT :sqlOffset, :limit;   -- only when limit truthy

-- without limit: same SELECT, return getNumRows() as integer count
```

**Keyword parsing:**
- Split keyword on spaces → each non-empty word becomes `CONCAT(fname,' ',lname) LIKE '%word%'` joined with **OR**.
- `individual_id` search fragment: if keyword contains `-` and part after first `-` is non-empty, use that part; else whole keyword.
- Example: `CC-12345` → also matches `individual_id LIKE '%12345%'`.

**Sort:**

| `sort_by` | ORDER BY |
|-----------|----------|
| empty / missing | `ue.id DESC` |
| `1` | `us.fname ASC` |
| `2` | `us.fname DESC` |
| `3` | `ue.create_date ASC` |
| anything else truthy (incl. `4`) | `ue.create_date DESC` |

> Because of `GROUP BY us.id`, designation / experience fields come from **one arbitrary experience row** per user (MySQL only_full_group_by dependent). Match PHP — do not invent “latest stint” logic unless product changes SQL.

### Connection card — **LOCKED KEYS**

Built almost identically for current and past (differences noted).

| Key | Type | Source / notes |
|-----|------|----------------|
| `user` | number | `user.id` (employee) |
| `profile` | string\|null | S3+profile or social_image |
| `username` | string | `fname + ' ' + lname` |
| `contact_person` | string | **phone** (key name is contact_person) |
| `email` | string | |
| `designation` | string | joined designation name |
| `employee_status` | string | `"Current"` if `still_working==1` else `"Past"` |
| `connectiondate` | string | `ue.create_date` |
| `approved` | number | experience approved flag |
| `experience_id` | number | `ue.id` |
| `linkdin` | | user field (typo **linkdin**) |
| `youtube` / `instagram` / `facebook` | | socials; `instagram` assigned **twice** |
| `individual_id` | | |
| `is_verified` | boolean | `UserModel::user_verified(userId)` |
| `slug` | | |
| `profile_description` | | |
| `dob` | | |
| `present_address` | | |
| `joining_date` | | experience |
| `worked_till_date` | | **past only** (current cards omit key) |
| `last_modify_date` | | `us.modify_date` |
| `account_create_date` | | `us.create_date` |
| `totalRating` | object | `get_user_rating` → `{ rating, noofrecord }` (sums, **not** average) |
| `userRating` | number | `getoverallprofileScore(...).rating` or `0` |
| `in_wishlist` | boolean | **current:** always `false` (wishlist query commented / empty). **past:** true if `company_wishlist` row `{status:1, company, user}` |
| `on_explore` | 0\|1 | gated |
| `on_immediate` | 0\|1 | gated |
| `on_notice` | 0\|1 | gated |

### Success — **LOCKED** envelope

```json
{
  "status": true,
  "messages": "Company Connection",
  "data": {
    "current_count": 2,
    "current": [
      {
        "user": 55,
        "profile": "https://s3.../p.jpg",
        "username": "John Doe",
        "contact_person": "9999999999",
        "email": "john@example.com",
        "designation": "Engineer",
        "employee_status": "Current",
        "connectiondate": "2024-01-15 10:30:00",
        "approved": 1,
        "experience_id": 100,
        "linkdin": "",
        "youtube": "",
        "instagram": "",
        "facebook": "",
        "individual_id": "IND-001",
        "is_verified": true,
        "slug": "john-doe",
        "profile_description": "...",
        "dob": "1990-01-15",
        "present_address": "...",
        "joining_date": "2024-01-15",
        "last_modify_date": "2024-06-01 12:00:00",
        "account_create_date": "2023-12-01 09:00:00",
        "totalRating": { "rating": 12, "noofrecord": 3 },
        "userRating": 4.2,
        "in_wishlist": false,
        "on_explore": 0,
        "on_immediate": 0,
        "on_notice": 0
      }
    ],
    "past_count": 1,
    "past": [
      {
        "user": 56,
        "employee_status": "Past",
        "worked_till_date": "2023-06-01",
        "in_wishlist": true,
        "totalRating": { "rating": 0, "noofrecord": 0 },
        "userRating": 0
      }
    ],
    "currentEmployeeCount": 25,
    "pastEmployeeCount": 10
  }
}
```

| Top-level `data` key | Meaning |
|----------------------|---------|
| `current` / `past` | Arrays of cards for **this page** |
| `current_count` / `past_count` | `count(current)` / `count(past)` on **this page** (after past dedupe) |
| `currentEmployeeCount` / `pastEmployeeCount` | **Totals** (no limit); integers from `getNumRows()` |

Empty lists: still `status: true`, arrays `[]`, counts `0`.

### Error cases

```json
// 403 menu
{ "status": false, "message": "<from checkMenuAccess>" }

// catch
{ "status": false, "messages": "Access denied" }
```

### Common Node mistakes (connection)

| Mistake | Symptom |
|---------|---------|
| `offset` as SQL offset | Wrong page of employees |
| Only one list (current OR past) | FE tabs empty |
| Include unapproved experiences | Shows pending as “connected” |
| `current_count` as total | Pagination UI wrong; use `*EmployeeCount` for badges |
| Dedupe past against current by experience_id not user id | Same person in both lists |
| `in_wishlist` true for current | PHP hard-disables wishlist for current |
| `totalRating` as average | Object is sum `rating` + `noofrecord` |
| 403 with `messages` | Should be `message` |

---

# 2. GET `/wapi/company/all-employement`

**Handler:** `CompanyApi::companyWiseEmploymentDetails` (~1320)  
**Auth:** JWT + menu **6** when `user_type == 2`  
**Method:** GET  
**Path spelling:** **`all-employement`** (legacy typo)

### Query / body params

**None.** No `limit` / `offset` / `keyword`. Company = `request.id`.

```http
GET /wapi/company/all-employement
Authorization: Bearer <jwt>
X-Company: <companyId>
```

### Logic (debug checklist)

```text
1. user_id = request.id          // company
   login_user_id = request.user_id
   user_type = request.user_type

2. IF user_type == 2:
     permission = checkMenuAccess(login_user_id, user_id, 6)
     IF denied → HTTP 403 { status:false, message }

3. IF user_id empty → skip body (response undefined) — avoid in Node; prefer empty success if hardening

4. allemploymentList = UserModel.get_company_experience_list(user_id)
   // ALL user_experience for company where ue.is_deleted=0 and user is_deleted=0
   // ⚠ NO filter on approved / status — pending (0), approved (1), rejected (2) all included
   // ORDER BY ue.id DESC

5. FOR each experience row:
     skills = get_skill(row.skill)   // skill JSON array of ids → skill names
     exitRecord = get_update_experience(row.id)  // COUNT of linked user_update_experience
     map employment card (see locked keys)
     request_type = exitRecord truthy ? 3 : 1
     allemployement.push(card)

6. newBasicUpdateList = get_basic_experience_update_list(user_id)
   // user_update_experience joined to experience for this company
   FOR each:
     map newUpdateList item
     // ⚠ $exitUpdateRecord assignment is COMMENTED OUT in PHP
     //    so request_type always falls through to 1 (undefined var is empty)
     finalnewBasic.push(item)

7. return {
     status: true,
     messages: "Employement History",
     data: allemployement,       // array (possibly [])
     newUpdateList: finalnewBasic
   }
```

### SQL — list

```sql
-- get_company_experience_list (CI query builder; logical table names)
SELECT ue.*,
       ur.individual_id, ur.fname, ur.lname, ur.profile, ur.claim_status,
       ur.social_image, ur.slug AS user_slug, ur.id AS user_id,
       ur.on_notice, ur.on_immediate, ur.on_explore,
       et.name AS employement_name,
       dg.name AS designation_name,
       dp.name AS department_name,
       ur.slug
FROM user_experience ue
LEFT JOIN user ur ON ue.user = ur.id
LEFT JOIN employement_type et ON ue.employment_type = et.id
LEFT JOIN designation dg ON ue.designation = dg.id
LEFT JOIN department dp ON ue.department = dp.id
WHERE ue.company = :companyId
  AND ur.is_deleted = 0
  AND ue.is_deleted = 0
ORDER BY ue.id DESC;
```

```sql
-- get_basic_experience_update_list
SELECT uue.*,
       ds.name AS designation,
       ur.profile, ur.social_image, ur.fname, ur.lname, ur.slug AS user_slug,
       oldds.name AS old_designation,
       ue.salary AS old_salary,
       ur.individual_id,
       ue.lastReview
FROM user_update_experience uue
JOIN user_experience ue ON uue.experience_id = ue.id
LEFT JOIN designation ds ON uue.designation = ds.id
LEFT JOIN designation oldds ON ue.designation = oldds.id
LEFT JOIN user ur ON ue.user = ur.id
WHERE ue.company = :companyId
  AND ue.is_deleted = 0
  AND uue.is_deleted = 0;
```

```sql
-- get_update_experience (count of pending-ish update rows for experience)
SELECT COUNT(*)
FROM user_experience ue
INNER JOIN user_update_experience upx ON ue.user = upx.user
WHERE upx.experience_id = :experienceId;
-- ⚠ join is on user, not experience_id alone; any count > 0 → request_type 3
```

### Employment card (`data[]`) — **LOCKED KEYS**

| Key | Type | Source / notes |
|-----|------|----------------|
| `id` | number | `user_experience.id` |
| `employement_id` | number | **same as `id`** (typo key **employement_id**) |
| `profile` | string\|null | S3+profile or social_image |
| `userName` | string | `fname + ' ' + lname` (camel **N**) |
| `salary` | | experience |
| `employment_type` | string | `employement_type.name` or `''` |
| `designation` | string | designation name or `''` |
| `joining_date` / `worked_till_date` | | |
| `still_working` | number | 0/1 |
| `approved` | number | 0 pending / 1 approved / 2 reject (typical) |
| `skill` | string[] | names only from JSON skill ids |
| `description` | | |
| `document` | **string[]** | S3-prefixed certificate paths from CSV `certificate` field — **array**, not single URL |
| `salary_inhand` / `salary_mode` | | |
| `department` | string | department name or `''` |
| `claim_status` | 0\|1 | employee user claim_status coerced |
| `rating` | array | `get_rating(experienceId)` — list of review objects (see below), **not** `{avgRating}` |
| `employment_status` | string | `"complete"` or `"pending"` only |
| `slug` | | `ur.slug` (selected twice as slug / user_slug) |
| `user_slug` | | same slug column alias |
| `individual_id` | | |
| `status` | | `ue.status` |
| `is_verified` | boolean | `user_verified(ue.user)` |
| `lastReview` | number | `(int) ue.lastReview` or `0` |
| `updateHistory` | array | see nested history |
| `on_explore` / `on_immediate` / `on_notice` | 0\|1 | gated via `show_exploring(user_id, companyId)` |
| `request_type` | number | **3** if `get_update_experience` count > 0, else **1** |

### `rating[]` item shape (`get_rating`)

```json
{
  "id": 1,
  "approved": 1,
  "status": "complete",
  "doc": ["https://s3.../file.pdf"],
  "date": "2024-06-01 12:00:00",
  "link": "",
  "show_home": 0,
  "show_review": 1,
  "history": [],
  "skill_rating": [
    { "skill_id": 3, "name": "PHP", "rating": 4, "show_home": 0 }
  ],
  "rating": 4,
  "review": "Great work"
}
```

`status` inside rating item: `"complete"` if `approved == 1` else `"pending"`.

### `employment_status` (`get_employment_status`)

```text
latest user_experience_rating WHERE status=1 AND experience=:id ORDER BY id DESC
IF added_by == 1 → "complete"
ELSE → "pending"
```

Returns a **string**, not an object. (api-ai-document `{ "verified": true }` is wrong.)

### `updateHistory[]` item (`get_employment_history`)

Parent rows: `user_update_experience_history` where `experience_id` and `parent = 0`, order id DESC.

| Key | Notes |
|-----|-------|
| `type` | |
| `designation_name` | join |
| `worked_till_date` | |
| `salary` / `salary_inhand` / `salary_mode` | |
| `modify_date` | |
| `approved` | **boolean** — true if company reply row exists (`parent = history.id`) |
| `reply` | object of reply fields, or `{}` if no reply |

Reply keys when present: `type`, `designation_name`, `salary`, `salary_inhand`, `salary_mode`, `modify_date`, `worked_till_date`.

### `newUpdateList[]` — **LOCKED KEYS**

| Key | Source / notes |
|-----|----------------|
| `id` | `user_update_experience.id` (assigned twice in PHP) |
| `experience_id` | |
| `user` | employee user id |
| `salary` / `salary_inhand` / `salary_mode` | proposed values |
| `designation` | **name** string (joined), not id |
| `worked_till_date` | |
| `status` / `type` | update row |
| `create_date` / `modify_date` | |
| `profile` | S3 or social_image |
| `fname` / `lname` | separate (not `userName`) |
| `old_designation` | name from current experience designation |
| `old_salary` | current `ue.salary` |
| `is_verified` | `user_verified(user)` |
| `individual_id` | |
| `slug` | `user_slug` |
| `lastReview` | from experience `(int)` or 0 |
| `request_type` | **always 1** in live PHP (see bug magnet #5) |

### Success — **LOCKED** envelope

```json
{
  "status": true,
  "messages": "Employement History",
  "data": [
    {
      "id": 10,
      "profile": "https://s3.../p.jpg",
      "userName": "John Doe",
      "salary": "80000",
      "employment_type": "Full-time",
      "designation": "Software Engineer",
      "joining_date": "2024-01-15",
      "worked_till_date": null,
      "still_working": 1,
      "approved": 0,
      "skill": ["PHP", "Laravel"],
      "description": "...",
      "document": ["https://s3.../cert.pdf"],
      "salary_inhand": "70000",
      "salary_mode": "bank",
      "department": "Engineering",
      "claim_status": 0,
      "rating": [],
      "employment_status": "pending",
      "employement_id": 10,
      "slug": "john-doe",
      "individual_id": "IND-001",
      "status": 1,
      "is_verified": true,
      "user_slug": "john-doe",
      "lastReview": 0,
      "updateHistory": [],
      "on_explore": 0,
      "on_immediate": 0,
      "on_notice": 0,
      "request_type": 1
    }
  ],
  "newUpdateList": [
    {
      "id": 20,
      "experience_id": 10,
      "user": 55,
      "salary": "90000",
      "salary_inhand": "78000",
      "salary_mode": "bank",
      "designation": "Senior Engineer",
      "worked_till_date": null,
      "status": 0,
      "type": 1,
      "create_date": "2024-06-01 10:00:00",
      "modify_date": null,
      "profile": "https://s3.../p.jpg",
      "fname": "John",
      "lname": "Doe",
      "old_designation": "Software Engineer",
      "old_salary": "80000",
      "is_verified": true,
      "individual_id": "IND-001",
      "slug": "john-doe",
      "lastReview": 0,
      "request_type": 1
    }
  ]
}
```

Empty company: `data: []`, `newUpdateList: []`, still success messages.

### Error cases

```json
// 403
{ "status": false, "message": "<permission>" }

// catch
{ "status": false, "messages": "Access denied" }
```

> **Node bug magnet #5:** Computing `request_type` for `newUpdateList` from active update checks. Live PHP **never sets** `$exitUpdateRecord` (assignment commented) → **`request_type` is always `1`** on `newUpdateList`. Main `data[]` cards **do** set 3 vs 1 via `get_update_experience`.

> **Node bug magnet #6:** Trusting `api-ai-document` shapes for `rating` / `employment_status` / `document`. Live: `rating` is review **array**, `employment_status` is **`"complete"|"pending"` string**, `document` is **URL array**.

### Common Node mistakes (employment)

| Mistake | Symptom |
|---------|---------|
| Filter `approved=1` only | Pending verification list empty |
| Paginate like all-connection | FE expects full dump |
| `document` as string | FE map fails |
| `employment_status: { verified }` | Wrong type |
| Message `"Employment History"` | Must be **`Employement History`** |
| Path `/all-employment` | 404 — use **`all-employement`** |
| `userName` vs `username` | Connection uses `username`; employment uses **`userName`** |
| Skip `newUpdateList` top-level key | Basic salary/designation update queue missing |

---

## Side-by-side / do not confuse

| Client need | Call this | Not this |
|-------------|-----------|----------|
| Company “my people” current/past tabs | `GET company/all-connection` | all-employement (includes pending; different card) |
| Employment verification inbox / history | `GET company/all-employement` | dashboard `employementRequestList` (pending only) |
| Approve one employment | `PUT company/update-employement/:id` | — |
| Employee’s own employment list | `GET employee/all-employement` / `allEmployementNew` | company routes |
| Wishlist | `GET company/all-wishlist` | connection `in_wishlist` is read-only flag |
| Add connection | `POST company/add-connection` | — |

Related dashboard note: `company/dashboard` pending employments ≠ this full list — see `debug/company-allapplication-and-dashboard-endpoints.md`.

---

## Full common Node mistake matrix

| Mistake | Symptom |
|---------|---------|
| Wrong menu id (5 vs 6) | 403 on one screen only |
| `message` vs `messages` | Auth/permission clients break |
| S3 prefix on social_image | Double URL / broken image |
| Skip `user_verified` | `is_verified` wrong |
| Skip exploring gate | Notice/immediate badges leak to blocked viewers |
| Connection without `GROUP BY user` | Duplicate people per stint |
| Employment without rejected/pending | Ops cannot act on requests |
| Invent REST 404 for empty lists | PHP returns 200 + empty arrays |

---

## Minimal verification checklist

```bash
# Connections page 1
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Company: $CID" \
  "$BASE/wapi/company/all-connection?limit=10&offset=1" | jq '{
    status, messages,
    current_count: .data.current_count,
    past_count: .data.past_count,
    totals: {c:.data.currentEmployeeCount, p:.data.pastEmployeeCount},
    sample: .data.current[0] | {user, username, employee_status, in_wishlist, totalRating, userRating}
  }'

# Employments (typo path)
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Company: $CID" \
  "$BASE/wapi/company/all-employement" | jq '{
    status, messages,
    n: (.data|length),
    updates: (.newUpdateList|length),
    sample: .data[0] | {id, userName, approved, skill, document, employment_status, request_type, employement_id}
  }'
```

**Assert:**

1. Connection success: `messages === "Company Connection"`; employment: `"Employement History"`.
2. Connection: `offset=1` and `offset=0` both first page; `offset=2` second page.
3. Connection totals: `currentEmployeeCount` ≥ `current_count` when total > page size.
4. Connection current cards: `in_wishlist === false` always; past may be true.
5. Connection past never includes a `user` id present in `current` on same response.
6. Employment: `data` is array; top-level **`newUpdateList`** always present.
7. Employment: `document` is array; `employment_status` is string; `employement_id === id`.
8. Employment: includes `approved: 0` rows if pending exist (not only approved).
9. 403 uses **`message`**; catch path uses **`messages`: `"Access denied"`**.
10. No success path invents HTTP 4xx for empty data.

---

## Quick port recipe (Node)

```js
// --- all-connection ---
async function allConnection(req) {
  const companyId = req.id;
  if (req.user_type == 2) {
    const p = await checkMenuAccess(req.user_id, companyId, 5);
    if (!p.status) return res403({ status: false, message: p.message });
  }
  const limit = Number(req.query.limit || 10);
  const page = Number(req.query.offset || 0);
  const sqlOffset = page <= 1 ? 0 : page * limit - limit;
  const keyword = (req.query.keyword || '').trim();
  const sort_by = req.query.sort_by;

  const currentRows = await getAllCollections(companyId, keyword, sort_by, 1, limit, sqlOffset);
  const pastRows = await getAllCollections(companyId, keyword, sort_by, null, limit, sqlOffset);

  const ids = [];
  const current = [];
  for (const row of currentRows) {
    ids.push(row.id);
    current.push(await mapConnectionCard(row, companyId, { wishlist: false, includeWorkedTill: false }));
  }
  const past = [];
  for (const row of pastRows) {
    if (ids.includes(row.id)) continue;
    const wish = await fs('company_wishlist', { status: 1, company: companyId, user: row.id });
    past.push(await mapConnectionCard(row, companyId, {
      wishlist: !!wish,
      includeWorkedTill: true,
    }));
  }

  return {
    status: true,
    messages: 'Company Connection',
    data: {
      current_count: current.length,
      current,
      past_count: past.length,
      past,
      currentEmployeeCount: await getAllCollections(companyId, keyword, sort_by, 1), // count mode
      pastEmployeeCount: await getAllCollections(companyId, keyword, sort_by, null),
    },
  };
}

// --- all-employement ---
async function allEmployement(req) {
  const companyId = req.id;
  if (req.user_type == 2) {
    const p = await checkMenuAccess(req.user_id, companyId, 6);
    if (!p.status) return res403({ status: false, message: p.message });
  }
  const list = await get_company_experience_list(companyId);
  const data = [];
  for (const eval of list) {
    const skills = await get_skill(eval.skill); // → names[]
    const exitCount = await get_update_experience(eval.id);
    let on_explore = 0, on_immediate = 0, on_notice = 0;
    if (eval.on_explore) {
      on_explore = (await show_exploring(eval.user_id, companyId)) ? 1 : 0;
    }
    if (on_explore === 1) {
      on_immediate = eval.on_immediate ? 1 : 0;
      on_notice = eval.on_notice ? 1 : 0;
    }
    data.push({
      id: eval.id,
      employement_id: eval.id,
      profile: eval.profile ? S3_PREFIX + eval.profile : eval.social_image,
      userName: `${eval.fname} ${eval.lname}`,
      // ... remaining locked keys ...
      skill: skills.map(s => s.name),
      document: get_certificate(eval.certificate), // string[]
      rating: await get_rating(eval.id),
      employment_status: await get_employment_status(eval.id), // 'complete'|'pending'
      is_verified: await user_verified(eval.user),
      updateHistory: await get_employment_history(eval.id),
      on_explore, on_immediate, on_notice,
      request_type: exitCount ? 3 : 1,
      lastReview: eval.lastReview != null ? Number(eval.lastReview) : 0,
    });
  }

  const updates = await get_basic_experience_update_list(companyId);
  const newUpdateList = updates.map(value => ({
    id: value.id,
    experience_id: value.experience_id,
    user: value.user,
    // ... locked keys ...
    request_type: 1, // match PHP dead branch
  }));

  return {
    status: true,
    messages: 'Employement History',
    data,
    newUpdateList,
  };
}
```

---

## Related endpoints

| Area | Route | Debug / notes |
|------|-------|---------------|
| Company dashboard | `GET company/dashboard` | `debug/company-allapplication-and-dashboard-endpoints.md` |
| Approve employment | `PUT company/update-employement/:id` | `CompanyApi::updateEmployement` |
| Applications | `GET company/allapplication` | same company-allapplication debug file |
| Employee employment lists | `employee/all-employement`, `allEmployementNew` | different DTOs |
| Exploring privacy | `POST employee/save-exploring` | `debug/employee-save-exploring-endpoint.md` |
| High-level (secondary) | `api-ai-document/company/company-endpoints.md` §4–5 | Prefer **this** file when shapes conflict |

---

## Response key freeze (frontend)

### all-connection envelope
`status`, `messages`, `data`

### all-connection `data`
`current_count`, `current`, `past_count`, `past`, `currentEmployeeCount`, `pastEmployeeCount`

### all-connection card
`user`, `profile`, `username`, `contact_person`, `email`, `designation`, `employee_status`, `connectiondate`, `approved`, `experience_id`, `linkdin`, `youtube`, `instagram`, `facebook`, `individual_id`, `is_verified`, `slug`, `profile_description`, `dob`, `present_address`, `joining_date`, `worked_till_date` (past), `last_modify_date`, `account_create_date`, `totalRating`, `userRating`, `in_wishlist`, `on_explore`, `on_immediate`, `on_notice`

### all-employement envelope
`status`, `messages`, `data`, `newUpdateList`

### all-employement `data[]`
`id`, `profile`, `userName`, `salary`, `employment_type`, `designation`, `joining_date`, `worked_till_date`, `still_working`, `approved`, `skill`, `description`, `document`, `salary_inhand`, `salary_mode`, `department`, `claim_status`, `rating`, `employment_status`, `employement_id`, `slug`, `individual_id`, `status`, `is_verified`, `user_slug`, `lastReview`, `updateHistory`, `on_explore`, `on_immediate`, `on_notice`, `request_type`

### newUpdateList[]
`id`, `experience_id`, `user`, `salary`, `salary_inhand`, `salary_mode`, `designation`, `worked_till_date`, `status`, `type`, `create_date`, `modify_date`, `profile`, `fname`, `lname`, `old_designation`, `old_salary`, `is_verified`, `individual_id`, `slug`, `lastReview`, `request_type`

### Frozen strings
- `"Company Connection"`
- `"Employement History"`
- `"Access denied"`
- `"Current"` / `"Past"`
- `"complete"` / `"pending"` (employment_status and rating.status)

---

*Generated from PHP source in this repo (`CompanyApi::allConnection` ~1716, `CompanyApi::companyWiseEmploymentDetails` ~1320, models cited above). When PHP and `api-ai-document/company/company-endpoints.md` disagree, trust this debug guide and the controller lines cited above.*
