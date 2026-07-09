
# Employee Employment Experience API Endpoints

## Overview

Five REST endpoints for managing employee employment experience (CRUD: Create/Update, Read list, Read detail, Soft-delete). All endpoints require JWT authentication and operate on the `cyb_user_experience` table with joins to `cybCompanies`, `cybDesignation`, `cybDepartment`, `cybCities`, `cybStates`, and `cybCountries`.

---

## Routes

| Method   | Path                                       | Controller Method                                | Description                    |
|----------|--------------------------------------------|--------------------------------------------------|--------------------------------|
| `GET`    | `/wapi/employee/all-experience`            | `allExperience`                                  | List all experiences           |
| `POST`   | `/wapi/employee/add-experience`            | `addExperience`                                  | Create new experience          |
| `POST`   | `/wapi/employee/add-experience/:id`        | `addExperience`                                  | Update existing experience     |
| `GET`    | `/wapi/employee/experience-detail/:id`     | `detailExperience`                               | Get single experience detail   |
| `DELETE` | `/wapi/employee/delete-experience/:id`     | `deleteExperience`                               | Soft-delete experience         |

---

## File Structure

```
src/
├── types/employee.types.ts          # Zod schemas, TypeScript types
├── repositery/employee.repositery.ts # Database queries
├── services/employee.service.ts      # Business logic
├── controllers/employee.controller.ts # Request handlers
├── routes/employee.route.ts          # Route registration (uploadToS3 middleware)
└── utils/uploadToS3.ts               # S3 multer config (PDF/TXT, 2MB, max 5 files)
```

---

## Zod Validation Schemas

### employmentBodySchema (Add/Update)

```typescript
z.object({
  params: z.object({ id: z.number() }).optional(),
  body: z.object({
    company: z.union([z.number(), z.string()]),
    designation: z.union([z.number(), z.string()]),
    department: z.union([z.number(), z.string()]),
    employment_type: z.number(),
    work_email: z.string().optional(),
    salary: z.string().optional(),
    salary_inhand: z.string().optional(),
    salary_mode: z.string().optional(),
    joining_date: z.string(),
    worked_till_date: z.string().optional(),
    still_working: z.preprocess(
      (val) => val === "true" || val === true || val === 1,
      z.boolean().optional()
    ),
    hired: z.preprocess(
      (val) => val === "true" || val === true || val === 1,
      z.boolean().optional()
    ),
    skill: z.array(z.number()).optional(),
    description: z.string().optional(),
    state: z.number().optional(),
    city: z.number().optional()
  })
})
```

### commonIdParamsSchema (List/Detail/Delete)

```typescript
z.object({ params: z.object({ id: z.number() }) })
```

---

## Middleware

- **File Upload:** `uploadToS3.array("document")` (S3 multer, PDF/TXT, 2MB, max 5 files)
- **Body Parser:** `express.json()`
- **Auth:** `authenticate` middleware extracts `uid` from JWT → `req.userId`

---

## Database Table: `cyb_user_experience`

| Column           | Type         | Notes                                              |
|------------------|-------------|----------------------------------------------------|
| `id`             | int (PK)    | auto-increment                                     |
| `user`           | int         | FK to `cybUser.id`                                 |
| `company`        | int         | FK to `cybCompanies.id`                            |
| `designation`    | int         | FK to `cybDesignation.id`                          |
| `department`     | int         | FK to `cybDepartment.id`                           |
| `employment_type`| int         | Employment type ID                                 |
| `work_email`     | varchar     | Work email address                                 |
| `salary`         | varchar     | Salary amount                                      |
| `salary_inhand`  | varchar     | In-hand salary                                     |
| `salary_mode`    | varchar     | Payment mode                                       |
| `joining_date`   | date        | Start date                                         |
| `worked_till_date`| varchar    | End date (empty if still working)                  |
| `still_working`  | tinyint     | `1` = currently employed, `0` = left               |
| `hired`          | tinyint     | `1` = hired, `0` = not hired                       |
| `skill`          | text        | Comma-separated skill IDs                          |
| `description`    | text        | Job description                                    |
| `approved`       | int         | Approval status                                    |
| `last_review`    | int         | Last review rating                                 |
| `status`         | tinyint     | `1` = active                                       |
| `is_deleted`     | tinyint     | `0` = active, `1` = soft-deleted                   |
| `certificate`    | text        | Comma-separated S3 keys for uploaded documents     |
| `state`          | int         | FK to `cybStates.id`                               |
| `city`           | int         | FK to `cybCities.id`                               |
| `create_date`    | varchar     |                                                    |
| `modify_date`    | datetime    |                                                    |

### Joined Tables

**`cybCompanies`** — company lookup table
| Column | Type | Notes |
|--------|------|-------|
| `id`   | int  | PK    |
| `name` | varchar | Company name |

