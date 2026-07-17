# Employee Profile & Review API Endpoints

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Route file:** `src/routes/employee.route.ts`  
> **Controller:** `src/controllers/profile-review.controller.ts`  
> **Service:** `src/services/profile-review.service.ts`  
> **Types:** `src/types/profile-review.types.ts`


## Overview

Eight REST endpoints for managing employee profile, reviews, employment change requests, and review documents. All endpoints require JWT authentication.

---

## Routes

### Review Routes

| Method   | Path                                       | Controller Method                                | Description                    |
|----------|--------------------------------------------|--------------------------------------------------|--------------------------------|
| `GET`    | `/wapi/employee/currentCompany`            | `currentCompany`                                 | List current companies         |
| `POST`   | `/wapi/employee/add-review`                | `addReview`                                      | Create/update review           |
| `POST`   | `/wapi/employee/add-review/:id`            | `updateReview`                                   | Update existing review         |
| `DELETE` | `/wapi/employee/deleteReview/:id`          | `deleteReview`                                   | Hard-delete review             |
| `GET`    | `/wapi/employee/reviewRemoveDocument`      | `reviewRemoveDocument`                           | Remove document from review    |
| `PUT`    | `/wapi/employee/show-home-review/:id`      | `showHomeReview`                                 | Toggle review visibility       |

### Profile Routes

| Method   | Path                                       | Controller Method                                | Description                    |
|----------|--------------------------------------------|--------------------------------------------------|--------------------------------|
| `POST`   | `/wapi/employee/edit-user`                 | `editUser`                                       | Update user profile            |
| `POST`   | `/wapi/employee/changeEmploymentBasic`     | `changeEmploymentBasic`                          | Submit employment change       |

---

## File Structure

```
src/
├── types/profile-review.types.ts          # Zod schemas for profile/review
├── repositery/profile-review.repositery.ts # Database queries
├── services/profile-review.service.ts      # Business logic
├── controllers/profile-review.controller.ts # Request handlers
├── routes/employee.route.ts               # Route registration
└── utils/educationUpload.ts               # S3 multer config (PDF/PNG/JPG/JPEG/DOC/DOCX, 2MB, max 5 files)
```
---

## Zod Validation Schemas

### Review Schemas

#### reviewBodySchema (Add/Update)

```typescript
z.object({
  experience: z.coerce.number().int().positive("Experience ID is required"),
  rating: z.coerce.number().min(1, "Rating is required").max(5, "Rating must be between 1 and 5"),
  review: z.string().trim().min(1, "Review is required"),
  link: z.string().optional(),
})
```
#### reviewRequestSchema (Add)

```typescript
z.object({ body: reviewBodySchema })
```
#### reviewUpdateRequestSchema (Update)

```typescript
z.object({
  params: commonIdParamsSchema.shape.params,
  body: reviewBodySchema,
})
```
#### reviewRemoveDocumentQuerySchema (Remove Document)

```typescript
z.object({
  query: z.object({
    ratingId: z.coerce.number().int().positive("Rating ID is required"),
    link: z.string().min(1, "Link is required"),
  }),
})
```
#### showHomeReviewRequestSchema (Toggle Visibility)

```typescript
z.object({ params: commonIdParamsSchema.shape.params })
```
### Profile Schemas

#### editUserBasicSchema (type = 1)

```typescript
z.object({
  type: z.literal(1),
  fname: z.string().trim().min(1, "First name is required"),
  lname: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  display_type: z.string().optional(),
  profile_description: z.string().optional(),
})
```
#### editUserAddressSchema (type = 2)

```typescript
z.object({
  type: z.literal(2),
  city: z.union([z.number(), z.string().min(1)]),
  state: z.string().min(1, "State is required"),
  accomodation: z.string().optional(),
  present_address: z.string().optional(),
  same_address: z.boolean().default(false),
  permanent_address: z.string().optional(),
  country: z.string().optional(),
})
```
#### editUserWorkStatusSchema (type = 3)

