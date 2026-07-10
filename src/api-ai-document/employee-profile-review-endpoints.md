
# Employee Profile & Review API Endpoints (CRUD Only)

## Overview

CRUD endpoints for managing employee profile, reviews, employment change requests, and review documents. All require JWT authentication. Email/notification triggers are handled separately.

---

## Authentication

- **Filter:** `Authenticate` (CodeIgniter 4 filter applied to route group `wapi`)
- **Header:** `Authorization: Bearer <jwt_token>`
- **JWT decode:** Extract `uid` claim → look up `user` table WHERE `id = uid`, `status = 1`, `is_deleted = 0`
- **Optional override:** Send `X-Company` header with a different user ID to act on behalf of that user
- **Injected request property:** `$this->request->id` → the acting user ID

---

## Routes

| Method   | Path                                        | Controller Method                           | Description                              |
|----------|---------------------------------------------|---------------------------------------------|------------------------------------------|
| `GET`    | `/wapi/employee/currentCompany`             | `IndividualApi::currentCompany`             | List current companies with designations |
| `POST`   | `/wapi/employee/add-review`                 | `IndividualApi::addReview`                  | Create a new review                      |
| `POST`   | `/wapi/employee/add-review/{id}`            | `IndividualApi::addReview/$1`               | Update existing review                   |
| `DELETE` | `/wapi/employee/deleteReview/{id}`          | `IndividualApi::deleteReview`               | Hard-delete review and history           |
| `GET`    | `/wapi/employee/reviewRemoveDocument`       | `IndividualApi::reviewRemoveDocument`       | Remove a document from review            |
| `POST`   | `/wapi/employee/edit-user`                  | `IndividualApi::edit_user_individual`       | Update user profile (multi-form)         |
| `POST`   | `/wapi/employee/changeEmploymentBasic`      | `IndividualApi::changeEmploymentBasic`      | Submit employment change request         |
| `PUT`    | `/wapi/employee/show-home-review/{id}`      | `IndividualApi::showHomeReview`             | Toggle review visibility on profile      |

---

## Common Response Envelope

All endpoints return `Content-Type: application/json`:

| Key        | Type             | Description                                   |
|------------|------------------|-----------------------------------------------|
| `status`   | boolean          | `true` for success, `false` for errors        |
| `messages` | string           | Human-readable status/error message           |
| `data`     | array / object   | Payload (absent on errors)                    |

---

## Endpoint 1: GET Current Company List

**Path:** `GET /wapi/employee/currentCompany`

Returns the companies the user currently works for (`still_working = 1`), with all active designations under each company.

### Database Tables

**`user_experience`** (relevant columns)

| Column          | Type     | Notes                                      |
|-----------------|----------|--------------------------------------------|
| `id`            | int      | PK                                         |
| `user`          | int      | FK to `user.id` (employee)                 |
| `company`       | int      | FK to `user.id` (company)                  |
| `designation`   | int      | FK to `designation.id`                     |
| `still_working` | tinyint  | `1` = currently employed                   |
| `status`        | tinyint  | `1` = active                               |
| `approved`      | tinyint  | `1`=approved, `2`=rejected                 |
| `is_deleted`    | tinyint  |                                             |

### Query Logic
```sql
-- Step 1: Get distinct current companies
SELECT DISTINCT ue.company, ur.fname AS name
FROM user_experience ue
LEFT JOIN user ur ON ue.company = ur.id
WHERE ue.user = :authUserId
  AND ue.still_working = 1
  AND ue.status = 1
  AND ue.approved <> 2
  AND ue.is_deleted = 0
  AND ur.is_deleted = 0
ORDER BY ur.fname ASC

-- Step 2: For each company, get designations
SELECT ue.designation AS id, dg.name AS designation_name
FROM user_experience ue
LEFT JOIN designation dg ON ue.designation = dg.id
WHERE ue.user = :authUserId
  AND ue.still_working = 1
  AND ue.status = 1
  AND ue.approved <> 2
  AND ue.company = :companyId
  AND ue.is_deleted = 0
```

