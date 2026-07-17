# Employee Misc Endpoints

> **Stack:** Node.js + Express + Drizzle ORM  
> **Auth:** `Authorization` middleware · optional `X-Company`  
> **Controllers:** `misc.controller.ts`, `profile-review` / related services  

## Routes Summary

| Method | Full path | Route file | Handler | Description |
|--------|-----------|------------|---------|-------------|
| GET | `/wapi/auth/company-profile/:slug` | `auth.route.ts` | `authCompanyProfile` | Auth company profile |
| GET | `/wapi/general/company-profile/:slug` | `general.route.ts` | `generalCompanyProfile` | Public company profile |
| PUT | `/wapi/general/markViewed/:id` | `general.route.ts` | `markViewed` | Mark notification read |
| GET | `/wapi/employee/sidebar-count` | `employee.route.ts` | `sidebarCount` | Badge counts |
| POST | `/wapi/employee/leave-reminder-experience` | `employee.route.ts` | `leaveReminderExperience` | Dismiss reminder |
| POST | `/wapi/hired` | `hired.route.ts` | `hired` | Hired check |
| POST | `/wapi/employee/save-exploring` | `employee.route.ts` | `saveExploring` | Save exploring prefs |
| GET | `/wapi/employee/cv-details` | `employee.route.ts` | `cvDetails` | CV details |
| POST | `/wapi/employee/edit-profile` | `employee.route.ts` | `editProfile` | Multi-step profile edit |
| GET | `/wapi/employee/all-company` | `employee.route.ts` | `allCompany` | Company search |
| GET | `/wapi/employee/user-detail` | `employee.route.ts` | `userDetail` | Own profile stats |

**Service:** `misc.service.ts` · **Repo:** `misc.repositery.ts` · **Types:** `misc.types.ts`

---

## 1. GET `auth/company-profile/:slug`

### Route
```
GET /wapi/auth/company-profile/{slug}
```
- `:slug` → `slug` — company slug (URL segment)

### Auth
JWT required. Public twin: `GET /wapi/general/company-profile/:slug`. Menu permission (legacy) may return **403** for company users without access.

### DB Queries
```
1. SELECT * FROM user WHERE slug = ? AND status = 1 AND is_deleted = 0
   → userDetail (must be user_type = 2, else "No Company Found!")

2. get_company_detail(userId)
   → Full company profile row (industry, company_size, turnover, etc.)

3. get_all_connection(userId)
   → Total connection count

4. get_all_job_list(filter)
   → Active jobs for company (limit 20), each with application count

5. get_similar_users(tfilter)
   → Top 4 similar companies (for sidebar)

6. get_all_connection(userId)
   → Follower count
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `slug` | URL segment | Yes | Company slug |

### Response
```json
{
  "status": true,
  "messages": "Success!",
  "company_profile": {
    "id": 123,
    "company_name": "Acme Corp",
    "fname": "Acme Corp",
    "email": "...",
    "slug": "acme-corp",
    "industry_name": "Technology",
    "company_size_name": "51-200",
    "turnover_name": "$1M-$5M",
    "country_name": "USA",
    "city_name": "New York",
    "state_name": "NY",
    "present_address": "...",
    "description": "...",
    "website": "...",
    "linkdin": "...",
    "profile": "https://s3.../profile.jpg",
    "social_image": "https://...",
    "followerCount": 42
  },
  "jobList": [
    {
      "id": 10,
      "title": "Software Engineer",
      "experience_name": "Mid",
      "department_name": "Engineering",
      "role_type_name": "Full-time",
      "vacancy": 3,
      "slug": "software-engineer-acme",
      "country_name": "USA",
      "state_name": "NY",
      "city_name": "New York",
      "designation_name": "Engineer",
      "salary": "$80k-$120k",
      "no_of_application": 15,
      "create_date": "2024-01-15",
      "urgent": 0
    }
  ],
  "similarCompany": [
    {
      "id": 456,
      "company_name": "SimilarCo",
      "slug": "similarco",
      "profile": "https://s3.../img.jpg"
    }
  ],
  "totalConnectionCount": 42
}
```
> Response is `json_encode()`-d, not wrapped in `this->response->setJSON()`.

---

## 2. PUT `general/markViewed/:id`

### Route
```
PUT /wapi/general/markViewed/{id}
```
- `:id` → `id` — notification ID

### Auth
JWT required. `req.auth.id` = authenticated user.

### DB Queries
```
UPDATE notifications SET is_viewed = 1
WHERE receiver = {userId} AND id = {id}
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `id` | URL segment | Yes | Notification ID |

