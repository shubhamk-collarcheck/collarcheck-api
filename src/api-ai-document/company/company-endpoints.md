# Company Endpoints — Settings, Edit, Connections, Employment, Wishlist

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi/company`  
> **Route file:** `src/routes/company.route.ts`  
> **Auth:** `Authorization` · `X-Company` for company context  

## Routes Summary

| Method | Path | Controller | Service | Description |
|--------|------|------------|---------|-------------|
| GET | `/getSetting` | `getCompanySetting` | `getCompanySettingService` | Account settings |
| POST | `/saveSetting` | `saveCompanySetting` | `saveCompanySettingService` | Save settings |
| POST | `/edit-user` | `editCompany` | `editCompanyService` | Edit company profile (multipart) |
| GET | `/all-connection` | `allConnection` | `allConnectionService` | Current + past employees |
| POST | `/add-connection` | `addConnection` | `addConnectionService` | Add connection |
| GET | `/all-employement` | `allEmployment` | `allEmploymentService` | Employment verification list |
| PUT | `/update-employement/:id` | `updateEmployment` | `updateEmploymentService` | Approve employment |
| GET | `/all-wishlist` | `allWishlist` | `allWishlistService` | Wishlist list |
| POST | `/add-wishlist` | `addWishlist` | `addWishlistService` | Add to wishlist |
| DELETE | `/delete-wishlist/:id` | `deleteWishlist` | `deleteWishlistService` | Soft-delete wishlist |

**Types:** `src/types/company.types.ts` · **Repo:** `src/repositery/company.repositery.ts`

---

## 1. GET `company/getSetting`

Identical to `GET wapi/user/getSetting`. See [common-auth-endpoints.md](../common-auth-endpoints.md#1-get-usersetting) for full documentation.

- Permission guard uses menu ID `11`.
- Returns `account_setting` rows pivoted into `{key: value}` object.

---

## 2. POST `company/saveSetting`

Identical to `POST wapi/user/saveSetting`. See [common-auth-endpoints.md](../common-auth-endpoints.md#2-post-usersavesetting) for full documentation.

- Dynamic key-value upsert into `account_setting`.
- Body keys ARE the setting names.

---

## 3. POST `company/edit-user`

### Route
```
POST /wapi/company/edit-user?type=1
POST /wapi/company/edit-user?type=2
POST /wapi/company/edit-user?type=3
```
### Auth
JWT required. `req.auth.user_id` / acting company via JWT or `X-Company`.

### Multi-Step Update
**`type` is a query param** (`?type=1`), not body (body.type accepted as legacy fallback).

| `type` | Fields | Validation |
|--------|--------|------------|
| `1` (Basic) | company_name, contact_person, company_size, email, landline, incorporate_date, turnover, profile_description, website, industry, profile (file) | company_name required, contact_person required, profile: PNG/JPG max 10MB |
| `2` (Address) | present_address, permanent_address, country, state, city | city can be ID or string (auto-creates if new) |
| `3` (Social) | linkdin, youtube, instagram, facebook, twitter | None |

### DB Queries
```
Type 1:
  1. unique_website(websiteurl, id) — check website uniqueness
  2. UPDATE user SET fname, contact_person, company_size, email, ...
  3. Parse website URL → extract domain → INSERT INTO user_domains (if not exists)
  4. If industry is string (not int): INSERT INTO industries (if not exists), then use ID
  5. If profile file uploaded: S3 upload → UPDATE user SET profile = s3path
  6. If company name changed: UPDATE verify_document SET verify = 0 (re-verify)

Type 2:
  1. If city is string: INSERT INTO cities (if not exists), then use ID
  2. Geocode present_address → UPDATE user_details SET latitude, longitude
  3. UPDATE user SET present_address, permanent_address, country, state, city

Type 3:
  1. UPDATE user SET linkdin, youtube, instagram, facebook, twitter

Always:
  UPDATE user SET claim_status = 1, user_type = 2, modify_date = NOW()
