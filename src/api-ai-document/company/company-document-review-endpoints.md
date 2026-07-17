
# Company Document, Review, Help & Application Endpoints

**Base path:** `/wapi` (all endpoints in `wapi` group with `Auth` filter, JWT Bearer token required)

---

## Routes Summary

| Method | Route | Handler | Node | Description |
|--------|-------|---------|------|-------------|
| POST | `company/add-document` | `CompanyApi::addDocument` | **Yes** | Upload company documents (multipart) |
| GET | `company/all-review` | `CompanyApi::allReview` | Yes | List all reviews for company's employees |
| POST | `company/add-review` | `CompanyApi::addReview` | Yes | Create new review |
| POST | `company/add-review/(:num)` | `CompanyApi::addReview/$1` | Yes | Update existing review |
| PUT | `company/rejectReview/(:num)` | `CompanyApi::rejectReview/$1` | Yes | Reject a review request |
| GET | `company/view-review/(:num)` | `CompanyApi::view_review_Detail/$1` | Yes | View reviews for specific experience |
| POST | `company/add-help` | `CompanyApi::addHelp` | Yes | Submit help request for experience |
| GET | `company/allapplication` | `CompanyApi::allApplication` | Yes | List job applications |
| PUT | `company/updateBasicExperience/(:num)` | `CompanyApi::updateBasicExperience/$1` | Yes | Approve employee experience update |

---

## 1. POST `company/add-document`

### Node status: **implemented**

| Item | Value |
|------|--------|
| Route | `POST /wapi/company/add-document` |
| Files | `company.route.ts` → `addCompanyDocument` → `addCompanyDocumentService` → `company.repositery.createCompanyDocument` |
| Content-Type | `multipart/form-data` |
| Fields | `doctype` (array or single), `document` files (parallel to doctype) |
| DB | `cyb_company_document` |

### Success
```json
{ "status": true, "messages": "Successfully added" }
```

### Errors (legacy strings)
```json
{ "status": false, "messages": "Doc Type field is required" }
```
```json
{ "status": false, "messages": "document not uploaded" }
```
```json
{ "status": false, "messages": "Something Went Wrong" }
```

Full contract: [remaining-misc-crud-endpoints.md §5](../remaining-misc-crud-endpoints.md).

---

## 2. GET `company/all-review`

### Route
```
GET /wapi/company/all-review
```

### Auth
JWT required. `$this->request->id` = company ID.

### DB Queries
```
1. UserModel::get_all_user_experience($filter) with lastReview=2 (exclude lastReview)
   → All approved employment records for company

2. UserModel::get_all_user_experience($filter) with lastReview=1 (only lastReview)
   → Employment records flagged for last review

3. For each experience: CompanyModel::get_all_experience_rating($experienceId)
   → All reviews for that experience

4. For each review:
   - UserModel::get_skill_based_rating_average($reviewId) → average rating
   - UserModel::get_reviews_with_skills($reviewId) → skill-based ratings
   - UserModel::get_rating_history($reviewId) → edit history

5. Experiences with no reviews but approved employment: status = 'employment'
```

### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `keyword` | GET query string | No | Search filter |
| `user_id` | GET query string | No | Filter by specific user |

### Response
```json
{
  "status": true,
  "messages": "review list",
  "data": {
    "pending_count": 2,
    "active_count": 5,
    "employement_count": 3,
    "allcount": 10,
    "pendingData": [
      {
        "id": 10,
        "user": "John Doe",
        "profile": "https://s3.../profile.jpg",
        "rating": 4,
        "review": "Great employee...",
        "designation": "Software Engineer",
        "approved": 0,
        "status": "pending",
        "doc": ["https://s3.../cert.pdf"],
        "edits": 1,
        "last_edit": "2024-06-15 10:30:00",
        "hours_left": "2024-06-18 10:30:00",
        "link": "https://...",
        "averageRating": 4.2,
        "skill_rating": [{"skill": "PHP", "rating": 5}],
        "history": [{"rating": 4, "review": "...", "create_date": "..."}],
        "experience_id": 20,
        "still_working": 1,
        "lastReview": 0,
        "user_slug": "john-doe"
      }
    ],
    "completeData": [],
    "allEmployee": [],
    "lastReviewArr": []
  }
}
```