### Response Shape
```json
{
  "status": true,
  "messages": "Current company List",
  "data": [
    {
      "id": 7,
      "name": "Acme Corp",
      "list": [
        { "id": 12, "name": "Software Engineer" },
        { "id": 15, "name": "Team Lead" }
      ]
    }
  ]
}
```

| Key    | Source                                             |
|--------|----------------------------------------------------|
| `id`   | `user_experience.company` (company user ID)        |
| `name` | `user.fname` (company name)                        |
| `list` | Array of `{ id: designation FK, name: designation_name }` |

### Error Response
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 2: POST Add / Update Review

**Path:** `POST /wapi/employee/add-review`
**Path:** `POST /wapi/employee/add-review/{id}` (update)

Creates or updates a review in `user_experience_rating`.

### Database Table: `user_experience_rating`

| Column        | Type     | Notes                                        |
|---------------|----------|----------------------------------------------|
| `id`          | int (PK) | auto-increment                               |
| `company`     | int      | FK to `user.id` (company)                    |
| `experience`  | int      | FK to `user_experience.id`                   |
| `rating`      | decimal  | Rating value                                 |
| `review`      | text     | Review text                                  |
| `link`        | varchar  | Optional URL                                 |
| `doc`         | text     | JSON array of S3 keys: `["key1.pdf","key2.jpg"]` |
| `approved`    | tinyint  | `0`=pending, `1`=approved                    |
| `show_home`   | tinyint  | `0`=hidden, `1`=visible on profile           |
| `create_date` | datetime |                                              |
| `modify_date` | datetime |                                              |

### Request Format
`multipart/form-data`

### Fields

| Field        | Required | Type         | Description                                            |
|-------------|----------|-------------|--------------------------------------------------------|
| `experience` | **Yes**  | int         | Experience ID (`user_experience.id`)                   |
| `rating`     | **Yes**  | numeric     | Rating value                                           |
| `review`     | **Yes**  | string      | Review text                                            |
| `link`       | No       | string      | Optional link                                          |
| `document`   | No       | file(s)     | Upload images/PDFs/Word docs. Can be multiple.         |

### Query Logic

**On Create (no id):**
```sql
-- Get company from experience
SELECT company FROM user_experience WHERE id = :experienceId AND status = 1

INSERT INTO user_experience_rating (company, experience, rating, review, link, doc, create_date, modify_date)
VALUES (:companyId, :experienceId, :rating, :review, :link, :docJson, NOW(), NOW())
```

**On Update (with id):**
```sql
-- Check if already approved
SELECT approved, doc FROM user_experience_rating WHERE id = :id
-- If approved == 1 → reject with error: "Company have approved your rating can't change review"

-- Merge existing docs with new uploads
-- Parse existing doc JSON, merge with new array, re-encode

UPDATE user_experience_rating
SET company = :companyId, experience = :experienceId, rating = :rating,
    review = :review, link = :link, doc = :mergedDocJson, modify_date = NOW()
WHERE id = :id
```

### Document Handling
- Files uploaded to S3 via `s3fileUploads(file, 'uploads/document/')`
- Stored as JSON array string in `doc` column
- On update: new docs merged with existing docs before save

### Response (Created)
```json
{
  "status": true,
  "messages": "Review submit successfully!"
}
```

### Response (Updated)
```json
{
  "status": true,
  "messages": "Update review successfully!"
}
```

### Response (Already Approved — cannot edit)
```json
{
  "status": false,
  "messages": "Company have approved your rating can't change review"
}
```

### Response (Validation Error)
```json
{
  "status": false,
  "messages": "The experience Id field is required,The Rating field is required,The Review field is required"
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

---

## Endpoint 3: DELETE Review (Hard Delete)

**Path:** `DELETE /wapi/employee/deleteReview/{id}`

Permanently deletes a review and its associated history records. Only the review author (experience owner) can delete.

### Database Table: `user_experience_rating_history`

| Column      | Type     | Notes                               |
|-------------|----------|-------------------------------------|
| `id`        | int (PK) |                                     |
| `rating_id` | int      | FK to `user_experience_rating.id`  |
| ...         |          | Other tracking fields               |

### Query Logic
```sql
-- 1. Verify ownership chain:
SELECT * FROM user_experience_rating WHERE id = :id
SELECT * FROM user_experience WHERE id = :experienceId AND user_id = :authUserId

