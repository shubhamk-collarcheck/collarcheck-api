
# Login & Registration Endpoints

AI porting guide for public (and one auth-gated) auth flows. Target: Node/other stack returns the **same JSON shapes and message strings** so web/mobile clients keep working.

> **Node status:** Implemented — `src/services/login.service.ts`, `src/controllers/login.controller.ts`, `src/repositery/login.repositery.ts`, routes on `root.route.ts` / `employee.route.ts` / `company.route.ts`.

**Base path:** `/wapi`  
**Content-Type:** `application/json` or `multipart/form-data`  
**HTTP:** Almost always **200** with `status: true|false` (business errors are not 4xx).

> Related but separate: authenticated phone/email OTP (`POST /wapi/sendOtp`, `verifyOtp`, `user/sendEmailOtp`) — not in this file.

---

## Routes Summary

| # | Method | Route | Handler | Auth | Purpose |
|---|--------|-------|---------|------|---------|
| 1 | POST | `login/sendOtp` | `GeneralApi::send_otp` | Public | Send OTP (employee login/signup legacy) |
| 2 | POST | `login/verifyOtp` | `GeneralApi::verify_otp` | Public | Verify OTP; optional login + session payload |
| 3 | POST | `login/googlelogin` | `GeneralApi::googleLogin` | Public | Google / social login or auto-register |
| 4 | POST | `login/social-login` | `GeneralApi::googleLogin` | Public | Alias of #3 (Apple/Google/etc.) |
| 5 | POST | `login` | `GeneralApi::login_common` | Public | Unified send-OTP (phone **or** email) |
| 6 | POST | `login/verify-otp` | `GeneralApi::verify_common_otp` | Public | Unified verify-OTP + session |
| 7 | POST | `employee/register` | `IndividualApi::addIndividual` | Public | Legacy employee form register |
| 8 | POST | `company/register` | `CompanyApi::addCompany` | **JWT Auth** | Company form register |
| 9 | POST | `employee/signup` | `employeeSignup` → `employeeSignupService` | Public | Modern employee signup step 1 |
| 10 | POST | `employee/final-signup` | `finalSignup` → `finalSignupService` | Public* | Onboarding step 2 (user/company/job) |
| 11 | POST | `employee/upload-resume` | `uploadResume` → `uploadResumeService` | Public* | Upload resume by `user_id` |

> **Deep dive for #9–#11:** see [`employee-signup-endpoints.md`](./employee-signup-endpoints.md) (Node implementation details).

\* Not Auth-filter protected; identify user via body `user_id` (+ `user_token` for internal API calls).

---

## Shared: session payload `getStatitcs(userId)`

Every successful **login / register / social** that returns `data` uses `GeneralApi::getStatitcs`.  
**`loginauth`** is the session token clients store and send as `Authorization: Bearer <loginauth>` (or raw token depending on client).

### Employee (`user_type == 1`) — `data` shape
```json
{
  "loginauth": "encrypted-or-jwt-token",
  "id": 101,
  "individual_id": "U101",
  "profile": "https://cdn.../a.jpg",
  "profile_type": null,
  "profile_percentage": 40,
  "uncomplete": [],
  "complete": [],
  "incomplete": [],
  "fname": "John",
  "lname": "Doe",
  "email": "john@example.com",
  "email_alternate": "",
  "second_phone_verify": 0,
  "email_alternate_verify": 0,
  "phone": "9876543210",
  "second_phone": "",
  "location": 400001,
  "work_status": 1,
  "work_status_name": "Employed",
  "current_position": 5,
  "current_company": 10,
  "profile_description": "",
  "linkdin": "",
  "youtube": "",
  "instagram": "",
  "facebook": "",
  "twitter": "",
  "is_verified": false,
  "user_type": "user",
  "phone_verified": 1,
  "email_verified": 0,
  "still_working_position": 5,
  "still_working_company": 10,
  "still_working": 1,
  "still_working_company_name": "Acme",
  "still_working_position_name": "Engineer",
  "accomodation": null,
  "accomodation_name": null,
  "present_address": "",
  "permanent_address": "",
  "same_address": false,
  "country": 101,
  "dob": "1995-01-01",
  "city": 400001,
  "state": 21,
  "industry": null,
  "country_name": "India",
  "city_name": "Mumbai",
  "state_name": "Maharashtra",
  "industry_name": null,
  "notice_period": null,
  "notice_period_name": null,
  "notice_date": null,
  "on_immediate": 0,
  "on_notice": 0,
  "on_explore": 0,
  "exploring_option": [],
  "expected_salary": null,
  "expected_inhand": null,
  "expected_mode": null,
  "notice_type": null,
  "gender_name": "Male",
  "gender": 1,
  "followCount": { "following": 0, "follower": 0 },
  "noticeEmployments": [],
  "slug": "john-doe-u101",
  "resume": "",
  "resumeName": "",
  "reminderExperience": false,
  "reminderExperienceList": [],
  "manual_verify": false,
  "cvPop": true,
  "account_deletion": false
}
```

