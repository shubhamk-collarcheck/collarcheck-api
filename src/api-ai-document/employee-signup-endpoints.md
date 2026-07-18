# Employee Signup / Registration Endpoints (Node)

> **Stack:** Node.js + Express + Drizzle ORM (MySQL)  
> **Status:** Implemented  
> **Base path:** `/wapi/employee`  
> **HTTP:** Almost always **200** with `status: true|false` (business errors are not 4xx).  
> **Key naming:** These endpoints use **`messages`** (plural), not `message`.  
> **Postman:** `collarcheck.postman_collection.json` → **employees → signup / registration (public)**  
> Collection vars: `URL`, `token`, `user_id` (auto-set from signup tests).

| Method | Full path | Route file | Controller | Service |
|--------|-----------|------------|------------|---------|
| POST | `/wapi/employee/signup` | `employee.route.ts` | `employeeSignup` | `employeeSignupService` |
| POST | `/wapi/employee/final-signup` | `employee.route.ts` | `finalSignup` | `finalSignupService` |
| POST | `/wapi/employee/upload-resume` | `employee.route.ts` | `uploadResume` | `uploadResumeService` |

**Layers**

| Layer | File |
|-------|------|
| Routes | `src/routes/employee.route.ts` (public; no `Authorization`) |
| Controller | `src/controllers/login.controller.ts` |
| Service | `src/services/login.service.ts` |
| Repository | `src/repositery/login.repositery.ts` |
| Types (Zod) | `src/types/login.types.ts` — `employeeSignupSchema`, `finalSignupSchema`, `uploadResumeSchema` |
| Resume upload | `src/utils/resumeUpload.ts` (multer-s3 → `uploads/resume/`) |
| Multipart (final-signup) | `src/utils/educationUpload.ts` fields: `resume`, `profile`, `document[]` |
| Session payload | `getStatistics(userId, loginauth?)` in `login.service.ts` |
| Token | `generateToken(userId)` → JWT `{ uid }` + `user.token` / `login_time` |

**Auth notes**

- All three routes are **public** (not behind `Authorization` middleware).
- Step 2 / resume identify the user via body `user_id` (and optional `user_token` = step-1 `loginauth`).
- For parity with legacy clients, identity is **not** re-checked with JWT on final-signup / upload-resume.

**Related**

- Full auth catalog: [`login-registration-endpoints.md`](./login-registration-endpoints.md)
- MSG91 OTP (pre-signup verify): [`msg91-sms.md`](./msg91-sms.md)
- Company / job internals used by final-signup: `company/` docs, `addJobService`
- Education: `education.service.ts` (`createEducationService` / `updateEducationService`)

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

---

## Shared: success session payload

Successful **signup** returns `data` from `getStatistics(userId)`.

Critical fields for clients:

| Field | Notes |
|-------|--------|
| `loginauth` | Session token → later `Authorization: Bearer …` |
| `id` | Numeric user id → use as `user_id` on step 2 |
| `user_type` | String `"user"` for employees |
| `individual_id` | e.g. `CCE123456` (`USER_PREFIX.EMPLOYEE`) |
| `slug` | Profile URL slug |
| `profile_percentage`, `incomplete`, etc. | Onboarding UI |

`final-signup` returns the same stats object **plus**:

| Extra key | Type | Notes |
|-----------|------|--------|
| `companyId` | int | Created/updated company id, or `0` |
| `jobId` | int | Created/updated job id, or `0` |

Token generation: `generateToken(userId)` writes `cyb_user.token` / `login_time` via `loginRepositery.setToken`.

---

# 1. POST `/wapi/employee/signup`

**Auth:** Public  
**Purpose:** Step 1 — create employee (`user_type = 1`), settings, default groups, token, optional company link, welcome emails/WhatsApp.

### Route wiring

```ts
// employee.route.ts
employRouter.post("/signup", validateData(employeeSignupSchema), employeeSignup);
```

### Request body

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `fname` | string | **Yes** | Zod: min 1 |
| `lname` | string | No | |
| `email` | string | **Yes** | Lowercased; unique vs employee primary/alternate |
| `phone` | string | **Yes** | min 10, max 15; unique vs employee phone/second_phone |
| `country` | any | No | Stored on `cyb_user` |
| `state` | any | No | Also used when creating free-text city |
| `city` | int or string | No | Integer → city id. String → find/create `cyb_cities` (`user_difined=1`) |
| `dob` | string | No | |
| `gender` | any | No | |
| `work_status` | any | No | Empty → `NULL` |
| `method_type` | string | No | Default `"Website"` |
| `referral_code` | string | No | Must match existing `user.individual_id` (`is_deleted=0`) |
| `company_id` | int | No | Explicit company to link via `cyb_user_relation` |
| `phone_verified` | 0/1 | No | Stored as `1` if truthy, else `0` |
| `email_verified` | 0/1 | No | Stored as `1` if truthy, else `0` |

