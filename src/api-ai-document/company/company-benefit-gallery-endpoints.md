# Company Benefits & Gallery Endpoints

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi/company`  
> **Route file:** `src/routes/company.route.ts`  
> **Controller:** `company-benefit-gallery.controller.ts`  
> **Service / repo:** `company-benefit-gallery.service.ts` · `company-benefit-gallery.repositery.ts`  
> **Types:** `company-benefit-gallery.types.ts`

## Routes Summary

### Benefits (legacy spelling `Benafit`)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/benefit` | `getBenefit` | List benefits |
| POST | `/addBenafit` | `addBenefit` | Add benefit |
| POST | `/addBenafit/:id` | `addBenefitUpdate` | Update benefit |
| DELETE | `/deleteBenafit/:id` | `deleteBenefit` | Soft-delete benefit |

### Gallery

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/gallery` | `getGallery` | List gallery |
| POST | `/addGallery` | `addGallery` | Upload images (`uploadToS3.array("file")`) |
| POST | `/addGallery/:id` | `addGalleryUpdate` | Update gallery item |
| DELETE | `/deleteGallery/:id` | `deleteGallery` | Soft-delete image |

---

## BENEFITS

---

## 1. GET `company/benefit`

### Route
```
GET /wapi/company/benefit
```
### Auth
JWT required. `req.auth.id` = company ID.
**Permission guard:** `checkMenuAccess(loginUserId, companyId, 10)`. Returns **403** if denied.

### DB Queries
```
get_company_benefit(companyId)
  → SELECT * FROM company_benefits
    JOIN benefits ON company_benefits.benefit_id = benefits.id
    WHERE company_benefits.company_id = {companyId}
    AND company_benefits.is_deleted = 0
```
### Request
No body params.

### Response
```json
{
  "status": true,
  "messages": "benefit list",
  "data": [
    {
      "id": 1,
      "name": "Health Insurance",
      "benefit_description": "Comprehensive health coverage for employees",
      "image": "https://s3.../benefit-icon.png"
    }
  ]
}
```
---

## 2. POST `company/addBenafit` (Create / Update)

### Route
```
POST /wapi/company/addBenafit         → Create new benefit  (legacy typo — primary path)
POST /wapi/company/addBenafit/{id}    → Update existing benefit
```
### Auth
JWT required. `req.auth.id` = company ID (`X-Company`).

### Middleware
`Authorization` → `formData` (`multer().none()`) → `validateData(addBenefitSchema)`  
FE uses **multipart/form-data** with `benefit_id` only (see company-benefits mutations).  
JSON / urlencoded also work via `express.json` / `urlencoded`.

### DB Queries
```
1. Validate: benefit_id required

2. If benefit_id is string (not int):
   a. check_record_exit('benefits', name) → check if benefit type exists
   b. If not: INSERT INTO benefits (name, user_defined=1, user_id, status=1)

3. Check duplicate: SELECT * FROM company_benefits
   WHERE company_id = {companyId} AND benefit_id = {benefitId} AND is_deleted = 0
   → If exists: "Record Already added!"

4. IF id provided (update):
   UPDATE company_benefits SET benefit_id, sortOrder, description, modify_date WHERE id = {id}

5. ELSE (create):
   INSERT INTO company_benefits (company_id, benefit_id, sortOrder, description, create_date, modify_date)
```
### Request (form-data or JSON)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `benefit_id` | string/int | Yes | Benefit type ID (int) or name (string, auto-creates). Alias: `benefitId` |
| `sortOrder` | string | No | Display order. Alias: `sort_order` |
| `description` | string | No | Benefit description |

### Response
```json
{ "status": true, "messages": "Successfully added" }
```
```json
{ "status": false, "messages": "Id is required." }
{ "status": false, "messages": "Record Already added!" }
```
### Notes
- Path spelling: **`addBenafit`** (legacy typo) is the primary FE path.
- `benefit_id` accepts pure integer string (id) or free-text name (auto-creates `benefits` with `user_defined=1`).
- Name match is **case-insensitive** (`LOWER(TRIM(name))`).
- **Duplicate check always runs** (create and `:id` update) — same `benefit_id` → `"Record Already added!"` even on update path (PHP parity).
- HTTP **200** for success and business failure.
- Contract: `src/debug/company-reviewuniqueusers-addgallery-addbenafit-endpoints.md`

---

## 3. DELETE `company/deleteBenafit/:id`

### Route
```
DELETE /wapi/company/deleteBenafit/{id}
```
- `:id` → `id` — company_benefits record ID

### Auth
JWT required. `req.auth.id` = company ID.

### DB Queries
```
1. SELECT * FROM company_benefits WHERE id = {id} AND company_id = {companyId}
   → Verify record exists and belongs to company