### Response
```json
{ "status": true, "messages": "Successfully updated" }
```
```json
{ "status": false, "messages": "Invalid notification id!" }
```
```json
{ "status": false, "messages": "Exception message" }
```
---

## 3. GET `employee/sidebar-count`

### Route
```
GET /wapi/employee/sidebar-count
```
### Auth
JWT required. `req.auth.id` = logged-in user.

### DB Queries
```
1. SELECT * FROM notifications WHERE receiver = ? AND is_viewed = 0 ORDER BY id DESC
   → unreadnotifications

2. For each unread notification, count child notifications with same parent_id:
   SELECT COUNT(*) FROM notifications WHERE parent_id = ? AND receiver = ?
   → appeneded as row['child_count']

3. get_unread_message_count(userId)
   → Total unread messages
```
### Request
No body or query params.

### Response
```json
{
  "status": true,
  "messages": "Success!",
  "data": {
    "notification_count": 5,
    "notifications": [
      {
        "id": 101,
        "sender": 12,
        "sender_name": "John Doe",
        "sender_profile": "https://s3.../img.jpg",
        "message": "You have a new connection request",
        "type": 1,
        "is_viewed": 0,
        "create_date": "2024-06-10 14:30:00",
        "parent_id": 0,
        "child_count": 2
      }
    ],
    "unreandMessageCount": 3
  }
}
```
---

## 4. POST `employee/leave-reminder-experience`

### Route
```
POST /wapi/employee/leave-reminder-experience
```
### Auth
JWT required. `req.auth.id` = logged-in user.

### DB Queries
```
1. SELECT * FROM user WHERE id = ? AND is_deleted = 0
   → Verify user exists

2. UPDATE user SET cvPop = 1 WHERE id = ?
```
### Request
No body params (user identified from JWT).

### Response
```json
{ "status": true, "messages": "Success!" }
```
```json
{ "status": false, "messages": "Access denied" }
```
```json
{ "status": false, "messages": "Exception message" }
```
---

## 5. POST `hired`

### Route
```
POST /wapi/hired
```
### Auth
JWT required. `req.auth.id` = logged-in user.

### DB Queries
```
1. SELECT * FROM user WHERE id = ? AND is_deleted = 0
   → Verify user exists

2. SELECT COUNT(*) FROM user_experience WHERE user = ? AND is_deleted = 0
   → alreadyHired (int)
```
### Request
No body params (user identified from JWT).

### Response
```json
{ "status": true, "messages": "Success!", "already_hired": 2 }
```
```json
{ "status": false, "messages": "Access denied" }
```
---

## 6. POST `employee/save-exploring`

### Route
```
POST /wapi/employee/save-exploring
```
### Auth
JWT required. `req.auth.id` = logged-in user.

### DB Queries
```
1. SELECT * FROM user WHERE id = ? AND is_deleted = 0
   → Verify user exists

2. UPDATE user
   SET on_explore = 1,
       exploring_option = ?,
       on_immediate = ?,
       on_notice = ?,
       notice_period = ?,
       notice_date = ?,
       expected_salary = ?,
       expected_inhand = ?,
       expected_mode = ?,
       notice_type = ?,
       notice_employments = ?
   WHERE id = ?

   (notice_employments is json_encode()'d before saving)
```
### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `exploring_option` | string | Yes | JSON array, e.g. `"[1,2,3]"` |
| `on_immediate` | int | Conditional | 1 or 0 |
| `on_notice` | int | Conditional | 1 or 0 |
| `notice_period` | int | No | Days |
| `notice_date` | string | No | Date |
| `expected_salary` | string | No | e.g. `"$80k-$100k"` |
| `expected_inhand` | string | No | In-hand salary |
| `expected_mode` | string | No | Salary mode |
| `notice_type` | string | No | Notice type |
| `notice_employments` | array | No | Array of employment IDs |

### Response
```json
{ "status": true, "messages": "Success!" }
```
```json
{ "status": false, "messages": "Access denied" }
```
---

## 7. GET `employee/cv-details`

### Route
```
GET /wapi/employee/cv-details
```
### Auth
JWT required. `req.auth.id` = logged-in user.

### DB Queries
This is a **heavy aggregation endpoint** that builds a full profile view by merging DB data with parsed CV/resume data:

```
1. get_user_detail(user)
   → Basic user row (name, email, phone, resume path, etc.)

2. `resume_parse(basic->resume)`
   → Parse uploaded resume (PDF/DOC) into structured data:
     - cvData->date_of_birth, cvData->about, cvData->address
     - cvData->linkedIn, cvData->education[], cvData->employment_history[]
     - cvData->skills (comma-separated), cvData->language (comma-separated)

3. get_unique_experience_id(filter)
   → Unique experience IDs for user

4. For each experience: get_experience_detail(id)
   → Full experience row with joined company_name, designation_name, etc.

5. get_educaton_list(user)
   → All education records

6. AdminModel::all_fetch('user_skill', where user, order by rating desc)
   → User skills with ratings

7. For each skill: AdminModel::fs('skill', id)
   → Skill name from skill table

8. get_user_langauageList(user)
   → Language proficiency records

9. get_certificate_list(user)
   → All certificates
```
**CV Merge logic:** DB records are primary. CV-parsed data is appended only if the same education (university+course) or employment (company name) does NOT already exist in DB. Skills and languages from CV are appended without IDs.

### Request
No body params (user identified from JWT).

### Response
```json
{
  "status": true,
  "data": {
    "user_details": {
      "id": 1,
      "individual_id": "IND-001",
      "fname": "John",
      "lname": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "gender": "male",
      "dob": "1990-01-15",
      "profile_description": "Software engineer...",
      "accomodation_name": "Rent",
      "country_name": "USA",
      "state_name": "New York",
      "city_name": "NYC",
      "present_address": "123 Main St",
      "linkedin": "https://linkedin.com/in/john",
      "is_verified": true,
      "phone_verified": 1,
      "email_verified": 1
    },
    "employmentList": [
      {
        "id": 10,
        "user": 1,
        "company": 5,
        "employment_type": 1,
        "designation": "Engineer",
        "salary": "$80k",
        "salary_inhand": "$70k",
        "salary_mode": "bank",
        "joining_date": "2022-01-15",
        "worked_till_date": null,
        "department": "Engineering",
        "still_working": 1,
        "skill": ["PHP", "Laravel"],
        "description": "...",
        "designation_name": "Software Engineer",
        "employment_type_name": "Full-time",
        "department_name": "Engineering",
        "company_name": "Acme Corp",
        "approved": 1
      }
    ],
    "educationList": [
      {
        "id": 5,
        "user": 1,
        "university": 10,
        "course": 3,
        "university_name": "MIT",
        "course_name": "CS",
        "course_type_name": "Bachelor",
        "country_name": "USA",
        "starting_date": "2010-09-01",
        "ending_date": "2014-06-01",
        "ongoing": 0,
        "ishighest": 1,
        "certificate": "https://s3.../cert.pdf"
      }
    ],
    "expertiseList": [
      { "id": 1, "skill": "PHP", "rating": 5 },
      { "skill": "Python" }
    ],
    "languageList": [
      { "id": 1, "language": 1, "verbal": 5, "written": 4, "language_name": "English" },
      { "language_name": "Spanish" }
    ],
    "certificateList": [
      {
        "id": 3,
        "user": 1,
        "university": "Coursera",
        "course": "ML",
        "start_date": "2023-01-01",
        "end_date": "2023-06-01",
        "ongoing": 0,
        "certificate": "https://s3.../cert.pdf",
        "certificate_id": "CERT-123",
        "url": "https://coursera.org/verify/123",
        "course_name": "Machine Learning",
        "university_name": "Coursera"
      }
    ]
  }
}
```
---

## 8. POST `employee/edit-profile`

### Route
```
POST /wapi/employee/edit-profile
```
### Auth
JWT required. `req.auth.id` = logged-in user.

### DB Queries
Multi-step profile update — all fields are optional, only provided fields are updated:

```
Step 1: Verify user exists
  SELECT * FROM user WHERE id = ? AND is_deleted = 0

Step 2: Upload profile image (if provided)
  - Upload to S3 via `uploadToS3` / `educationUpload` (multer)
  - S3 path stored in save['profile']
  - Old profile moved to save['social_image'] (backup)

Step 3: Upload cover image (if provided)
  - Same S3 upload flow
  - Old cover moved to save['cover_image_backup']

Step 4: Upload resume (if provided)
  - PDF/DOC upload to S3
  - Stored in save['resume'] + save['resumeName']

Step 5: Upload cover-letter (if provided)
  - S3 upload → save['cover_letter'] + save['cover_letter_name']

Step 6: Upload additional-documents (if provided)
  - S3 upload → save['additional_documents'] + save['additional_documents_name']

Step 7: Upload social-image (if provided)
  - S3 upload → save['social_image']

Step 8: Insert profile update history
  INSERT INTO profile_update_history (user, description)
  VALUES (?, 'Basic information save.')

Step 9: UPDATE user SET ... WHERE id = ?
  All collected fields merged into single UPDATE.
```
### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `fname` | string | No | First name |
| `lname` | string | No | Last name |
| `profile` | file | No | Profile image (multipart) |
| `cover` | file | No | Cover image |
| `resume` | file | No | PDF/DOC resume |
| `resumeName` | string | No | Resume filename |
| `cover_letter` | file | No | Cover letter PDF |
| `cover_letter_name` | string | No | Cover letter filename |
| `additional_documents` | file | No | Additional doc |
| `additional_documents_name` | string | No | Filename |
| `dob` | string | No | Date of birth |
| `gender` | string | No | Gender |
| `phone` | string | No | Phone number |
| `second_phone` | string | No | Alternate phone |
| `profile_description` | string | No | Bio/about |
| `country` | int | No | Country ID |
| `state` | int | No | State ID |
| `city` | int | No | City ID |
| `present_address` | string | No | Present address |
| `permanent_address` | string | No | Permanent address |
| `same_address` | int | No | 1 = same |
| `accomodation` | string | No | Accommodation type |
| `social_image` | string | No | Social image URL |
| `cover_image_backup` | string | No | Cover backup URL |
| `cover_image` | string | No | Cover image URL |
| `work_status` | int | No | Work status ID |
| `current_possition` | string | No | Current position |
| `current_company` | int | No | Current company ID |
| `industry` | int | No | Industry ID |
| `notice_period` | int | No | Notice period days |
| `notice_date` | string | No | Notice date |
| `on_explore` | int | No | 1 = exploring |
| `on_immediate` | int | No | 1 = available immediately |
| `on_notice` | int | No | 1 = on notice |
| `linkdin` | string | No | LinkedIn URL |
| `youtube` | string | No | YouTube URL |
| `instagram` | string | No | Instagram URL |
| `facebook` | string | No | Facebook URL |
| `twitter` | string | No | Twitter URL |

### Response
```json
{ "status": true, "messages": "Success!", "id": 1 }
```
```json
{ "status": false, "messages": "User not found" }
```
```json
{ "status": false, "messages": "Exception message" }
```
---

## 9. GET `employee/all-company`

### Route
```
GET /wapi/employee/all-company
```
### Auth
JWT required (but user not used in query — public company listing).

### DB Queries
```
MainModel::getAllCompanySearch(keyword, limit, offset)
  → SELECT * FROM user
    WHERE status = 1 AND user_type = 2 AND claim_status = 1
    AND fname LIKE '%{word1}%' AND fname LIKE '%{word2}%' ...
    ORDER BY fname ASC
    LIMIT {limit} OFFSET {offset}

Total count: returns countAllResults() when limit is false
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `search` | GET query string | No | Multi-word search (split on space) |
| `limit` | GET query string | No | Default: 10 |
| `offset` | GET query string | No | Default: 0 |
| `page` | GET query string | No | Alternative to offset (offset = page × 10) |
| `total` | GET query string | No | If `total=1`, returns count instead of rows |

### Response — Company list
```json
{
  "status": true,
  "messages": "Success!",
  "data": [
    {
      "id": 123,
      "fname": "Acme Corp",
      "slug": "acme-corp",
      "profile": "https://s3.../img.jpg"
    }
  ]
}
```
### Response — Total count (`total=1`)
```json
{
  "status": true,
  "messages": "Success!",
  "data": 42
}
```
---

## 10. GET `employee/user-detail`

### Route
```
GET /wapi/employee/user-detail
```
### Auth
JWT required. `req.auth.id` = logged-in user.

### DB Queries
Calls `getStatitcs`(user_id)` which returns a massive profile object. Key queries:

```
1. get_user_detail(user_id)
   → Full user row

2. ProfilePercentage(user_id)
   → Completion percentage breakdown

3. IF user_type = 1 (individual):
   - get_user_future_experience_coming(user_id)
     → Future-dated experience records (for reminder badge)
   - MainModel::fs('user_experience', where still_working=1)
     → Current job
   - get_user_experience_detail(stillWorking->id)
     → Current job details
   - MainModel::fs('account_delete_requests', where user_id)
     → Account deletion status
   - get_total_follower_count(user_id)
   - check_manual_verify_apply(user_id)

4. IF user_type = 2 (company):
   - get_all_connection(user_id)
   - MainModel::fs('company_job', where company + status=1)
     → exploreTalent flag
   - check_relation_record_exit(user_id)
   - check_event_permission(user_id, loginUserId)
```
### Request
No body params (user identified from JWT).