Content-Type: `application/json` or form fields.

### Validation

- Zod schema: `employeeSignupBodySchema` in `login.types.ts`
- Middleware: `validateData` → **400** `{ error, details }` on schema failure (project-wide)
- Service-level uniqueness / referral still return **200** + `{ status: false, messages }`

### Logic (ordered)

1. **Validate** referral (`findByIndividualId`) → `"Invalid refferal code!"` (spelling intentional).
2. **Uniqueness** — `findEmployeeByPhone` / `findEmployeeByEmail`.
3. **City:** integer id as-is; string name → `findCityByName` / `createCity` (`user_difined=1`, `status=1`, optional `state`).
4. **`register_type`:** `"qa"` if `isBypass(phone|email)`, else `"form"`.
5. **Insert** `cyb_user` with:
   - `userType = 1` (`USER_TYPE.EMPLOYEE`)
   - `acceptTerm = 1`
   - `individualId` = `generateUniqueId(USER_PREFIX.EMPLOYEE)` → **`CCE` + digits**
   - `slug` from name + individual id
   - `phoneVerified` / `emailVerified` from body
6. On insert success:
   - `createEmptyUserDetails(userId)`
   - `createDefaultSettings(userId)`
   - `createDefaultUserGroups(userId)` (group_id=1 Super Admin group row for owner)
7. **Company link** (optional):
   - Explicit `company_id`, **or** `findCompanyByPhoneWithoutRelation(phone)` (company phone match with no existing relation)
   - `createUserRelation(userId, companyId, type=1)` → also inserts Super Admin `cyb_user_permission` (`groupId=1`)
