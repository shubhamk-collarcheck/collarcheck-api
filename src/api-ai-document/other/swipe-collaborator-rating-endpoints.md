
# Swipe, Collaborator, Clarity & Rating Endpoints — Routes batch 29-01-2026

AI porting guide for the **NEW ROUTES (29-01-2026)** block in `Routes.php` (~486–506). Target: Node/other stack returns the **same JSON shapes and message strings** so web/mobile clients keep working.

**Base path:** `/wapi` (routes registered as full `wapi/...` paths)  
**Content-Type:** `application/json`  
**Auth:** `Authorization: Bearer <jwt>` when marked JWT; acting user = `$this->request->id`  
**Company context:** `X-Company: {company_id}` → `$this->request->id` = company; original JWT user in `$this->request->user_id`  
**HTTP:** Almost always **200** with `status: true|false` (business errors are not 4xx). Auth filter failures are **401**.

> Side effects (SQS email / push / WhatsApp) must **not** change the response body.

---

## Routes Summary

| # | Method | Route | Handler | Auth | Purpose |
|---|--------|-------|---------|------|---------|
| 1 | PATCH | `swipe-number` | `common\SwipeController::swipe_number` | JWT | Swap primary ↔ secondary phone |
| 2 | PATCH | `alternate-empty` | `common\SwipeController::alternate_empty` | JWT | Clear alternate phone or email |
| 3 | GET | `clarity` | `module\ClarityControlller::clarity` | Public | Fetch MS Clarity insights + save row |
| 4 | POST | `collaborator-request` | `common\CollaboratorController::collaborator_request` | JWT (company) | Sync job collaborators set |
| 5 | PATCH | `accept-colloborator/:id` | `common\CollaboratorController::accept_collaborator` | JWT | Accept collaborator invite |
| 6 | GET | `collaborator-list` | `common\CollaboratorController::collaborator_list` | JWT | Jobs I collaborate on (by job status) |
| 7 | GET | `job-collaborator-list` | `common\CollaboratorController::job_collaborator_list` | JWT (company) | People on a job |
| 8 | GET | `get_question` | `module\ChatSupport::get_question` | Public | Chat-support FAQ list |
| 9 | DELETE | `delete-email-domains/:id` | `CompanyApi::deleteCompanyEmailDomain` | JWT (company) | Soft-delete domain/email row |
| 10 | GET | `user-highest-level` | `Cronjob::user_highest_level` | Public | Recompute `user_levels` (cron) |
| 11 | POST | `employee/add-skill-rating` | `RatingController::addSkillRating` | JWT | Employee add review + skill ratings |
| 12 | POST | `employee/add-skill-rating/:id` | `RatingController::addSkillRating/$1` | JWT | Employee update review |
| 13 | GET | `edit-rating-list/:id` | `RatingController::editReviewRating` | JWT | Load review for edit form |
| 14 | GET | `show-rating` | `RatingController::showProfileRating` | JWT | Profile ratings by `type` |
| 15 | POST | `update-show-profile-rating` | `RatingController::updateShowProfileRating` | JWT | Set show_home flags |
| 16 | POST | `company/add-skill-rating` | `RatingController::addCompanyReview` | JWT (company) | Company add review |
| 17 | POST | `company/add-skill-rating/:id` | `RatingController::addCompanyReview/$1` | JWT (company) | Company update review |
| 18 | GET | `rating-average` | `RatingController::RatingAverage` | JWT | Designation score payload |

**Count:** 18 routes.

**Spelling preserved from PHP (do not “fix” in routes):**
- Class `ClarityControlller` (triple `l`)
- Path `accept-colloborator` (missing `a`)
- Success message `Colloborator list`

---

## Global response quirks

| Key / shape | Where |
|-------------|--------|
| `message` (singular) | swipe, alternate-empty, collaborator*, clarity, delete-email-domains, many rating **errors**, `update-show-profile-rating` success |
| `messages` (plural) | employee/company **add-skill-rating** success; several rating errors; catch `"Someting went wrong!"` |
| `error` | clarity curl failure only |
| `data` | list endpoints; edit-rating-list; show-rating |
| `designation_score` | rating-average success (**not** under `data`) |
| No message key | `get_question` success (`status` + `data` only) |
| Bare `true` | `user-highest-level` (not a JSON object) |