### Response — Individual (user_type = 1)
```json
{
  "status": true,
  "messages": "Success!",
  "data": {
    "id": 1,
    "loginauth": "jwt-token-here",
    "individual_id": "IND-001",
    "profile": "https://s3.../profile.jpg",
    "profile_type": 1,
    "profile_percentage": 75,
    "uncomplete": ["cover_letter"],
    "complete": ["fname", "email", "phone"],
    "incomplete": ["cover_letter", "resume"],
    "fname": "John",
    "lname": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "second_phone": "",
    "location": "New York",
    "work_status": 1,
    "work_status_name": "Employed",
    "current_position": "Engineer",
    "current_company": 5,
    "profile_description": "...",
    "linkdin": "https://linkedin.com/in/john",
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
    "present_address": "123 Main St",
    "country": 1,
    "dob": "1990-01-15",
    "city": 10,
    "state": 20,
    "industry": 3,
    "country_name": "USA",
    "city_name": "New York",
    "state_name": "NY",
    "industry_name": "Technology",
    "notice_period": 30,
    "on_explore": 1,
    "on_immediate": 1,
    "on_notice": 0,
    "exploring_option": [1, 2, 3],
    "expected_salary": "$100k",
    "expected_inhand": "$85k",
    "expected_mode": "bank",
    "slug": "john-doe",
    "resume": "https://s3.../resume.pdf",
    "resumeName": "John_Resume.pdf",
    "reminderExperience": true,
    "reminderExperienceList": [],
    "cvPop": true,
    "followCount": 12,
    "account_deletion": false,
    "manual_verify": false,
    "noticeEmployments": []
  }
}
```
### Response — Company (user_type = 2)
```json
{
  "status": true,
  "messages": "Success!",
  "data": {
    "id": 123,
    "loginauth": "jwt-token-here",
    "company_name": "Acme Corp",
    "contact_person": "Jane Admin",
    "email": "admin@acme.com",
    "profile": "https://s3.../logo.jpg",
    "website": "https://acme.com",
    "description": "...",
    "location": "New York",
    "user_type": "company",
    "totalConnection": 42,
    "profile_percentage": 90,
    "is_verified": true,
    "slug": "acme-corp",
    "incorporate_date": "2015-01-01",
    "turnover_name": "$1M-$5M",
    "company_size_name": "51-200",
    "industry_name": "Technology",
    "event_permission": true,
    "is_user_relation": 1,
    "account_deletion": false
  }
}
```
---

## Cross-Language Porting Notes

### companyDetail
- Slug lookup with permission guard — port the `checkMenuAccess` helper or replicate its logic (DB-based menu permission check).
- Response uses `json_encode()` not framework response object — raw JSON output.
- Company profile uses `get_company_detail()` — port the full JOIN query.

### markViewed
- Simple UPDATE with two WHERE conditions (`receiver` + `id`).
- Returns `json_encode()` directly (no framework wrapper).

### sidebarCount
- Returns unread notifications (with child counts for grouped notifications) + unread message count.
- Child notification grouping: for each unread notification, counts other notifications with same `parent_id`.

### leave_reminder_experience
- Dismisses the "future experience" reminder by setting `cvPop = 1`.
- `cvPop` controls whether the onboarding/reminder modal is shown.

### hired
- Simple count query on `user_experience` table.
- Returns integer count of past employment records.

### save_exploring
- Updates exploring preferences: `on_explore`, `on_immediate`, `on_notice`, `notice_period`, `expected_salary`, etc.
- `notice_employments` is a JSON array of experience IDs, stored as JSON string.
- `exploring_option` is a JSON array stored as string.

### cv_details
- **Heaviest endpoint** — merges DB data with parsed resume content.
- Resume parsing (`resume_parse()`) extracts: education, employment history, skills, languages from uploaded PDF/DOC.
- CV data is appended only when no duplicate exists in DB (by university+course or company name).
- CV-parsed skills/languages have no `id` or `rating` fields.

### edit-profile
- Multi-file upload endpoint (profile, cover, resume, cover-letter, additional-docs, social-image).
- Each file upload is independent — only provided files are uploaded.
- Old files backed up to `*_backup` fields before overwrite.
- Inserts into `profile_update_history` on every save.

### all-company
- `MainModel::getAllCompanySearch()` — multi-word LIKE search across company `fname`.
- Returns company list OR total count (when `total=1`).
- Only returns companies with `claim_status = 1`.

### user-detail
- Calls `getStatitcs`()` — a massive function returning user profile + stats.
- Response shape varies by `user_type` (individual vs company).
- Individual response includes: profile percentage, exploring state, future experience reminders, follower count, account deletion status.
- Company response includes: connection count, event permissions, explore-talent flag, user-relation status.
