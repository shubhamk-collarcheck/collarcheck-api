# Employee Certificate API Endpoints

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Route file:** `src/routes/employee.route.ts`  
> **Controller:** `src/controllers/certificate.controller.ts`  
> **Service:** `src/services/certificate.service.ts`  
> **Types:** `src/types/certificate.types.ts`


## Overview

Five REST endpoints for managing employee certificates (CRUD: Create/Update, Read list, Read detail, Soft-delete). All endpoints require JWT authentication and operate on the `cyb_user_certificate` table with joins to `cybCourses` and `cybInstitutions`.

---

## Routes

| Method   | Path                                       | Controller Method                                | Description                    |
|----------|--------------------------------------------|--------------------------------------------------|--------------------------------|
| `GET`    | `/wapi/employee/all-certificate`           | `allCertificateList`                             | List all certificates          |
| `POST`   | `/wapi/employee/add-certificate`           | `addCertificate`                                 | Create new certificate         |
| `POST`   | `/wapi/employee/add-certificate/:id`       | `addCertificate`                                 | Update existing certificate    |
| `GET`    | `/wapi/employee/certificate-detail/:id`    | `certificateDetail`                              | Get single certificate detail  |
| `DELETE` | `/wapi/employee/delete-certificate/:id`    | `deleteCertificate`                              | Soft-delete certificate        |

---

## File Structure

```
src/
├── types/certificate.types.ts          # Zod schemas, TypeScript types
├── repositery/certificate.repositery.ts # Database queries
├── services/certificate.service.ts      # Business logic
├── controllers/certificate.controller.ts # Request handlers
├── routes/employee.route.ts            # Route registration (certificateUpload middleware)
└── utils/educationUpload.ts            # S3 multer config (PDF/PNG/JPG/JPEG/DOC/DOCX, 2MB, max 5 files)
```
---

## Zod Validation Schemas

### certificateBodySchema (Add/Update)

```typescript
z.object({
  params: z.object({ id: z.number() }).optional(),
  body: z.object({
    university: z.union([z.number(), z.string()]),
    course: z.union([z.number(), z.string()]),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    certificate_id: z.string().optional(),
    url: z.string().optional(),
    ongoing: z.preprocess(
      (val) => val === "true" || val === true || val === 1,
      z.boolean().optional()
    )
  })
})
```
### certificateRequestSchema (List/Detail)

```typescript
z.object({ params: z.object({ id: z.number() }) })
```
---

## Middleware

- **File Upload:** `educationUpload.fields([{ name: "document" }, { name: "document[]" }, { name: "file" }])` (S3 multer, PDF/PNG/JPG/JPEG/DOC/DOCX, 2MB, max 5 per field). Prefer form field **`document`** (or `document[]` from Postman/mobile).
- **Body Parser:** `express.json()`
- **Auth:** `authenticate` middleware extracts `uid` from JWT → `req.userId`

---

## Database Table: `cyb_user_certificate`

| Column           | Type         | Notes                                              |
|------------------|-------------|----------------------------------------------------|
| `id`             | int (PK)    | auto-increment                                     |
| `user`           | int         | FK to `cybUser.id`                                 |
| `university`     | int         | FK to `cybInstitutions.id`                         |
| `course`         | int         | FK to `cybCourses.id`                              |
| `start_date`     | varchar     |                                                    |
| `end_date`       | varchar     |                                                    |
| `certificate_id` | varchar     | External certificate ID number                     |
| `url`            | varchar     | Certificate verification URL                       |
| `certificate`    | text        | Comma-separated S3 object keys for uploaded docs   |
| `ongoing`        | tinyint     | `1` = ongoing, `0` = completed                     |
| `status`         | tinyint     | `1` = active                                       |
| `is_deleted`     | tinyint     | `0` = active, `1` = soft-deleted                   |
| `create_date`    | varchar     |                                                    |
| `modify_date`    | datetime    |                                                    |

### Joined Tables

**`cybCourses`** — lookup table for course/program names
| Column | Type | Notes |
|--------|------|-------|
| `id`   | int  | PK    |
| `name` | varchar | Course name |

**`cybInstitutions`** — lookup table for university/school names
| Column | Type | Notes |
|--------|------|-------|
| `id`   | int  | PK    |
| `name` | varchar | Institution name |

---

## Repository Methods

```typescript
getAllByUserId(userId: number)
  → SELECT uc.*, course.name AS courseName, institution.name AS universityName
    FROM cyb_user_certificate uc
    LEFT JOIN cybCourses course ON uc.course = course.id
    LEFT JOIN cybInstitutions institution ON uc.university = institution.id
    WHERE uc.user = :userId AND uc.status = 1 AND uc.is_deleted = 0
    ORDER BY uc.create_date DESC

findById(id: number)
  → SELECT * FROM cyb_user_certificate WHERE id = :id LIMIT 1

findByIdAndUser(id: number, userId: number)
  → SELECT uc.*, course.name AS courseName, institution.name AS universityName
    FROM cyb_user_certificate uc
    LEFT JOIN cybCourses course ON uc.course = course.id
    LEFT JOIN cybInstitutions institution ON uc.university = institution.id
    WHERE uc.id = :id AND uc.user = :userId AND uc.status = 1
    LIMIT 1

create(data)
  → INSERT INTO cyb_user_certificate (...) VALUES (...)

update(id, data)
  → UPDATE cyb_user_certificate SET ... WHERE id = :id

deleteByUserAndId(id: number, userId: number)
  → UPDATE cyb_user_certificate SET is_deleted = 1 WHERE id = :id AND user = :userId
```
---

## Service Methods

### resolveInstitution(value, userId)