```typescript
z.object({
  type: z.literal(3),
  work_status: z.union([z.number(), z.string().min(1)]).optional(),
  current_position: z.union([z.number(), z.string().min(1)]).optional(),
  current_company: z.union([z.number(), z.string().min(1)]).optional(),
  expected_salary: z.string().optional(),
  expected_mode: z.string().optional(),
  expected_inhand: z.string().optional(),
  on_immediate: z.boolean().default(false),
  notice_period: z.string().optional(),
  on_notice: z.boolean().default(false),
  notice_date: z.string().optional(),
  on_explore: z.boolean().default(false),
  exploring_option: z.array(z.string()).optional(),
  noticeEmployments: z.string().optional(),
})
```
#### editUserSocialLinksSchema (type = 4)

```typescript
z.object({
  type: z.literal(4),
  linkdin: z.string().optional(),
  youtube: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
})
```
#### changeEmploymentBasicBodySchema

```typescript
z.object({
  experience_id: z.coerce.number().int().positive("Experience ID is required"),
  type: z.coerce.number().int().min(1).max(3, "Type must be 1, 2, or 3"),
  salary: z.string().optional(),
  salary_inhand: z.string().optional(),
  salary_mode: z.string().optional(),
  designation: z.union([z.number(), z.string().min(1)]).optional(),
  worked_till_date: z.string().optional(),
  lastReview: z.boolean().default(false),
})
```
---

## Middleware

- **File Upload:** `educationUpload.array("document")` (S3 multer, PDF/PNG/JPG/JPEG/DOC/DOCX, 2MB, max 5 files)
- **Body Parser:** `express.json()`
- **Auth:** `Authorization` middleware extracts `uid` from JWT → `req.auth.user_id`

---

## Database Tables

### `cyb_user_experience_rating`

| Column        | Type         | Notes                                              |
|---------------|-------------|----------------------------------------------------|
| `id`          | int (PK)    | auto-increment                                     |
| `experience`  | int         | FK to `cyb_user_experience.id`                     |
| `company`     | int         | FK to `cyb_user.id` (company)                      |
| `rating`      | int         | Rating value (1-5)                                 |
| `review`      | text        | Review text                                        |
| `doc`         | text        | JSON array of S3 keys: `["key1.pdf","key2.jpg"]`  |
| `link`        | text        | Optional URL                                       |
| `approved`    | int         | `0`=pending, `1`=approved                          |
| `show_home`   | tinyint     | `0`=hidden, `1`=visible on profile                 |
| `status`      | int         | `1` = active                                       |
| `is_deleted`  | tinyint     | `0` = active, `1` = soft-deleted                   |
| `create_date` | datetime    |                                                    |
| `modify_date` | datetime    |                                                    |

### `cyb_user_experience_rating_history`

| Column        | Type         | Notes                                              |
|---------------|-------------|----------------------------------------------------|
| `id`          | int (PK)    | auto-increment                                     |
| `rating_id`   | int         | FK to `cyb_user_experience_rating.id`              |
| `rating`      | int         | Rating value                                       |
| `review`      | text        | Review text                                        |
| `doc`         | text        | JSON array of S3 keys                              |
| `link`        | text        | Optional URL                                       |
| `status`      | int         | `1` = active                                       |
| `is_deleted`  | int         | `0` = active, `1` = soft-deleted                   |
| `create_date` | datetime    |                                                    |
| `modify_date` | datetime    |                                                    |

### `cyb_user_update_experience`

| Column           | Type         | Notes                                              |
|------------------|-------------|----------------------------------------------------|
| `id`             | int (PK)    | auto-increment                                     |
| `experience_id`  | int         | FK to `cyb_user_experience.id`                     |
| `user`           | int         | FK to `cyb_user.id` (employee)                     |
| `type`           | int         | `1`=leave, `2`=promotion, `3`=salary verify        |
| `designation`    | int         | FK to `cyb_designation.id`                         |
| `salary`         | varchar     | Salary amount                                      |
| `salary_inhand`  | varchar     | In-hand salary                                     |
| `salary_mode`    | varchar     | Salary mode                                        |
| `worked_till_date`| varchar    | Last working day                                   |
| `status`         | int         | `1` = active                                       |
| `is_deleted`     | int         | `0` = active, `1` = soft-deleted                   |
| `create_date`    | varchar     |                                                    |
| `modify_date`    | varchar     |                                                    |

