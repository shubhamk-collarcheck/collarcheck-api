
# Employee Signup / Registration Endpoints

Porting guide for the **modern multi-step employee registration** flow. Target stack should return the **same JSON shapes and message strings** so web/mobile clients keep working.

| Route | Handler | Auth |
|-------|---------|------|
| `POST /wapi/employee/signup` | `ModuleController::indivisualSignup` | Public |
| `POST /wapi/employee/final-signup` | `ModuleController::final_Signup` | Public* |
| `POST /wapi/employee/upload-resume` | `ModuleController::upload_resume` | Public* |

\* Not behind the `Auth` filter. Identity is passed in the body as `user_id` (+ `user_token` for internal proxy calls on final-signup).

**Source:** `app/Controllers/ModuleController.php`  
**Routes:** `app/Config/Routes.php`

**Related:**

- Full auth catalog: `login-registration-endpoints.md`
- Session payload shape: `GeneralApi::getStatitcs` (see login doc)
- MSG91 OTP (pre-signup verify): `msg91-sms.md`
- Company add-company / add-job (proxied by final-signup): `company/` docs

---

## Recommended client flow

```
1. POST /wapi/login              { uniqueId: phone|email, checkUnique: 1 }   // signup mode OTP
2. POST /wapi/login/verify-otp   { uniqueId, otp }                            // verify only (or with login)
3. POST /wapi/employee/signup    { fname, lname, email, phone, phone_verified?, ... }
      → data.loginauth, data.id
4. POST /wapi/employee/final-signup
      { user_id, user_token, user_register_type, ... }                        // step-2 onboarding
5. Optional: POST /wapi/employee/upload-resume
      { user_id, resume: file }                                               // if resume not sent in final-signup
```

**HTTP:** Almost always **200** with `status: true|false` (business errors are not 4xx).  
**Key naming:** These endpoints use **`messages`** (plural), not `message`.

---

## Shared: success session payload

Successful **signup** returns `data` from `GeneralApi::getStatitcs(userId)`.

Critical fields for clients:

| Field | Notes |
|-------|--------|
| `loginauth` | Session token → later `Authorization: Bearer …` |
| `id` | Numeric user id → use as `user_id` on step 2 |
| `user_type` | String `"user"` for employees |
| `individual_id` | e.g. `CCE123456` |
| `slug` | Profile URL slug |
| `profile_percentage`, `incomplete`, etc. | Onboarding UI |

`final-signup` returns the same stats object **plus**:

| Extra key | Type | Notes |
|-----------|------|--------|
| `companyId` | int | Created/updated company id, or `0` |
| `jobId` | int | Created job id, or `0` |

Token generation: `FrontModel::generateToken($userId)` writes `user.token` / `user.login_time`.

---

# 1. POST `/wapi/employee/signup`

**Handler:** `ModuleController::indivisualSignup`  
**Auth:** Public  
**Purpose:** Step 1 — create employee (`user_type = 1`), settings, token, optional company link, welcome emails/WhatsApp.

### Request body

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `fname` | string | **Yes** | First name (`escxss`) |
| `lname` | string | No | Last name (rule: `trim` only) |
| `email` | string | **Yes** | Lowercased; rules: `required\|valid_email\|user_email[]` (unique vs primary/alternate) |
| `phone` | string | **Yes** | Rules: `required\|min_length[10]\|max_length[15]\|user_mobile[]` (unique vs phone/second_phone) |
| `country` | any | No | Stored on `user` |
| `state` | any | No | Stored on `user`; also used when creating free-text city |
| `city` | int or string | No | If integer → city id. If string → find/create `cities` row (`user_defined=1`) |
| `dob` | string | No | |
| `gender` | any | No | |
| `work_status` | any | No | Empty → `NULL` |
| `method_type` | string | No | Default `"Website"` |
| `referral_code` | string | No | Must match existing `user.individual_id` (`is_deleted=0`) |
| `company_id` | int | No | Explicit company to link via `user_relation` |
| `phone_verified` | 0/1 | No | Stored as `1` if truthy, else `0` |
| `email_verified` | 0/1 | No | Stored as `1` if truthy, else `0` |

Content-Type: `application/json` or form fields.

### Validation errors

```json
{ "status": false, "messages": "The First Name field is required.,..." }
```

Messages are `implode(',', $validator->getErrors())`.

### Logic (ordered)

