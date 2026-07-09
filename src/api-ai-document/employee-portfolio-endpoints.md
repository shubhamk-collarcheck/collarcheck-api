
# Employee Portfolio API Endpoints

## Overview

Three REST endpoints for managing employee portfolio items (CRUD: Read list, Read detail, Soft-delete). All endpoints require JWT authentication and operate on the `user_protfolio` table.

---

## Authentication

follow othere api for understanding authentication

---

## Base URL / Route Prefix

All routes are grouped under:
```
/wapi/employee/...
```

### Routes

| Method   | Path                                | Controller Method                   | Description         |
|----------|-------------------------------------|-------------------------------------|---------------------|
| `GET`    | `/wapi/employee/all-portfolio`      | `IndividualApi::allPortfolioList`   | List all portfolios |
| `GET`    | `/wapi/employee/portfolio-detail/{id}` | `IndividualApi::portfolio_detail` | Get single portfolio |
| `DELETE` | `/wapi/employee/delete-portfolio/{id}` | `IndividualApi::deletePortfolioIndividual` | Soft-delete portfolio |

---

## Database Table: `user_protfolio`

| Column        | Type         | Notes                                          |
|---------------|-------------|------------------------------------------------|
| `id`          | int (PK)    | auto-increment                                 |
| `user`        | int         | FK to `user.id`                                |
| `type`        | tinyint     | `1`=image, `2`=video, `3`=url, `4`=pdf        |
| `title`       | varchar(?)  |                                                |
| `image`       | varchar(?)  | S3 object key (used when type=1)               |
| `video`       | varchar(?)  | S3 object key (used when type=2)               |
| `youtube`     | varchar(?)  | YouTube URL (used when type=2)                 |
| `url`         | varchar(?)  | External URL (used when type=3)                |
| `pdf`         | varchar(?)  | S3 object key (used when type=4 / default)     |
| `description` | text        |                                                |
| `status`      | tinyint     | always `1` = active                           |
| `is_deleted`  | tinyint     | `0` = active, `1` = soft-deleted              |
| `create_date` | datetime    |                                                |
| `modify_date` | datetime    |                                                |

> **Note:** The table is actually named `user_protfolio` (typo: "protfolio" not "portfolio") in the schema.

---

## Type-Based Response Field Mapping (shared logic)

This mapping is used in both LIST and DETAIL endpoints. The response object keys differ depending on `type`:

### type = 1 (Image)
```json
{
  "id": 1,
  "type": 1,
  "title": "My Project",
  "image": "https://s3-bucket.s3.amazonaws.com/uploads/document/abc.jpg",
  "description": "Project description here"
}
```
| Key           | Source                                          |
|---------------|------------------------------------------------|
| `id`          | `user_protfolio.id`                            |
| `type`        | `user_protfolio.type`                          |
| `title`       | `user_protfolio.title`                         |
| `image`       | `env('S3_PREFIX') . user_protfolio.image`      |
| `description` | `user_protfolio.description`                   |

### type = 2 (Video)
```json
{
  "id": 2,
  "type": 2,
  "title": "Demo Video",
  "video": "https://s3-bucket.s3.amazonaws.com/uploads/document/demo.mp4",
  "description": "Video description",
  "youtube": "dQw4w9WgXcQ"
}
```
| Key           | Source                                                    |
|---------------|----------------------------------------------------------|
| `id`          | `user_protfolio.id`                                      |
| `type`        | `user_protfolio.type`                                    |
| `title`       | `user_protfolio.title`                                   |
| `video`       | `env('S3_PREFIX') . user_protfolio.video`                |
| `description` | `user_protfolio.description`                             |
| `youtube`     | For LIST: `substr($youtube, strpos($youtube, '=') + 1)` (extracts value after last `=`) |
|               | For DETAIL: raw `user_protfolio.youtube` (full URL)      |

> ⚠️ **Inconsistency:** The LIST endpoint strips the YouTube video ID from the URL (extracts value after `=`), while DETAIL returns the full raw URL.

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
| Key           | Source                    |
|---------------|--------------------------|
| `id`          | `user_protfolio.id`      |
| `type`        | `user_protfolio.type`    |
# Employee Portfolio API Endpoints

## Overview

Three REST endpoints for managing employee portfolio items (CRUD: Read list, Read detail, Soft-delete). All endpoints require JWT authentication and operate on the `user_protfolio` table.

---

## Authentication

- **Filter:** `Authenticate` (CodeIgniter 4 filter applied to route group `wapi`)
- **Header:** `Authorization: Bearer <jwt_token>`
- **JWT decode:** Extract `uid` claim → look up `user` table WHERE `id = uid`, `status = 1`, `is_deleted = 0`
- **Optional override:** Send `X-Company` header with a different user ID to act on behalf of that user
- **Injected request property:** `$this->request->id` → the acting user ID (used as `user` filter in all queries)

---

## Base URL / Route Prefix

All routes are grouped under:
```
/wapi/employee/...
```

### Routes