Pagination on collaborator lists: query `offset` is a **page number** (`page <= 1 → SQL 0`, else `page * limit - limit`). Same pattern as other docs (`remaining-misc-crud-endpoints.md`, `general-auth-endpoints.md`).

---

# 1. PATCH `/wapi/swipe-number`

### Auth
JWT.

### Handler
`common\SwipeController::swipe_number`

### Request
None. Acts on `$this->request->id`.

### Logic
1. Load `user` where `id = actingUser`, `is_deleted = 0`, `status = 1`. Missing → `"User Detail not found!"`.
2. Require **both** channels valid:
   - primary: non-empty `phone` AND `phone_verified == 1`
   - secondary: non-empty `second_phone` AND `second_phone_verify == 1`
3. Fail if either invalid → `"Check primary or secondary phone number must be provided and verified."`
4. Swap values: `phone = second_phone`, `second_phone = phone`.  
   **Verification flags are not swapped.**

### Success
```json
{ "status": true, "message": "Number Swipe successfully" }
```

### Errors
```json
{ "status": false, "message": "User Detail not found!" }
```
```json
{ "status": false, "message": "Check primary or secondary phone number must be provided and verified." }
```
```json
{ "status": false, "message": "Something went wrong!" }
```
```json
{ "status": false, "messages": "Someting went wrong!" }
```

### Porting notes
- Success uses **`message`**, not `messages`.
- Catch block typo: `Someting` (missing `h`).

---

# 2. PATCH `/wapi/alternate-empty`

### Auth
JWT.

### Handler
`common\SwipeController::alternate_empty`