**`cybDesignation`** — designation lookup table
| Column | Type | Notes |
|--------|------|-------|
| `id`   | int  | PK    |
| `name` | varchar | Designation name |

**`cybDepartment`** — department lookup table
| Column | Type | Notes |
|--------|------|-------|
| `id`   | int  | PK    |
| `name` | varchar | Department name |

**`cybCities`** — city lookup table
| Column | Type | Notes |
|--------|------|-------|
| `id`   | int  | PK    |
| `name` | varchar | City name |

**`cybStates`** — state lookup table
| Column | Type | Notes |
|--------|------|-------|
| `id`   | int  | PK    |
| `name` | varchar | State name |

**`cybCountries`** — country lookup table
| Column | Type | Notes |
|--------|------|-------|
| `id`   | int  | PK    |
| `name` | varchar | Country name |

---

## Repository Methods

```typescript
getAllByUserId(userId: number)
  → SELECT exp.*, company.name AS companyName, designation.name AS designationName,
           department.name AS departmentName, city.name AS cityName, state.name AS stateName
    FROM cyb_user_experience exp
    LEFT JOIN cybCompanies company ON exp.company = company.id
    LEFT JOIN cybDesignation designation ON exp.designation = designation.id
    LEFT JOIN cybDepartment department ON exp.department = department.id
    LEFT JOIN cybCities city ON exp.city = city.id
    LEFT JOIN cybStates state ON exp.state = state.id
    WHERE exp.user = :userId AND exp.status = 1 AND exp.is_deleted = 0
    ORDER BY exp.create_date DESC

findById(id: number)
  → SELECT * FROM cyb_user_experience WHERE id = :id LIMIT 1

findByIdAndUser(id: number, userId: number)
  → SELECT exp.*, company.name AS companyName, designation.name AS designationName,
           department.name AS departmentName, city.name AS cityName, state.name AS stateName
    FROM cyb_user_experience exp
    LEFT JOIN cybCompanies company ON exp.company = company.id
    LEFT JOIN cybDesignation designation ON exp.designation = designation.id
    LEFT JOIN cybDepartment department ON exp.department = department.id
    LEFT JOIN cybCities city ON exp.city = city.id
    LEFT JOIN cybStates state ON exp.state = state.id
    WHERE exp.id = :id AND exp.user = :userId AND exp.status = 1
    LIMIT 1

create(data)
  → INSERT INTO cyb_user_experience (...) VALUES (...)

update(id, data)
  → UPDATE cyb_user_experience SET ... WHERE id = :id

deleteByUserAndId(id: number, userId: number)
  → UPDATE cyb_user_experience SET is_deleted = 1 WHERE id = :id AND user = :userId

getExperienceRating(experienceId: number)
  → SELECT * FROM cyb_user_experience_rating WHERE experience = :experienceId LIMIT 1
```

---

## Service Methods

### resolveCompany(value, userId)

Dynamic FK resolution for `company` field:
- If `value` is a number → use directly as FK
- If `value` is a string → check `cybCompanies` for existing name
  - If found → use that `id`
  - If not → insert new row with `name`, `userDefined = 1`, `user = userId`

### resolveDesignation(value, userId)

Same logic as `resolveCompany` but for `cybDesignation` table.

### resolveDepartment(value, userId)

Same logic as `resolveCompany` but for `cybDepartment` table.

### resolveSkill(skillArray, userId)

Resolves skill IDs:
- Filter out empty/null values
- Return array of valid skill IDs

### employmentTransaction(data, userId, id?)

Core transaction logic:
1. Resolve `company` via `resolveCompany`
2. Resolve `designation` via `resolveDesignation`
3. Resolve `department` via `resolveDepartment`
4. Resolve `skill` via `resolveSkill`
5. If `id` is provided → UPDATE existing record
6. If no `id` → INSERT new record
7. Return `{ status: true, messages: "..." }`

### createExperienceService(data, userId, files)

1. Handle file uploads (if present)
2. Collect S3 keys into array, join with commas
3. Call `employmentTransaction` with `{ ...data, certificate: keys }`

### updateExperienceService(data, userId, id, files)

1. Fetch existing record via `findByIdAndUser`
2. Merge existing S3 keys with new uploads (if present)
3. Call `employmentTransaction` with merged data

### allExperienceService(userId)

1. Fetch all records via `getAllByUserId`
2. Fetch experience rating for each record via `getExperienceRating`
3. Map each record through `mapExperienceItem`
4. Return formatted array

### experienceDetailService(id, userId)

1. Fetch record via `findByIdAndUser`
2. Fetch experience rating via `getExperienceRating`
3. Map through `mapExperienceItem` (includes additional fields)

### deleteExperienceService(id, userId)

1. Soft-delete via `deleteByUserAndId`

---

## Controller Methods

### addExperience

```typescript
async (req, res) => {
  const result = await createExperienceService(req.body, req.userId, files)
  return res.status(200).json(result)
}
```

