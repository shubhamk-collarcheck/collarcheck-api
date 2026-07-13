
# Employee Job, Dashboard & View Request API Endpoints

## Overview

Thirteen REST endpoints for job applications, dashboard summary, profile view requests, employment approval, and resume management. All require JWT authentication. Email/notification triggers are handled separately.

---

## Authentication

- **Filter:** `Authenticate` (CodeIgniter 4 filter applied to route group `wapi`)
- **Header:** `Authorization: Bearer <jwt_token>`
- **JWT decode:** Extract `uid` claim → look up `user` table WHERE `id = uid`, `status = 1`, `is_deleted = 0`
- **Optional override:** Send `X-Company` header with a different user ID to act on behalf of that user
- **Injected request property:** `$this->request->id` → the acting user ID

---

## Routes

| Method   | Path                                        | Controller Method                       | Description                           |
|----------|---------------------------------------------|-----------------------------------------|---------------------------------------|
| `POST`   | `/wapi/employee/apply-job`                  | `IndividualApi::applyJob`               | Apply to a job                        |
| `GET`    | `/wapi/employee/all-user`                   | `IndividualApi::allUser`                | ⚠️ NOT IMPLEMENTED (returns 404)     |
| `GET`    | `/wapi/employee/applyJobList`               | `IndividualApi::applyJobList`           | List all applied job IDs              |
| `GET`    | `/wapi/employee/ProfilePercentage`          | `IndividualApi::ProfilePercentage`      | Get profile completion percentage     |
| `PUT`    | `/wapi/employee/approvedEmployment/{id}`    | `IndividualApi::approvedEmployment`     | Approve employment verification       |
| `GET`    | `/wapi/employee/AllViewRequest`             | `IndividualApi::AllViewRequest`         | List all profile view requests        |
| `POST`   | `/wapi/employee/approvedVeiwRequest`        | `IndividualApi::approvedVeiwRequest`    | Approve a profile view request        |
| `PUT`    | `/wapi/employee/rejectVeiwRequest/{id}`     | `IndividualApi::rejectVeiwRequest`      | Reject a profile view request         |
| `DELETE` | `/wapi/employee/deleteViewRequest/{id}`     | `IndividualApi::deleteViewRequest`      | Soft-delete a view request            |
| `GET`    | `/wapi/employee/checkCurrentCompany`        | `IndividualApi::checkCurrentCompany`    | Check current company employment      |
| `GET`    | `/wapi/employee/dashboard`                  | `IndividualApi::dashboard`              | Dashboard summary data                |
| `GET`    | `/wapi/employee/appliedjob`                 | `IndividualApi::appliedjob`             | Paginated list of applied jobs        |
| `DELETE` | `/wapi/employee/remove-resume`              | `IndividualApi::removeResume`           | Remove uploaded resume                |

---

## Common Response Envelope

Returns `Content-Type: application/json`:

| Key        | Type             | Description                                 |
|------------|------------------|---------------------------------------------|
| `status`   | boolean          | `true` for success, `false` for errors      |
| `messages` | string           | Human-readable status/error message         |
| `data`     | array / object   | Payload (absent on errors)                  |

---

## Endpoint 1: POST Apply to Job

**Path:** `POST /wapi/employee/apply-job`

### Database Table: `application`

| Column        | Type     | Notes                            |
|---------------|----------|----------------------------------|
| `id`          | int (PK) |                                  |
| `job`         | int      | FK to `company_job.id`           |
| `user`        | int      | FK to `user.id` (employee)       |
| `create_date` | datetime |                                  |
| `modify_date` | datetime |                                  |

### Request Format
`application/x-www-form-urlencoded` or `multipart/form-data`

### Fields

| Field | Required | Type | Description     |
|-------|----------|------|-----------------|
| `job` | **Yes**  | int  | Job ID          |

