# Employee Portfolio API Endpoints

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Auth:** `Authorization` middleware · optional `X-Company` header  
> **Layers:** `routes → controllers → services → repositery` · types in `src/types/`

## Overview

Five REST endpoints for managing employee portfolio items (CRUD: Create, Read list, Read detail, Update, Soft-delete). All endpoints require JWT authentication and operate on the `cyb_user_protfolio` table.

---

## Authentication

- **Middleware:** `Authorization` (JWT validation)
- **Header:** `Authorization: Bearer <jwt_token>`
- **JWT decode:** Extract `uid` claim → `get_user_detail(uid)` (`users.service.ts`)
- **Injected request property:** `req.auth.user_id` → the acting user ID (used as `user` filter in all queries)

---

## File Structure

```
src/
├── types/portfolio.types.ts          # Zod schemas, PORTFOLIO_TYPE enum, request types
├── repositery/portfolio.repositery.ts # Database queries (Drizzle ORM)
├── services/portfolio.service.ts     # Business logic, S3 URL mapping
├── controllers/portfolio.controller.ts # Request handlers
└── routes/employee.route.ts          # Route definitions
```
---

## Base URL / Route Prefix

All routes are grouped under:
```
/wapi/employee/...
```
### Routes

| Method   | Path                                    | Controller Method   | Validation Schema                | Description           |
|----------|----------------------------------------|---------------------|----------------------------------|-----------------------|
| `POST`   | `/wapi/employee/add-portfolio`         | `addPortfolio`      | `portfolioRequestSchema`         | Create portfolio      |
| `POST`   | `/wapi/employee/add-portfolio/:id`     | `updatePortfolio`   | `portfolioUpdateRequestSchema`   | Update portfolio      |
| `GET`    | `/wapi/employee/all-portfolio`         | `allPortfolioList`  | none (auth only)                 | List all portfolios   |
| `GET`    | `/wapi/employee/portfolio-detail/:id`  | `portfolioDetail`   | `commonIdParamsSchema`           | Get single portfolio  |
| `DELETE` | `/wapi/employee/delete-portfolio/:id`  | `deletePortfolio`   | `commonIdParamsSchema`           | Soft-delete portfolio |

---

## Database Table: `cyb_user_protfolio`

| Column        | Type         | Drizzle Field      | Notes                                          |
|---------------|-------------|--------------------|------------------------------------------------|
| `id`          | int (PK)    | `id`               | auto-increment                                 |
| `user`        | int         | `user`             | FK to `cyb_user.id`                            |
| `type`        | tinyint     | `type`             | `1`=image, `2`=video, `3`=url, `4`=pdf        |
| `title`       | varchar     | `title`            |                                                |
| `description` | text        | `description`      |                                                |
| `image`       | text        | `image`            | S3 object key (used when type=1)               |
| `video`       | text        | `video`            | S3 object key (used when type=2)               |
| `youtube`     | varchar     | `youtube`          | YouTube URL (used when type=2)                 |
| `url`         | text        | `url`              | External URL (used when type=3)                |
| `pdf`         | text        | `pdf`              | S3 object key (used when type=4)               |
| `status`      | tinyint     | `status`           | always `1` = active                            |
| `sort_order`  | int         | `sortOrder`        | default `1`                                    |
| `is_deleted`  | tinyint     | `isDeleted`        | `0` = active, `1` = soft-deleted              |
| `create_date` | datetime    | `createDate`       | ISO format: `YYYY-MM-DD HH:mm:ss`             |
| `modify_date` | datetime    | `modifyDate`       | ISO format: `YYYY-MM-DD HH:mm:ss`             |

> **Note:** The table is named `cyb_user_protfolio` (typo: "protfolio" not "portfolio") in the schema.

---

## PORTFOLIO_TYPE Enum

Defined in `src/types/portfolio.types.ts`:

```typescript
export enum PORTFOLIO_TYPE {
  IMAGE = 1,
  VIDEO = 2,
  URL = 3,
  PDF = 4
}
```
---

## Zod Validation Schemas

### `newPortfolioSchema` (body)