### allExperience

```typescript
async (req, res) => {
  const experiences = await allExperienceService(req.userId)
  return res.status(200).json({
    status: true,
    messages: "Experience History",
    data: experiences
  })
}
```

### detailExperience

```typescript
async (req, res) => {
  const result = await experienceDetailService(req.params.id, req.userId)
  if (!result) throw new BadRequestError("Experience not found")
  return res.status(200).json({
    status: true,
    messages: "Experience Detail",
    data: result
  })
}
```

### deleteExperience

```typescript
async (req, res) => {
  const result = await deleteExperienceService(req.params.id, req.userId)
  if (result.affectedRows === 0) throw new BadRequestError("Experience not found")
  return res.status(200).json({
    status: true,
    messages: " Deleted Successfully"
  })
}
```

---

## Response Mapping

### List Item Response (allExperience)

```json
{
  "id": 1,
  "company": "TechCorp",
  "designation": "Software Engineer",
  "department": "Engineering",
  "employment_type": 1,
  "work_email": "john@techcorp.com",
  "joining_date": "2020-01-15",
  "worked_till_date": "",
  "still_working": true,
  "hired": true,
  "skill": [1, 2, 3],
  "description": "Full-stack development",
  "state": "California",
  "city": "San Francisco",
  "last_review": 4,
  "document": [
    "https://s3.amazonaws.com/bucket/uploads/document/offer_letter.pdf"
  ]
}
```

| Key              | Source / Logic                                                                  |
|------------------|---------------------------------------------------------------------------------|
| `id`             | `cyb_user_experience.id`                                                        |
| `company`        | `cybCompanies.name` (joined as `companyName`)                                   |
| `designation`    | `cybDesignation.name` (joined as `designationName`)                             |
| `department`     | `cybDepartment.name` (joined as `departmentName`)                               |
| `employment_type`| `cyb_user_experience.employment_type`                                           |
| `work_email`     | `cyb_user_experience.work_email` (empty string if null)                         |
| `joining_date`   | `cyb_user_experience.joining_date`                                              |
| `worked_till_date`| `cyb_user_experience.worked_till_date` (empty string if null)                  |
| `still_working`  | Boolean conversion of `still_working` value                                      |
| `hired`          | Boolean conversion of `hired` value                                              |
| `skill`          | Parsed from comma-separated skill IDs (empty array if null)                     |
| `description`    | `cyb_user_experience.description` (empty string if null)                        |
| `state`          | `cybStates.name` (joined as `stateName`)                                        |
| `city`           | `cybCities.name` (joined as `cityName`)                                         |
| `last_review`    | From `cyb_user_experience_rating.last_review` (0 if null)                       |
| `document`       | Parsed from comma-separated S3 keys via `decodeExperienceURLs`                  |

### Detail Item Response (experienceDetail)

Same as List, plus additional fields:

| Key              | Source / Logic                                                                  |
|------------------|---------------------------------------------------------------------------------|
| `stateId`        | `cyb_user_experience.state` (raw FK integer — NOT in LIST response)            |
| `cityId`         | `cyb_user_experience.city` (raw FK integer — NOT in LIST response)             |

> ⚠️ **Key difference from LIST:** DETAIL also returns `stateId` and `cityId` (raw integer FK values). LIST does NOT include these.

---

## Implementation Notes

1. **Dynamic FK creation:** On add/update, `company`, `designation`, and `department` can be plain text strings — the backend auto-creates rows in respective tables and resolves them to IDs
2. **Document handling:** The `certificate` column stores comma-separated S3 keys. On update, existing keys are preserved and new keys appended
3. **LIST vs DETAIL key differences:**
   - LIST returns `company`, `designation`, `department`, `state`, `city` (names)
   - DETAIL also returns `stateId`, `cityId` (raw FK values)
4. **Soft-delete:** `DELETE` sets `is_deleted = 1`, never removes rows
5. **Owner scoping:** All queries include `user = :userId`
6. **Skill handling:** Skills are stored as comma-separated IDs and parsed into an array for the response
7. **Experience rating:** Fetched from `cyb_user_experience_rating` table and included in response

---

## Example Request

### Add Experience (with file upload)

```bash
curl -X POST http://localhost:3000/wapi/employee/add-experience \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "TechCorp",
    "designation": "Software Engineer",
    "department": "Engineering",
    "employment_type": 1,
    "work_email": "john@techcorp.com",
    "salary": "80000",
    "salary_inhand": "65000",
    "salary_mode": "monthly",
    "joining_date": "2020-01-15",
    "worked_till_date": "",
    "still_working": true,
    "hired": true,
    "skill": [1, 2, 3],
    "description": "Full-stack development",
    "state": 123,
    "city": 456
  }'
```

### Success Response

```json
{
  "status": true,
  "messages": "Successfully Added !"
}
```