8. `generateToken(userId)` → `getStatistics(userId, token)`
9. **Side effects (async SQS — must not flip success if they fail):**
   - Email template **48** (welcome / thank-you)
   - WhatsApp campaign **162** (`SEND_WHATSAPP`, payload `name`)
   - Email template **46** (onboarding journey)

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
{ "status": false, "messages": "This phone number is already associated with an account." }
```
```json
{ "status": false, "messages": "This Email address is already associated with an account." }
```
```json
{ "status": false, "messages": "Invalid refferal code!" }
```
```json
{ "status": false, "messages": "Something went wrong!" }
```

### Tables touched

| Table | Action |
|-------|--------|
| `cyb_user` | INSERT |
| `cyb_user_details` | INSERT `{ user_id }` |
| `cyb_cities` | optional INSERT (free-text city) |
| `cyb_user_relation` | optional INSERT (company link) |
| `cyb_user_permission` | optional INSERT (Super Admin) |
| `cyb_user_group` | optional INSERT (default group) |
| `cyb_account_setting` | default settings rows |

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

**Auth:** Public (no JWT middleware)  
**Content-Type:** often `multipart/form-data` (resume / company profile / education documents)

**Purpose:** Step 2 onboarding. One endpoint handles:

- **A)** Employee career type (fresher / working / not working) + explore flags + optional resume  
- **B)** Optional company create/update (in-process, not HTTP self-curl)  
- **C)** Optional first job via `addJobService`

### Route wiring

```ts
employRouter.post(
  "/final-signup",
  educationUpload.fields([
    { name: "resume", maxCount: 1 },
    { name: "profile", maxCount: 1 },
    { name: "document", maxCount: 5 },
  ]),
  validateData(finalSignupSchema),
  finalSignup
);
```

### Identity fields

| Field | Required | Notes |
|-------|----------|-------|
| `user_id` | **Yes** | Target employee id from step 1 (`data.id`); Zod coerce positive int |
| `user_token` | Optional | Prefer as `loginauth` for response; if omitted a new token is minted |

Missing / invalid `user_id` (schema):

```json
{ "status": false, "messages": "user id is missing!" }
```
(service also returns this if `user_id` is falsy)

---

## Branch A — Employee profile (`user_register_type` present)

Triggered when `user_register_type` is non-empty.

### Common fields

| Field | Type | Notes |
|-------|------|--------|
| `user_register_type` | int/string | **`1`** fresher/student · **`2`** currently working · **`3`** not currently working |
| `on_explore` | any | Empty → `0`; else `1` |
| `on_immediate` | any | Empty → `on_immediate=0`, `notice_period=NULL`; else `1` + optional `notice_period` |
| `on_notice` | any | Empty → `on_notice=0`, `notice_date=NULL`; else `1` + optional `notice_date` |
| `notice_period` | any | Only when immediate path |
| `notice_date` | date | Only when notice path |
| `resume` | file | Optional; S3 key under `uploads/resume/` (via educationUpload / multer-s3); sets `resume`, `resumeName`, `cvPop=1` |
| `exploring_option` | array/string | JSON-encoded into `cyb_user_details.exploring_option` |

### Step A.1 — Update user + exploring options

1. Build user updates: `userRegisterType`, explore flags, optional resume columns.
2. Upsert `user_details.exploring_option` when provided.
3. If user update fails → `{ "status": false, "messages": "Exploring not save" }`.

### Step A.2 — Type 2 or 3 (employment history)

When `user_register_type == 2 || user_register_type == 3`:

| Field | Notes |
|-------|--------|
| `current_position` | int designation id **or** free-text → find/create `cyb_designation` (`user_defined=1`, `user_id`) |
| `current_company` | int company user id **or** free-text → find/create company user (`user_type=2`, `user_defined_company=1`, `CCC…` individual_id + slug) |
| `joining_date` | date string |
| `worked_till_date` | Used when type **3**; must be **>** `joining_date` if both set |

**Experience row `cyb_user_experience`:**

| Column | Type 2 (working) | Type 3 (not working) |
|--------|------------------|----------------------|
| `user` | `user_id` | same |
| `company` | resolved company id | same |
| `designation` | resolved position id | same |
| `joining_date` | from body | from body |
| `still_working` | **1** | **0** |
| `worked_till_date` | null | from body or null |

If experience for same `user`+`company` exists → **update**; else **insert** (`findExperienceByUserAndCompany`).

Also writes `cyb_user.current_possition` (double-s spelling) and `current_company`.

**Errors:**

```json
{ "status": false, "messages": "work till date not less then or equal to joining date" }
```
```json
{ "status": false, "messages": "Experience not added!" }
```

### Step A.3 — Type 1 (fresher / education)

When type **1** and `university` + `course` present:

- Existing education for user → `updateEducationService`
- Else → `createEducationService`

**Forwarded fields:** `university`, `course_type`, `course`, `starting_date`, `ending_date`, `state`, `city`, `country`, `ishighest`, `ongoing`, optional `document[]` files.

```json
{ "status": false, "messages": "Education not added!" }
```

---

## Branch B — Company onboarding (`company_name` present)

Triggered when `company_name` is non-empty (can run **in addition** to Branch A in the same request).

### Fields

| Field | Maps to company user |
|-------|----------------------|
| `company_name` | `fname` |
| `contact_person` | `contact_person` |
| `company_email` | `email` |
| `company_phone` | `phone` |
| `incorporate_date` | `incorporate_date` |
| `website` | Auto-prefix `https://` if no scheme |
| `industry` | `industry` |
| `profile` | file → S3 key on `profile` |
| (fixed on create) | `user_type=2`, `register_type=form`, `claim_status=1`, `accept_term=1` |

### Logic (in-process)

| Condition | Behavior |
|-----------|----------|
| Employee already has `cyb_user_relation` | Update that company row (`getFirstUserRelation`) |
| Else | Create company user + settings + `createUserRelation` (Super Admin permission) |

On failure:

```json
{ "status": false, "messages": "Company not added!" }
```

On success: `companyId` = company id.

---

## Branch C — Job (after successful company)

Runs only if company branch set `companyId` **and** `job_title` is non-empty.

### Fields → `addJobService(companyId, data)`

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
| `skill` | array or value (JSON-stringified in job service) |
| `slug` | Optional; else generated from title |

If company already has a job (`findFirstCompanyJob`) → update via `data.id`; else create.

On failure:

```json
{ "status": false, "messages": "<upstream or 'Job not added!'>" }
```

---