### Notes
- Three categories: `pendingData` (approved=0), `completeData` (approved=1), `allEmployee` (all including employment-only).
- `status`: `"complete"` (approved=1), `"pending"` (approved=0), `"employment"` (no review yet, just employment record).
- `hours_left`: review edit expiry timestamp (72-hour window from creation).
- `edits`: count of review history entries (max 3 edits allowed).

---

## 3. POST `company/add-review` (Create / Update)

### Route
```
POST /wapi/company/add-review         → Create new review
POST /wapi/company/add-review/{id}    → Update existing review
```

### Auth
JWT required. `$this->request->id` = company ID.

### Side Effects (Non-CRUD)
Triggers notifications via SQS:
1. **Push notification** → to employee
2. **Email** → to employee (template 69: "review_completion_notification_employee")
3. **Email** → to company (template 70: "review_completion_notification_company")
4. **WhatsApp** → to company (campaign 212)

### DB Queries
```
1. Validate experience exists: SELECT * FROM user_experience WHERE id = {experienceId}

2. IF update ($id provided):
   a. SELECT * FROM user_experience_rating WHERE id = {$id}
   b. Check edit count: SELECT COUNT(*) FROM user_experience_rating_history WHERE rating_id = {$id}
      → Max 3 edits allowed
   c. Check expiry: IF expiry < NOW() → "Can't modify after 72 hours"
   d. UPDATE user_experience_rating SET approved=1, show_review, create_date=NOW()
   e. INSERT INTO user_experience_rating_history

3. IF create (no $id):
   a. Check if experience already has review (for still_working=0, max 2 history entries)
   b. INSERT INTO user_experience_rating (company, experience, rating, review, link, doc, expiry=+72h, approved=1)
   c. INSERT INTO user_experience_rating_history (alias entry)
   d. Clear lastReview flag on experience

4. INSERT INTO notifications
5. SQS push: SEND_PUSH, SEND_EMAIL (employee + company), SEND_WHATSAPP
```

### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `experience_id` or `experience` | int | Yes | Experience ID to review |
| `rating` | int | Yes | Numeric rating |
| `review` | string | Yes | Review text |
| `link` | string | No | External link |
| `show_review` | int | No | 1 = show publicly, 0 = hide |
| `document` | file[] | No | Multiple files, max 2MB each (PNG/JPG/PDF/DOC/SVG/WEBP) |

### Response
```json
{ "status": true, "messages": "Successfully added" }
```
```json
{ "status": false, "messages": "No More Edits allowed" }
{ "status": false, "messages": "Can't modify after 72 hours" }
{ "status": false, "messages": "rating,review are required." }
```

### Notes
- **72-hour edit window**: review can be edited within 72 hours of creation.
- **Max 3 edits**: after 3 history entries, no more edits allowed.
- For past employment (`still_working=0`): max 2 history entries.
- Documents stored as JSON-encoded array of S3 URLs.
- `approved` is always set to `1` on create/update (auto-approved by company).
- `expiry` calculated as `create_date + 72 hours`.

---

## 4. PUT `company/rejectReview/(:num)`

### Route
```
PUT /wapi/company/rejectReview/{id}
```
- `(:num)` → `$id` — review ID

### Auth
JWT required. `$this->request->id` = company ID.

### Side Effects (Non-CRUD)
Triggers emails via SQS:
1. **Email** → to employee (template 75: "review_request_rejected_by_employer_user")
2. **Email** → to company (template 76: "review_request_rejected_by_employer_company")

### DB Queries
```
1. SELECT * FROM user_experience_rating WHERE company = {companyId} AND id = {reviewId}
   → Verify review belongs to company

2. UPDATE user_experience_rating SET approved = 2 WHERE id = {reviewId}
   → Rejected status

3. UserModel::get_user_experience_detail($experienceId)
   → Get employee details for email

4. SQS push: SEND_EMAIL (employee + company)
```

### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `$id` | URL segment | Yes | Review ID |

### Response
```json
{ "status": true, "messages": " Review rejected Sucessfully!" }
```
```json
{ "status": false, "messages": "Access Denied! " }
```

### Notes
- Sets `approved = 2` (rejected). Different from `0` (pending) and `1` (approved).
- Sends rejection notification to both employee and company.