### `cyb_user_update_experience_history`

| Column        | Type         | Notes                                              |
|---------------|-------------|----------------------------------------------------|
| `id`          | int (PK)    | auto-increment                                     |
| `update_id`   | int         | FK to `cyb_user_update_experience.id`              |
| `parent`      | int         | FK to parent history row                           |
| Same fields as `cyb_user_update_experience` | | Snapshot of the request |

### `cyb_user`

| Column               | Type         | Notes                              |
|----------------------|-------------|------------------------------------|
| `id`                 | int (PK)    |                                    |
| `fname`              | varchar     | First name                         |
| `lname`              | varchar     | Last name                          |
| `gender`             | tinyint     |                                    |
| `dob`                | varchar     | Date of birth                      |
| `display_type`       | int         | Display name preference            |
| `profile_description`| text        | Bio                                |
| `profile`            | text        | S3 key for profile image           |
| `resume`             | varchar     | S3 key for resume                  |
| `city`               | int         | FK to `cyb_cities.id`              |
| `state`              | int         |                                    |
| `country`            | int         |                                    |
| `present_address`    | text        |                                    |
| `permanent_address`  | text        |                                    |
| `same_address`       | tinyint     |                                    |
| `accomodation`       | int         |                                    |
| `current_company`    | int         | FK to `cyb_user.id` (company)      |
| `current_possition`  | int         | FK to `cyb_designation.id`         |
| `work_status`        | int         |                                    |
| `expected_salary`    | int         |                                    |
| `expected_mode`      | varchar     |                                    |
| `expected_inhand`    | varchar     |                                    |
| `on_immediate`       | tinyint     |                                    |
| `notice_period`      | int         |                                    |
| `on_notice`          | tinyint     |                                    |
| `notice_date`        | varchar     |                                    |
| `on_explore`         | tinyint     |                                    |
| `linkdin`            | text        |                                    |
| `youtube`            | text        |                                    |
| `instagram`          | text        |                                    |
| `facebook`           | text        |                                    |
| `twitter`            | text        |                                    |
| `modify_date`        | datetime    |                                    |

---

## Repository Methods

### Current Company Methods

```typescript
getCurrentCompanies(userId: number)
  → SELECT DISTINCT ue.company, ur.fname AS name
    FROM cyb_user_experience ue
    LEFT JOIN cyb_user ur ON ue.company = ur.id
    WHERE ue.user = :userId AND ue.still_working = 1 AND ue.status = 1 AND ue.is_deleted = 0
    GROUP BY ue.company, ur.fname

getDesignationsByCompany(userId: number, companyId: number)
  → SELECT ue.designation AS id, dg.name AS name
    FROM cyb_user_experience ue
    LEFT JOIN cyb_designation dg ON ue.designation = dg.id
    WHERE ue.user = :userId AND ue.company = :companyId AND ue.still_working = 1 AND ue.status = 1 AND ue.is_deleted = 0
    GROUP BY ue.designation, dg.name
```
### Review Methods

```typescript
getExperienceById(experienceId: number)
  → SELECT * FROM cyb_user_experience WHERE id = :experienceId LIMIT 1

getRatingById(ratingId: number)
  → SELECT * FROM cyb_user_experience_rating WHERE id = :ratingId LIMIT 1

createRating(data)
  → INSERT INTO cyb_user_experience_rating (...) VALUES (...)

updateRating(id, data)
  → UPDATE cyb_user_experience_rating SET ... WHERE id = :id

hardDeleteRating(id)
  → DELETE FROM cyb_user_experience_rating_history WHERE rating_id = :id
  → DELETE FROM cyb_user_experience_rating WHERE id = :id

removeDocumentFromRating(id, docJson)
  → UPDATE cyb_user_experience_rating SET doc = :docJson WHERE id = :id
```
### User Profile Methods