| Method   | Path                                | Controller Method                   | Description         |
|----------|-------------------------------------|-------------------------------------|---------------------|
| `GET`    | `/wapi/employee/all-portfolio`      | `IndividualApi::allPortfolioList`   | List all portfolios |
| `GET`    | `/wapi/employee/portfolio-detail/{id}` | `IndividualApi::portfolio_detail` | Get single portfolio |
| `DELETE` | `/wapi/employee/delete-portfolio/{id}` | `IndividualApi::deletePortfolioIndividual` | Soft-delete portfolio |

---

## Database Table: `user_protfolio`

| Column        | Type         | Notes                                          |
|---------------|-------------|------------------------------------------------|
| `id`          | int (PK)    | auto-increment                                 |
| `user`        | int         | FK to `user.id`                                |
| `type`        | tinyint     | `1`=image, `2`=video, `3`=url, `4`=pdf        |
| `title`       | varchar(?)  |                                                |
| `image`       | varchar(?)  | S3 object key (used when type=1)               |
| `video`       | varchar(?)  | S3 object key (used when type=2)               |
| `youtube`     | varchar(?)  | YouTube URL (used when type=2)                 |
| `url`         | varchar(?)  | External URL (used when type=3)                |
| `pdf`         | varchar(?)  | S3 object key (used when type=4 / default)     |
| `description` | text        |                                                |
| `status`      | tinyint     | always `1` = active                           |
| `is_deleted`  | tinyint     | `0` = active, `1` = soft-deleted              |
| `create_date` | datetime    |                                                |
| `modify_date` | datetime    |                                                |

> **Note:** The table is actually named `user_protfolio` (typo: "protfolio" not "portfolio") in the schema.

---

## Type-Based Response Field Mapping (shared logic)

This mapping is used in both LIST and DETAIL endpoints. The response object keys differ depending on `type`:

### type = 1 (Image)
```json
{
  "id": 1,
  "type": 1,
  "title": "My Project",
  "image": "https://s3-bucket.s3.amazonaws.com/uploads/document/abc.jpg",
  "description": "Project description here"
}
```
| Key           | Source                                          |
|---------------|------------------------------------------------|
| `id`          | `user_protfolio.id`                            |
| `type`        | `user_protfolio.type`                          |
| `title`       | `user_protfolio.title`                         |
| `image`       | `env('S3_PREFIX') . user_protfolio.image`      |
| `description` | `user_protfolio.description`                   |

### type = 2 (Video)
```json
{
  "id": 2,
  "type": 2,
  "title": "Demo Video",
  "video": "https://s3-bucket.s3.amazonaws.com/uploads/document/demo.mp4",
  "description": "Video description",
  "youtube": "dQw4w9WgXcQ"
}
```
| Key           | Source                                                    |
|---------------|----------------------------------------------------------|
| `id`          | `user_protfolio.id`                                      |
| `type`        | `user_protfolio.type`                                    |
| `title`       | `user_protfolio.title`                                   |
| `video`       | `env('S3_PREFIX') . user_protfolio.video`                |
| `description` | `user_protfolio.description`                             |
| `youtube`     | For LIST: `substr($youtube, strpos($youtube, '=') + 1)` (extracts value after last `=`) |
|               | For DETAIL: raw `user_protfolio.youtube` (full URL)      |

> ⚠️ **Inconsistency:** The LIST endpoint strips the YouTube video ID from the URL (extracts value after `=`), while DETAIL returns the full raw URL.

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
| Key           | Source                    |
|---------------|--------------------------|
| `id`          | `user_protfolio.id`      |
| `type`        | `user_protfolio.type`    |
| `title`       | `user_protfolio.title`   |
| `url`         | `user_protfolio.url`     |
| `description` | `user_protfolio.description` |

### type = 4 or any other (PDF / Default)
```json
{
  "id": 4,
  "type": 4,
  "title": "My Resume",
  "pdf": "https://s3-bucket.s3.amazonaws.com/uploads/document/resume.pdf",
  "description": "PDF description"
}
```
| Key           | Source                                        |
|---------------|----------------------------------------------|
| `id`          | `user_protfolio.id`                          |
| `type`        | `user_protfolio.type`                        |
| `title`       | `user_protfolio.title`                       |
| `pdf`         | `env('S3_PREFIX') . user_protfolio.pdf`      |
| `description` | `user_protfolio.description`                 |

---

## Endpoint 1: GET All Portfolio List

**Path:** `GET /wapi/employee/all-portfolio`

### Query Logic
```sql
SELECT * FROM user_protfolio
WHERE status = 1
  AND user = :authenticated_user_id
  AND is_deleted = 0
ORDER BY create_date DESC
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

### Response (Error/Exception - 200 with status false)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 2: GET Portfolio Detail

**Path:** `GET /wapi/employee/portfolio-detail/{id}`

### Query Logic
```sql
SELECT * FROM user_protfolio
WHERE id = :id
  AND status = 1
  AND user = :authenticated_user_id
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

### Response (Not Found - 200 with status false)
```json
{
  "status": false,
  "messages": "No record found!"
}
```

### Response (Error/Exception - 200 with status false)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 3: DELETE (Soft-Delete) Portfolio

**Path:** `DELETE /wapi/employee/delete-portfolio/{id}`