### Company (`user_type == 2`) — `data` shape
```json
{
  "id": 10,
  "loginauth": "token...",
  "individual_id": "CC10",
  "company_name": "Acme Corp",
  "contact_person": "Jane",
  "email": "hr@acme.com",
  "email_alternate": "",
  "phone": "9876543210",
  "landline": "",
  "profile": "https://cdn.../logo.png",
  "social_image": "",
  "website": "https://acme.com",
  "description": "",
  "second_phone": "",
  "location": "Mumbai",
  "phone_verified": "",
  "email_verified": "",
  "followCount": { "following": 0, "follower": 0 },
  "is_verified": false,
  "user_type": "company",
  "second_phone_verify": 0,
  "email_alternate_verify": 0,
  "profile_description": "",
  "present_address": "",
  "permanent_address": "",
  "same_address": false,
  "country": 101,
  "city": 400001,
  "state": 21,
  "slug": "acme-corp-cc10",
  "country_name": "India",
  "city_name": "Mumbai",
  "state_name": "Maharashtra",
  "linkdin": "",
  "youtube": "",
  "instagram": "",
  "facebook": "",
  "twitter": "",
  "incorporate_date": null,
  "turnover": null,
  "turnover_name": null,
  "company_size": null,
  "company_size_name": null,
  "industry": null,
  "industry_name": null,
  "totalConnection": 0,
  "profile_percentage": 20,
  "uncomplete": [],
  "complete": [],
  "incomplete": [],
  "manual_verify": false,
  "socialLogin": true,
  "exploreTalent": 0,
  "is_user_relation": 0,
  "event_permission": null,
  "account_deletion": false
}
```

### Token generation (`FrontModel::generateToken`)
- Writes/updates `user.token`, `user.login_time`
- Returned as `data.loginauth`

### OTP table `otp`
| Column | Notes |
|--------|--------|
| `phone` / `email` | One of them set |
| `otp` | 6-digit string |
| `expiry` | unix timestamp, **+10 minutes** |
| `status` | 1 |
| `create_date` | datetime |

### Throttle
Several endpoints: **3 requests / minute / IP** via CodeIgniter throttler.

### Bypass / QA
Helper `bypass(phoneOrEmail)` and `register_type == 'qa'` skip real OTP delivery/check for test accounts.

---

# A. Login & authentication

## 1. POST `/wapi/login/sendOtp`

**Handler:** `GeneralApi::send_otp`  
**Auth:** Public  
**Throttle:** 3/min/IP  

### Request body
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone` | string | If not international | min 10, max 13 |
| `email` | string | If international / dual | valid email |
| `international` | 0/1 | No | If 1, email required; OTP via email only |
| `name` | string | No | Used in email OTP template |
| `checkUnique` | any truthy | No | **Signup mode**: phone/email must NOT exist (`user_type=1`). **Login mode** (absent): phone must exist |
| `referral_code` | string | No | Must match `user.individual_id` |
| `send_email` | any | No | Also send email OTP when phone path |
| `methodType` | string | No | `'app'` skips captcha path |
| `token` | string | No | reCAPTCHA (web; currently commented) |

### Logic
1. Validate phone and/or email rules  
2. Optional referral validation  
3. If `international` and no email → error  
4. **`checkUnique` set (signup):** reject if phone/email already on employee account  
5. **`checkUnique` empty (login):** require `user` with that phone + `user_type=1`  
6. Bypass short-circuit success without SMS  
7. Domestic: `send_otp_event(phone)` and/or `send_otp_email`  
8. International: email OTP only  

### Success
```json
{
  "status": true,
  "message": "The OTP has been successfully delivered to your registered phone number."
}
```
Other success `message` variants:
- `"The OTP has been successfully delivered to your registered email address."`
- `"The OTP has been successfully delivered to your registered phone number or email address."`

### Errors
```json
{ "status": false, "message": "Otp Send limit is reach retry after some time !" }
```
```json
{ "status": false, "message": "validation errors..." }
```
```json
{ "status": false, "messages": "Invalid refferal code!" }
```
```json
{ "status": false, "messages": "Kindly enter your email address." }
```
```json
{ "status": false, "messages": "This phone number is already associated with an account." }
```
```json
{ "status": false, "messages": "This Email address is already associated with an account." }
```
```json
{ "status": false, "messages": "phone not registered with us !" }
```
```json
{ "status": false, "message": "Something Went wrong try again" }
```

> Note mixed `message` vs `messages` keys — preserve for client parity.

---

## 2. POST `/wapi/login/verifyOtp`

**Handler:** `GeneralApi::verify_otp`  
**Auth:** Public  

### Request body
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone` | string | If used | numeric, 8–15 |
| `email` | string | If used | valid email |
| `otp` | string | Yes* | 6 digits (phone path) |
| `emailotp` | string | Alt | If set, validates as Email OTP; else `otp` rule |
| `login` | 0/1 | No | If `1`, mark verified + issue token + return `getStatitcs` |

