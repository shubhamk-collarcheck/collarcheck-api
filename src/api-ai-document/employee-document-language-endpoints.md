# Employee Document & Language API Endpoints

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Route file:** `src/routes/employee.route.ts`  
> **Controller:** `src/controllers/document/language controllers`  
> **Service:** `src/services/document/language services`  
> **Types:** `src/types/document.types.ts / language.types.ts`


## Overview

Seven REST endpoints for managing employee documents and languages. All endpoints require JWT authentication.

---

## Routes

### Document Routes

| Method   | Path                                       | Controller Method                                | Description                    |
|----------|--------------------------------------------|--------------------------------------------------|--------------------------------|
| `POST`   | `/wapi/employee/add-document`              | `addDocument`                                    | Upload a document              |
| `GET`    | `/wapi/employee/all-document`              | `allDocumentList`                                | List all documents             |
| `GET`    | `/wapi/employee/document-detail/:id`       | `documentDetail`                                 | Get single document detail     |
| `DELETE` | `/wapi/employee/delete-document/:id`       | `deleteDocument`                                 | Soft-delete document           |

### Language Routes

> **Path note:** Node paths match PHP legacy names (`add_language`, `allLanguage`, `language/:id`).

| Method   | Path                                       | Controller Method                                | Description                    |
|----------|--------------------------------------------|--------------------------------------------------|--------------------------------|
| `POST`   | `/wapi/employee/add_language`              | `addLanguage`                                    | Create/update language         |
| `GET`    | `/wapi/employee/allLanguage`               | `allLanguageList`                                | List all languages             |
| `GET`    | `/wapi/employee/language-detail/:id`       | `languageDetail`                                 | Single language detail         |
| `DELETE` | `/wapi/employee/language/:id`              | `deleteLanguage`                                 | Delete language                |

---

## File Structure

```
src/
├── types/document.types.ts          # Zod schemas for document
├── types/language.types.ts          # Zod schemas for language
├── repositery/document.repositery.ts # Database queries for document
├── repositery/language.repositery.ts # Database queries for language
├── services/document.service.ts      # Business logic for document
├── services/language.service.ts      # Business logic for language
├── controllers/document.controller.ts # Request handlers for document
├── controllers/language.controller.ts # Request handlers for language
├── routes/employee.route.ts          # Route registration
└── utils/educationUpload.ts          # S3 multer config (PDF/PNG/JPG/JPEG/DOC/DOCX, 2MB, max 5 files)
```
---

## Zod Validation Schemas

### Document Schemas

#### newDocumentSchema (Add)

```typescript
z.object({
  doctype: z.coerce.number().int().positive("Document type is required"),
})
```
#### documentRequestSchema (Add)

```typescript
z.object({ body: newDocumentSchema })
```
#### documentDeleteRequestSchema (Delete)

```typescript
z.object({ params: commonIdParamsSchema.shape.params })
```
### Language Schemas

#### newLanguageSchema (Add/Upsert)

```typescript
z.object({
  language: z.union([
    z.coerce.number().int().positive("ID must be greater than 0."),
    z.string().trim().min(1, "Value cannot be empty."),
  ]),
  verbal: z.string().trim().min(1, "Verbal proficiency is required"),
  written: z.string().trim().min(1, "Written proficiency is required"),
})
```
#### languageRequestSchema (Add/Upsert)

```typescript
z.object({ body: newLanguageSchema })
```
#### languageDeleteRequestSchema (Delete)

```typescript
z.object({ params: commonIdParamsSchema.shape.params })
```
---

## Middleware

- **File Upload:** `educationUpload.array("document")` (S3 multer, PDF/PNG/JPG/JPEG/DOC/DOCX, 2MB, max 5 files)
- **Body Parser:** `express.json()`
- **Auth:** `Authorization` middleware extracts `uid` from JWT → `req.auth.user_id`

---

## Database Tables

### `cyb_user_document`

| Column        | Type         | Notes                                              |
|---------------|-------------|----------------------------------------------------|
| `id`          | int (PK)    | auto-increment                                     |
| `user`        | int         | FK to `cybUser.id`                                 |
| `doctype`     | int         | FK to `cybDoctype.id`                              |
| `doc`         | text        | S3 object key for uploaded document                |
| `docnumber`   | text        | Document number (optional)                         |
| `status`      | int         | `1` = active                                       |
| `is_deleted`  | int         | `0` = active, `1` = soft-deleted                   |
| `create_date` | datetime    |                                                    |
| `modify_date` | datetime    |                                                    |

### `cyb_doctype`

| Column                    | Type     | Notes                                       |
|---------------------------|----------|---------------------------------------------|
| `id`                      | int      | PK                                          |
| `name`                    | varchar  | e.g. "ID Proof", "Resume", "Certificate"   |
| `docfor`                  | int      | `1` = individual, `2` = company             |
| `is_verification_required` | int     |                                              |
| `status`                  | int      |                                              |

### `cyb_user_language`

