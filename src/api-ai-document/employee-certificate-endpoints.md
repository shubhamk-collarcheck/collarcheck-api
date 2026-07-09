
# Employee Certificate API Endpoints

## Overview

Five REST endpoints for managing employee certificates (CRUD: Create/Update, Read list, Read detail, Soft-delete). All endpoints require JWT authentication and operate on the `user_certificate` table with joins to `courses` and `institutions`.

---

## Authentication

- **Filter:** `Authenticate` (CodeIgniter 4 filter applied to route group `wapi`)
- **Header:** `Authorization: Bearer <jwt_token>`
- **JWT decode:** Extract `uid` claim → look up `user` table WHERE `id = uid`, `status = 1`, `is_deleted = 0`
- **Optional override:** Send `X-Company` header with a different user ID to act on behalf of that user
- **Injected request property:** `$this->request->id` → the acting user ID (used as `user` filter in all queries)

---

## Routes

| Method   | Path                                       | Controller Method                                | Description                    |
|----------|--------------------------------------------|--------------------------------------------------|--------------------------------|
| `GET`    | `/wapi/employee/all-certificate`           | `IndividualApi::allCertificates`                 | List all certificates          |
| `POST`   | `/wapi/employee/add-certificate`           | `IndividualApi::addCertificate`                  | Create new certificate         |
| `POST`   | `/wapi/employee/add-certificate/{id}`      | `IndividualApi::addCertificate/$1`               | Update existing certificate    |
| `GET`    | `/wapi/employee/certificate-detail/{id}`   | `IndividualApi::certificate_detail`              | Get single certificate detail  |
| `DELETE` | `/wapi/employee/delete-certificate/{id}`   | `IndividualApi::deleteCertificateIndividual`     | Soft-delete certificate        |

---

## Database Table: `user_certificate`

| Column           | Type         | Notes                                              |
|------------------|-------------|----------------------------------------------------|
| `id`             | int (PK)    | auto-increment                                     |
| `user`           | int         | FK to `user.id`                                    |
| `university`     | int         | FK to `institutions.id`                            |
| `course`         | int         | FK to `courses.id`                                 |
| `start_date`     | varchar(?)  |                                                    |
| `end_date`       | varchar(?)  |                                                    |
| `certificate_id` | varchar(?)  | External certificate ID number                     |
| `url`            | varchar(?)  | Certificate verification URL                       |
| `certificate`    | text        | Comma-separated S3 object keys for uploaded docs   |
| `ongoing`        | tinyint/bool| `true` / `false`                                   |
| `status`         | tinyint     | `1` = active                                       |
| `is_deleted`     | tinyint     | `0` = active, `1` = soft-deleted                   |
| `create_date`    | datetime    |                                                    |
| `modify_date`    | datetime    |                                                    |

### Joined Tables

**`courses`** — lookup table for course/program names
| Column | Type | Notes |
|--------|------|-------|
| `id`   | int  | PK    |
| `name` | varchar | Course name |

**`institutions`** — lookup table for university/school names
| Column | Type | Notes |
|--------|------|-------|
| `id`   | int  | PK    |
| `name` | varchar | Institution name |

---

## Common Response Envelope

All endpoints return `Content-Type: application/json`:

| Key        | Type             | Description                                 |
|------------|------------------|---------------------------------------------|
| `status`   | boolean          | `true` for success, `false` for errors      |
| `messages` | string           | Human-readable status/error message         |
| `data`     | array / object   | Payload (omitted/absent on some errors)     |

---

## Endpoint 1: GET All Certificates

**Path:** `GET /wapi/employee/all-certificate`

### Query Logic
```sql
SELECT uc.*, course.name AS course_name, int.name AS university_name
FROM user_certificate uc
LEFT JOIN courses course ON uc.course = course.id
LEFT JOIN institutions int ON uc.university = int.id
WHERE uc.user = :authenticated_user_id
  AND uc.status = 1
  AND uc.is_deleted = 0
ORDER BY uc.create_date DESC
```