```typescript
z.object({
  type: z.number(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  youtube: z.string().optional(),
  url: z.string().optional(),
  file: z.unknown().optional(),
}).superRefine((data, ctx) => {
  // type 1 (IMAGE) or 4 (PDF): file is required
  // type 2 (VIDEO): youtube is required
  // type 3 (URL): url is required
})
```
### `portfolioRequestSchema` (add)

```typescript
z.object({ body: newPortfolioSchema })
```
### `portfolioUpdateRequestSchema` (update)

```typescript
z.object({
  params: commonIdParamsSchema.shape.params, // { id: number }
  body: newPortfolioSchema,
})
```
---

## Type-Based Response Field Mapping

Response object keys differ depending on `type`. Implemented in `mapPortfolioItem()` in `src/services/portfolio.service.ts`.

### type = 1 (Image)

```json
{
  "id": 1,
  "type": 1,
  "title": "My Project",
  "image": "https://s3.amazonaws.com/bucket/uploads/document/abc.jpg",
  "description": "Project description here"
}
```
| Key           | Source                                          |
|---------------|------------------------------------------------|
| `id`          | `cyb_user_protfolio.id`                        |
| `type`        | `cyb_user_protfolio.type`                      |
| `title`       | `cyb_user_protfolio.title`                     |
| `image`       | `env('S3_PREFIX') + cyb_user_protfolio.image`  |
| `description` | `cyb_user_protfolio.description`               |

### type = 2 (Video)

```json
{
  "id": 2,
  "type": 2,
  "title": "Demo Video",
  "video": "https://s3.amazonaws.com/bucket/uploads/document/demo.mp4",
  "description": "Video description",
  "youtube": "dQw4w9WgXcQ"
}
```
| Key           | Source                                                    |
|---------------|----------------------------------------------------------|
| `id`          | `cyb_user_protfolio.id`                                  |
| `type`        | `cyb_user_protfolio.type`                                |
| `title`       | `cyb_user_protfolio.title`                               |
| `video`       | `env('S3_PREFIX') + cyb_user_protfolio.video`            |
| `description` | `cyb_user_protfolio.description`                         |
| `youtube`     | For LIST: extracts video ID after `=` from URL           |
|               | For DETAIL: raw `cyb_user_protfolio.youtube` (full URL)  |

> **Inconsistency:** LIST endpoint strips YouTube to video ID, DETAIL returns full URL.

### type = 3 (URL/Link)

```json
{
  "id": 3,
  "type": 3,
  "title": "External Link",
  "url": "https://example.com/portfolio",
  "description": "Link description"
}
```
| Key           | Source                      |
|---------------|----------------------------|
| `id`          | `cyb_user_protfolio.id`    |
| `type`        | `cyb_user_protfolio.type`  |
| `title`       | `cyb_user_protfolio.title` |
| `url`         | `cyb_user_protfolio.url`   |
| `description` | `cyb_user_protfolio.description` |

### type = 4 (PDF)

```json
{
  "id": 4,
  "type": 4,
  "title": "My Resume",
  "pdf": "https://s3.amazonaws.com/bucket/uploads/document/resume.pdf",
  "description": "PDF description"
}
```
| Key           | Source                                        |
|---------------|----------------------------------------------|
| `id`          | `cyb_user_protfolio.id`                      |
| `type`        | `cyb_user_protfolio.type`                    |
| `title`       | `cyb_user_protfolio.title`                   |
| `pdf`         | `env('S3_PREFIX') + cyb_user_protfolio.pdf`  |
| `description` | `cyb_user_protfolio.description`             |

---

## Endpoint 1: POST Add Portfolio

**Path:** `POST /wapi/employee/add-portfolio`

**Middleware:** `Authorization`, `uploadToS3.single("file")`, `validateData(portfolioRequestSchema)`

### Request Body