```typescript
getUserById(userId: number)
  → SELECT * FROM cyb_user WHERE id = :userId LIMIT 1

updateUser(userId, data)
  → UPDATE cyb_user SET ... WHERE id = :userId

getUserDetails(userId: number)
  → SELECT * FROM cyb_user_details WHERE user_id = :userId LIMIT 1

upsertUserDetails(userId, data)
  → INSERT or UPDATE cyb_user_details WHERE user_id = :userId

getVerifyDocument(userId: number)
  → SELECT * FROM cyb_verify_document WHERE user_id = :userId LIMIT 1

updateVerifyDocument(userId, verify)
  → UPDATE cyb_verify_document SET verify = :verify WHERE user_id = :userId
```
### Change Employment Basic Methods

```typescript
getUpdateExperience(experienceId: number, type: number)
  → SELECT * FROM cyb_user_update_experience WHERE experience_id = :experienceId AND type = :type AND is_deleted = 0 LIMIT 1

createUpdateExperience(data)
  → INSERT INTO cyb_user_update_experience (...) VALUES (...)

updateUpdateExperience(id, data)
  → UPDATE cyb_user_update_experience SET ... WHERE id = :id

createUpdateExperienceHistory(data)
  → INSERT INTO cyb_user_update_experience_history (...) VALUES (...)

updateUpdateExperienceHistory(updateId, data)
  → UPDATE cyb_user_update_experience_history SET ... WHERE update_id = :updateId

updateExperienceStillWorking(experienceId, stillWorking)
  → UPDATE cyb_user_experience SET still_working = :stillWorking WHERE id = :experienceId

clearUserCurrentPosition(userId)
  → UPDATE cyb_user SET current_company = NULL, current_possition = NULL WHERE id = :userId
```
---

## Service Methods

### currentCompanyService(userId)

1. Fetch distinct current companies via `getCurrentCompanies`
2. For each company, fetch designations via `getDesignationsByCompany`
3. Return formatted array with nested `list` of designations

### upsertReviewService(userId, data, files)

1. Verify experience ownership
2. Handle file uploads (if present)
3. Check if rating already exists for this experience
4. If exists and approved = 1 → throw error
5. If exists → update with merged documents
6. If not exists → create new rating
7. Return success message

### deleteReviewService(userId, id)

1. Verify review ownership via `verifyReviewOwnership`
2. Hard-delete rating and history via `hardDeleteRating`

### removeReviewDocumentService(userId, ratingId, link)

1. Verify review ownership
2. Parse existing doc JSON
3. Filter out matching link
4. Update rating with filtered doc

### toggleShowHomeReviewService(userId, id)

1. Verify review ownership
2. Toggle `show_home` value (0↔1)
3. Return appropriate message

### editUserProfileService(userId, data, files)

Handle 4 form types:
- **type = 1 (Basic):** Update fname, lname, dob, gender, display_type, profile_description, profile image, resume
- **type = 2 (Address):** Update city, state, accomodation, present_address, permanent_address, country
- **type = 3 (Work Status):** Update work_status, current_position, current_company, expected_salary, notice period, on_explore
- **type = 4 (Social):** Update linkdin, youtube, instagram, facebook, twitter

### changeEmploymentBasicService(userId, data)

1. Verify experience ownership
2. Resolve designation (auto-create if string)
3. Check for existing update request
4. Upsert into `cyb_user_update_experience` and history
5. Handle leave type (type=1): update still_working, clear current position

---

## Controller Methods