1. **Validate** required/unique rules.
2. Build `$save` row for table `user`:
   - `user_type = 1`
   - `register_type = 'form'` (or **`qa`** if `bypass(phone|email)` matches test list)
   - `accept_term = true`
   - `phone_verified` / `email_verified` from body
3. **Referral:** if `referral_code` set and no matching `user.individual_id` →  
   `{ "status": false, "messages": "Invalid refferal code!" }`  
   (spelling **refferal** is intentional for client parity)
4. **City:** integer id as-is; string name → lookup/insert `cities` with `user_defined=1`, `status=1`, optional `state`.
5. **Insert** `user`.
6. On insert success:
   - `createDefaultUserGroups(email)` (helper)
   - Insert empty-ish `user_details` row: `{ user_id }`
   - **Auto company link by phone** (if phone already exists on a company-like row and no `user_relation` yet):
     - Insert `user_relation` (`user_id`, `company_id`, `type='1'`, empty permission JSON)
     - Assign Super Admin: find `user_group` where `added_by=user` and `group_id=1`, insert `user_permission` if missing
   - **Or explicit `company_id`:** same relation + Super Admin permission pattern (`type=1`, `status=1`)
7. `FrontModel::create_user_setting($userId)`
8. `FrontModel::generateToken($userId)`
9. Update `individual_id` + `slug`:
   - `individual_id` = `get_unique_id` → prefix **`CCE`** + 6 non-VIP digits
   - `slug` = `get_slug(url_title(fname lname) + '-' + individual_id)`
10. `data = getStatitcs($userId)`
11. **Side effects (async SQS — must not change success JSON if they fail silently):**
    - Email template **48**: “Thank You for Joining CollarCheck!” → `email/trigger/onboarding_thankyou_user`, link `{REACT_SITE}dashboard/user/profile`
    - WhatsApp campaign **162** (`SEND_WHATSAPP`, payload name)
    - Email template **46**: “Your Verified Career Journey Starts Here!” → `email/trigger/onboarding_user`, link `{REACT_SITE}`

### Success

```json
{
  "status": true,
  "messages": "Successfully Registered",
  "data": {
    "loginauth": "...",
    "id": 101,
    "individual_id": "CCE123456",
    "user_type": "user",
    "fname": "John",
    "lname": "Doe",
    "email": "john@example.com",
    "phone": "9876543210"
  }
}
```

### Errors

```json
{ "status": false, "messages": "validation errors..." }
```
```json
{ "status": false, "messages": "Invalid refferal code!" }
```
```json
{ "status": false, "messages": "Something went wrong!" }
```
```json
{ "status": false, "messages": "Exception message" }
```

### Tables touched

| Table | Action |
|-------|--------|
| `user` | INSERT then UPDATE (`individual_id`, `slug`) |
| `user_details` | INSERT `{ user_id }` |
| `cities` | optional INSERT (free-text city) |
| `user_relation` | optional INSERT (company link) |
| `user_permission` | optional INSERT (Super Admin) |
| `user_group` | READ (for Super Admin group row) |
| account settings | via `create_user_setting` |
| default groups | via `createDefaultUserGroups` |

### Example request

```http
POST /wapi/employee/signup
Content-Type: application/json

{
  "fname": "John",
  "lname": "Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "phone_verified": 1,
  "country": 101,
  "state": 21,
  "city": 400001,
  "gender": 1,
  "method_type": "app"
}
```

---

# 2. POST `/wapi/employee/final-signup`

**Handler:** `ModuleController::final_Signup`  
**Auth:** Public (no Auth filter)  
**Content-Type:** often `multipart/form-data` (resume / company profile / education documents)

**Purpose:** Step 2 onboarding. One endpoint handles:

- **A)** Employee career type (fresher / working / not working) + explore flags + optional resume  
- **B)** Optional company create/update (self-curl to add-company)  
- **C)** Optional first job (self-curl to add-job)

### Identity fields

| Field | Required | Notes |
|-------|----------|-------|
| `user_id` | **Yes** | Target employee id from step 1 (`data.id`) |
| `user_token` | For proxy branches | Sent as `Authorization: {user_token}` when calling add-education / add-company / add-job. Typically `loginauth` from step 1 (with or without `Bearer` depending on how client stores it — PHP sets header as `"Authorization: $token"` literally). |

Missing `user_id`:

```json
{ "status": false, "messages": "user id is missing!" }
```

---

## Branch A — Employee profile (`user_register_type` present)

Triggered when `user_register_type` is non-empty.

### Common fields