### Logic
1. Validate identifiers + OTP  
2. Unless bypass: load `otp` by phone and/or email; check expiry + match  
3. If `login == 1`:
   - Mark `phone_verified` / `email_verified` on matching employee
   - `generateToken` + `getStatitcs`
4. If `login != 1`: OTP ok only (pre-register verification)

### Success — with login
```json
{
  "status": true,
  "messages": "Otp verify successfully !",
  "data": { "...getStatitcs employee or user..." }
}
```

### Success — without login
```json
{
  "status": true,
  "messages": "Otp verify successfully !"
}
```

### Errors
```json
{ "status": false, "message": "validation..." }
```
```json
{ "status": false, "messages": "invalid phone no." }
```
```json
{ "status": false, "messages": "invalid email address." }
```
```json
{ "status": false, "messages": "Otp Expired !" }
```
```json
{ "status": false, "messages": "Invalid phone OTP!" }
```
```json
{ "status": false, "messages": "Invalid email OTP!" }
```

---

## 3–4. POST `/wapi/login/googlelogin` & `/wapi/login/social-login`

**Handler:** `GeneralApi::googleLogin` (both routes)  
**Auth:** Public  

### Request body
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | Yes | lowercased |
| `pageType` | string | No | Prefixed into success message e.g. `"login"` → `"login Successfully!"` |
| `name` | string | No | New user first/last split |
| `profile` | string URL | No | Stored as `social_image` (ignore `"undefined"`) |
| `type` | string | No | → `register_type` (default `social`) |
| `apple_id` | string | No | Apple identity link |
| `method_type` | string | No | Default `Website` |

### Logic
1. Find user by email (primary/alternate) via `check_email_on_user_type_date` (+ apple_id)  
2. If found:
   - Reject deactivated (`status` empty/0)
   - Mark email or alternate verified
   - Block company-only / related accounts (unified login rules + `UNIFIED_DATE`)
   - `generateToken` + `getStatitcs`
3. If not found — **auto register employee**:
   - Insert `user` (`user_type=1`, `email_verified=1`, social fields)
   - Split name → fname/lname, assign `individual_id` + `slug`
   - `create_user_setting`, welcome emails via SQS, `createDefaultUserGroups`
   - Token + stats  
4. Always success envelope if no hard error  

### Success
```json
{
  "status": true,
  "message": "login Successfully!",
  "socialLogin": true,
  "data": { "...getStatitcs..." }
}
```
(`message` = `{pageType} Successfully!` — if `pageType` empty → `" Successfully!"`)

### Errors
```json
{ "status": false, "messages": "The email field is required." }
```
```json
{
  "status": false,
  "message": "Your account is deactivated please contact web administrator !"
}
```
```json
{
  "status": false,
  "message": "Please use your main account Email Address"
}
```
```json
{
  "status": false,
  "message": "Newly registered company cannot log in. Please create a user account and link it to this company"
}
```

---

## 5. POST `/wapi/login` (unified send OTP)

**Handler:** `GeneralApi::login_common`  
**Auth:** Public  
**Throttle:** 3/min/IP  

Preferred modern login entry: **one field** is phone or email.

### Request body
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `uniqueId` | string | Yes | Email **or** phone (auto-detected by regex) |
| `checkUnique` | any | No | Signup uniqueness vs login existence |
| `methodType` | string | No | `'app'` skips captcha |
| `token` | string | No | reCAPTCHA response |

### Detection
```
if uniqueId matches email regex → email path
else → phone path (min 10, max 15)
```