---

## 5. GET `company/view-review/(:num)`

### Route
```
GET /wapi/company/view-review/{id}
```
- `(:num)` → `$id` — experience ID

### Auth
JWT required. `$this->request->id` = company ID.

### DB Queries
```
1. UserModel::get_experience_detail($id)
   → Experience + user details

2. UserModel::get_all_experience_rating($filter)
   → All reviews for this experience

3. For each review: UserModel::get_rating_history($reviewId)
   → Edit history
```

### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `$id` | URL segment | Yes | Experience ID |

### Response
```json
{
  "status": true,
  "messages": "review edit list",
  "data": {
    "user": "John Doe",
    "profile": "https://s3.../profile.jpg",
    "designation": "Software Engineer",
    "review": [
      {
        "id": 10,
        "user": "John Doe",
        "rating": 4,
        "review": "Great employee...",
        "designation": "Software Engineer",
        "approved": 1,
        "status": "complete",
        "doc": "https://s3.../cert.pdf",
        "edits": 2,
        "last_edit": "2024-06-15 10:30:00",
        "hours_left": "2024-06-18 10:30:00",
        "history": [
          {"rating": 4, "review": "Updated review...", "create_date": "..."},
          {"rating": 3, "review": "Initial review...", "create_date": "..."}
        ]
      }
    ]
  }
}
```

### Error Responses
```json
{ "status": false, "messages": "No experience found!" }
```