### currentCompany

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const data = await currentCompanyService(user_id)
  return res.status(200).json({
    status: true,
    messages: "Current company List",
    data,
  })
}
```
### addReview / updateReview

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { body } = req.validated as ReviewRequest
  const files = req.files as Express.MulterS3.File[] | undefined
  const messages = await upsertReviewService(user_id, body, files)
  return res.status(200).json({
    status: true,
    messages,
  })
}
```
### deleteReview

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { params } = req.validated as ReviewUpdateRequest
  const messages = await deleteReviewService(user_id, params.id)
  return res.status(200).json({
    status: true,
    messages,
  })
}
```
### reviewRemoveDocument

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { query } = req.validated as ReviewRemoveDocumentQuery
  const messages = await removeReviewDocumentService(user_id, query.ratingId, query.link)
  return res.status(200).json({
    status: true,
    messages,
  })
}
```
### showHomeReview

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { params } = req.validated as ShowHomeReviewRequest
  const messages = await toggleShowHomeReviewService(user_id, params.id)
  return res.status(200).json({
    status: true,
    messages,
  })
}
```
### editUser

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { body } = req.validated as EditUserRequest
  const files = req.files as Express.MulterS3.File[] | undefined
  const messages = await editUserProfileService(user_id, body, files)
  return res.status(200).json({
    status: true,
    messages,
  })
}
```
### changeEmploymentBasic

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { body } = req.validated as ChangeEmploymentBasicRequest
  const messages = await changeEmploymentBasicService(user_id, body)
  return res.status(200).json({
    status: true,
    messages,
  })
}
```
---

## Response Mapping

### Current Company Response

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
### Review Response

```json
{
  "status": true,
  "messages": "Review submit successfully!"
}
```
### Delete Review Response

```json
{
  "status": true,
  "messages": "Review delete successfully!"
}
```
### Toggle Show Home Response

```json
{
  "status": true,
  "messages": "Review show successfully!"
}
```
### Edit User Response

```json
{
  "status": true,
  "messages": "Successfully Updated"
}
```
### Change Employment Basic Response

```json
{
  "status": true,
  "messages": "Request Submit Successfully!"
}
```
---

## Implementation Notes

1. **Review ownership check:** Used in deleteReview, reviewRemoveDocument, addReview update, showHomeReview. Pattern: fetch `cyb_user_experience_rating` → get `experience` → fetch `cyb_user_experience` → compare `user` with authenticated user
2. **Review doc format:** Stored as JSON array string in `doc` column. Parse with `JSON.parse`, manipulate as array, save with `JSON.stringify`
3. **Dynamic FK creation:** Used across `designation`, `work_status`, `city` fields. If value is non-integer string → check if record exists by name → use existing ID OR insert new row with `userDefined = 1`
4. **Hard delete:** `deleteReview` uses `DELETE FROM` (permanent removal), not soft-delete
5. **Approved review lock:** If `approved = 1`, review cannot be edited
6. **showHomeReview is toggle:** Each call flips the boolean
7. **currentCompany returns distinct companies** with `still_working = 1`. Nested `list` contains all designations for that company
8. **Leave type auto-actions:** When `type = 1` and `worked_till_date <= today`, system updates `still_working = 0` and clears current company/position
9. **changeEmploymentBasic upsert:** If request exists for same `experience_id + type`, updates rather than inserting duplicate

---

## Example Requests

### Add Review (with file upload)

```bash
curl -X POST http://localhost:3000/wapi/employee/add-review \
  -H "Authorization: Bearer <token>" \
  -F "experience=1" \
  -F "rating=5" \
  -F "review=Great company to work with!" \
  -F "link=https://example.com" \
  -F "document=@/path/to/review.pdf"
```
### Success Response

```json
{
  "status": true,
  "messages": "Review submit successfully!"
}
```
### Edit User Profile (Basic Info)

```bash
curl -X POST http://localhost:3000/wapi/employee/edit-user \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": 1,
    "fname": "John",
    "lname": "Doe",
    "dob": "1990-01-15",
    "gender": "male",
    "display_type": "full_name",
    "profile_description": "Software developer"
  }'
```
### Success Response

```json
{
  "status": true,
  "messages": "Successfully Updated"
}
```
### Change Employment Basic

```bash
curl -X POST http://localhost:3000/wapi/employee/changeEmploymentBasic \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "experience_id": 1,
    "type": 2,
    "salary": "80000",
    "salary_inhand": "65000",
    "salary_mode": "Per Month",
    "designation": "Senior Developer"
  }'
```
### Success Response

```json
{
  "status": true,
  "messages": "Request Submit Successfully!"
}
```