```
### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | int | Yes | 1=basic, 2=address, 3=social |
| `company_name` | string | Type 1 | |
| `contact_person` | string | Type 1 | |
| `company_size` | string | No | |
| `email` | string | Type 1 | |
| `landline` | string | No | |
| `incorporate_date` | string | No | Year format |
| `turnover` | string | No | |
| `profile_description` | string | No | |
| `website` | string | Type 1 | Unique across platform; auto-prepends `https://` |
| `industry` | string/int | Type 1 | ID (int) or name (string, auto-creates) |
| `profile` | file | Type 1 | PNG/JPG, max 10MB |
| `present_address` | string | Type 2 | |
| `permanent_address` | string | Type 2 | |
| `country` | int | Type 2 | Country ID |
| `state` | int | Type 2 | State ID |
| `city` | string/int | Type 2 | ID (int) or name (string, auto-creates) |
| `linkdin` | string | Type 3 | LinkedIn URL |
| `youtube` | string | Type 3 | |
| `instagram` | string | Type 3 | |
| `facebook` | string | Type 3 | |
| `twitter` | string | Type 3 | |

### Response
```json
{ "status": true, "messages": "Successfully Updated" }
```
```json
{ "status": false, "messages": "company_name,contact_person are required." }  // validation
{ "status": false, "messages": "This website is already associated with another company." }
{ "status": false, "messages": "Invalid Param" }
{ "status": false, "messages": "Access denied" }
```
### Notes
- Website uniqueness checked via `unique_website()` helper (skips own record on edit).
- New industries/cities created with `user_defined = 1` flag.
- Lat/long geocoded from `present_address` via `this->Cronjob->get_lat_long()`.
- Company name change triggers `verify_document.verify = 0` (re-verification required).

---

## 4. GET `company/all-connection`

> **Stack:** Node · `company.controller.ts` `allConnection` · `allConnectionService` · `company.repositery.ts`  
> **Contract:** `src/debug/company-all-employement-and-all-connection-endpoints.md`  
> **Status:** **implemented**

### Route
```
GET /wapi/company/all-connection?limit=10&offset=1&keyword=&sort_by=4
```
### Auth
JWT. Acting company = **`req.auth.id`** (honours `X-Company`). Menu **5** when `user_type == 2` → HTTP **403** `{ status:false, message }` (singular).

### Query
| Field | Default | Notes |
|-------|---------|-------|
| `keyword` | `''` | Name words OR individual_id |
| `sort_by` | empty → `ue.id DESC` | 1 fname ASC, 2 DESC, 3 create ASC, else create DESC |
| `limit` | 10 | page size |
| `offset` | 0 | **page number** (0 and 1 = first page) |

### Response
```json
{
  "status": true,
  "messages": "Company Connection",
  "data": {
    "current_count": 2,
    "current": [
      {
        "user": 55,
        "profile": "https://s3.../p.jpg",
        "username": "John Doe",
        "contact_person": "9999999999",
        "email": "john@example.com",
        "designation": "Engineer",
        "employee_status": "Current",
        "connectiondate": "2024-01-15 10:30:00",
        "approved": 1,
        "experience_id": 100,
        "linkdin": "",
        "youtube": "",
        "instagram": "",
        "facebook": "",
        "individual_id": "IND-001",
        "is_verified": true,
        "slug": "john-doe",
        "profile_description": "...",
        "dob": "1990-01-15",
        "present_address": "...",
        "joining_date": "2024-01-15",
        "last_modify_date": "2024-06-01 12:00:00",
        "account_create_date": "2023-12-01 09:00:00",
        "totalRating": { "rating": 12, "noofrecord": 3 },
        "userRating": 4.2,
        "in_wishlist": false,
        "on_explore": 0,
        "on_immediate": 0,
        "on_notice": 0
      }
    ],
    "past_count": 1,
    "past": [],
    "currentEmployeeCount": 25,
    "pastEmployeeCount": 10
  }
}
```
### Notes
- Current: `still_working=1`; past: `still_working=0`; both `approved=1`, GROUP BY user.
- `current_count` / `past_count` = **page** lengths; `*EmployeeCount` = totals.
- Current cards: `in_wishlist` always **false**; past may be true.
- Past list deduped against current by **user** id.
- `totalRating` is **sum** `{ rating, noofrecord }`, not average.