| Column        | Type         | Notes                                              |
|---------------|-------------|----------------------------------------------------|
| `id`          | int (PK)    | auto-increment                                     |
| `user`        | int         | FK to `cybUser.id`                                 |
| `language`    | int         | FK to `cybLanguages.id`                            |
| `verbal`      | varchar     | Proficiency level (e.g. "Fluent", "Native")        |
| `written`     | varchar     | Proficiency level (e.g. "Fluent", "Native")        |
| `status`      | int         | `1` = active                                       |
| `is_deleted`  | int         | `0` = active, `1` = soft-deleted                   |
| `create_date` | datetime    |                                                    |
| `modify_date` | datetime    |                                                    |

### `cyb_languages`

| Column        | Type     | Notes                              |
|---------------|----------|------------------------------------|
| `id`          | int      | PK                                 |
| `name`        | varchar  | Language name (e.g. "English")     |
| `user_defined` | int     | `1` = user-created on the fly      |
| `user_id`     | int      | FK to `cybUser.id` (creator)       |
| `status`      | int      |                                    |
| `create_date` | varchar  |                                    |
| `modify_date` | varchar  |                                    |

---

## Repository Methods

### Document Repository

```typescript
getAllByUserId(userId: number)
  → SELECT ud.*, doctype.name AS doctypeName
    FROM cyb_user_document ud
    LEFT JOIN cyb_doctype doctype ON ud.doctype = doctype.id
    WHERE ud.user = :userId AND ud.status = 1 AND ud.is_deleted = 0
    ORDER BY ud.create_date DESC

findByIdAndUser(id: number, userId: number)
  → SELECT ud.*, doctype.name AS doctypeName
    FROM cyb_user_document ud
    LEFT JOIN cyb_doctype doctype ON ud.doctype = doctype.id
    WHERE ud.id = :id AND ud.user = :userId AND ud.status = 1 AND ud.is_deleted = 0
    LIMIT 1

findById(id: number)
  → SELECT * FROM cyb_user_document WHERE id = :id LIMIT 1

create(data)
  → INSERT INTO cyb_user_document (...) VALUES (...)

update(id, data)
  → UPDATE cyb_user_document SET ... WHERE id = :id

deleteByUserAndId(userId: number, id: number)
  → UPDATE cyb_user_document SET is_deleted = 1 WHERE id = :id AND user = :userId
```
### Language Repository

```typescript
getAllByUserId(userId: number)
  → SELECT ul.*, languages.name AS languageName
    FROM cyb_user_language ul
    LEFT JOIN cyb_languages languages ON ul.language = languages.id
    WHERE ul.user = :userId AND ul.status = 1 AND ul.is_deleted = 0
    ORDER BY ul.create_date DESC

findByIdAndUser(id: number, userId: number)
  → SELECT ul.*, languages.name AS languageName
    FROM cyb_user_language ul
    LEFT JOIN cyb_languages languages ON ul.language = languages.id
    WHERE ul.id = :id AND ul.user = :userId AND ul.status = 1 AND ul.is_deleted = 0
    LIMIT 1

findByUserAndLanguage(userId: number, languageId: number)
  → SELECT * FROM cyb_user_language
    WHERE user = :userId AND language = :languageId AND status = 1 AND is_deleted = 0
    LIMIT 1

create(data)
  → INSERT INTO cyb_user_language (...) VALUES (...)

update(id, data)
  → UPDATE cyb_user_language SET ... WHERE id = :id

hardDelete(userId: number, id: number)
  → DELETE FROM cyb_user_language WHERE id = :id AND user = :userId
```
---

## Service Methods

### Document Service

#### createDocumentService(userId, data, files)

1. Handle file upload (if present)
2. Get S3 key from first file
3. Create document record in database
4. Return success message

#### allDocumentListService(userId)

1. Fetch all records via `getAllByUserId`
2. Map each record through response format
3. Return formatted array

#### documentDetailService(userId, id)

1. Fetch record via `findByIdAndUser`
2. Return formatted record with additional fields

#### deleteDocumentService(userId, id)

1. Soft-delete via `deleteByUserAndId`

### Language Service

#### resolveLanguage(value, userId)

Dynamic FK resolution for `language` field:
- If `value` is a number → use directly as FK
- If `value` is a string → check `cyb_languages` for existing name
  - If found → use that `id`
  - If not → insert new row with `name`, `userDefined = 1`, `userId`

#### languageTransaction(userId, data)

Core transaction logic:
1. Resolve `language` via `resolveLanguage`
2. Return `languageId`

#### upsertLanguageService(userId, data)

1. Resolve `language` via `languageTransaction`
2. Check if record exists via `findByUserAndLanguage`
3. If exists → UPDATE existing record
4. If not → INSERT new record
5. Return success message

#### allLanguageListService(userId)

1. Fetch all records via `getAllByUserId`
2. Map each record through response format
3. Return formatted array

#### languageDetailService(userId, id)

1. Fetch record via `findByIdAndUser`
2. Return formatted record

#### deleteLanguageService(userId, id)

