
# Common Auth Endpoints — Settings, Auth Profile, View Request, People List

**Base path:** `/wapi` (all endpoints in `wapi` group with `Auth` filter, JWT Bearer token required)

---

## Routes Summary

| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| GET | `user/getSetting` | `IndividualApi::getSetting` | Get user account settings |
| POST | `user/saveSetting` | `IndividualApi::saveSetting` | Save/update account settings |
| GET | `auth/user-profile/(:any)` | `IndividualApi::authUserprofile/$1` | Full user profile (auth-gated view) |
| POST | `company/sendUserProfileViewRequest` | `CompanyApi::sendUserProfileViewRequest` | Request salary/profile view access |
| GET | `people-list` | `ModuleController::people_list` | Exploring people picker list |

---

## 1. GET `user/getSetting`

### Route
```
GET /wapi/user/getSetting
```

### Auth
JWT required. `$this->request->id` = logged-in user.
**Permission guard:** If `$this->request->user_type == 2` (company viewing another user's settings), runs `checkMenuAccess($login_user_id, $companyId, 11)`. Returns **403** if denied.

### DB Queries
```
SELECT * FROM account_setting WHERE user_id = ?
```
Results pivoted into a key→value associative array.

### Request
No body params (user identified from JWT).

### Response
```json
{
  "status": true,
  "messages": "All setting",
  "data": {
    "email_notification": "1",
    "push_notification": "1",
    "profile_visibility": "public",
    "show_salary": "0",
    "show_email": "1",
    "show_mobile": "0",
    "show_address": "1",
    "show_dob": "0"
  }
}
```
> `data` is an object where each key is a setting name and value is the stored string. Keys are dynamic based on what the user has saved.

### Error Responses
```json
{ "status": false, "message": "Permission denied message" }   // 403
{ "status": false, "messages": "Exception message" }
```

---

## 2. POST `user/saveSetting`

### Route
```
POST /wapi/user/saveSetting
```

### Auth
JWT required. `$this->request->id` = logged-in user.

### DB Queries
Iterates over **all POST body keys** and upserts each into `account_setting`:

```
For each key/value in POST body:
  1. SELECT * FROM account_setting WHERE user_id = ? AND key = ?
  2. SELECT COUNT(*) FROM account_setting WHERE user_id = ? AND key = ?

  IF exists AND count > 1 (duplicate cleanup):
      DELETE FROM account_setting WHERE user_id = ? AND key = ?
      INSERT INTO account_setting (user_id, code, key, value)
  ELSE IF exists:
      UPDATE account_setting SET user_id, code, key, value WHERE id = ?
  ELSE:
      INSERT INTO account_setting (user_id, code, key, value)
```

### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `*` (any) | string | Yes | Any key-value pairs. Keys become setting names. |

Example body:
```
email_notification=1
push_notification=0
profile_visibility=public
show_salary=1
```

### Response
```json
{ "status": true, "messages": "Record updated!" }
```
```json
{ "status": false, "messages": "Exception message" }
```

### Notes
- `code` column is always set to `'config'`.
- Handles duplicate cleanup: if multiple rows exist for same user+key, deletes all and re-inserts one.
- All body params are treated as settings — no validation on key names.

---

## 3. GET `auth/user-profile/(:any)`

### Route
```
GET /wapi/auth/user-profile/{slug}
```
- `(:any)` → `$slug` — user slug (individual, user_type=1)

### Auth
JWT required. `$this->request->id` = current logged-in user (viewer).

### DB Queries
```
1. SELECT * FROM user WHERE slug = ? AND status = 1 AND is_deleted = 0
   → $userdetail (must be user_type=1, else "No User Found!")

2. UserModel::get_user_detail($userdetail->id)
   → Full user row with joined names

3. SELECT * FROM user WHERE id = {currentUserId}
   → $currentUser (viewer)

4. SELECT * FROM user_profile_view_request
   WHERE userid = {target} AND companyid = {viewer} AND status = 1
   AND is_deleted = 0 AND DATE(expiry) >= CURDATE()
   → $viewRequest (salary-view permission)

5. check_data_permission(target, viewer, field)
   → Controls visibility of email, phone, address, dob

6. UserModel::get_unique_experience_id($filter)
   → Employment history (approved + pending for others, all for self)

7. For each experience: get_experience_detail(id, ...)
   → Full experience with salary visibility based on viewRequest

8. UserModel::get_educaton_list($user)
   → Education records

9. UserModel::get_user_skill_list($user)
   → Skills with ratings

10. UserModel::get_user_langauageList($user)
    → Language proficiency

11. UserModel::get_certificate_list($user)
    → Certificates

12. UserModel::get_user_portfolio($user)
    → Portfolio items

13. UserModel::get_total_follower_count($user)
    → Follower count

14. UserModel::get_follow_status(currentUserId, targetUserId)
    → Boolean follow status

15. UserModel::overallprofileScore($user) / getoverallprofileScore($user)
    → Rating/review scores

16. accountSetting($currentUserId)
    → Viewer's own settings (only returned if viewing self)
```

### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `$slug` | URL segment | Yes | Target user's slug |

### Access Control Logic
- **Self-viewing** (`currentUserId == targetId`): Full access to all fields + settings returned.
- **With view request** (company has approved `user_profile_view_request`):
  - `access` array in request controls what's visible: `['1']` = salary, `['2']` = review.
  - `showSalary = true`, `showReview = true` when access includes '1' or '2'.
- **Without view request**: `showSalaryStatus = 1`, salary hidden.
- **Permission-gated fields** (email, phone, address, dob): Only shown if `check_data_permission()` returns true.

### Response
```json
{
  "status": true,
  "messages": "Success!",
  "data": {
    "id": 1,
    "individual_id": "IND-001",
    "fname": "John",
    "lname": "Doe",
    "profile": "https://s3.../profile.jpg",
    "state_name": "New York",
    "showReview": true,
    "showSalary": false,
    "present_address": "123 Main St",
    "email": "john@example.com",
    "email_alternate": "",
    "phone": "+1234567890",
    "second_phone": "",
    "dob": "1990-01-15",
    "setting": {},
    "employement_history": [],
    "employement_history_new": [
      {
        "id": 10,
        "company_name": "Acme Corp",
        "designation_name": "Engineer",
        "salary": "$80k",
        "approved": 1
      }
    ],
    "all_document": [],
    "all_certificate": [
      {
        "id": 3,
        "university": "Coursera",
        "course": "ML",
        "start_date": "2023-01-01",
        "end_date": "2023-06-01",
        "ongoing": false,
        "document": "https://s3.../cert.pdf"
      }
    ],
    "all_portfolio": [],
    "all_education": [
      {
        "id": 5,
        "university": "MIT",
        "course_type": "Bachelor",
        "course": "CS",
        "state": "Massachusetts",
        "city": "Cambridge",
        "starting_date": "2010-09-01",
        "ending_date": "2014-06-01",
        "country": "USA",
        "ishighest": true,
        "ongoing": false,
        "document": "https://s3.../cert.pdf"
      }
    ],
    "social_image": "https://...",
    "profile_type": 1,
    "totalRating": { "noofrecord": 5, "avgRating": 4.2 },
    "userRating": { "noofrecord": 5, "avgRating": 4.2 },
    "second_phone_verify": 1,
    "email_alternate_verify": 0,
    "location": 10,
    "work_status": 1,
    "work_status_name": "Employed",
    "current_position": "Engineer",
    "current_company": 5,
    "profile_description": "Software engineer...",
    "linkdin": "https://linkedin.com/in/john",
    "youtube": "",
    "instagram": "",
    "facebook": "",
    "twitter": "",
    "gender_name": "Male",
    "gender": "male",
    "is_verified": true,
    "user_type": "user",
    "phone_verified": 1,
    "email_verified": 1,
    "still_working_position": "Engineer",
    "still_working_company": 5,
    "still_working": 1,
    "still_working_company_name": "Acme Corp",
    "still_working_position_name": "Software Engineer",
    "accomodation_name": "Rent",
    "same_address": false,
    "country": 1,
    "city": 10,
    "state": 20,
    "industry": 3,
    "country_name": "USA",
    "resume": "https://s3.../resume.pdf",
    "resumeName": "John_Resume.pdf",
    "notice_period": 30,
    "notice_period_name": "30 days",
    "notice_date": "2024-07-01",
    "show_notice_popup": false,
    "on_explore": 1,
    "on_immediate": 1,
    "on_notice": 0,
    "expected_salary": "$100k",
    "industry_name": "Technology",
    "slug": "john-doe",
    "all_Skill": [
      { "id": 1, "skill": "PHP", "rating": 5 }
    ],
    "all_languages": [
      { "id": 1, "name": "English", "verbal": 5, "written": 4 }
    ],
    "followData": { "follower": 12, "following": 5 },
    "topCompany": [],
    "topUser": [],
    "following": true,
    "authuser": true
  }
}
```

### Error Responses
```json
{ "status": false, "messages": "No User Found!" }
{ "status": false, "messages": "Exception message" }
```

---

## 4. POST `company/sendUserProfileViewRequest`

### Route
```
POST /wapi/company/sendUserProfileViewRequest
```

### Auth
JWT required. `$this->request->id` = sender (must be user_type=1, individual only).

### Side Effects (Non-CRUD)
This endpoint triggers **3 notifications** via SQS queues:
1. **Push notification** → to target user (salary view request)
2. **Email** → to target user (template 97: "requested_to_view_full_profile_user")
3. **WhatsApp** → to target user (campaign 144)
4. **Email** → to sender/company (template 98: "requested_to_view_full_profile_company")
5. **WhatsApp** → to sender/company (campaign 159)

### DB Queries
```
1. SELECT * FROM user WHERE id = {companyId} AND status = 1
   → Verify sender exists; REJECT if user_type=2 ("Only user can request!")

2. SELECT * FROM user WHERE id = {userid} AND status = 1
   → Verify target user exists

3. SELECT COUNT(*) FROM user_profile_view_request
   WHERE userid = {userid} AND companyid = {companyId} AND is_deleted = 0
   → If count >= 1, reject ("Already Request send!")

4. INSERT INTO user_profile_view_request
   (userid, companyid, status, create_date, modify_date)
   VALUES ({userid}, {companyId}, 0, NOW(), NOW())

5. INSERT INTO notifications
   (sender, receiver, message, link, redirect, create_date, modify_date)

6. SQS push: SEND_PUSH, SEND_EMAIL, SEND_WHATSAPP
```

### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userid` | int | Yes | Target user ID to request view access from |

### Response
```json
{ "status": true, "message": "Full Profile Access Request Sent!" }
```
```json
{ "status": false, "messages": "Only user can request to salary !" }
```
```json
{ "status": false, "messages": "User Id is required" }          // validation
{ "status": false, "messages": "User Not Found!" }
{ "status": false, "messages": "Already Request send!" }
```

### Notes
- Despite the route name mentioning "salary", this is a **full profile view request**.
- `status = 0` on insert means the request is **pending** until the target user approves.
- The `access` column on the `user_profile_view_request` row determines what the company can see after approval (JSON array: `['1']` = salary, `['2']` = review).

---

## 5. GET `people-list`

### Route
```
GET /wapi/people-list
```

### Auth
JWT required. `$this->request->id` = logged-in user.

### DB Queries
```
1. SELECT * FROM user_details WHERE user_id = ?
   → $checkList (exploring config)

2. JSON-decode $checkList->exploring_details → $peopleIds (array of selected user IDs)

3. UserModel::get_exploring_user_list($peopleIds)
   → SELECT id, user_type, individual_id, fname, lname, profile, social_image
     FROM user WHERE id IN ($peopleIds)
   → Split into selected users (user_type=1) and selected companies (user_type=2)

4. UserModel::get_user_explore(user_type=1, $peopleIds)
   → SELECT * FROM user WHERE status=1 AND user_type=1 AND is_deleted=0
     AND id NOT IN ($peopleIds) ORDER BY RAND() LIMIT 10
   → Random unselected users, sorted alphabetically

5. UserModel::get_user_explore(user_type=2, $peopleIds)
   → Same as above but for companies (user_type=2)
```

### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `user_id` | GET query string | No | Override target user (defaults to JWT user) |

### Response
```json
{
  "status": true,
  "data": {
    "selectedUserList": [
      {
        "id": 1,
        "individual_id": "IND-001",
        "profile": "https://s3.../profile.jpg",
        "name": "John Doe",
        "checked": 1
      }
    ],
    "selectedCompanyList": [
      {
        "id": 123,
        "individual_id": "CMP-001",
        "company_logo": "https://s3.../logo.jpg",
        "company": "Acme Corp",
        "checked": 1
      }
    ],
    "userList": [
      {
        "id": 2,
        "individual_id": "IND-002",
        "profile": "https://s3.../img.jpg",
        "name": "Jane Smith",
        "checked": 0
      }
    ],
    "companyList": [
      {
        "id": 456,
        "individual_id": "CMP-002",
        "company_logo": "https://s3.../img.jpg",
        "company": "TechCo",
        "checked": 0
      }
    ]
  }
}
```

### Error Responses
```json
{ "status": false, "message": "ID is missing" }
```

---

## Cross-Language Porting Notes

### getSetting / saveSetting
- **Simple key-value store** pattern: `account_setting` table with `user_id`, `code`, `key`, `value`.
- `getSetting` pivots rows into `{ key: value }` object.
- `saveSetting` iterates ALL body params — no predefined schema. Body keys ARE the setting names.
- Upsert logic with duplicate cleanup: if >1 row for same user+key, delete all and re-insert one.
- Permission guard (menu ID 11) applies when company user accesses another user's settings.

### authUserprofile
- **Heaviest read endpoint** — full profile with access-controlled field visibility.
- Core logic: salary/review visibility depends on `user_profile_view_request` status and `access` JSON array.
- `check_data_permission()` controls per-field visibility (email, phone, address, dob).
- Employment history shows approved+pending for others, all for self.
- `showSalary`/`showReview` booleans tell the frontend what to display.
- `on_explore` visibility: self sees raw value, others see `show_exploring()` result (respects privacy).

### sendUserProfileViewRequest
- **Non-CRUD**: triggers push + email + WhatsApp notifications via SQS.
- Only individuals (user_type=1) can send requests — companies are rejected.
- One request per company-user pair (duplicate check via COUNT).
- `status = 0` = pending; target user must approve to grant access.
- `access` column (JSON array) determines granted permissions after approval.

### people-list
- Returns a **picker list** for "exploring" feature: selected people + random suggestions.
- Selected people come from `user_details.exploring_details` (JSON array of IDs stored as string).
- Suggestions are random (`ORDER BY RAND()`) excluding already-selected IDs, limited to 10.
- Response has 4 lists: selected users, selected companies, suggestion users, suggestion companies.
- `checked` field: `1` = already selected, `0` = suggestion.