2. UPDATE company_benefits SET is_deleted = 1 WHERE id = {id} AND company_id = {companyId}
   → Soft delete
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `id` | URL segment | Yes | company_benefits record ID |

### Response
```json
{ "status": true, "messages": "Delete Successfully" }
```
```json
{ "status": false, "message": "Id is required!" }
{ "status": false, "messages": "Invalid Id" }
```
---

## GALLERY

---

## 4. GET `company/gallery`

### Route
```
GET /wapi/company/gallery
```
### Auth
JWT required. `req.auth.id` = company ID.
**Permission guard:** `checkMenuAccess(loginUserId, companyId, 9)`. Returns **403** if denied.

### DB Queries
```
MainModel::all_fetch('galleries', array('company_id' => companyId, 'is_deleted' => 0))
  → SELECT * FROM galleries WHERE company_id = {companyId} AND is_deleted = 0
```
### Request
No body params.

### Response
```json
{
  "status": true,
  "messages": "gallery list",
  "data": [
    {
      "id": 1,
      "name": "Office Photo",
      "description": "",
      "image": "https://s3.../gallery-img.jpg"
    }
  ]
}
```
---

## 5. POST `company/addGallery` (Upload)

### Route
```
POST /wapi/company/addGallery
POST /wapi/company/addGallery/:id   → :id ignored; always insert
```
### Auth
JWT · `req.auth.id` · **no** menu check on write.

### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | file[] | soft | Multi upload; empty → success **Nothing Modified !** |
| `title` | string/array | No | Per-file name if array |

### Response
```json
{ "status": true, "messages": "Successfully added" }
```
```json
{ "status": true, "messages": "Nothing Modified !" }
```

### Notes
- One `galleries` row per successful file; image stored as **path** (not full URL).
- `:id` route always **inserts** (update code dead in PHP).
- HTTP **200** always for soft empty / success.

---

## 6. DELETE `company/deleteGallery/:id`

### Route
```
DELETE /wapi/company/deleteGallery/{id}
```
- `:id` → `id` — galleries record ID

### Auth
JWT required. `req.auth.id` = company ID.

### DB Queries
```
1. SELECT * FROM galleries WHERE id = {id} AND company_id = {companyId}
   → Verify record exists and belongs to company

2. UPDATE galleries SET is_deleted = 1 WHERE id = {id} AND company_id = {companyId}
   → Soft delete
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `id` | URL segment | Yes | galleries record ID |

### Response
```json
{ "status": true, "messages": "Delete Successfully" }
```
```json
{ "status": false, "message": "Id is required!" }
{ "status": false, "messages": "Invalid Id" }
```
---

## Cross-Language Porting Notes

### benefit / addBenafit / deleteBenafit
- **Two-table design**: `benefits` (lookup: benefit types) + `company_benefits` (junction: company-specific benefits).
- `addBenafit` auto-creates new benefit types if string name provided (with `user_defined=1` flag).
- Duplicate check: same company + same benefit_id = rejected on create.
- Soft delete (`is_deleted = 1`) on `company_benefits` table.
- Permission guard uses menu ID `10`.

### gallery / addGallery / deleteGallery
- **Single table**: `galleries` with `company_id`, `name`, `image`, `is_deleted`.
- Supports **multi-file upload** — each file creates a separate row.
- `title` can be string (same for all) or array (per-image names).
- Update route exists but handler **always creates** (update code commented out).
- Soft delete (`is_deleted = 1`).
- Permission guard uses menu ID `9`.
- Images uploaded to S3 at `uploads/images/` path.