### Login-mode business rules (when `checkUnique` empty)
- Phone/email must be registered (any type via FrontModel helpers)
- If only company account matches and has `user_relation` → force primary account message
- If company registered after `UNIFIED_DATE` env and not employee → reject company-only login
- QA `register_type=='qa'` → success without sending OTP

### Success
```json
{
  "status": true,
  "message": "OTP Successfully sent to your registered phone"
}
```
or
```json
{
  "status": true,
  "message": "OTP Successfully sent to your registered email"
}
```

### Errors
```json
{ "status": false, "messages": "limit is reach please retry after some time !" }
```
```json
{ "status": false, "message": "The Email field is required" }
```
```json
{ "status": false, "message": "The Phone field is required." }
```
```json
{ "status": false, "message": "This phone number is already associated with an account." }
```
```json
{ "status": false, "message": "This Email address is already associated with an account." }
```
```json
{ "status": false, "message": "Phone not registered with us!" }
```
```json
{ "status": false, "message": "Email not registered with us !" }
```
```json
{
  "status": false,
  "message": "Kindly use the phone number associated with your primary account"
}
```
```json
{
  "status": false,
  "message": "Please use your main account Email Address"
}
```
```json
{
  "status": false,
  "message": "Newly registered company cannot log in. Please create a user account and link it to this company"
}
```
```json
{ "status": false, "message": "Something Went wrong try again" }
```

### OTP send helper
`send_common_otp(uniqueId)` → 6-digit OTP in `otp` table, SMS or email via MainController.

---

## 6. POST `/wapi/login/verify-otp` (unified verify)

**Handler:** `GeneralApi::verify_common_otp`  
**Auth:** Public  

### Request body
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `uniqueId` | string | Yes | Same phone/email as send |
| `otp` | string | Yes | 6 digits |
| `device_id` | string | No | Login history |
| `login` | any | No | Present in code but always issues session on success |

### Logic
1. Detect email vs phone  
2. QA / bypass shortcuts → token + stats immediately  
3. Load OTP row; expiry + match  
4. Resolve user: try `user_type=1` first, else company `user_type=2`  
5. Mark phone/email (or alternate) verified flags  
6. `createDefaultUserGroups` for employees  
7. `generateToken` + `getStatitcs` + `saveLoginHistory`  
8. Delete OTP rows for phone and email  

### Success
```json
{
  "status": true,
  "message": "Otp verify successfully !",
  "data": { "...getStatitcs..." }
}
```

### Errors
```json
{ "status": false, "message": "OTP field is required." }
```
```json
{ "status": false, "message": "invalid phone no." }
```
```json
{ "status": false, "message": "Invalid Email" }
```
```json
{ "status": false, "message": "Otp Expired !" }
```
```json
{ "status": false, "message": "Invalid OTP!" }
```

### Login history table `user_login_history`
Insert: `user_id`, `device_id`, `ip_address`, `user_agent`, `platform`, `login_at`.

---

# B. Registration

## 7. POST `/wapi/employee/register`

**Handler:** `IndividualApi::addIndividual`  
**Auth:** Public  
**Flow:** Legacy single-step employee create after OTP.

### Request body
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `fname` | string | Yes | |
| `lname` | string | No | |
| `email` | string | Yes | `user_email[]` custom unique rule |
| `phone` | string | Yes | 10–15, `user_mobile[]` unique |
| `gender` | any | No | |
| `country` | any | No | |
| `work_status` | any | No | |
| `method_type` | string | No | Default `Website` |
| `referral_code` | string | No | `user.individual_id` |
| `register_type` | string | No | Default `form` |
| `pan` | string | No | Inserted into `user_document` doctype=2 |

### Logic
1. Validate → insert `user` (`user_type=1`, `phone_verified=1`, `cvPop=1`, `accept_term=true`)  
2. Assign `individual_id` + `slug`  
3. `create_user_setting`, `createDefaultUserGroups`, `generateToken`  
4. Optional PAN document  
5. Welcome emails (SQS templates 48 + 46)  
6. Return `getStatitcs`  

### Success
```json
{
  "status": true,
  "messages": "Successfully Registered",
  "data": { "...employee getStatitcs..." }
}
```

### Errors
```json
{ "status": false, "messages": "First Name field is required,..." }
```
```json
{ "status": false, "messages": "Invalid refferal code!" }
```
```json
{ "status": false, "messages": "Something went wrong!" }
```

---

## 8. POST `/wapi/company/register`