| Field | Type | Notes |
|-------|------|--------|
| `user_register_type` | int/string | **`1`** fresher/student · **`2`** currently working · **`3`** not currently working |
| `on_explore` | any | Empty → `0`; else `1` |
| `on_immediate` | any | Empty → `on_immediate=false`, `notice_period=NULL`; else true + optional `notice_period` |
| `on_notice` | any | Empty → `on_notice=false`, `notice_date=NULL`; else true + optional `notice_date` (via `changeDateFormat(..., 1)`) |
| `notice_period` | any | Only when immediate path |
| `notice_date` | date | Only when notice path |
| `resume` | file | Optional; S3 path `uploads/resume/` via `s3fileUploads`; sets `resume`, `resumeName` (original filename), `cvPop=true` |
| `exploring_option` | array | JSON-encoded into `user_details.exploring_option` |

### Step A.1 — Update user + exploring options

1. `UPDATE user SET … WHERE id = user_id` with register type + explore flags (+ resume fields if file).
2. If update fails → `{ "status": false, "messages": "Exploring not save" }`.
3. Upsert `user_details.exploring_option` for that `user_id`.

### Step A.2 — Type 2 or 3 (employment history)

When `user_register_type == 2 || user_register_type == 3`:

| Field | Notes |
|-------|--------|
| `current_position` | int designation id **or** free-text string → find/create `designation` (`user_defined=1`, `user_id`) |
| `current_company` | int company user id **or** free-text → find/create `user` with `user_type=2`, `user_defined_company=1`, assign `CCC…` individual_id + slug |
| `joining_date` | date → `changeDateFormat(..., 1)` |
| `worked_till_date` | Used when type **3**; must be **>** `joining_date` if both set |

**Experience row `user_experience`:**

| Column | Type 2 (working) | Type 3 (not working) |
|--------|------------------|----------------------|
| `user` | `user_id` | same |
| `company` | resolved company id | same |
| `designation` | resolved position id | same |
| `joining_date` | from body | from body |
| `still_working` | **1** | **0** |
| `worked_till_date` | `''` | from body or NULL |
| dates | create/modify now | same |

If experience for same `user`+`company` exists → **update**; else **insert**.

**Errors:**

```json
{ "status": false, "messages": "Something went wrong!" }
```
```json
{ "status": false, "messages": "work till date not less then or equal to joining date" }
```
```json
{ "status": false, "messages": "Experience not added!" }
```

Note: column on user is written as `current_possition` (double-s) — match DB column name for parity.

### Step A.3 — Type 1 (fresher / education)

When not type 2/3 (i.e. type **1** path), proxies internal API:

| Target | When |
|--------|------|
| `POST /wapi/employee/add-education` | No existing education for user |
| `POST /wapi/employee/add-education/{id}` | Existing `user_education` row for user |

**Forwarded fields:**

| Field | Notes |
|-------|--------|
| `university` | |
| `course_type` | |
| `course` | |
| `starting_date` | |
| `ending_date` | |
| `state`, `city`, `country` | |
| `ishighest` | |
| `ongoing` | |
| `document[]` | Optional multi-file → CURLFile array |
| `user` | Set to `user_id` |

Header: `Authorization: {user_token}`

If proxied response `status !== true`:

```json
{ "status": false, "messages": "<upstream messages or 'Education not added!'>" }
```

> **Node port tip:** Call the same education service/function in-process instead of HTTP self-curl; preserve failure messages and side effects.

---

## Branch B — Company onboarding (`company_name` present)

Triggered when `company_name` is non-empty (can run **in addition** to Branch A in the same request).

### Fields

| Field | Maps to internal add-company |
|-------|------------------------------|
| `company_name` | `company_name` |
| `contact_person` | `contact_person` |
| `company_email` | `email` |
| `company_phone` | `phone` |
| `incorporate_date` | `incorporate_date` |
| `website` | Auto-prefix `https://` if no scheme |
| `industry` | `industry` |
| `method_type` | Default `Website` |
| `profile` | file → CURLFile |
| (fixed) | `user_type=2`, `register_type=form`, `claim_status=1`, `accept_term=true` |
| `user_id` | Calling employee |
| `user_relation` | `1` if employee already has any `user_relation` row, else `0` |

### Internal call

| Condition | URL |
|-----------|-----|
| Employee already has `user_relation` | `POST /wapi/company/add-company/{company_id}` |
| Else | `POST /wapi/company/add-company` |

Header: `Authorization: {user_token}`

On failure:

```json
{ "status": false, "messages": "<upstream or 'Company not added!'>" }
```