Dynamic FK resolution for `university` field:
- If `value` is a number → use directly as FK
- If `value` is a string → check `cybInstitutions` for existing name
  - If found → use that `id`
  - If not → insert new row with `name`, `userDefined = 1`, `user = userId`

### resolveCourse(value, userId)

Same logic as `resolveInstitution` but for `cybCourses` table.

### certificateTransaction(data, userId, id?)

Core transaction logic:
1. Resolve `university` via `resolveInstitution`
2. Resolve `course` via `resolveCourse`
3. If `id` is provided → UPDATE existing record
4. If no `id` → INSERT new record
5. Return `{ status: true, messages: "..." }`

### decodeCertificateURLs(certificateValue)

Parse comma-separated S3 keys:
```typescript
certificateValue
  .split(",")
  .map((key) => key.trim())
  .filter((key) => key !== "")
  .map((key) => process.env.S3_PREFIX + key)
```
### createCertificateService(data, userId)

1. Handle file uploads (if present)
2. Collect S3 keys into array, join with commas
3. Call `certificateTransaction` with `{ ...data, certificate: keys }`

### updateCertificateService(data, userId, id)

1. Fetch existing record via `findByIdAndUser`
2. Merge existing S3 keys with new uploads (if present)
3. Call `certificateTransaction` with merged data

### allCertificateListService(userId)

1. Fetch all records via `getAllByUserId`
2. Map each record through `mapCertificateItem`
3. Return formatted array

### certificateDetailService(id, userId)

1. Fetch record via `findByIdAndUser`
2. Map through `mapCertificateItem` (includes `courseId` and `universityId`)

### deleteCertificateService(id, userId)

1. Soft-delete via `deleteByUserAndId`

---

## Controller Methods

### addCertificate

```typescript
async (req, res) => {
  const result = await createCertificateService(req.body, req.userId, files)
  return res.status(200).json(result)
}
```
### allCertificateList

```typescript
async (req, res) => {
  const certificates = await allCertificateListService(req.userId)
  return res.status(200).json({
    status: true,
    messages: "certificate History",
    data: certificates
  })
}
```
### certificateDetail

```typescript
async (req, res) => {
  const result = await certificateDetailService(req.params.id, req.userId)
  if (!result) throw new BadRequestError("certificate not found")
  return res.status(200).json({
    status: true,
    messages: "certificate Detail",
    data: result
  })
}
```
### deleteCertificate

```typescript
async (req, res) => {
  const result = await deleteCertificateService(req.params.id, req.userId)
  if (result.affectedRows === 0) throw new BadRequestError("Certificate not found")
  return res.status(200).json({
    status: true,
    messages: " Deleted Sucessfully"
  })
}
```
---

## Response Mapping

### List Item Response (allCertificateList)

```json
{
  "id": 1,
  "university": "MIT",
  "course": "Computer Science",
  "start_date": "2020-09-01",
  "end_date": "2024-06-30",
  "certificate_id": "CERT-12345",
  "url": "https://verify.example.com/cert",
  "ongoing": false,
  "document": [
    "https://s3.amazonaws.com/bucket/uploads/document/doc1.pdf"
  ]
}
```
| Key              | Source / Logic                                                                  |
|------------------|---------------------------------------------------------------------------------|
| `id`             | `cyb_user_certificate.id`                                                       |
| `university`     | `cybInstitutions.name` (joined as `universityName`)                             |
| `course`         | `cybCourses.name` (joined as `courseName`)                                      |
| `start_date`     | `cyb_user_certificate.start_date` (empty string if null)                        |
| `end_date`       | `cyb_user_certificate.end_date` (empty string if null)                          |
| `certificate_id` | `cyb_user_certificate.certificate_id` (empty string if null)                    |
| `url`            | `cyb_user_certificate.url` (empty string if null)                               |
| `ongoing`        | Boolean conversion of `ongoing` value                                            |
| `document`       | Parsed from comma-separated S3 keys via `decodeCertificateURLs`                  |

### Detail Item Response (certificateDetail)

Same as List, plus additional fields:

| Key              | Source / Logic                                                                  |
|------------------|---------------------------------------------------------------------------------|
| `courseId`       | `cyb_user_certificate.course` (raw FK integer — NOT in LIST response)          |
| `universityId`   | `cyb_user_certificate.university` (raw FK integer — NOT in LIST response)      |

> ⚠️ **Key difference from LIST:** DETAIL also returns `courseId` and `universityId` (raw integer FK values). LIST does NOT include these.

---

## Implementation Notes

1. **Dynamic FK creation:** On add/update, `university` and `course` can be plain text strings — the backend auto-creates rows in `cybInstitutions` / `cybCourses` tables and resolves them to IDs
2. **Document handling:** The `certificate` column stores comma-separated S3 keys. On update, existing keys are preserved and new keys appended
3. **LIST vs DETAIL key differences:**
   - LIST returns `university` (name), `course` (name)
   - DETAIL also returns `universityId` (raw FK), `courseId` (raw FK)
4. **Soft-delete:** `DELETE` sets `is_deleted = 1`, never removes rows
5. **Owner scoping:** All queries include `user = :userId`

---

## Example Request

### Add Certificate (with file upload)

```bash
curl -X POST http://localhost:3000/wapi/employee/add-certificate \
  -H "Authorization: Bearer <token>" \
  -F "university=MIT" \
  -F "course=Computer Science" \
  -F "start_date=2020-09-01" \
  -F "end_date=2024-06-30" \
  -F "certificate_id=CERT-12345" \
  -F "url=https://verify.example.com/cert" \
  -F "ongoing=false" \
  -F "document=@/path/to/cert.pdf"
```
### Success Response

```json
{
  "status": true,
  "messages": "Successfully Added !"
}
```