### Response Shape — Each item in `data[]`
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
    "https://s3.amazonaws.com/bucket/uploads/document/doc1.pdf",
    "https://s3.amazonaws.com/bucket/uploads/document/doc2.jpg"
  ]
}
```

| Key              | Source / Logic                                                                  |
|------------------|---------------------------------------------------------------------------------|
| `id`             | `user_certificate.id`                                                           |
| `university`     | `institutions.name` (joined as `university_name`)                               |
| `course`         | `courses.name` (joined as `course_name`)                                        |
| `start_date`     | `user_certificate.start_date` (empty string if null)                            |
| `end_date`       | `user_certificate.end_date` (empty string if null)                              |
| `certificate_id` | `user_certificate.certificate_id` (empty string if null)                        |
| `url`            | `user_certificate.url` (empty string if null)                                   |
| `ongoing`        | `user_certificate.ongoing == 'true' ? true : false` (string comparison)         |
| `document`       | Explode comma-separated `certificate` → trim → filter empty → prepend `S3_PREFIX` to each → return as array |

Example full response:
```json
{
  "status": true,
  "messages": "certificate History",
  "data": [
    {
      "id": 1,
      "university": "MIT",
      "course": "Computer Science",
      "start_date": "2020-09-01",
      "end_date": "2024-06-30",
      "certificate_id": "CERT-12345",
      "url": "https://verify.example.com/cert",
      "ongoing": false,
      "document": ["https://s3.amazonaws.com/bucket/uploads/document/doc1.pdf"]
    }
  ]
}
```

### Error Response
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 2: GET Certificate Detail

**Path:** `GET /wapi/employee/certificate-detail/{id}`

### Query Logic
```sql
SELECT uc.*, course.name AS course_name, int.name AS university_name
FROM user_certificate uc
LEFT JOIN courses course ON uc.course = course.id
LEFT JOIN institutions int ON uc.university = int.id
WHERE uc.id = :id
  AND uc.user = :authenticated_user_id
  AND uc.status = 1