On success: `companyid = response.lastCreateId` (or `0`).

---

## Branch C — Job (after successful company)

Runs only if company branch response succeeded **and** `job_title` is non-empty **and** `companyid` is set.

### Fields → `POST /wapi/company/add-job` (+ `/{jobId}` if company already has a job)

| Field | Notes |
|-------|--------|
| `job_title` | Required to enter branch |
| `job_description` | |
| `roles_responsibility` | |
| `department` | |
| `role_type` | |
| `city`, `state`, `country` | |
| `salary` | |
| `vacancy` | |
| `industry` | |
| `urgent` | |
| `experience` | |
| `designation` | |
| `status` | Default `0` if empty |
| `job_mode` | |
| `skill[]` | Array → expanded as `skill[0]`, `skill[1]`, … |
| `slug` | Optional; else slugified job title via `sfu` / `url_title` |
| `document` | Optional single file |

Headers:

```
Authorization: {user_token}
X-Company: {companyid}
```

On failure:

```json
{ "status": false, "messages": "<upstream or 'Job not added!'>" }
```

`jobId` for final payload is taken from upstream `response.jobId` when present.

---

## Final success (all branches that completed)

Always ends with:

```php
$authData = getStatitcs($user);
$authData['companyId'] = (int) $companyid ?: 0;
$authData['jobId']     = (int) $response['jobId'] ?: 0;
```

```json
{
  "status": true,
  "messages": "Successfully Registered",
  "data": {
    "loginauth": "...",
    "id": 101,
    "user_type": "user",
    "companyId": 10,
    "jobId": 900
  }
}
```

If no company/job was created, `companyId` and `jobId` are `0`.

### Errors (summary)

| `messages` | When |
|------------|------|
| `user id is missing!` | No `user_id` |
| `Exploring not save` | User explore/register-type update failed |
| `Something went wrong!` | User update after position/company failed |
| `work till date not less then or equal to joining date` | Type 3 date rule |
| `Experience not added!` | Experience insert/update failed |
| `Education not added!` | Proxy education failed |
| `Company not added!` | Proxy company failed |
| `Job not added!` | Proxy job failed |
| Exception message | Catch block |

### Example — currently working employee

```http
POST /wapi/employee/final-signup
Content-Type: multipart/form-data

user_id=101
user_token=<loginauth>
user_register_type=2
on_explore=1
on_immediate=1
current_position=5
current_company=10
joining_date=2020-01-15
resume=<file optional>
```

### Example — fresher + education

```http
POST /wapi/employee/final-signup

user_id=101
user_token=<loginauth>
user_register_type=1
university=...
course=...
course_type=...
starting_date=...
ending_date=...
```

### Example — also create company + job

```http
POST /wapi/employee/final-signup

user_id=101
user_token=<loginauth>
user_register_type=2
...employment fields...
company_name=Acme Corp
company_email=hr@acme.com
company_phone=9876543210
contact_person=Jane
website=acme.com
industry=3
job_title=Backend Engineer
job_description=...
skill[]=PHP
skill[]=MySQL
```

---

# 3. POST `/wapi/employee/upload-resume`

**Handler:** `ModuleController::upload_resume`  
**Auth:** Public (body `user_id` only — **no token check**)  
**Content-Type:** `multipart/form-data`

**Purpose:** Standalone resume upload after signup (or anytime client has `user_id`). Same S3 + user columns as optional resume inside final-signup.

### Request

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `user_id` | int | **Yes** | Target user |
| `resume` | file | **Yes** | See validation |

### Validation rules

| Rule | Limit | Error message |
|------|--------|----------------|
| `uploaded[resume]` | must be present | `You must upload a file (Word, PDF).` |
| `max_size[resume,5240]` | **5240 KB** (~5 MB) | `The file size must not exceed 5MB.` |
| `mime_in` | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `Allowed file types: PDF, DOC, DOCX.` |
| `ext_in` | `pdf`, `doc`, `docx` | `Invalid file extension. Allowed: pdf, doc, docx` |

### Logic

1. Reject empty `user_id` → `"User ID is required"`.
2. Validate file rules.
3. `s3fileUploads($file, 'uploads/resume/')` → stores S3 object path (path relative after host, e.g. under bucket prefix).
4. `UPDATE user SET`:
   - `resume` = S3 relative path  
   - `resumeName` = original client filename  
   - `cvPop` = `TRUE`  
   `WHERE id = user_id`
5. Success if update affected.