-- 2. If owner matches:
DELETE FROM user_experience_rating_history WHERE rating_id = :id
DELETE FROM user_experience_rating WHERE id = :id
```

### Response (Success)
```json
{
  "status": true,
  "messages": "Review delete successfully!"
}
```

### Response (Not Found / Not Owner)
```json
{
  "status": false,
  "messages": "Review not found!!"
}
```

### Response (Missing ID)
```json
{
  "status": false,
  "messages": "id is required!"
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

---

## Endpoint 4: GET Remove Document from Review

**Path:** `GET /wapi/employee/reviewRemoveDocument?ratingId={id}&link={s3Key}`

Removes a specific document URL from a review's `doc` JSON array. Only the review author (experience owner) can remove.

### Query Parameters

| Param      | Required | Type   | Description                              |
|------------|----------|--------|------------------------------------------|
| `ratingId` | **Yes**  | int    | Review ID (`user_experience_rating.id`)  |
| `link`     | **Yes**  | string | The S3 URL value to remove from array    |

### Query Logic
```sql
-- 1. Fetch review + verify ownership (experience owner)
SELECT * FROM user_experience_rating WHERE id = :ratingId
SELECT * FROM user_experience WHERE id = :experienceId AND user_id = :authUserId

-- 2. Parse doc JSON, filter out matching link, re-save
-- doc = json_encode(array_filter(json_decode(doc), fn($v) => $v !== link))
UPDATE user_experience_rating SET doc = :filteredJson WHERE id = :ratingId
```

### Response (Success)
```json
{
  "status": true,
  "messages": "Review document detele successfully!"
}
```

### Response (Not Found / Not Owner)
```json
{
  "status": false,
  "messages": "Review not found!!"
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

---

## Endpoint 5: POST Edit User Profile

**Path:** `POST /wapi/employee/edit-user`

Updates the authenticated user's profile. Supports 4 form types via the `type` field. Each type validates and saves different fields.

### Database Table: `user`

| Column               | Type     | Notes                              |
|----------------------|----------|------------------------------------|
| `id`                 | int (PK) |                                    |
| `fname`              | varchar  | First name                         |
| `lname`              | varchar  | Last name                          |
| `gender`             | varchar  |                                    |
| `dob`                | date     | Date of birth                      |
| `display_type`       | varchar  | Display name preference            |
| `profile_description`| text     | Bio                                |
| `profile`            | varchar  | S3 key for profile image           |
| `resume`             | varchar  | S3 key for resume                  |
| `resumeName`         | varchar  | Original resume filename           |
| `cvPop`              | tinyint  | Resume upload flag                 |
| `city`               | int      | FK to `cities.id`                  |
| `state`              | varchar  |                                    |
| `country`            | varchar  |                                    |
| `present_address`    | text     |                                    |
| `permanent_address`  | text     |                                    |
| `same_address`       | tinyint  |                                    |
| `accomodation`       | varchar  |                                    |
| `current_company`    | int      | FK to `user.id` (company)          |
| `current_possition`  | int      | FK to `designation.id`             |
| `work_status`        | int      | FK to `work_type.id`              |
| `expected_salary`    | varchar  |                                    |
| `expected_mode`      | varchar  | Salary mode                        |
| `expected_inhand`    | varchar  | In-hand salary                     |
| `on_immediate`       | tinyint  | Available immediately              |
| `notice_period`      | varchar  | Notice period days                 |
| `on_notice`          | tinyint  | Currently on notice                |
| `notice_date`        | date     | Notice end date                    |
| `on_explore`         | tinyint  | Open to explore                    |
| `linkdin`            | varchar  | LinkedIn URL                       |
| `youtube`            | varchar  | YouTube URL                        |
| `instagram`          | varchar  | Instagram URL                      |
| `facebook`           | varchar  | Facebook URL                       |
| `twitter`            | varchar  | Twitter URL                        |
| `modify_date`        | datetime |                                    |

### Lookup Table: `user_details`

| Column               | Type     | Notes                                |
|----------------------|----------|--------------------------------------|
| `user_id`            | int      | FK to `user.id`                      |
| `exploring_option`   | text     | JSON array of exploring preferences  |
| `notice_employments` | text     | JSON array of employment IDs         |
| `latitude`           | varchar  | Geocoded from present_address        |
| `longitude`          | varchar  |                                      |

### Lookup Table: `verify_document`

| Column    | Type     | Notes                            |
|-----------|----------|----------------------------------|
| `id`      | int (PK) |                                  |
| `user_id` | int      | FK to `user.id`                  |
| `doc_name`| varchar  | Verified full name from document |
| `verify`  | tinyint  | `1` = name matches               |

### Request Format
`multipart/form-data`

### Fields by Form Type

#### type = 1 (Basic Info)
| Field                 | Required | Type             | Description                                      |
|-----------------------|----------|------------------|--------------------------------------------------|
| `type`                | **Yes**  | int              | Must be `1`                                      |
| `fname`               | **Yes**  | string           | First name                                       |
| `lname`               | No       | string           | Last name                                        |
| `dob`                 | **Yes**  | string           | Date of birth                                    |
| `gender`              | **Yes**  | string           | Gender                                           |
| `display_type`        | No       | string           | Display name preference                          |
| `profile_description` | No       | string           | Bio                                              |
| `profile`             | No       | file             | Profile image (jpg/jpeg/heic/png/svg/webp, max 10MB) |
| `resume`              | No       | file             | Resume file (pdf/doc/docx, max 10MB)             |

**Name verification:** If `verify_document` exists for the user, compare `fname + ' ' + lname` against `doc_name`. If match → `verify = 1`, otherwise `verify = 0`.

#### type = 2 (Address)
| Field              | Required | Type         | Description                                        |
|--------------------|----------|-------------|----------------------------------------------------|
| `type`             | **Yes**  | int         | Must be `2`                                        |
| `city`             | **Yes**  | int or str  | City ID or name (string → auto-create in `cities`) |
| `state`            | **Yes**  | string      | State                                              |
| `accomodation`     | No       | string      | Accommodation type                                 |
| `present_address`  | No       | string      | Current address                                    |
| `same_address`     | No       | bool        | If true, copies present_address to permanent       |
| `permanent_address`| No       | string      | Permanent address (when same_address is false)     |
| `country`          | No       | string      | Country                                            |

**Auto-create city:** If `city` is a non-integer string, check `cities` table by name → use existing or insert with `user_defined = 1`.

**Geocoding:** If `present_address` is provided, latitude/longitude is resolved and saved to `user_details`.

#### type = 3 (Work Status)
| Field               | Required | Type         | Description                                              |
|---------------------|----------|-------------|----------------------------------------------------------|
| `type`              | **Yes**  | int         | Must be `3`                                              |
| `work_status`       | No       | int or str  | Work type ID or name (string → auto-create in `work_type`) |
| `current_position`  | No       | int or str  | Designation ID or name (string → auto-create in `designation`) |
| `current_company`   | No       | int or str  | Company ID or name (string → auto-create in `user` as company) |
| `expected_salary`   | No       | string      | Expected salary                                           |
| `expected_mode`     | No       | string      | Salary mode (e.g. "Per Annum", "Per Month")              |
| `expected_inhand`   | No       | string      | In-hand salary                                            |
| `on_immediate`      | No       | bool        | Available immediately (send truthy value)                 |
| `notice_period`     | No       | string      | Notice period days (when on_immediate is truthy)          |
| `on_notice`         | No       | bool        | Currently on notice (send truthy value)                   |
| `notice_date`       | No       | string      | Notice end date (when on_notice is truthy)                |
| `on_explore`        | No       | bool        | Open to explore (send truthy value)                       |
| `exploring_option`  | No       | array       | Exploring preferences (stored as JSON in `user_details`)  |
| `noticeEmployments` | No       | string      | Comma-separated employment IDs for notice (stored as JSON)|

**Auto-create company:** If `current_company` is a string, insert into `user` with `user_type = 2` (company), `user_defined_company = 1`.

**Auto-create designation:** If `current_position` is a string, insert into `designation` table with `user_defined = 1`.

#### type = 4 (Social Links)
| Field       | Required | Type   | Description       |
|-------------|----------|--------|-------------------|
| `type`      | **Yes**  | int    | Must be `4`       |
| `linkdin`   | No       | string | LinkedIn URL      |
| `youtube`   | No       | string | YouTube URL       |
| `instagram` | No       | string | Instagram URL     |
| `facebook`  | No       | string | Facebook URL      |
| `twitter`   | No       | string | Twitter URL       |

### SQL
```sql
UPDATE user SET fname = :fname, ..., modify_date = NOW() WHERE id = :authUserId

-- For type=2 with present_address:
-- Geocode address, upsert into user_details (latitude, longitude)

-- For type=3:
-- Upsert into user_details (exploring_option, notice_employments)
```

### Response (Success)
```json
{
  "status": true,
  "messages": "Successfully Updated"
}
```

### Response (Validation Error)
```json
{
  "status": false,
  "messages": "The First name field is required,The Date of birth field is required,The Gender field is required"
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

### Response (Fallback Failure)
```json
{
  "status": false,
  "messages": "Something Went Wrong!"
}
```

---

## Endpoint 6: POST Change Employment Basic

**Path:** `POST /wapi/employee/changeEmploymentBasic`

Creates or updates an employment change request in `user_update_experience` (with a history row in `user_update_experience_history`). Three types: leave, promotion/change, salary verification.

### Database Table: `user_update_experience`

| Column           | Type     | Notes                                       |
|------------------|----------|---------------------------------------------|
| `id`             | int (PK) |                                             |
| `user`           | int      | FK to `user.id` (employee)                  |
| `experience_id`  | int      | FK to `user_experience.id`                  |
| `type`           | tinyint  | `1`=leave, `2`=promotion, `3`=salary verify |
| `designation`    | int      | FK to `designation.id` (type 2 or 3)       |
| `salary`         | varchar  | (type 2 or 3)                               |
| `salary_inhand`  | varchar  | (type 2 or 3)                               |
| `salary_mode`    | varchar  | (type 2 or 3)                               |
| `worked_till_date`| date    | (type 1)                                    |
| `is_deleted`     | tinyint  | `0`=active                                  |
| `create_date`    | datetime |                                             |
| `modify_date`    | datetime |                                             |

### Database Table: `user_update_experience_history`

| Column        | Type     | Notes                                    |
|---------------|----------|------------------------------------------|
| `id`          | int (PK) |                                          |
| `update_id`   | int      | FK to `user_update_experience.id`        |
| Same fields as above |    | Snapshot of the request at creation |
| `parent`      | int      | FK to parent history row (for chaining)  |

### Request Format
`application/x-www-form-urlencoded` or `multipart/form-data`

### Fields

| Field              | Required       | Type         | Description                                              |
|--------------------|----------------|-------------|----------------------------------------------------------|
| `experience_id`    | **Yes**        | int         | Experience ID (`user_experience.id`)                     |
| `type`             | **Yes**        | int         | `1`=leave, `2`=promotion/change, `3`=salary verification |
| `salary`           | type 2 or 3    | string      | Salary amount                                            |
| `salary_inhand`    | type 2 or 3    | string      | In-hand salary (defaults to existing or "CTC")           |
| `salary_mode`      | type 2 or 3    | string      | Salary mode (defaults to existing or "Per Annum")        |
| `designation`      | type 2 or 3    | int or str  | Designation ID or name (string → auto-create)            |
| `worked_till_date` | type 1         | string      | Last working day                                         |
| `lastReview`       | type 1         | bool        | If truthy, updates experience `lastReview` key           |

### Type-Specific Logic

**type = 1 (Leave):**
- Saves `worked_till_date`
- If `worked_till_date <= today`: sets `still_working = 0` in `user_experience`
- Clears `current_company` and `current_possition` from user profile
- If another active employment exists, reassigns that as current
- Sets `expiry` = worked_till_date + 72 hours in `user_experience`

**type = 2 (Promotion/Change):**
- Saves `salary`, `salary_inhand`, `salary_mode`, `designation`
- Dynamic designation creation if string provided

**type = 3 (Salary Verification):**
- Same fields as type 2
- Sets `is_deleted = 0` on insert

### Query Logic (Upsert)
```sql
-- Check if request already exists for this experience + type
SELECT * FROM user_update_experience WHERE experience_id = :expId AND type = :type

-- If exists → UPDATE both tables
UPDATE user_update_experience SET ... WHERE id = :existingId
UPDATE user_update_experience_history SET ... WHERE update_id = :existingId

-- If not → INSERT into both (history stores initial snapshot)
INSERT INTO user_update_experience (user, experience_id, type, ...) VALUES (...)
INSERT INTO user_update_experience_history (update_id, user, experience_id, type, ...) VALUES (:newId, ...)
```

### Response (Success)
```json
{
  "status": true,
  "messages": "Request Submit Successfully!"
}
```

### Response (Validation Error)
```json
{
  "status": false,
  "messages": "The Experience Id field is required,The Type field is required"
}
```

---

## Endpoint 7: PUT Toggle Show Home Review

**Path:** `PUT /wapi/employee/show-home-review/{id}`

Toggles the `show_home` boolean flag on a review (controls whether the review is displayed on the employee's public profile). Only the review author (experience owner) can toggle.

### Query Logic
```sql
-- 1. Verify ownership chain:
SELECT * FROM user_experience_rating WHERE id = :id
SELECT * FROM user_experience WHERE id = :experienceId AND user_id = :authUserId

-- 2. Toggle show_home
UPDATE user_experience_rating
SET show_home = CASE WHEN show_home = 1 THEN 0 ELSE 1 END
WHERE id = :id
```

### Response (Show)
```json
{
  "status": true,
  "messages": "Review show successfully!"
}
```

### Response (Hide)
```json
{
  "status": true,
  "messages": "Review hide successfully!"
}
```

### Response (Missing ID)
```json
{
  "status": false,
  "messages": "ID is required!"
}
```

### Response (Token Mismatch — wrong user)
```json
{
  "status": false,
  "messages": "Token mismatch!"
}
```

### Response (Review Not Found)
```json
{
  "status": false,
  "messages": "Review not found!"
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```

---

## Implementation Notes for Cross-Language Porting

1. **Review ownership check chain:** Used in 4 endpoints (deleteReview, reviewRemoveDocument, addReview update, showHomeReview). Pattern: fetch `user_experience_rating` → get `experience` → fetch `user_experience` → compare `user_id` with authenticated user. If mismatch → `"Review not found!!"` or `"Token mismatch!"`.
2. **Review doc format:** Stored as JSON array string in `doc` column. Parse with `json_decode`, manipulate as array, save with `json_encode`.
3. **Dynamic FK creation (auto-create):** Used across `city`, `designation`, `work_type`, `company` fields. If value is non-integer string: check if record exists by name → use existing ID OR insert new row with `user_defined = 1`.
4. **Hard delete:** `deleteReview` uses `DELETE FROM` (permanent removal), not soft-delete.
5. **Approved review lock:** If `approved = 1`, review cannot be edited (`"Company have approved your rating can't change review"`).
6. **showHomeReview is toggle:** Each call flips the boolean — no explicit set-to-show or set-to-hide.
7. **currentCompany returns distinct companies** with `still_working = 1`, `approved <> 2`. Nested `list` contains all designations for that company.
8. **Leave type auto-actions:** When `type = 1` and `worked_till_date <= today`, the system automatically updates `user_experience.still_working = 0` and clears the user's current company/position.
9. **changeEmploymentBasic upsert:** If a request already exists for the same `experience_id + type`, it updates rather than inserting a duplicate.