### Request body
```json
{ "type": "phone" }
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| type | string | yes | `"phone"` or `"email"` |

### Logic
1. User must exist (same as swipe).
2. Empty `type` → `"type is required!."` (period after `!`).
3. `type == "phone"` and `second_phone` set → clear `second_phone`, set `second_phone_verify = 0`.
4. `type == "email"` and `email_alternate` set → clear `email_alternate`, set `email_alternate_verify = 0`.
5. Does **not** clear primary phone/email.
6. If no update ran → `"Nothing to update!"`.

### Success
```json
{ "status": true, "message": "Update successfully" }
```

### Errors
```json
{ "status": false, "message": "User Detail not found!" }
```
```json
{ "status": false, "message": "type is required!." }
```
```json
{ "status": false, "message": "Nothing to update!" }
```
```json
{ "status": false, "messages": "Someting went wrong!" }
```

---

# 3. GET `/wapi/clarity`

### Auth
Public.

### Handler
`module\ClarityControlller::clarity` (class name typo: Controlller).

### Query
| Param | Required | Notes |
|-------|----------|-------|
| numOfDays | forwarded | passed to Microsoft Clarity export API |

### Logic
1. `GET https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=...`
2. Headers: `Authorization: Bearer {CLARITY_TOKEN}`, `Accept: application/json`
3. Curl error → `{ "status": false, "error": "<curl message>" }` (key is **`error`**)
4. Insert into `clarity`: `{ result: <raw response string>, create_date: now }`
5. Client response reflects **DB insert only** — does **not** return Clarity payload

### Success
```json
{ "status": true, "message": "record save success" }
```

### Errors
```json
{ "status": false, "error": "..." }
```
```json
{ "status": false, "message": "record not saved" }
```

### Porting notes
- Env: `CLARITY_TOKEN`
- Do not proxy MS JSON as the API body

---

# 4. POST `/wapi/collaborator-request`

### Auth
JWT. **`$this->request->id` = company_id** (company context / `X-Company`).

### Handler
`common\CollaboratorController::collaborator_request`

### Request body
```json
{
  "job_id": 123,
  "user_id": [55, 66, 77]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| job_id | int | yes | CI label `Job Id` |
| user_id | int[] | no (default `[]`) | Final collaborator user ids for this job |

### Logic (full set sync)
1. Validate `job_id`.
2. `invited_by = request.user_id` (JWT user, **not** company id).
3. `company_id = request.id`.
4. Load existing `job_collaborators` for `(company_id, job_id)`.
5. `remainId = oldUserIds − newUserIds` → **hard-delete** those rows.
6. For each id in `user_id`: insert if missing; notification on insert; email + WhatsApp in loop.
7. Company-side email/WhatsApp with distinct collaborator count.
8. Always success after validation (empty `user_id` removes all).

**Table `job_collaborators` write:** `invited_by`, `job_id`, `company_id`, `user_id`, `created_at`, `updated_at`. Accept later sets `status = 1`.

### Success
```json
{ "status": true, "message": "collaborators saved successfully!" }
```

### Errors
```json
{ "status": false, "message": "The Job Id field is required." }
```
```json
{ "status": false, "messages": "Someting went wrong!" }
```

### Porting notes
- Not append-only: must delete removed users.
- Body key is `user_id` (array), not `users` / `collaborators`.

---

# 5. PATCH `/wapi/accept-colloborator/:id`

> Path is **`accept-colloborator`** (typo). Path `:id` = **`job_collaborators.id`** (PK), not user id.

### Auth
JWT (invitee / collaborator user).

### Handler
`common\CollaboratorController::accept_collaborator`

### Logic
1. Find row: `id = :id`, `user_id = request.id`, `is_deleted = 0` → else `"Invalid collaborators request"`.
2. `UPDATE job_collaborators SET status = 1 WHERE id = :id`.

### Success
```json
{ "status": true, "message": "Accept successfully!" }
```

### Errors
```json
{ "status": false, "message": "Invalid collaborators request" }
```
```json
{ "status": false, "message": "Something went wrong!" }
```
```json
{ "status": false, "messages": "Someting went wrong!" }
```

---

# 6. GET `/wapi/collaborator-list`

### Auth
JWT. Acting user is the **collaborator** (`jc.user_id = request.id`).

### Handler
`common\CollaboratorController::collaborator_list` → `CollaboratorModel::get_collaborator_list`

### Query
| Param | Default | Notes |
|-------|---------|-------|
| limit | 20 | page size |
| offset | 0 | **page number** (see global pagination) |

### Success
```json
{
  "status": true,
  "message": "Colloborator list",
  "data": {
    "draftJobs": [],
    "publishJobs": [],
    "cancelJobs": [],
    "draftJobsCounts": 0,
    "publishJobsCounts": 0,
    "cancelJobsCounts": 0
  }
}
```

| Key | `company_job.status` | Type |
|-----|----------------------|------|
| draftJobs | 3 | array of job cards |
| publishJobs | 1 | array |
| cancelJobs | 2 | array |
| *Counts | same filters, no limit | number |

### Job card fields
| Key | Source |
|-----|--------|
| id | `company_job.id` |
| job_title, slug, company, urgent, vacancy, create_date, status | job |
| city_name, state_name, country_name | joins |
| industry_name, department_name, experience_name, role_type_name, designation_name | joins |
| company_name | `user.full_name` |
| profile | `S3_PREFIX + profile` or null |
| social_image | |
| companyId, company_slug, individual_id | company user |
| job_mode_name, salary_name | joins |
| applicationCount | COUNT(application) |

Filters: `jc.is_deleted = 0`, `cj.is_deleted = 0`, group by job, order `jc.created_at DESC`.

### Errors
```json
{ "status": false, "messages": "Someting went wrong!" }
```

---

# 7. GET `/wapi/job-collaborator-list`

### Auth
JWT. Acting user is **company** (`jc.company_id = request.id`).

### Handler
`common\CollaboratorController::job_collaborator_list`

### Params
| Field | Where | Notes |
|-------|-------|-------|
| job_id | query/body (`getVar`) | required for useful results |
| limit | query | default 20 |
| offset | query | page number |

### Success
```json
{
  "status": true,
  "message": "Colloborator list",
  "data": {
    "list": [
      {
        "id": 55,
        "full_name": "Jane Doe",
        "slug": "jane-doe",
        "individual_id": "CC123",
        "profile": "https://cdn.example.com/p.jpg",
        "designation_name": "Engineer"
      }
    ],
    "totalCount": 3
  }
}
```

| Key | Notes |
|-----|-------|
| list[].id | **user id** (`ur.id`), not `job_collaborators.id` |
| profile | `S3_PREFIX + profile` else `social_image` |
| totalCount | count without limit |

### Porting notes
- Accept uses collaborator-row PK; this list returns user ids — FE uses different ids per screen.

---

# 8. GET `/wapi/get_question`

### Auth
Public.

### Handler
`module\ChatSupport::get_question`

### Logic
`SELECT * FROM chat_support WHERE status = 1`, map each row to `{ type, question, answer }`.

### Success
```json
{
  "status": true,
  "data": [
    {
      "type": "faq",
      "question": "How do I reset password?",
      "answer": "Go to settings..."
    }
  ]
}
```

> No `message` / `messages` on success.

### Errors
```json
{ "status": false, "messages": "<exception message>" }
```

### Porting notes
- Distinct from `GET /wapi/faqs` (`new-routes-endpoints.md` / ModuleController).

---

# 9. DELETE `/wapi/delete-email-domains/:id`

### Auth
JWT company (`request.id = company`).

### Handler
`CompanyApi::deleteCompanyEmailDomain`

### Path
`:id` = domain/email row id. Lookup: `user_domains` where `id`, `user_id = company`, `is_deleted = 0`. Updates often use table name **`cyb_user_domains`**.

### Logic

**Case A — row has `email`:**
1. Count verified active emails for company.
2. Deleting last verified email → `"At least one verified email is required"`.
3. Soft-delete: `is_deleted = 1`, `is_verified = 0`.
4. Unverify related auto domain (`is_email_based = 1` for that email’s domain).
5. Success message: `"Email deleted successfully"`.

**Case B — row has `domain`:**
1. Soft-delete domain row.
2. Soft-delete related emails whose `@domain` matches.
3. Notify linked employees (clear `user_experience.work_email`) + company SQS email/WhatsApp.
4. Success message: `"Domain deleted successfully"`.  
   Legacy quirk: failure branch may still return `status: true` with `"Something went wrong!"`.

### Success
```json
{ "status": true, "message": "Email deleted successfully" }
```
```json
{ "status": true, "message": "Domain deleted successfully" }
```

### Errors
```json
{ "status": false, "message": "Record not found" }
```
```json
{ "status": false, "message": "At least one verified email is required" }
```
```json
{ "status": false, "message": "<exception>" }
```

---

# 10. GET `/wapi/user-highest-level`

### Auth
Public (no Auth filter). Treat as ops/cron; protect in Node if exposed.

### Handler
`Cronjob::user_highest_level`

### Logic
1. Distinct `user` from `user_experience` where `is_deleted = 0`.
2. Per user, max verification level 1–4 across employments via `UserModel::get_verification_process_details`.
3. Upsert `user_levels` (`user`, `level`) — insertBatch / updateBatch on key `user`.
4. PHP `return true` → body is bare boolean, **not** a JSON object.

### Success
```text
true
```

### Porting notes
- Do not wrap as `{ "status": true }` unless product intentionally changes clients.
- Heavy unauthenticated job — consider internal secret / cron-only in Node.

---

# Rating & review (shared model)

| Table | Role |
|-------|------|
| `user_experience_rating` | review text + `approved`, `show_home`, `show_review`, `expiry`, … |
| `skill_rating` | scores: `review_id`, `experience_id`, `user_id`, `skill_id`, `rating`, `show_home` |
| `user_experience_rating_history` / `skill_rating_history` | company edit history |
| `skill` | master (auto-create free-text names) |

---

# 11. POST `/wapi/employee/add-skill-rating`

# 12. POST `/wapi/employee/add-skill-rating/:id`

### Auth
JWT employee (`request.id` = employee).

### Handler
`RatingController::addSkillRating($id = false)`  
- no path id → **insert**  
- `/:id` → **update** (`user_experience_rating.id`)

### Request body
```json
{
  "experience_id": 900,
  "review": "Great team",
  "skill_id": [12, "Leadership"],
  "rating": [4, 5]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| review | string | conditional | text |
| skill_id | array or JSON string | conditional | each item: skill PK **or** name |
| rating | array | conditional | parallel to `skill_id` |
| experience_id / experience | int | for company link | loads `user_experience` |

**Custom validation:** if `review` empty **and** (`skill_id` empty **or** `rating` empty) →  
`"Either review is required OR both skill and rating are required"` (key **`message`**).

### Logic
**Insert:** save company from experience + review (xss); insert `user_experience_rating`; upsert `skill_rating` by array index; notify company + SQS.  
**Update:** if `approved == 1` block; else update review + re-upsert skills.

**Skill upsert rules:**
- Decode JSON string arrays
- Skip empty skill or empty rating at same index
- Int → skill PK; string → find/create skill (`word_limiter` 7 words)
- Existing rows ordered by `id ASC`; match by **index**, not skill_id equality

### Success
```json
{ "status": true, "messages": "Review added successfully" }
```
```json
{ "status": true, "messages": "Review updated successfully" }
```

### Errors
```json
{ "status": false, "message": "Either review is required OR both skill and rating are required" }
```
```json
{ "status": false, "messages": "Company have approved your rating, can't change review" }
```
```json
{ "status": false, "messages": "Review not added!!" }
```
```json
{ "status": false, "messages": "Access denied" }
```

### Porting notes
- Success uses **`messages`** (plural); either-or validation uses **`message`** (singular).

---

# 13. GET `/wapi/edit-rating-list/:id`

### Auth
JWT.

### Handler
`RatingController::editReviewRating`  
Path `:id` = `user_experience_rating.id` (`is_deleted = 0`).

### Success
```json
{
  "status": true,
  "data": {
    "review_id": 101,
    "experience": 900,
    "review": "Great team",
    "ratingSkills": [
      { "id": 12, "name": "React", "rating": 4 }
    ]
  }
}
```

| Key | Notes |
|-----|-------|
| ratingSkills[].id | **`skill_id`** (not `skill_rating` row id) |
| ratingSkills[].rating | cast to **int** |

No `messages` on success. Skills from `RatingModel::getReviewsWithSkills`.

### Errors
```json
{ "status": false, "message": "Review not found" }
```
```json
{ "status": false, "messages": "Access denied" }
```

---

# 14. GET `/wapi/show-rating`

### Auth
JWT.

### Handler
`RatingController::showProfileRating`

### Query / body (`getVar`)
| Field | Required | Values |
|-------|----------|--------|
| experience_id | yes | employment id |
| type | strongly recommended | `"show"` \| `"public"` \| `"all"` |

### Errors
```json
{ "status": false, "message": "Experience ID required" }
```
```json
{ "status": false, "message": "Experience details not found!!" }
```
```json
{ "status": false, "message": "No data found" }
```
```json
{ "status": false, "message": "Access denied" }
```

### A) `type=show` — flat editor payload
```json
{
  "status": true,
  "data": {
    "review": [
      {
        "review_id": 101,
        "review": "text",
        "approved": 1,
        "show_home": 0
      }
    ],
    "skill_rating": [
      {
        "skill_rating_id": 55,
        "skill_id": 12,
        "name": "React",
        "rating": 4,
        "show_home": 1
      }
    ]
  }
}
```

- Reviews: `approved = 1`, `is_deleted = 0` for experience
- `skill_rating_id` = **`skill_rating.id`** (for update-show-profile-rating)

### B) `type=public` — profile visibility
```json
{
  "status": true,
  "data": [
    {
      "id": 101,
      "review": "visible text or empty",
      "approved": 1,
      "create_date": "2025-01-01 10:00:00",
      "show_home": 1,
      "skill_rating": [
        {
          "skill_id": 12,
          "name": "React",
          "rating": 4,
          "show_home": 1
        }
      ]
    }
  ]
}
```

Rules:
- Include only skills with `show_home == 1`
- Skip entry if review not shown and no visible skills
- Hidden review forces `review` to `""` while skills may still appear

### C) `type=all` — grouped list
```json
{
  "status": true,
  "data": [
    {
      "id": 101,
      "review": "text",
      "approved": 1,
      "create_date": "...",
      "show_home": 0,
      "skill_rating": [
        {
          "skill_id": 12,
          "name": "React",
          "rating": 4,
          "show_home": 0
        }
      ]
    }
  ]
}
```

If viewer ≠ experience owner → filter reviews with `show_home = 1` and `approved = 1`.

### Porting notes
- Three different shapes — do not unify.
- `type=show` uses `skill_rating_id`; public/all use nested `skill_id` only.

---

# 15. POST `/wapi/update-show-profile-rating`

### Auth
JWT.

### Handler
`RatingController::updateShowProfileRating`

### Request body
```json
{
  "experience_id": 900,
  "review_id": [101, 102],
  "skill_rating_id": [55, 56]
}
```

| Field | Type | Notes |
|-------|------|-------|
| experience_id | int | reset scope |
| review_id | array or CSV | `user_experience_rating.id` to show |
| skill_rating_id | array or CSV | `skill_rating.id` to show |

### Logic
1. Reset all for experience: `skill_rating.show_home = 0`, `user_experience_rating.show_home = 0`.
2. Set `show_home = 1` for listed review ids.
3. Set `show_home = 1` for listed skill_rating ids.

**Replace selection**, not toggle.

### Success
```json
{ "status": true, "message": "Updated successfully" }
```

### Errors
```json
{ "status": false, "messages": "Access denied" }
```

---

# 16. POST `/wapi/company/add-skill-rating`

# 17. POST `/wapi/company/add-skill-rating/:id`

### Auth
JWT. `request.id` = **company**, `request.user_id` = actor.

### Handler
`RatingController::addCompanyReview($id = false)`

### Request body
```json
{
  "experience_id": 900,
  "review": "Solid performer",
  "skill_id": [12],
  "rating": [5],
  "show_review": "1",
  "link": "https://..."
}
```

| Field | Required | Notes |
|-------|----------|-------|
| experience_id / experience | **yes** | else `"Experience is required"` |
| review | conditional | same either-or rule as employee |
| skill_id / rating | conditional | arrays (JSON string ok) |
| show_review | no | `"1"` → 1 else 0 |
| link | no | insert only |

### Company-only rules

| Condition | Response (`messages` unless noted) |
|-----------|-------------------------------------|
| Missing experience | `Experience is required` |
| Invalid experience | `Invalid experience` |
| Insert when not still working and review exists | `Review already exists` |
| Update missing review | `Review not found` |
| Ex-employee + history count ≥ 3 | `No More Edits allowed` |
| Past `expiry` | `Can't modify after 72 hours` |
| Either-or validation fail | **`message`**: Either review is required OR both skill and rating are required |

### Insert specifics
- `approved = 1`, `added_by = 1`, `status = 1`, `rating = 0`, `expiry = now + 72h`
- Clear `user_experience.lastReview` if set
- Write rating + skill history rows

### Update specifics
- `approved = 1`; set first `expiry = +72h` if empty
- History + `skill_rating_history`

### Success
```json
{ "status": true, "messages": "Review added successfully" }
```
```json
{ "status": true, "messages": "Review updated successfully" }
```

### Errors
```json
{ "status": false, "message": "Either review is required OR both skill and rating are required" }
```
```json
{ "status": false, "messages": "Experience is required" }
```
```json
{ "status": false, "messages": "Invalid experience" }
```
```json
{ "status": false, "messages": "Review already exists" }
```
```json
{ "status": false, "messages": "Review not found" }
```
```json
{ "status": false, "messages": "No More Edits allowed" }
```
```json
{ "status": false, "messages": "Can't modify after 72 hours" }
```
```json
{ "status": false, "messages": "<exception>" }
```

---

# 18. GET `/wapi/rating-average`

### Auth
JWT (`request.id` = user).

### Handler
`RatingController::RatingAverage` → helper `getAverageSessionData($user_id, $experience_id)` in `general_helper.php`.

### Success
```json
{
  "status": true,
  "designation_score": {}
}
```

| Key | Notes |
|-----|-------|
| designation_score | plain array from `calculateDesignationScore` |
| **no** `data` | |
| **no** `messages` | on success |

### PHP quirk (must document for Node)
```php
getAverageSessionData($user_id, 3752); // experience_id HARDCODED
```

Parity options:
1. Match hardcoded `3752` for wire-identical behavior, or  
2. Accept `experience_id` query and diverge intentionally (only if product agrees).

Helper uses session windows, criteria averages, and `rating_weight` (`weight_type` 1 and 2).

### Errors
```json
{ "status": false, "message": "User ID required" }
```
```json
{ "status": false, "message": "<exception>" }
```

---

## Response key freeze (frontend)

### Mutations (message/messages only)
| Endpoint | Success keys |
|----------|--------------|
| swipe-number | `status`, `message` |
| alternate-empty | `status`, `message` |
| clarity | `status`, `message` |
| collaborator-request / accept | `status`, `message` |
| delete-email-domains | `status`, `message` |
| employee/company add-skill-rating | `status`, `messages` |
| update-show-profile-rating | `status`, `message` |

### Lists / reads
| Endpoint | Keys |
|----------|------|
| collaborator-list | `data.draftJobs`, `publishJobs`, `cancelJobs`, `draftJobsCounts`, `publishJobsCounts`, `cancelJobsCounts` |
| job-collaborator-list | `data.list`, `data.totalCount` |
| get_question | `data[]` → `type`, `question`, `answer` |
| edit-rating-list | `data.review_id`, `experience`, `review`, `ratingSkills[]` |
| show-rating `show` | `data.review[]`, `data.skill_rating[]` |
| show-rating `public`/`all` | `data[]` + nested `skill_rating[]` |
| rating-average | `designation_score` |
| user-highest-level | bare `true` |

---

## Node implementation checklist

1. Preserve **`message` vs `messages`** per endpoint (do not normalize).
2. Keep route typos: `accept-colloborator`, class/file `ClarityControlller`.
3. Collaborator request is a **full set sync** of `user_id[]`.
4. Accept path id = `job_collaborators.id`; job-collaborator-list `list[].id` = **user** id.
5. `show-rating` must branch on `type` into three shapes.
6. `update-show-profile-rating` resets all `show_home` then sets selected ids.
7. `user-highest-level` returns literal `true`.
8. `rating-average` uses key `designation_score`; note hardcoded experience `3752`.
9. Pagination: `offset` is page number.
10. Side effects optional; **body must not depend on them**.

---

## Related docs

| Topic | File |
|-------|------|
| Earlier “new routes” batch (splash, FAQ, hired, resume) | `new-routes-endpoints.md` |
| Employee profile reviews (older review APIs) | `employee-profile-review-endpoints.md` |
| Company document/review | `company/company-document-review-endpoints.md` |
| Follow / multi ops | `remaining-misc-crud-endpoints.md` |
| Module groups/permissions | `module-user-group-permission-endpoints.md` |

---

## Source map

| File | Methods |
|------|---------|
| `app/Controllers/common/SwipeController.php` | `swipe_number`, `alternate_empty` |
| `app/Controllers/common/CollaboratorController.php` | collaborator_* |
| `app/Models/common/CollaboratorModel.php` | list queries |
| `app/Controllers/module/ClarityControlller.php` | `clarity` |
| `app/Controllers/module/ChatSupport.php` | `get_question` |
| `app/Controllers/CompanyApi.php` | `deleteCompanyEmailDomain` |
| `app/Controllers/Cronjob.php` | `user_highest_level` |
| `app/Controllers/RatingController.php` | all rating endpoints |
| `app/Models/RatingModel.php` | skill/review joins |
| `app/Helpers/general_helper.php` | `getAverageSessionData` |
| `app/Config/Routes.php` | ~486–506 |