### Query Logic
```sql
-- 1. Validate job exists
SELECT * FROM company_job WHERE id = :jobId AND status = 1

-- 2. Check if already applied
SELECT * FROM application WHERE job = :jobId AND user = :authUserId

-- 3. Insert
INSERT INTO application (job, user, create_date, modify_date)
VALUES (:jobId, :authUserId, NOW(), NOW())
```

### Response (Success)
```json
{
  "status": true,
  "messages": "Successfully Applied"
}
```

### Response (Already Applied)
```json
{
  "status": false,
  "messages": "Already Applied"
}
```

### Response (Invalid Job)
```json
{
  "status": false,
  "messages": "Invalid Job id"
}
```

### Response (Validation Error)
```json
{
  "status": false,
  "messages": "The Job field is required."
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 2: GET All User (⚠️ NOT IMPLEMENTED)

**Path:** `GET /wapi/employee/all-user`

The route references `IndividualApi::allUser` but this method does **not exist** in the controller. Will return a 404.

---

## Endpoint 3: GET Applied Job ID List

**Path:** `GET /wapi/employee/applyJobList`

Returns a flat array of job IDs the user has applied to (for active jobs only).

### Query Logic
```sql
SELECT app.job
FROM application app
LEFT JOIN company_job cj ON app.job = cj.id
WHERE cj.status = 1
  AND app.user = :authUserId