| Field         | Type    | Required | Notes                                      |
|---------------|---------|----------|--------------------------------------------|
| `type`        | number  | yes      | `1`=image, `2`=video, `3`=url, `4`=pdf    |
| `title`       | string  | yes      | min 1 char                                 |
| `description` | string  | no       |                                            |
| `youtube`     | string  | cond.    | required when type=2                       |
| `url`         | string  | cond.    | required when type=3                       |
| `file`        | file    | cond.    | required when type=1 or type=4             |

**File upload:** Single file via `uploadToS3` (S3 multer). Field name: `file`.

### Response (Success - 201)

```json
{
  "status": true,
  "messages": "Successfully Added!"
}
```
### Response (Error - via error handler)

```json
{
  "status": false,
  "messages": "Something Went Wrong"
}
```
### Implementation

- **Controller:** `src/controllers/portfolio.controller.ts` → `addPortfolio()`
- **Service:** `src/services/portfolio.service.ts` → `addPortfolioService()`
- **Repo:** `src/repositery/portfolio.repositery.ts` → `create()`

---

## Endpoint 2: POST Update Portfolio

**Path:** `POST /wapi/employee/add-portfolio/:id`

**Middleware:** `Authorization`, `uploadToS3.single("file")`, `validateData(portfolioUpdateRequestSchema)`

### Request Body

Same as Add endpoint.

### Request Params

| Field | Type   | Required | Notes         |
|-------|--------|----------|---------------|
| `id`  | number | yes      | Portfolio ID  |

### Response (Success - 200)

```json
{
  "status": true,
  "messages": "Successfully Updated!"
}
```
### Response (Error - via error handler)

```json
{
  "status": false,
  "messages": "Portfolio not found"
}
```
### Implementation

- **Controller:** `src/controllers/portfolio.controller.ts` → `updatePortfolio()`
- **Service:** `src/services/portfolio.service.ts` → `updatePortfolioService()`
- **Repo:** `src/repositery/portfolio.repositery.ts` → `findById()`, `update()`

**Logic:** Finds existing by ID, verifies `existing.user === userId`, updates fields based on type.

---

## Endpoint 3: GET All Portfolio List

**Path:** `GET /wapi/employee/all-portfolio`

**Middleware:** `Authorization`

### Query Logic

```sql
SELECT * FROM cyb_user_protfolio
WHERE user = :authenticated_user_id
  AND status = 1
  AND is_deleted = 0
ORDER BY sort_order DESC
```
### Response (Success - 200)

```json
{
  "status": true,
  "messages": "portfolio History",
  "data": [
    {
      "id": 1,
      "type": 1,
      "title": "My Project",
      "image": "https://s3.amazonaws.com/bucket/uploads/document/abc.jpg",
      "description": "A cool project"
    },
    {
      "id": 2,
      "type": 2,
      "title": "Demo",
      "video": "https://s3.amazonaws.com/bucket/uploads/document/vid.mp4",
      "description": "Video",
      "youtube": "dQw4w9WgXcQ"
    },
    {
      "id": 3,
      "type": 3,
      "title": "My Website",
      "url": "https://example.com",
      "description": "Personal website"
    },
    {
      "id": 4,
      "type": 4,
      "title": "Certificate",
      "pdf": "https://s3.amazonaws.com/bucket/uploads/document/cert.pdf",
      "description": "My certificate"
    }
  ]
}
```
### Response (Error/Exception - via error handler)

```json
{
  "status": false,
  "messages": "Access denied"
}
```
### Implementation

- **Controller:** `src/controllers/portfolio.controller.ts` → `allPortfolioList()`
- **Service:** `src/services/portfolio.service.ts` → `allPortfolioListService()`
- **Repo:** `src/repositery/portfolio.repositery.ts` → `getAllByUserId()`
- **Mapping:** `mapPortfolioItem(item, true)` — extracts YouTube ID for LIST

---

## Endpoint 4: GET Portfolio Detail

**Path:** `GET /wapi/employee/portfolio-detail/:id`

**Middleware:** `Authorization`, `validateData(commonIdParamsSchema)`

### Request Params

| Field | Type   | Required | Notes         |
|-------|--------|----------|---------------|
| `id`  | number | yes      | Portfolio ID  |

### Query Logic