1. Hard-delete via `hardDelete`

---

## Controller Methods

### Document Controllers

#### addDocument

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { body } = req.validated as DocumentRequest
  const files = req.files as Express.MulterS3.File[] | undefined

  const messages = await createDocumentService(user_id, body, files)

  return res.status(201).json({
    status: true,
    messages,
  })
}
```
#### allDocumentList

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser

  const data = await allDocumentListService(user_id)

  return res.status(200).json({
    status: true,
    messages: "Document History",
    data,
  })
}
```
#### documentDetail

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { params } = req.validated as CommonIdParams

  const data = await documentDetailService(user_id, params.id)

  return res.status(200).json({
    status: true,
    messages: "Document Detail",
    data,
  })
}
```
#### deleteDocument

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { params } = req.validated as CommonIdParams

  const messages = await deleteDocumentService(user_id, params.id)

  return res.status(200).json({
    status: true,
    messages,
  })
}
```
### Language Controllers

#### addLanguage

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { body } = req.validated as LanguageRequest

  const messages = await upsertLanguageService(user_id, body)

  return res.status(200).json({
    status: true,
    messages,
  })
}
```
#### allLanguageList

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser

  const data = await allLanguageListService(user_id)

  return res.status(200).json({
    status: true,
    messages: "Language List",
    data,
  })
}
```
#### languageDetail

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { params } = req.validated as CommonIdParams

  const data = await languageDetailService(user_id, params.id)

  return res.status(200).json({
    status: true,
    messages: "Language Detail",
    data,
  })
}
```
#### deleteLanguage

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { params } = req.validated as CommonIdParams

  const messages = await deleteLanguageService(user_id, params.id)

  return res.status(200).json({
    status: true,
    messages,
  })
}
```
---

## Response Mapping

### Document List Item Response (allDocumentList)

```json
{
  "id": 1,
  "doctype": "ID Proof",
  "doc": "https://s3.amazonaws.com/bucket/uploads/document/id_proof.pdf",
  "docnumber": "",
  "create_date": "2024-01-15 10:30:00"
}
```
| Key           | Source / Logic                                                                  |
|---------------|---------------------------------------------------------------------------------|
| `id`          | `cyb_user_document.id`                                                          |
| `doctype`     | `cyb_doctype.name` (joined as `doctypeName`)                                    |
| `doc`         | Parsed from S3 key via `decodeDocumentURL`                                       |
| `docnumber`   | `cyb_user_document.docnumber` (empty string if null)                            |
| `create_date` | `cyb_user_document.create_date`                                                 |

### Document Detail Item Response (documentDetail)

Same as List, plus additional fields:

| Key           | Source / Logic                                                                  |
|---------------|---------------------------------------------------------------------------------|
| `doctypeId`   | `cyb_user_document.doctype` (raw FK integer — NOT in LIST response)             |

> ⚠️ **Key difference from LIST:** DETAIL also returns `doctypeId` (raw integer FK value). LIST does NOT include these.

### Language List Item Response (allLanguageList)

```json
{
  "id": 1,
  "language": "English",
  "languageId": 5,
  "verbal": "Fluent",
  "written": "Native",
  "create_date": "2024-01-15 10:30:00"
}
```
| Key           | Source / Logic                                                                  |
|---------------|---------------------------------------------------------------------------------|
| `id`          | `cyb_user_language.id`                                                          |
| `language`    | `cyb_languages.name` (joined as `languageName`)                                 |
| `languageId`  | `cyb_user_language.language` (raw FK integer)                                   |
| `verbal`      | `cyb_user_language.verbal`                                                      |
| `written`     | `cyb_user_language.written`                                                     |
| `create_date` | `cyb_user_language.create_date`                                                 |

### Language Detail Item Response (languageDetail)

Same as List response.

---

## Implementation Notes

1. **Document soft-delete:** `DELETE` sets `is_deleted = 1`, never removes rows
2. **Language hard-delete:** `DELETE` permanently removes the row using `DELETE FROM`
3. **Dynamic FK creation:** On add/upsert, `language` can be a plain text string — the backend auto-creates rows in `cyb_languages` table and resolves them to IDs
4. **Upsert pattern:** Language endpoint uses upsert — checks if record exists for user+language, updates if exists, inserts if not
5. **Owner scoping:** All queries include `user = :userId`
6. **Document file handling:** Single file upload via `educationUpload.array("document")`

---

## Example Requests

### Add Document (with file upload)

```bash
curl -X POST http://localhost:3000/wapi/employee/add-document \
  -H "Authorization: Bearer <token>" \
  -F "doctype=1" \
  -F "document=@/path/to/document.pdf"
```
### Success Response

```json
{
  "status": true,
  "messages": "Successfully Added !"
}
```
### Add Language

```bash
curl -X POST http://localhost:3000/wapi/employee/add_language \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "English",
    "verbal": "Fluent",
    "written": "Native"
  }'
```
### Success Response

```json
{
  "status": true,
  "messages": "Successfully added"
}
```