---

## 5. GET `company/all-employement`

> **Path spelling:** **`all-employement`** (legacy typo)  
> **Stack:** `allEmployment` → `allEmploymentService` · menu **6**  
> **Contract:** same debug file §2 · **Status:** **implemented**

### Route
```
GET /wapi/company/all-employement
```
### Auth
JWT + `req.auth.id` as company. Menu **6** when `user_type == 2` → 403 `{ message }` singular.

### Request
No query/body. Full dump (no pagination).

### Response
```json
{
  "status": true,
  "messages": "Employement History",
  "data": [
    {
      "id": 10,
      "employement_id": 10,
      "profile": "https://s3.../profile.jpg",
      "userName": "John Doe",
      "salary": "80000",
      "employment_type": "Full-time",
      "designation": "Software Engineer",
      "joining_date": "2024-01-15",
      "worked_till_date": null,
      "still_working": 1,
      "approved": 0,
      "skill": ["PHP", "Laravel"],
      "description": "...",
      "document": "https://s3.../cert.pdf",
      "salary_inhand": "$70k",
      "salary_mode": "bank",
      "department": "Engineering",
      "claim_status": 1,
      "rating": { "noofrecord": 2, "avgRating": 4.0 },
      "employment_status": { "verified": true },
      "employement_id": 10,
      "slug": "john-doe",
      "individual_id": "IND-001",
      "status": 1,
      "is_verified": true,
      "user_slug": "john-doe",
      "lastReview": 1,
      "updateHistory": [],
      "on_explore": 1,
      "on_immediate": 1,
      "on_notice": 0,
      "request_type": 1
    }
  ],
  "newUpdateList": [
    {
      "id": 20,
      "experience_id": 10,
      "user": 1,
      "salary": "$90k",
      "salary_inhand": "$78k",
      "salary_mode": "bank",
      "designation": "Senior Engineer",
      "worked_till_date": null,
      "status": 0,
      "type": 1,
      "create_date": "2024-06-01",
      "old_designation": "Software Engineer",
      "old_salary": "$80k",
      "is_verified": true,
      "individual_id": "IND-001",
      "slug": "john-doe"
    }
  ]
}
```
### Notes
- `data` = **all** `user_experience` for company (`is_deleted=0`), including pending/approved/rejected — **no** pagination.
- Top-level **`newUpdateList`** always present (basic salary/designation update queue).
- `document` is a **string[]** of S3 URLs (from CSV certificate field).
- `employment_status` is **`"complete"|"pending"` string** (not `{ verified }`).
- `rating` is a **review array** (not avg object).
- `skill` is **name strings only**.
- `request_type` on main cards: `3` if update rows exist else `1`; on **`newUpdateList` always `1`** (PHP parity).
- Message: **`Employement History`** (typo).

---

## 6. PUT `company/update-employement/:id`

### Route
```
PUT /wapi/company/update-employement/{id}
```
- `:id` → `id` — experience ID

### Auth
JWT required. `req.auth.id` = company ID.

### Side Effects (Non-CRUD)
Triggers **4 notifications** via SQS:
1. **Push notification** → to employee ("your experience has been accepted!")
2. **Email** → to employee (template 123: "level3_verified_user")
3. **WhatsApp** → to employee (campaign 208)
4. **Email** → to company (template 122: "level3_verified_company")
5. **WhatsApp** → to company (campaign 209)