ORDER BY uc.create_date DESC
LIMIT 1
```

### Response Shape
```json
{
  "id": 1,
  "university": "MIT",
  "course": "Computer Science",
  "courseId": 42,
  "universityId": 7,
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
| `id`             | `user_certificate.id`                                                           |
| `university`     | `institutions.name` (joined as `university_name`)                               |
| `course`         | `courses.name` (joined as `course_name`)                                        |
| `courseId`       | `user_certificate.course` (raw FK integer — NOT in LIST response)               |
| `universityId`   | `user_certificate.university` (raw FK integer — NOT in LIST response)           |
| `start_date`     | `user_certificate.start_date`                                                   |
| `end_date`       | `user_certificate.end_date`                                                     |
| `certificate_id` | `user_certificate.certificate_id`                                               |
| `url`            | `user_certificate.url`                                                          |
| `ongoing`        | `user_certificate.ongoing == true ? true : false` (boolean comparison)           |
| `document`       | Explode comma-separated `certificate` → trim → filter empty → prepend `S3_PREFIX` → array |

> ⚠️ **Key difference from LIST:** DETAIL also returns `courseId` and `universityId` (raw integer FK values). LIST does NOT include these.

### Response (Found)
```json
{
  "status": true,
  "messages": "certificate Detail",
  "data": { ... }
}
```

### Response (Error/Exception)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 3: POST Add / Update Certificate

**Path:** `POST /wapi/employee/add-certificate`
**Path:** `POST /wapi/employee/add-certificate/{id}` (update existing)

### Request Format
`multipart/form-data`

### Fields

| Field            | Required | Type                | Description                                                      |
|------------------|----------|---------------------|------------------------------------------------------------------|
| `university`     | **Yes**  | string or int       | Institution name (string → auto-create; int → existing FK)      |
| `course`         | **Yes**  | string or int       | Course name (string → auto-create; int → existing FK)            |
| `start_date`     | No       | string              |                                                                  |
| `end_date`       | No       | string              |                                                                  |
| `certificate_id` | No       | string              | External certificate ID                                          |
| `url`            | No       | string              | Verification URL                                                 |
| `ongoing`        | No       | boolean (string)    | `true` / `false` — if truthy, sets `ongoing = true`              |
| `document`       | No       | file(s)             | Upload files (images/PDFs/Word docs). Can be multiple.           |

#### Dynamic Institution/Course Creation

If `university` is a string (not an integer):
1. Check if a record exists in `institutions` table with matching `name`
2. If exists → use that `id`
3. If not → insert new row into `institutions` with `name`, `user_defined = 1`, `user_id = :authUserId`
4. Save the resolved `id` into `user_certificate.university`

Same logic applies to `course` → `courses` table.

### Document File Handling
- Accepts multiple files via the `document` field
- Each file is uploaded to S3 via `s3fileUploads(file, 'uploads/document/')`
- Uploaded S3 keys are collected into an array, then `implode(',')` into the `certificate` column
- On update: existing `certificate` values are preserved and new keys appended (comma-separated)

### On Create (no `id`)
```sql
INSERT INTO user_certificate (user, start_date, end_date, certificate_id, url,
                               university, course, certificate, ongoing,
                               create_date, modify_date)
VALUES (:authUserId, ..., date('Y-m-d'), date('Y-m-d'))
```

### On Update (`id` present)
```sql
UPDATE user_certificate
SET user = :authUserId, start_date = ..., modify_date = date('Y-m-d')
WHERE id = :id
```
> ⚠️ Note: The update does NOT scope by `user` — it updates by `id` only.

### Response (Success)
```json
{
  "status": true,
  "messages": "Successfully Added !"
}
```
```json
{
  "status": true,
  "messages": "Successfully updated !"
}
```

### Response (Validation Error)
```json
{
  "status": false,
  "messages": "The university field is required,The course field is required"
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "<exception message>"
}
```
> ⚠️ **Note:** The add endpoint exposes the actual exception message (e.g. SQL error), unlike other endpoints that return a generic `"Access denied"`.

### Response (Fallback Failure)
```json
{
  "status": false,
  "messages": "Something Went Wrong"
}
```

---

## Endpoint 4: DELETE (Soft-Delete) Certificate

**Path:** `DELETE /wapi/employee/delete-certificate/{id}`

### Query Logic
```sql
UPDATE user_certificate
SET is_deleted = 1
WHERE user = :authenticated_user_id
  AND id = :id
```

### Response (Success)
```json
{
  "status": true,
  "messages": " Deleted Sucessfully"
}
```

### Response (Failure)
```json
{
  "status": false,
  "messages": "Try again something went wrong "
}
```

### Response (Exception)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

> ⚠️ **Edge case:** If `$user` (authenticated user ID) is empty/null, the function skips all logic and returns `null` (JSON `null`) because no `$response` variable is ever assigned.

---

## Implementation Notes for Cross-Language Porting

1. **Auth filter:** All routes behind JWT validation middleware that injects user ID into request context
2. **Document parsing:** The `certificate` column stores comma-separated S3 keys (e.g., `key1.pdf,key2.jpg,` with a trailing comma). Parse by: explode on `,` → `array_filter` (remove empties) → `array_map('trim')` → `array_values` → prepend `S3_PREFIX`
3. **S3 prefix:** `env('S3_PREFIX')` is the full S3 base URL (e.g., `https://bucket.s3.region.amazonaws.com/`)
4. **Dynamic FK creation:** On add, `university` and `course` can be plain text strings — the backend auto-creates rows in `institutions` / `courses` tables and resolves them to IDs
5. **LIST vs DETAIL key differences:**
   - LIST returns `university` (name), `course` (name)
   - DETAIL also returns `universityId` (raw FK), `courseId` (raw FK)
   - LIST checks `ongoing == 'true'` (string comp), DETAIL checks `ongoing == true` (bool comp) — both produce boolean JSON output
6. **Soft-delete:** `DELETE` sets `is_deleted = 1`, never removes rows
7. **Owner scoping:** LIST, DETAIL, and DELETE queries include `user = :authUserId`. Add/Update does NOT scope by user on update — it updates by `id` alone
8. **Exposed exception messages:** The add endpoint leaks `$ex->getMessage()` in error responses, while other endpoints use generic `"Access denied"`