### Success

```json
{
  "status": true,
  "messages": "Resume upload successfully"
}
```

### Errors

```json
{ "status": false, "messages": "User ID is required" }
```
```json
{ "status": false, "messages": "You must upload a file (Word, PDF)." }
```
```json
{ "status": false, "messages": "The file size must not exceed 5MB." }
```
```json
{ "status": false, "messages": "Allowed file types: PDF, DOC, DOCX." }
```
```json
{ "status": false, "messages": "Resume not upload" }
```
```json
{ "status": false, "messages": "Exception message" }
```

### S3 upload detail (shared with final-signup)

| Item | Value |
|------|--------|
| Helper | Trait `Awss3::s3fileUploads` (`app/Libraries/traits/Awss3.php`) |
| Path prefix | `uploads/resume/` |
| Return value | Absolute path portion of S3 `ObjectURL` (leading `/` stripped) — stored in `user.resume` |
| Client filename | Stored separately in `user.resumeName` |

Env/config for AWS is whatever `S3ClientLibrary` uses (same as rest of app).

### Example

```http
POST /wapi/employee/upload-resume
Content-Type: multipart/form-data

user_id=101
resume=@/path/to/cv.pdf
```

---

# `user_register_type` reference

| Value | Meaning | Side data |
|-------|---------|-----------|
| `1` | Fresher / student | Education via add-education proxy |
| `2` | Currently working | Experience with `still_working=1` |
| `3` | Not currently working | Experience with `still_working=0` + `worked_till_date` |

---

# Internal dependencies (final-signup proxies)

These routes are under the authenticated `wapi` group with **Auth filter** in `Routes.php`. final-signup calls them with the client's `user_token`:

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/wapi/employee/add-education` | `IndividualApi::addEducation` |
| POST | `/wapi/employee/add-education/(:num)` | `IndividualApi::addEducation/$1` |
| POST | `/wapi/company/add-company` | `CompanyApi::add_company` |
| POST | `/wapi/company/add-company/(:num)` | `CompanyApi::add_company/$1` |
| POST | `/wapi/company/add-job` | `CompanyApi::addJob` |
| POST | `/wapi/company/add-job/(:num)` | `CompanyApi::addJob/$1` |

Job calls also need header **`X-Company: {companyId}`**.

For a greenfield port, prefer **in-process** service calls with the same DB side effects rather than HTTP loops to self.

---

# Side effects checklist (step 1 signup)

| Channel | Trigger | Details |
|---------|---------|---------|
| SQS `SEND_EMAIL` | Always on success | Template ids `48` then `46` |
| SQS `SEND_WHATSAPP` | Always on success | `campaign_id: 162`, payload `name` |
| Default user groups | Always | `createDefaultUserGroups(email)` |
| User settings | Always | `create_user_setting` |
| Company auto-link | Conditional | Phone match company without relation, or `company_id` body |

Failures in SQS/email should not flip HTTP success if the user was created (match PHP: success response is built after queue push without checking queue result).

---

# Node / other-stack parity checklist

1. HTTP **200** + `status` boolean for business outcomes.  
2. Use **`messages`** (plural) on these three endpoints.  
3. Preserve exact strings including typos: `Invalid refferal code!`, `work till date not less then or equal to joining date`, `Resume upload successfully`.  
4. After step 1, return full `getStatitcs` + `loginauth`.  
5. After step 2, return stats **plus** integer `companyId` / `jobId` (0 when unused).  
6. `individual_id` for employees: **`CCE` + 6 digits**, avoid VIP patterns used in `FrontModel::isCheckVipNumber`.  
7. Free-text city / designation / company create with `user_defined` flags as above.  
8. Resume: PDF/DOC/DOCX, max ~5MB (5240 KB rule), path prefix `uploads/resume/`, set `cvPop=true`.  
9. final-signup company/job/education: same validations and DB writes as the proxied endpoints.  
10. `upload-resume` does **not** re-issue token; only updates user columns.  
11. Security note for ports: step 2/3 only require `user_id` (and optional token for proxies) — consider hardening with JWT if redesigning; for parity keep body `user_id`.

---

# Quick reference

```
POST /wapi/employee/signup
  → create employee, token, emails/WA
  ← data.loginauth, data.id

POST /wapi/employee/final-signup
  → career type + optional education/experience
  → optional company + job (proxied)
  ← data + companyId + jobId

POST /wapi/employee/upload-resume
  → S3 resume on user
  ← messages only (no data payload)
```