## Final success (all branches that completed)

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
| `Something went wrong!` | User not found / stats failed |
| `work till date not less then or equal to joining date` | Type 3 date rule |
| `Experience not added!` | Experience insert/update failed |
| `Education not added!` | Education service failed |
| `Company not added!` | Company create/update failed |
| `Job not added!` | Job create/update failed |

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
skill[]=Node
skill[]=MySQL
```

---

# 3. POST `/wapi/employee/upload-resume`

**Auth:** Public (body `user_id` only — **no token check**)  
**Content-Type:** `multipart/form-data`

**Purpose:** Standalone resume upload after signup (or anytime client has `user_id`). Same S3 + user columns as optional resume inside final-signup.

### Route wiring

```ts
employRouter.post(
  "/upload-resume",
  resumeUpload.single("resume"),
  validateData(uploadResumeSchema),
  uploadResume
);
```

### Request

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `user_id` | int | **Yes** | Target user |
| `resume` | file | **Yes** | See validation |

### Validation rules

| Rule | Limit | Error message |
|------|--------|----------------|
| file present | must be uploaded | `You must upload a file (Word, PDF).` |
| max size | **5 MB** (`resumeUpload` limits) | `The file size must not exceed 5MB.` |
| mime | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `Allowed file types: PDF, DOC, DOCX.` |
| extension | `pdf`, `doc`, `docx` | same as mime message |

### Logic

1. Reject empty `user_id` → `"User ID is required"`.
2. Validate file (multer filter + controller size check).
3. Multer-S3 stores under `uploads/resume/{uuid}{ext}` → `file.key`.
4. `UPDATE cyb_user SET`:
   - `resume` = S3 key  
   - `resumeName` = original client filename  
   - `cvPop` = `1`  
   `WHERE id = user_id`
5. Success if update succeeds.

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

### S3 upload detail

| Item | Value |
|------|--------|
| Middleware | `resumeUpload` (`src/utils/resumeUpload.ts`) |
| Path prefix | `uploads/resume/` |
| Stored value | `file.key` on `cyb_user.resume` |
| Client filename | `cyb_user.resumeName` |
| Env | `AWS_KEY`, `AWS_SECRET`, `AWS_REGION`, `AWS_BUCKET` |

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
| `1` | Fresher / student | Education via `createEducationService` / `updateEducationService` |
| `2` | Currently working | Experience with `still_working=1` |
| `3` | Not currently working | Experience with `still_working=0` + `worked_till_date` |

---

# Internal dependencies (final-signup)

PHP self-curled authenticated routes. **Node calls services in-process** instead:

| Concern | Node entry |
|---------|------------|
| Education create/update | `education.service.ts` → `createEducationService` / `updateEducationService` |
| Company create/update | `login.service.ts` final-signup Branch B + `loginRepositery` |
| Job create/update | `company-job.service.ts` → `addJobService` |
| Designation free-text | `designation.repositery.ts` |
| Company free-text (experience) | `users.repositery.ts` + `USER_PREFIX.COMPANY` |

---

# Side effects checklist (step 1 signup)

| Channel | Trigger | Details |
|---------|---------|---------|
| SQS `SEND_EMAIL` | Always on success | Template ids `48` then `46` |
| SQS `SEND_WHATSAPP` | Always on success | `template: 162`, payload `name` |
| Default user groups | Always | `createDefaultUserGroups` |
| User settings | Always | `createDefaultSettings` |
| Company auto-link | Conditional | Phone match company without relation, or `company_id` body |

Failures in SQS/email should not flip HTTP success if the user was created.

---

# Node parity checklist

1. HTTP **200** + `status` boolean for business outcomes (schema validation may be **400** via `validateData`).  
2. Use **`messages`** (plural) on these three endpoints.  
3. Preserve exact strings including typos: `Invalid refferal code!`, `work till date not less then or equal to joining date`, `Resume upload successfully`.  
4. After step 1, return full `getStatistics` + `loginauth`.  
5. After step 2, return stats **plus** integer `companyId` / `jobId` (0 when unused).  
6. `individual_id` for employees: **`CCE` + digits** via `generateUniqueId(USER_PREFIX.EMPLOYEE)`.  
7. Free-text city / designation / company create with `user_defined` flags.  
8. Resume: PDF/DOC/DOCX, max 5MB, path prefix `uploads/resume/`, set `cvPop=1`.  
9. final-signup company/job/education: in-process service calls (no self-HTTP).  
10. `upload-resume` does **not** re-issue token; only updates user columns.  
11. Security note: step 2/3 only require `user_id` (and optional token for response) — parity with legacy; consider JWT hardening if redesigning.

---

# Quick reference

```
POST /wapi/employee/signup
  → create employee, token, emails/WA
  ← data.loginauth, data.id
  Node: employeeSignup → employeeSignupService

POST /wapi/employee/final-signup
  → career type + optional education/experience
  → optional company + job (in-process)
  ← data + companyId + jobId
  Node: finalSignup → finalSignupService

POST /wapi/employee/upload-resume
  → S3 resume on user
  ← messages only (no data payload)
  Node: uploadResume → uploadResumeService
```