### Query Logic
```sql
UPDATE user_protfolio
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

### Response (Failure - 200 with status false)
```json
{
  "status": false,
  "messages": "Try again something went wrong "
}
```

### Response (Error/Exception - 200 with status false)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Common Response Envelope

All endpoints return `Content-Type: application/json` with this top-level structure:

| Key        | Type    | Description                                  |
|------------|---------|----------------------------------------------|
| `status`   | boolean | `true` for success, `false` for errors       |
| `messages` | string  | Human-readable status/error message          |
| `data`     | array/object/null | Payload (absent or null on errors) |

> ⚠️ Note: The original uses `messages` (plural) consistently, even for single messages.

---

## Error Handling (All Endpoints)

Every endpoint wraps its core logic in a `try-catch` block. On any exception:
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Implementation Notes for Cross-Language Porting

1. **Auth filter:** Ensure all routes are behind JWT validation middleware that injects user ID into request context
2. **Soft-delete pattern:** `DELETE` does not remove the row — sets `is_deleted = 1`
3. **S3 prefix:** Asset URLs are built as `env('S3_PREFIX') . db_column_value`. The `S3_PREFIX` env var is the full S3 base URL (e.g., `https://bucket.s3.region.amazonaws.com/`)
4. **YouTube extraction (LIST only):** `substr(youtube, strpos(youtube, '=') + 1)` — extracts video ID after `=` from a URL like `https://youtube.com/watch?v=dQw4w9WgXcQ`
5. **Owner scoping:** Every query includes `user = :authUserId` to ensure users can only access their own portfolio
6. **Field exclusions:** Fields `status`, `create_date`, `modify_date`, `is_deleted`, `user` are never exposed in the response
| `title`       | `user_protfolio.title`   |
| `url`         | `user_protfolio.url`     |
| `description` | `user_protfolio.description` |

### type = 4 or any other (PDF / Default)
```json
{
  "id": 4,
  "type": 4,
  "title": "My Resume",
  "pdf": "https://s3-bucket.s3.amazonaws.com/uploads/document/resume.pdf",
  "description": "PDF description"
}
```
| Key           | Source                                        |
|---------------|----------------------------------------------|
| `id`          | `user_protfolio.id`                          |
| `type`        | `user_protfolio.type`                        |
| `title`       | `user_protfolio.title`                       |
| `pdf`         | `env('S3_PREFIX') . user_protfolio.pdf`      |
| `description` | `user_protfolio.description`                 |

---

## Endpoint 1: GET All Portfolio List

**Path:** `GET /wapi/employee/all-portfolio`

### Query Logic
```sql
SELECT * FROM user_protfolio
WHERE status = 1
  AND user = :authenticated_user_id
  AND is_deleted = 0
ORDER BY create_date DESC
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

### Response (Error/Exception - 200 with status false)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 2: GET Portfolio Detail

**Path:** `GET /wapi/employee/portfolio-detail/{id}`

### Query Logic
```sql
SELECT * FROM user_protfolio
WHERE id = :id
  AND status = 1
  AND user = :authenticated_user_id
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

### Response (Not Found - 200 with status false)
```json
{
  "status": false,
  "messages": "No record found!"
}
```

### Response (Error/Exception - 200 with status false)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Endpoint 3: DELETE (Soft-Delete) Portfolio

**Path:** `DELETE /wapi/employee/delete-portfolio/{id}`

### Query Logic
```sql
UPDATE user_protfolio
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

### Response (Failure - 200 with status false)
```json
{
  "status": false,
  "messages": "Try again something went wrong "
}
```

### Response (Error/Exception - 200 with status false)
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Common Response Envelope

All endpoints return `Content-Type: application/json` with this top-level structure:

| Key        | Type    | Description                                  |
|------------|---------|----------------------------------------------|
| `status`   | boolean | `true` for success, `false` for errors       |
| `messages` | string  | Human-readable status/error message          |
| `data`     | array/object/null | Payload (absent or null on errors) |

> ⚠️ Note: The original uses `messages` (plural) consistently, even for single messages.

---

## Error Handling (All Endpoints)

Every endpoint wraps its core logic in a `try-catch` block. On any exception:
```json
{
  "status": false,
  "messages": "Access denied"
}
```

---

## Implementation Notes for Cross-Language Porting

1. **Auth filter:** Ensure all routes are behind JWT validation middleware that injects user ID into request context
2. **Soft-delete pattern:** `DELETE` does not remove the row — sets `is_deleted = 1`
3. **S3 prefix:** Asset URLs are built as `env('S3_PREFIX') . db_column_value`. The `S3_PREFIX` env var is the full S3 base URL (e.g., `https://bucket.s3.region.amazonaws.com/`)
4. **YouTube extraction (LIST only):** `substr(youtube, strpos(youtube, '=') + 1)` — extracts video ID after `=` from a URL like `https://youtube.com/watch?v=dQw4w9WgXcQ`
5. **Owner scoping:** Every query includes `user = :authUserId` to ensure users can only access their own portfolio
6. **Field exclusions:** Fields `status`, `create_date`, `modify_date`, `is_deleted`, `user` are never exposed in the response