### DB Queries
```
1. SELECT * FROM user WHERE id = {companyId} AND status = 1
   → Verify company

2. UPDATE user_experience SET approved = 1
   WHERE company = {companyId} AND id = {experienceId}

3. SELECT * FROM user_experience WHERE id = {experienceId}
   → Detail (with joined user + company names)

4. SELECT * FROM user WHERE id = {Detail->user}
   → userDetail

5. IF userDetail.current_company IS NULL:
   UPDATE user SET current_company = {company}, current_possition = {designation}
   WHERE id = {userId}

6. INSERT INTO notifications (sender, receiver, message, link, redirect, type)

7. SQS push: SEND_PUSH, SEND_EMAIL, SEND_WHATSAPP
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `id` | URL segment | Yes | Experience ID to approve |

### Response
```json
{ "status": true, "messages": " update Sucessfully" }
```
```json
{ "status": false, "messages": "Try again something went wrong " }
{ "status": false, "messages": "Access denied" }
```
### Notes
- Approval auto-sets `current_company` and `current_possition` on the user's profile if they don't have one.
- Triggers Level 3 verification emails (domain verification prompt for company).
- Email/WhatsApp templates are commented out for employment acceptance but Level 3 verification is active.

---

## 7. GET `company/all-wishlist`

### Route
```
GET /wapi/company/all-wishlist
```
### Auth
**Custom auth** — extracts token from `Authorization` header, validates against `user.token` directly (does not use `req.auth.id`).

### DB Queries
```
1. SELECT * FROM user WHERE token = ? AND status = 1
   → row (company)

2. SELECT * FROM company_wishlist WHERE status = 1 AND company = {companyId} ORDER BY id DESC
   → All wishlist entries

   For each entry:
   a. SELECT * FROM user WHERE id = {wishlist.user}
      → employee_detail
   b. IF employee has current_company:
      SELECT * FROM user WHERE id = {current_company}
      → companyname
   c. SELECT * FROM designation WHERE id = {employee.current_possition}
      → designationdetail
```
### Request
No body params (company identified from JWT token).

### Response
```json
{
  "status": true,
  "messages": "Company Connection",
  "data": [
    {
      "id": 5,
      "profile": "https://s3.../profile.jpg",
      "username": "John Doe",
      "designation": "Software Engineer",
      "company": "Acme Corp"
    }
  ]
}
```
### Error Responses
```json
{ "status": false, "messages": "Token is missing" }
{ "status": false, "messages": "Login Expired" }
{ "status": false, "messages": "Method Not Found" }   // if not GET
{ "status": false, "messages": "Access denied" }
```
### Notes
- Uses legacy auth pattern (token lookup) instead of `req.auth.id`.
- Only returns users who are on the company's wishlist.
- Company name comes from employee's `current_company` lookup (not stored on wishlist).

---

## Cross-Language Porting Notes

### getSetting / saveSetting
- Shared with individual endpoints. See common-auth-endpoints.md for details.
- Permission guard uses menu ID `11` for company access.

### editCompany
- **Multi-step update** via `type` param: 1=basic, 2=address, 3=social.
- Auto-creates industries and cities if string values provided (with `user_defined=1` flag).
- Website uniqueness enforced via `unique_website()` helper (skips own record).
- Geocodes `present_address` → lat/long stored in `user_details`.
- Company name change triggers re-verification (`verify_document.verify = 0`).
- Domain extracted from website URL → inserted into `user_domains` table.

### allConnection
- Two queries: current employees (`still_working=1, approved=1`) and past (`still_working=0, approved=1`).
- `getAllCollections()` model method uses raw SQL with JOINs across `user`, `user_experience`, `designation`.
- Supports keyword search (name or individual_id), sort, pagination.
- `currentEmployeeCount`/`pastEmployeeCount` are unpaginated totals.
- `on_explore` visibility respects user privacy via `show_exploring()`.

### companyWiseEmploymentDetails
- Lists all employment records for the company (both approved and pending).
- Includes `newUpdateList` — basic info change requests from employees.
- `request_type`: `1` = normal, `3` = has pending update.
- Rich per-record data: skills, ratings, verification status, update history.

### updateEmployement
- Approves an employment request (`approved = 1`).
- Auto-sets `current_company` and `current_possition` on user profile if empty.
- Triggers Level 3 verification emails + WhatsApp to both employee and company.
- Email/WhatsApp for acceptance itself are commented out (only Level 3 notifications active).

### allWishlist
- Uses legacy auth (token header lookup) instead of `req.auth.id`.
- Returns wishlisted users with profile, designation, and current company name.
- Company name resolved via `user.current_company` → `user.name` lookup.