### Notes
- Returns all reviews for a specific experience (employee's work history).
- `history` array is ordered by `id DESC` (latest first).

---

## 6. POST `company/add-help`

### Route
```
POST /wapi/company/add-help
```

### Auth
**Custom auth** — extracts token from `Authorization` header (does not use `$this->request->id`).

### DB Queries
```
1. SELECT * FROM user WHERE token = ? AND status = 1
   → Verify company

2. INSERT INTO help (company, experience, subject, message, create_date)
```

### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | int | Yes | Experience ID |
| `subject` | string | Yes | Help subject |
| `message` | string | Yes | Help message |

### Response
```json
{ "status": true, "messages": "Successfully added" }
```
```json
{ "status": false, "messages": "id,subject,message are required." }
{ "status": false, "messages": "Token Expired" }
{ "status": false, "messages": "Token is missing" }
{ "status": false, "messages": "Method Not Found" }   // if not POST
```

### Notes
- Uses legacy auth (token header lookup) instead of `$this->request->id`.
- Creates a help/support ticket tied to an experience.

---

## 7. GET `company/allapplication`

### Route
```
GET /wapi/company/allapplication
```

### Auth
JWT required. `$this->request->id` = company ID.
Checks collaborator access — if user is a collaborator, verifies job belongs to their assigned jobs.

### DB Queries
```
1. CompanyModel::get_colloborator_companyIds($userId)
   → Get company IDs and job IDs where user is a collaborator

2. CompanyModel::getAllApplication($filter)
   → Paginated list of applications for the job

   For each applicant:
   - UserModel::user_verified($userId) → is_verified
   - UserModel::get_user_rating($userId) → rating
   - UserModel::getoverallprofileScore($userId) → userRating
   - show_exploring() → on_explore visibility

3. CompanyModel::getAllApplication($filter) without limit → total count
```

### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `job` | GET query string | Yes | Job ID (comma-separated, uses first) |
| `keyword` | GET query string | No | Search filter |
| `limit` | GET query string | No | Default: 50 |
| `offset` | GET query string | No | Page-based |

### Response
```json
{
  "status": true,
  "messages": "Application",
  "job_title": "Software Engineer",
  "data": [
    {
      "id": 100,
      "job": "Software Engineer",
      "job_slug": "software-engineer-new-york-...",
      "user_id": 1,
      "individual_id": "IND-001",
      "fname": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "city_name": "New York",
      "state_name": "NY",
      "country_name": "USA",
      "profile": "https://s3.../profile.jpg",
      "slug": "john-doe",
      "company_name": "Previous Co",
      "designation_name": "Engineer",
      "present_address": "123 Main St",
      "profile_description": "...",
      "date": "2024-06-15 10:30:00",
      "resume": "https://s3.../resume.pdf",
      "resumeName": "John_Resume.pdf",
      "expected_salary": "$100k",
      "notice_period": 30,
      "notice_date": "2024-07-01",
      "isVerified": true,
      "rating": {"noofrecord": 3, "avgRating": 4.5},
      "userRating": 4.2,
      "on_explore": 1,
      "on_immediate": 1,
      "on_notice": 0
    }
  ],
  "totalCounts": 25
}
```

### Notes
- `job` param is comma-separated; only the first value is used.
- Collaborators can only see applications for jobs they're assigned to.
- `totalCounts` is the total unpaginated count.
- Applicant data includes: profile, resume, expected salary, notice period, exploring status.

---

## 8. PUT `company/updateBasicExperience/(:num)`

### Route
```
PUT /wapi/company/updateBasicExperience/{id}
```
- `(:num)` → `$id` — `user_update_experience` record ID

### Auth
JWT required. `$this->request->id` = company ID.

### DB Queries
```
1. SELECT * FROM user_update_experience WHERE id = {id}
   → $row (pending update request from employee)

2. SELECT * FROM user WHERE id = {row->user}
   → $userCurrentDetail

3. SELECT * FROM user_experience WHERE id = {row->experience_id}
   → $experiencDetail

4. IF type = 1 (leave/end employment):
   a. UPDATE user_experience SET still_working=0, worked_till_date={date}
   b. IF user's current_company matches this company:
      UPDATE user SET current_company=NULL, current_possition=NULL
   c. Calculate expiry (72 hours from end date or adjusted if past)
   d. UPDATE user_experience SET expiry={calculated}

5. IF type = 2 (promotion/salary change):
   a. UPDATE user_experience SET salary, designation, salary_inhand, salary_mode
   b. IF still_working AND matches current_company:
      UPDATE user SET current_possition={new_designation}
   c. IF no current_company set:
      UPDATE user SET current_possition, current_company

6. DELETE FROM user_update_experience WHERE id = {id}
   → Remove the pending request after applying
```

### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `$id` | URL segment | Yes | user_update_experience record ID |

### Response
```json
{ "status": true, "messages": "Update successfully !" }
```
```json
{ "status": false, "messages": "Record not found!" }
{ "status": false, "messages": "Access denied" }
```

### Notes
- **Two types of updates**: `type=1` = leave employment, `type=2` = promotion/salary change.
- On leave: clears `current_company` and `current_possition` on user profile.
- On promotion: updates `current_possition` (and `current_company` if empty).
- The pending request record is **deleted** after being applied.
- Review expiry is recalculated based on the end date for leave updates.

---

## Cross-Language Porting Notes

### addDocument
- **Implemented in Node:** `POST /wapi/company/add-document` → `addCompanyDocumentService` / `cyb_company_document`.

### allReview
- Complex aggregation: merges regular reviews + lastReview-flagged employment records.
- Three output buckets: `pendingData`, `completeData`, `allEmployee`.
- `status` values: `"complete"`, `"pending"`, `"employment"` (no review yet).
- Review history tracked in `user_experience_rating_history` table.
- Max 3 edits per review, 72-hour edit window.

### addReview (Create/Update)
- **Triple-purpose**: create review, update review, or edit existing.
- Auto-approved (`approved=1`) on create/update by company.
- 72-hour edit window enforced via `expiry` field.
- Max 3 history entries per review.
- Documents stored as JSON array of S3 URLs.
- Triggers push + email (employee + company) + WhatsApp.

### rejectReview
- Sets `approved = 2` (rejected status).
- Sends rejection email to both employee and company.

### view_review_Detail
- Returns all reviews for a specific experience (employee work history).
- Includes full edit history per review.

### addHelp
- Creates support ticket in `help` table tied to an experience.
- Uses legacy auth (token header).

### allApplication
- Paginated list of job applicants.
- Collaborator access control: only see applications for assigned jobs.
- Rich applicant data: resume, salary expectations, notice period, exploring status.

### updateBasicExperience
- Applies employee-requested changes (leave or promotion).
- Two types: `type=1` = leave (clears current position), `type=2` = promotion (updates designation/salary).
- Deletes the pending request after applying.
- Recalculates review expiry on leave.