**Handler:** `CompanyApi::addCompany`  
**Auth:** **JWT required** (`['filter' => 'Auth']` on route)

### Request body
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `company_name` | string | Yes | → `user.fname` |
| `email` | string | Yes | unique on email + alternate |
| `phone` | string | Yes | unique on phone + second_phone |
| `contact_person` | string | No | |
| `company_size` | any | No | |
| `country` | any | No | |
| `method_type` | string | No | Default `Website` |
| `referral_code` | string | No | |
| `invite` | string | No | Encrypted `company_invite.id` |

### Logic branches
1. **Invite id:** update pre-created company row; mark invite deleted; phone_verified=1  
2. **Invite by email:** update existing invite company  
3. **Fresh:** `INSERT user` + `create_company_setting`  
Then: `individual_id`, `slug`, token, onboarding email + WhatsApp, `getStatitcs`

Hardcoded: `user_type=2`, `claim_status=1`, `register_type=form`, `accept_term=true`

### Success
```json
{
  "status": true,
  "messages": "Successfully Registered",
  "data": { "...company getStatitcs..." }
}
```

### Errors
```json
{ "status": false, "messages": "Company Name field is required,..." }
```
```json
{ "status": false, "messages": "Invalid refferal code!" }
```
```json
{ "status": false, "messages": "Something went wrong!" }
```

---

## 9. POST `/wapi/employee/signup`