```

### Response
```json
{
  "status": true,
  "messages": "Applied Lists",
  "data": [42, 87, 103]
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 4: GET Profile Percentage

**Path:** `GET /wapi/employee/ProfilePercentage`

Returns the profile completion percentage with breakdown. Logic differs for `user_type = 1` (individual) vs `user_type = 2` (company).

### Profile Fields Checked (Individual — `user_type = 1`)

| Field                | Points | Weight |
|----------------------|--------|--------|
| `profile` (image)    | 2      | 2%     |
| `email`              | 2      | 2%     |
| `email_verified`     | 3      | 3%     |
| `phone`              | 2      | 2%     |
| `phone_verified`     | 3      | 3%     |
| `dob`                | 3      | 3%     |
| `gender`             | 2      | 2%     |
| `city`               | 2      | 2%     |
| `state`              | 2      | 2%     |
| `accomodation`       | 2      | 2%     |
| `work_status`        | 2      | 2%     |
| `country`            | 2      | 2%     |
| `current_company`    | 2      | 2%     |
| `current_possition`  | 2      | 2%     |
| `profile_description`| 5      | 5%     |
| `expected_salary`    | 2      | 2%     |
| `user_experience`    | 5      | 5%     |
| `user_experience_approved` | 10 (ind) / 15 (intl) | 10-15% |
| `user_education`     | 10     | 10%    |
| `user_skill`         | 2      | 2%     |
| `user_certificate`   | 2      | 2%     |
| `user_language`      | 2      | 2%     |
| `review`             | 10-15  | 10-15% |

> International users (country != 101/India) get higher weights for experience_approved and review.

### Response
```json
{
  "status": true,
  "messages": "profile percentage",
  "data": {
    "total": 78,
    "complete": {
      "profile": "2",
      "email": "2",
      "email_verified": "3",
      "phone": "2",
      "phone_verified": "3",
      "dob": "3",
      "gender": "2",
      "profile_description": "5"
    },
    "uncomplete": [
      "City",
      "State",
      "Country"
    ],
    "incomplete": [
      { "key": "City", "value": "2%" },
      { "key": "State", "value": "2%" },
      { "key": "Country", "value": "2%" }
    ]
  }
}
```

| Key          | Type             | Description                                    |
|--------------|------------------|------------------------------------------------|
| `total`      | int              | Total points accumulated (not percentage)      |
| `complete`   | object           | Key-value pairs of completed fields + points   |
| `uncomplete` | string[]         | Array of missing field labels                  |
| `incomplete` | object[]         | Array of `{ key, value }` for missing fields   |

---

## Endpoint 5: PUT Approve Employment

**Path:** `PUT /wapi/employee/approvedEmployment/{id}`

Approves an employment record and sets `status = 1`. If the user has no `current_company` set and `still_working = 1`, updates the user's current company/position.

### Database Table: `user_experience`

| Column        | Type     | Notes                                  |
|---------------|----------|----------------------------------------|
| `id`          | int (PK) |                                        |
| `user`        | int      | FK to `user.id` (employee)             |
| `company`     | int      | FK to `user.id` (company)              |
| `designation` | int      | FK to `designation.id`                 |
| `still_working`| tinyint | `1` = currently employed               |
| `status`      | tinyint | Updated to `1` on approval             |
| `approved`    | tinyint | `1`=approved, `2`=rejected             |

### Query Logic
```sql
-- 1. Verify ownership
SELECT * FROM user WHERE id = :authUserId AND status = 1

-- 2. Verify experience belongs to user
SELECT * FROM user_experience WHERE user = :authUserId AND id = :id

-- 3. Approve
UPDATE user_experience SET status = 1 WHERE id = :id

-- 4. If user has no current_company and still_working = 1:
UPDATE user SET current_possition = :designation, current_company = :company WHERE id = :authUserId
```

### Response (Success)
```json
{
  "status": true,
  "messages": "Approved successfully!"
}
```

### Response (Not Found / No Permission)
```json
{
  "status": false,
  "messages": "The requested employment details could not be found, or you do not have permission to access them."
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 6: GET All View Requests

**Path:** `GET /wapi/employee/AllViewRequest`

Returns a paginated list of profile view requests and pending follow requests.

### Query Parameters

| Param    | Required | Type   | Default | Description            |
|----------|----------|--------|---------|------------------------|
| `limit`  | No       | int    | 15      | Results per page        |
| `offset` | No       | int    | 0       | Page number (1-based)   |

### Query Logic
```sql
-- View requests (from companies requesting to see profile)
SELECT upv.id, upv.create_date, upv.expiry, upv.status,
       cmp.fname AS company_name, cmp.claim_status, cmp.profile, cmp.slug,
       cmp.individual_id, cmp.user_type,
       cty.name AS city_name, st.name AS state_name, ctry.name AS country_name,
       dg.name AS designation_name
FROM user_profile_view_request upv
LEFT JOIN user cmp ON upv.companyid = cmp.id
LEFT JOIN user ur ON upv.userid = ur.id
LEFT JOIN cities cty ON ur.city = cty.id
LEFT JOIN state st ON ur.state = st.id
LEFT JOIN country ctry ON ur.country = ctry.id
LEFT JOIN designation dg ON ur.current_possition = dg.id
WHERE upv.userid = :authUserId AND upv.is_deleted = 0
ORDER BY upv.create_date DESC
LIMIT :limit OFFSET :offset

-- Pending follow requests (status = 0)
SELECT fl.*, ur.fname, ur.lname, ur.profile, ur.slug, ur.individual_id,
       ur.on_explore, ur.on_immediate, ur.on_notice, ur.user_type,
       cty.name AS city_name, st.name AS state_name, ctry.name AS country_name,
       dg.name AS designation_name
FROM follow fl
LEFT JOIN user ur ON fl.followed_id = ur.id
LEFT JOIN cities cty ON ur.city = cty.id
LEFT JOIN state st ON ur.state = st.id
LEFT JOIN country ctry ON ur.country = ctry.id
LEFT JOIN designation dg ON ur.current_possition = dg.id
WHERE fl.follower_id = :authUserId AND fl.status = 0 AND fl.is_deleted = 0
LIMIT :limit OFFSET :offset
```

### Response Shape
```json
{
  "status": true,
  "messages": "All view request List",
  "data": {
    "viewReqest": [
      {
        "id": 1,
        "individual_id": "CC001",
        "company_name": "Acme Corp",
        "claim_status": 1,
        "profile": "https://s3.amazonaws.com/bucket/profile.jpg",
        "slug": "acme-corp",
        "create_date": "2024-06-15 10:30:00",
        "status": 1,
        "expiry": "2024-06-22 10:30:00",
        "user_type": 2,
        "designation_name": "HR Manager",
        "country_name": "India",
        "state_name": "Maharashtra",
        "city_name": "Mumbai"
      }
    ],
    "follow": [
      {
        "id": 5,
        "individual_id": "CC002",
        "name": "John Doe",
        "profile": "https://s3.amazonaws.com/bucket/profile.jpg",
        "slug": "john-doe",
        "user_type": 1,
        "create_date": "2024-06-14 08:00:00",
        "designation_name": "Software Engineer",
        "country_name": "India",
        "state_name": "Karnataka",
        "city_name": "Bangalore",
        "on_explore": 1,
        "on_immediate": 1,
        "on_notice": 0
      }
    ],
    "allRequestCount": 25,
    "followListCount": 12
  }
}
```

| Key                | Type             | Description                                  |
|--------------------|------------------|----------------------------------------------|
| `viewReqest`       | object[]         | Profile view requests from companies         |
| `follow`           | object[]         | Pending follow requests                      |
| `allRequestCount`  | int              | Total view request count (no pagination)     |
| `followListCount`  | int              | Total follow count (no pagination)           |

> **Note:** `on_explore` in the `follow` list is only set to `1` if the followed user has explore enabled AND the authenticated user is within their allowed audience (via `show_exploring` check). `on_immediate` and `on_notice` are only populated when `on_explore == 1`.

---

## Endpoint 7: POST Approve View Request

**Path:** `POST /wapi/employee/approvedVeiwRequest`

Approves a profile view request, granting the company access to the employee's profile for a specified number of days.

### Request Format
`application/x-www-form-urlencoded`

### Fields

| Field   | Required | Type         | Description                                         |
|---------|----------|-------------|-----------------------------------------------------|
| `id`    | **Yes**  | int         | View request ID (`user_profile_view_request.id`)    |
| `access`| No       | array/string| Access levels (default: `['1', '2']`)              |
| `day`   | No       | int         | Number of days to grant access (default: `1`)       |

### Database Table: `user_profile_view_request`

| Column     | Type     | Notes                                              |
|------------|----------|----------------------------------------------------|
| `id`       | int (PK) |                                                    |
| `userid`   | int      | FK to `user.id` (employee)                         |
| `companyid`| int      | FK to `user.id` (company)                          |
| `status`   | tinyint  | `0`=pending, `1`=approved (toggled)                |
| `expiry`   | datetime | Computed as `NOW() + day days`                     |
| `access`   | text     | JSON array of access level IDs                     |
| `is_deleted`| tinyint | `0`=active                                         |
| `create_date`| datetime |                                                  |

### Query Logic
```sql
-- 1. Verify request belongs to user
SELECT * FROM user_profile_view_request WHERE userid = :authUserId AND id = :id

-- 2. Toggle status (0→1 or 1→0)
UPDATE user_profile_view_request
SET status = :toggledStatus,
    expiry = :expiry,        -- NOW() + :day days
    access = :accessJson     -- JSON array
WHERE id = :id
```

### Response (Success)
```json
{
  "status": true,
  "messages": "Approved successfully!"
}
```

### Response (Not Found)
```json
{
  "status": false,
  "messages": "Record not found!"
}
```

### Response (Validation Error)
```json
{
  "status": false,
  "messages": "The id field is required."
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 8: PUT Reject View Request

**Path:** `PUT /wapi/employee/rejectVeiwRequest/{id}`

Sets the status of a view request to `0` (pending/rejected).

### Query Logic
```sql
SELECT * FROM user_profile_view_request WHERE userid = :authUserId AND id = :id

UPDATE user_profile_view_request SET status = 0 WHERE id = :id
```

### Response (Success)
```json
{
  "status": true,
  "messages": "Reject successfully!"
}
```

### Response (Not Found)
```json
{
  "status": false,
  "messages": "Record not found!"
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 9: DELETE View Request (Soft-Delete)

**Path:** `DELETE /wapi/employee/deleteViewRequest/{id}`

Soft-deletes a view request by setting `is_deleted = 1`.

### Query Logic
```sql
-- 1. Verify user exists and request belongs to them
SELECT * FROM user WHERE id = :authUserId
SELECT * FROM user_profile_view_request WHERE userid = :authUserId AND id = :id AND is_deleted = 0

-- 2. Soft-delete
UPDATE user_profile_view_request SET is_deleted = 1 WHERE userid = :authUserId AND id = :id
```

### Response (Success)
```json
{
  "status": true,
  "messages": "Delete successfully!"
}
```

### Response (Not Found)
```json
{
  "status": false,
  "messages": "Record not found!!"
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 10: GET Check Current Company

**Path:** `GET /wapi/employee/checkCurrentCompany`

Checks if the user is currently employed at other companies (excluding a specific employment ID). Used to determine if a user is switching employers.

### Query Parameters

| Param          | Required | Type | Description                                |
|----------------|----------|------|--------------------------------------------|
| `employment_id`| No       | int  | Employment ID to exclude from results      |

### Query Logic
```sql
SELECT * FROM user_experience
WHERE user = :authUserId
  AND still_working = 1
  AND is_deleted = 0
```

Filters out the row matching `employment_id` from the results.

### Response Shape
```json
{
  "status": true,
  "data": {
    "currentWorking": true,
    "ids": [
      {
        "id": 7,
        "company_name": "Acme Corp",
        "department_name": "Engineering",
        "designation_name": "Software Engineer"
      }
    ]
  }
}
```

| Key              | Type             | Description                                  |
|------------------|------------------|----------------------------------------------|
| `currentWorking` | boolean          | `true` if other current employments exist     |
| `ids`            | object[]         | List of other current employment records      |

### Response (Exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

---

## Endpoint 11: GET Dashboard

**Path:** `GET /wapi/employee/dashboard`

Returns a comprehensive dashboard summary with counts, skills, pending follow requests, and current employment details.

### Response Shape
```json
{
  "status": true,
  "data": {
    "jobsApplieds": 15,
    "connections": 42,
    "followRequests": 3,
    "messages": 5,
    "percentage": {
      "total": 78,
      "complete": { "profile": "2", "email": "2" },
      "uncomplete": ["City", "State"],
      "incomplete": [{ "key": "City", "value": "2%" }]
    },
    "followList": [
      {
        "id": 5,
        "status": 0,
        "create_date": "2024-06-14 08:00:00",
        "fname": "John",
        "lname": "Doe",
        "profile": "https://s3.amazonaws.com/bucket/profile.jpg",
        "slug": "john-doe",
        "user_type": 1,
        "individual_id": "CC002",
        "designation_name": "Software Engineer",
        "company_name": "Globex",
        "state_name": "Karnataka",
        "country_name": "India"
      }
    ],
    "skillList": [
      { "id": 1, "skill": "JavaScript", "rating": 5 },
      { "id": 2, "skill": "React", "rating": 4 }
    ],
    "currentEmployees": [ ... ]
  }
}
```

| Key              | Type             | Description                                    |
|------------------|------------------|------------------------------------------------|
| `jobsApplieds`   | int              | Total count of jobs applied                    |
| `connections`    | int              | Total accepted connections                     |
| `followRequests` | int              | Pending follow requests count                  |
| `messages`       | int              | Unread messages count                          |
| `percentage`     | object           | Profile completion breakdown (same as Endpoint 4)|
| `followList`     | object[]         | Top 10 pending follow requests                 |
| `skillList`      | object[]         | User skills with ratings, sorted by rating desc|
| `currentEmployees` | object[]      | Detailed current employment records            |

### Response (Exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

---

## Endpoint 12: GET Applied Jobs (Paginated)

**Path:** `GET /wapi/employee/appliedjob`

Returns a paginated list of jobs the user has applied to, with full job details.

### Query Parameters

| Param    | Required | Type   | Default | Description         |
|----------|----------|--------|---------|---------------------|
| `limit`  | No       | int    | 16      | Results per page     |
| `offset` | No       | int    | 0       | Page number (1-based)|

### Response Shape
```json
{
  "status": true,
  "data": {
    "jobsApplieds": [
      {
        "id": 1,
        "job": 42,
        "user": 10,
        "create_date": "2024-06-15 10:30:00",
        "job_title": "Software Engineer",
        "slug": "software-engineer",
        "fname": "Acme Corp",
        "profile": "https://s3.amazonaws.com/bucket/logo.jpg",
        "city_name": "Mumbai",
        "state_name": "Maharashtra",
        "country_name": "India",
        "industry_name": "Technology",
        "department_name": "Engineering",
        "experience_name": "3-5 Years",
        "role_type_name": "Full Time",
        "designation_name": "Software Engineer",
        "salary_name": "10-15 LPA",
        "job_mode_name": "Remote",
        "job_status": 1,
        "delete_status": 0
      }
    ],
    "totalCount": 45
  }
}
```

| Key         | Type    | Description                              |
|-------------|---------|------------------------------------------|
| `totalCount`| int     | Total applied jobs (across all pages)    |

### Response (Exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

---

## Endpoint 13: DELETE Remove Resume

**Path:** `DELETE /wapi/employee/remove-resume`

Clears the user's `resume` and `resumeName` fields (sets to empty string).

### Query Logic
```sql
-- 1. Fetch user
SELECT * FROM user WHERE id = :authUserId

-- 2. If resume exists, clear it
UPDATE user SET resume = '', resumeName = '' WHERE id = :authUserId
```

### Response (Success)
```json
{
  "status": true,
  "messages": "Resume delete successfull!"
}
```

### Response (No Resume)
Returns nothing (function exits early without setting `$response`).

### Response (Exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

---

## Implementation Notes for Cross-Language Porting

1. **`allUser` is missing:** The route exists but the controller method does not. Will return 404.
2. **`applyJobList` returns IDs only:** Just an array of job IDs in `data`, not full job details. Use `appliedjob` for the full paginated list.
3. **`applyJob` duplicate check:** The check is on `job + user` pair in the `application` table — not on job status. Even inactive jobs are checked for duplicates, but only active jobs (`company_job.status = 1`) pass validation.
4. **`approvedEmployment` auto-sets current company:** If the user has no `current_company` set and the experience has `still_working = 1`, it auto-assigns the company/designation to the user profile.
5. **`approvedVeiwRequest` toggles status:** The status is toggled (`!status ? 1 : 0`), meaning calling it twice reverts the state. It also sets an `expiry` date based on the `day` parameter.
6. **`rejectVeiwRequest` just sets `status = 0`:** Unlike approve (which toggles), reject explicitly sets to `0`.
7. **`deleteViewRequest` is soft-delete:** Uses `is_deleted = 1`, not a hard delete.
8. **`AllViewRequest` combines two lists:** Returns both view requests and pending follow requests in a single response, with separate counts.
9. **`dashboard` has no `messages` key:** The response uses `data` directly without a `messages` field — unlike other endpoints.
10. **`ProfilePercentage` scoring differs by user type:** Individual users get different point allocations than company users (e.g., experience_approved is 10 for domestic, 15 for international).
11. **`removeResume` exits early without response:** If no resume exists, the function returns nothing (no JSON). Frontend should handle empty response body.
12. **Pagination uses 1-based offset:** Both `AllViewRequest` and `appliedjob` treat `offset` as a page number. `offset = 0` or `offset = 1` both return the first page.
13. **Exception messages exposed:** `applyJob`, `appliedjob`, `checkCurrentCompany`, `dashboard` expose `$ex->getMessage()` in error responses. Other endpoints use generic `"Access denied"`.