```sql
SELECT * FROM cyb_user_protfolio
WHERE id = :id
  AND user = :authenticated_user_id
  AND status = 1
  AND is_deleted = 0
LIMIT 1
```
### Response (Found - 200)

```json
{
  "status": true,
  "messages": "portfolio Detail",
  "data": {
    "id": 1,
    "type": 1,
    "title": "My Project",
    "image": "https://s3.amazonaws.com/bucket/uploads/document/abc.jpg",
    "description": "A cool project"
  }
}
```
### Response (Not Found - via error handler)

```json
{
  "status": false,
  "messages": "No record found!"
}
```
### Implementation

- **Controller:** `src/controllers/portfolio.controller.ts` → `portfolioDetail()`
- **Service:** `src/services/portfolio.service.ts` → `portfolioDetailService()`
- **Repo:** `src/repositery/portfolio.repositery.ts` → `findByIdAndUser()`
- **Mapping:** `mapPortfolioItem(item, false)` — returns raw YouTube URL for DETAIL

---

## Endpoint 5: DELETE (Soft-Delete) Portfolio

**Path:** `DELETE /wapi/employee/delete-portfolio/:id`

**Middleware:** `Authorization`, `validateData(commonIdParamsSchema)`

### Request Params

| Field | Type   | Required | Notes         |
|-------|--------|----------|---------------|
| `id`  | number | yes      | Portfolio ID  |

### Query Logic

```sql
UPDATE cyb_user_protfolio
SET is_deleted = 1
WHERE id = :id
  AND user = :authenticated_user_id
```
> Note: Does NOT check `status` or `is_deleted` in the WHERE clause — it will update regardless of current state.

### Response (Success - 200)

```json
{
  "status": true,
  "messages": "Deleted Sucessfully"
}
```
### Response (Failure - via error handler)

```json
{
  "status": false,
  "messages": "Try again something went wrong"
}
```
### Implementation

- **Controller:** `src/controllers/portfolio.controller.ts` → `deletePortfolio()`
- **Service:** `src/services/portfolio.service.ts` → `deletePortfolioService()`
- **Repo:** `src/repositery/portfolio.repositery.ts` → `deleteByUserAndId()`

---

## Common Response Envelope

All endpoints return `Content-Type: application/json` with this top-level structure:

| Key        | Type                    | Description                          |
|------------|-------------------------|--------------------------------------|
| `status`   | boolean                 | `true` for success, `false` for errors |
| `messages` | string                  | Human-readable status/error message  |
| `data`     | array/object/null       | Payload (absent or null on errors)   |

> Note: Uses `messages` (plural) consistently, even for single messages.

---

## Error Handling (All Endpoints)

Every endpoint wraps its core logic in a `try-catch` block. Errors are passed to `next(error)` and handled by the global error handler middleware.

```typescript
// Pattern used in all controllers:
try {
  // ... business logic
} catch (error) {
  next(error)
}
```
The error handler returns:
```json
{
  "status": false,
  "messages": "<error message>"
}
```
---

## Implementation Notes

1. **Auth middleware:** `src/middlewares/Authorization.ts` — JWT validation, injects `req.auth.user_id`
2. **Soft-delete pattern:** `DELETE` does not remove the row — sets `is_deleted = 1`
3. **S3 prefix:** Asset URLs are built as `process.env.S3_PREFIX + db_column_value`. The `S3_PREFIX` env var is the full S3 base URL (e.g., `https://bucket.s3.region.amazonaws.com/`)
4. **YouTube extraction (LIST only):** Regex `youtube.match(/[?&]v=([^&]+)/)` extracts video ID after `=` from a URL like `https://youtube.com/watch?v=dQw4w9WgXcQ`
5. **Owner scoping:** Every query includes `user = :authUserId` to ensure users can only access their own portfolio
6. **Field exclusions:** Fields `status`, `create_date`, `modify_date`, `is_deleted`, `user` are never exposed in the response
7. **Validation:** Uses Zod schemas with `superRefine` for conditional validation based on `type`
8. **File upload:** Uses `uploadToS3.single("file")` for single file upload to S3