**Handler:** `ModuleController::indivisualSignup`  
**Auth:** Public  
**Flow:** Modern step-1 signup (richer than #7).

### Request body
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `fname` | string | Yes | |
| `lname` | string | No | |
| `email` | string | Yes | `user_email[]` |
| `phone` | string | Yes | `user_mobile[]` |
| `country` | any | No | |
| `state` | any | No | |
| `city` | int or string | No | String → create `cities` user_defined |
| `dob` | string | No | |
| `gender` | any | No | |
| `work_status` | any | No | |
| `method_type` | string | No | Default `Website` |
| `referral_code` | string | No | |
| `company_id` | int | No | Auto-link `user_relation` + super-admin permission |
| `phone_verified` | 0/1 | No | Stored as 1 if truthy |
| `email_verified` | 0/1 | No | Stored as 1 if truthy |

### Extra logic vs #7
- Insert empty `user_details` row  
- If phone already on a **company** without relation → create `user_relation` + super-admin `user_permission`  
- Or link provided `company_id` the same way  
- Bypass phone/email → `register_type = 'qa'`  
- WhatsApp campaign 162 + emails  

### Success
```json
{
  "status": true,
  "messages": "Successfully Registered",
  "data": { "...employee getStatitcs..." }
}
```

### Errors
```json
{ "status": false, "messages": "First Name field is required,..." }
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

---

## 10. POST `/wapi/employee/final-signup`

**Handler:** `ModuleController::final_Signup`  
**Auth:** Public (identity via body)  
**Content-Type:** often `multipart/form-data`

Completes onboarding after step-1. Branches by payload.

### Identity fields
| Field | Required | Notes |
|-------|----------|-------|
| `user_id` | Yes | Target user |
| `user_token` | For nested calls | Passed as `Authorization` when proxying add-education / add-company / add-job |

### Branch A — employee profile (`user_register_type` present)

| Field | Notes |
|-------|--------|
| `user_register_type` | `1` fresher/student · `2` currently working · `3` not currently working |
| `on_explore` | 0/1 |
| `on_immediate` | 0/1 (+ optional `notice_period`) |
| `on_notice` | 0/1 (+ optional `notice_date`) |
| `resume` | file → S3 `uploads/resume/`, sets `resumeName`, `cvPop` |
| `exploring_option` | array → JSON in `user_details` |

**Type 2 or 3 — employment:**
| Field | Notes |
|-------|--------|
| `current_position` | int id or string (create designation) |
| `current_company` | int id or string (create unverified company user_type=2) |
| `joining_date` | date |
| `worked_till_date` | required logic for type 3; must be > joining_date |
| `still_working` | set 1 for type 2, 0 for type 3 |

Writes/updates `user` + `user_experience`.

**Type 1 — education (fresher):**
Proxies `POST /wapi/employee/add-education` with:
`university`, `course_type`, `course`, `starting_date`, `ending_date`, `state`, `city`, `country`, `ishighest`, `ongoing`, optional `document[]` files.

### Branch B — company onboarding (`company_name` present)
Proxies `POST /wapi/company/add-company` (+ optional job):

| Field | Maps to |
|-------|---------|
| `company_name` | company_name |
| `contact_person` | contact_person |
| `company_email` | email |
| `company_phone` | phone |
| `incorporate_date` | incorporate_date |
| `website` | website (auto https://) |
| `industry` | industry |
| `profile` | file |
| `job_title` etc. | optional job via `POST company/add-job` with `X-Company` |

Job fields: `job_title`, `job_description`, `roles_responsibility`, `department`, `role_type`, `city`, `state`, `country`, `salary`, `vacancy`, `industry`, `urgent`, `experience`, `designation`, `status`, `job_mode`, `skill[]`, `document`, `slug`.

### Success
```json
{
  "status": true,
  "messages": "Successfully Registered",
  "data": {
    "...getStatitcs for user_id...": true,
    "companyId": 10,
    "jobId": 900
  }
}
```
- `companyId` / `jobId` are integers; `0` if not created  
- `data` is stats object **plus** these two keys

### Errors
```json
{ "status": false, "messages": "user id is missing!" }
```
```json
{ "status": false, "messages": "Exploring not save" }
```
```json
{ "status": false, "messages": "Something went wrong!" }
```
```json
{ "status": false, "messages": "work till date not less then or equal to joining date" }
```
```json
{ "status": false, "messages": "Experience not added!" }
```
```json
{ "status": false, "messages": "Education not added!" }
```
```json
{ "status": false, "messages": "Company not added!" }
```
```json
{ "status": false, "messages": "Job not added!" }
```
```json
{ "status": false, "messages": "Exception message" }
```

---

## 11. POST `/wapi/employee/upload-resume`

**Handler:** `ModuleController::upload_resume`  
**Auth:** Public (body `user_id`)  
**Content-Type:** `multipart/form-data`

### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `user_id` | int | Yes | |
| `resume` | file | Yes | PDF/DOC/DOCX, max **5MB** (5240 KB rule) |

### Logic
1. Validate file  
2. S3 upload `uploads/resume/`  
3. `UPDATE user SET resume, resumeName, cvPop=TRUE WHERE id = user_id`

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

---

# Recommended client flows (for implementers)

### Modern unified login
```
1. POST /wapi/login              { uniqueId, methodType? }
2. POST /wapi/login/verify-otp   { uniqueId, otp, device_id? }
   → store data.loginauth
```

### Legacy employee login
```
1. POST /wapi/login/sendOtp      { phone }           // no checkUnique
2. POST /wapi/login/verifyOtp    { phone, otp, login: 1 }
```

### Employee signup (modern multi-step)
```
1. POST /wapi/login/sendOtp      { phone, email?, checkUnique: 1 }
2. POST /wapi/login/verifyOtp    { phone, otp }      // login != 1
3. POST /wapi/employee/signup    { fname, lname, email, phone, ... }
4. POST /wapi/employee/final-signup { user_id, user_token, user_register_type, ... }
   optional: POST /wapi/employee/upload-resume
```

### Social
```
POST /wapi/login/social-login { email, name, profile, type, pageType, apple_id? }
→ data.loginauth
```

### Company register (legacy)
```
POST /wapi/company/register  (JWT) { company_name, email, phone, ... }
```

---

# Node parity checklist

1. Return **HTTP 200** with `status` boolean for almost all cases.  
2. Preserve **`message` vs `messages`** per endpoint (mixed legacy).  
3. `data.loginauth` must be the token used for subsequent Auth filter calls.  
4. `user_type` in stats is string `"user"` or `"company"`, not `1`/`2`.  
5. OTP: 6 digits, 10 min expiry (unix), table upsert by phone/email.  
6. Throttle login send endpoints at 3/min/IP.  
7. Unified login blocks pure company accounts after `UNIFIED_DATE`.  
8. Social login **auto-creates** employee if email unknown.  
9. `final-signup` may call internal services instead of HTTP self-curl in Node — keep same side effects and final `data` shape (`companyId`, `jobId`).  
10. Side effects (SQS email/WhatsApp) must not change success JSON if they fail silently.

---

# Related docs

| Topic | File |
|-------|------|
| Authenticated phone/email OTP | `remaining-misc-crud-endpoints.md` (out of scope there) / GeneralApi |
| User groups after register | `module-user-group-permission-endpoints.md` |
| Company add-company / add-job (proxied by final-signup) | `company/company-endpoints.md`, `company/company-job-endpoints.md` |
| Auth filter / JWT | `AGENTS.md` conventions |
