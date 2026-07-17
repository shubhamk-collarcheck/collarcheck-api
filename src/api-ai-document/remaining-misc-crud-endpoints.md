
# Remaining CRUD Endpoints — Response Contracts for Node Port

AI porting guide for **CRUD-only** endpoints. Goal: a new stack (Node/Express, Nest, etc.) must return **the same JSON shape and message strings** so existing mobile/web clients keep working.

**Base path:** `/wapi`  
**Content-Type:** `application/json` (or `multipart/form-data` for file uploads)  
**Auth:** `Authorization: Bearer <jwt>` unless marked Public  
**Acting user:** JWT `id` → request user. Header `X-Company: {companyId}` swaps acting id to company; original user in `user_id`.

> **Out of scope:** OTP, email OTP, KYC/verifyDocument/Aadhaar/GST/Digilocker (still separate). `globalSearch` already exists under `general/globalSearch`.
>
> **Node status (2026-07):** All **19** routes below are implemented. See [Node file map](#node-file-map).

---

## Global response rules (must match in Node)

### HTTP status
| Case | HTTP | Body |
|------|------|------|
| Most success/business errors | **200** | `{ status: true\|false, ... }` |
| Permission denied (menu access) | **403** | `{ status: false, message: "..." }` (note: key is `message`, not `messages`) |
| Auth filter fail (missing/invalid JWT) | **401** | Framework-dependent; keep client-compatible |
| Unimplemented route/handler | **404** | CI4 default |

Most handlers always return HTTP 200 with `status: false` for validation/business failures. Do **not** invent REST 400s unless the client already expects them.

### Envelope keys (legacy quirks — copy exactly)
| Key | When used |
|-----|-----------|
| `status` | Always boolean |
| `messages` | Most endpoints (plural) |
| `message` | Some profiles, people-list error, 403 permission, a few others (singular) |
| `data` | Success payload; **omit** on many errors |

### Shared nested shapes

**`followData`** (from `UserModel::get_total_follower_count`):
```json
{ "following": 12, "follower": 45 }
```

**`following` / follow status** (from `UserModel::get_follow_status` — used on auth company profile):
```json
{
  "requestSend": true,
  "requestApproved": false,
  "id": 99,
  "followerRequest": false,
  "followerRequestApproved": false
}
```
> Exact merged keys may include both outgoing and incoming request fields. Company-list uses a **simpler** subset (see #6).

**`is_verified`:** boolean from `user_verified()` (phone + email + KYC name match, OR verified company domain).

**Profile images:**  
`profile ? process.env.S3_PREFIX + profile : social_image`  
(empty string if both missing, depending on endpoint)

---

## Routes Summary

| # | Method | Route | Auth | Impl | CRUD | Node route file |
|---|--------|-------|------|------|------|-----------------|
| 1 | GET | `employee/all-user` | JWT | **Yes** | R | `employee.route.ts` |
| 2 | POST | `company/add-connection` | JWT | **Yes** | C | `company.route.ts` |
| 3 | POST | `company/add-wishlist` | JWT | **Yes** | C | `company.route.ts` |
| 4 | DELETE | `company/delete-wishlist/:id` | JWT | **Yes** | D | `company.route.ts` |
| 5 | POST | `company/add-document` | JWT | **Yes** | C | `company.route.ts` |
| 6 | GET | `company-list` | JWT | **Yes** | R | `root.route.ts` |
| 7 | GET | `auth/company-profile/:slug` | JWT | **Yes** | R | `auth.route.ts` |
| 8 | GET | `general/company-profile/:slug` | Public | **Yes** | R | `general.route.ts` |
| 9 | GET | `people-list-signup` | Public | **Yes** | R | `root.route.ts` |
| 10 | DELETE | `general/delete-message/:id` | JWT | **Yes** | D | `general.route.ts` |
| 11 | POST | `general/send-message` | JWT | **Yes** | C | `general.route.ts` (alias of company message) |
| 12 | POST | `general/follow` | JWT | **Yes** | C | `general.route.ts` |
| 13 | PUT | `general/acceptfollow/:id` | JWT | **Yes** | U | `general.route.ts` |
| 14 | DELETE | `general/rejectfollow/:id` | JWT | **Yes** | D | `general.route.ts` |
| 15 | POST | `multi-acceptfollow` | JWT | **Yes** | U | `root.route.ts` |
| 16 | POST | `multi-rejectfollow` | JWT | **Yes** | D | `root.route.ts` |
| 17 | POST | `multi-deleteViewRequest` | JWT | **Yes** | D | `root.route.ts` |
| 18 | POST | `multi-approvedVeiwRequest` | JWT | **Yes** | U | `root.route.ts` |
| 19 | GET | `general/skill/:id` | Public | **Yes** | R | `general.route.ts` |

### Node file map

| Area | Types | Service | Controller | Repository |
|------|-------|---------|------------|------------|
| Company connection / wishlist / document | `types/company.types.ts` | `services/company.service.ts` | `controllers/company.controller.ts` | `repositery/company.repositery.ts` |
| Company list | `types/general.types.ts` (`companyListRootQuerySchema`) | `services/company-employee-request.service.ts` | `controllers/company-employee-request.controller.ts` | `repositery/company-employee-request.repositery.ts` |
| Company profile (auth + public) | `types/general.types.ts` | `services/misc.service.ts` (`companyProfileService`) | `controllers/misc.controller.ts` / `general.controller.ts` | `repositery/misc.repositery.ts` |
| People list signup | — | `services/common-auth.service.ts` | `controllers/common-auth.controller.ts` | `repositery/common-auth.repositery.ts` |
| All-user | `types/general.types.ts` | `services/misc.service.ts` (`allUserService`) | `controllers/misc.controller.ts` | `repositery/common-auth.repositery.ts` |
| Follow / delete-message / skill | `types/general.types.ts` | `services/general.service.ts` | `controllers/general.controller.ts` | `repositery/general.repositery.ts` / `skill.repositery.ts` |
| Multi view-request | `types/job-dashboard.types.ts` | `services/job-dashboard.service.ts` | `controllers/job-dashboard.controller.ts` | `repositery/job-dashboard.repositery.ts` |

**Postman:** `collarcheck.postman_collection.json` includes these endpoints.

---

# A. Write / list handlers (implemented in Node)

## 1. GET `/wapi/employee/all-user`

**Auth:** JWT  
**Node:** `GET /wapi/employee/all-user` → `allUser` / `allUserService`

### Suggested request
| Query | Type | Default |
|-------|------|---------|
| `keyword` | string | |
| `limit` | int | 10 |
| `offset` | int | 0 (page; use `page<=1 → 0 else page*limit-limit`) |

### Suggested success response (align with other list endpoints)
```json
{
  "status": true,
  "messages": "User list",
  "data": {
    "list": [
      {
        "id": 101,
        "individual_id": "U101",
        "name": "John Doe",
        "profile": "https://cdn.example.com/uploads/profile/a.jpg",
        "slug": "john-doe",
        "designation_name": "Engineer",
        "city_name": "Mumbai",
        "is_verified": true
      }
    ],
    "count": 1
  }
}
```

### Error
```json
{ "status": false, "messages": "Access denied" }
```

---

## 2. POST `/wapi/company/add-connection`

**Auth:** JWT (company id via `X-Company` / auth `id`). Menu permission id `5` recommended (same as `all-connection`; Node best-effort, no full menu helper yet).  
**Node:** `addConnection` / `addConnectionService`

### Request body
```json
{
  "user": 101,
  "designation": "Developer",
  "joining_date": "2024-01-15",
  "still_working": 1
}
```

### Success
```json
{ "status": true, "messages": "Connection added" }
```

### Errors
```json
{ "status": false, "messages": "user is required" }
```
```json
{ "status": false, "messages": "Already connected" }
```
```json
{
  "status": false,
  "message": "You do not have permission to access this module."
}
```
HTTP **403** for permission (same pattern as other company routes).

---

## 3. POST `/wapi/company/add-wishlist`

**Auth:** JWT company  
**Node:** `addWishlist` / `addWishlistService`

### Request
```json
{ "user": 101 }
```

### Success
```json
{ "status": true, "messages": "Added to wishlist" }
```

### Errors
```json
{ "status": false, "messages": "Already in wishlist" }
```
```json
{ "status": false, "messages": "user is required" }
```

### DB write
```sql
INSERT INTO company_wishlist (company, user, status, create_date, modify_date)
VALUES (:companyId, :userId, 1, NOW(), NOW());
```

---

## 4. DELETE `/wapi/company/delete-wishlist/:id`

**Auth:** JWT company  
**Path:** `id` = `company_wishlist.id`  
**Node:** `deleteWishlist` / `deleteWishlistService` (soft-delete `status=0`)

### Success
```json
{ "status": true, "messages": "Deleted Successfully" }
```

### Errors
```json
{ "status": false, "messages": "Record not found!" }
```
```json
{ "status": false, "messages": "Invalid Id" }
```

### DB
```sql
UPDATE company_wishlist
SET status = 0, modify_date = NOW()
WHERE id = :id AND company = :companyId;
```

---

## 5. POST `/wapi/company/add-document`

**Auth:** JWT company  
**Content-Type:** `multipart/form-data`  
**Node:** `addCompanyDocument` / `addCompanyDocumentService` → `cyb_company_document`

### Request fields
| Field | Type | Required |
|-------|------|----------|
| `doctype[]` | int[] | Yes |
| `document[]` | file[] | Yes (parallel to doctype) |

### Success (from `addDocument_old`)
```json
{ "status": true, "messages": "Successfully added" }
```

### Errors (exact legacy strings)
```json
{ "status": false, "messages": "Doc Type field is required" }
```
```json
{ "status": false, "messages": "document not uploaded" }
```
```json
{ "status": false, "messages": "Something Went Wrong" }
```
```json
{ "status": false, "messages": "Token Expired" }
```
```json
{ "status": false, "messages": "Token is missing" }
```
```json
{ "status": false, "messages": "Method Not Found" }
```

---

# B. Read / social / multi-action contracts (implemented in Node)

## 6. GET `/wapi/company-list`

**Auth:** JWT  
**Handler:** `CompanyApi::company_list`  
**Node:** `GET /wapi/company-list` → `companyList` / `companyListService`

### Query
| Param | Default |
|-------|---------|
| `limit` | 16 |
| `offset` | 0 (page number) |

### Success response
```json
{
  "status": true,
  "messages": "Company list",
  "data": {
    "myCompany": [
      {
        "id": 10,
        "individual_id": "CC10",
        "profile": "https://cdn.example.com/logo.png",
        "name": "Acme Corp",
        "city_name": "Mumbai",
        "state_name": "Maharashtra",
        "claim_status": 1,
        "country_name": "India",
        "status": 1,
        "slug": "acme-corp",
        "company_size_name": "51-200",
        "industry_name": "Information Technology",
        "is_verified": true,
        "followData": {
          "following": 3,
          "follower": 120
        },
        "following": {
          "requestSend": true,
          "requestApproved": true
        },
        "exploreTalent": 1,
        "user_group": [
          {
            "id": 1,
            "name": "Super Admin"
          }
        ],
        "user_details": [],
        "user_count": 4,
        "account_deletion": false,
        "currentStatus": 1,
        "isSuperAdmin": false
      }
    ]
  }
}
```

### Field notes
| Field | Type | Rules |
|-------|------|--------|
| `profile` | string\|null | S3 prefix + path, else `social_image` |
| `status` | number | From company–user **relation** row, not company account status alone |
| `following` | object | **Only** `{ requestSend, requestApproved }` (boolean). No `id` in this endpoint |
| `exploreTalent` | 0\|1 | 1 if any `company_job` with status=1, is_deleted=0 |
| `user_group` | array | Empty array if none |
| `user_details` | array | Nested users of company (paginated by limit/offset) |
| `user_count` | number | Total collaborators for company |
| `account_deletion` | boolean | Active row in `account_delete_requests` |
| `currentStatus` | 1\|2\|3\|4 | See below |
| `isSuperAdmin` | boolean | `user_group.id == 1` via permission |

**`currentStatus` meaning:**
| Value | Meaning |
|-------|---------|
| 1 | Fully verified (KYC + GST path) — manage company |
| 2 | Manual doc pending, no GST |
| 3 | GST ok, not fully verified |
| 4 | Pending / show verify |

### Empty success
```json
{
  "status": true,
  "messages": "Company list",
  "data": {
    "myCompany": []
  }
}
```

### Error
```json
{ "status": false, "messages": "Exception message text" }
```

---

## 7. GET `/wapi/auth/company-profile/:slug`

**Auth:** JWT  
**Handler:** `CompanyApi::companyDetail`  
**Permission:** if JWT `user_type == 2`, `checkMenuAccess(loginUserId, companyId, 2)` → 403  
**Node:** `authCompanyProfile` / `companyProfileService(slug, { viewerId, isPublic: false })`

### Success response (full field contract)
```json
{
  "status": true,
  "message": "company Detail",
  "data": {
    "id": 10,
    "is_verified": true,
    "individual_id": "CC10",
    "company_name": "Acme Corp",
    "contact_person": "Jane Doe",
    "email": "hr@acme.com",
    "email_alternate": "ops@acme.com",
    "phone": "9876543210",
    "profile": "uploads/profile/acme.jpg",
    "website": "https://acme.com",
    "description": "About company...",
    "second_phone": "",
    "location": "Mumbai",
    "phone_verified": 1,
    "email_verified": 1,
    "user_type": "company",
    "second_phone_verify": 0,
    "email_alternate_verify": 0,
    "profile_description": "About company...",
    "present_address": "Andheri East",
    "country": 101,
    "city": 400001,
    "state": 21,
    "slug": "acme-corp",
    "country_name": "India",
    "city_name": "Mumbai",
    "state_name": "Maharashtra",
    "linkdin": "https://linkedin.com/company/acme",
    "youtube": "",
    "instagram": "",
    "facebook": "",
    "tumblr": "",
    "discord": "",
    "twitter": "",
    "snapchat": "",
    "incorporate_date": "2015-01-01",
    "turnover": 3,
    "claim_status": 1,
    "turnover_name": "1-10 Cr",
    "industry": 5,
    "industry_name": "IT",
    "company_size": 2,
    "company_size_name": "51-200",
    "total_employee": 40,
    "allEmploymentCount": 55,
    "alljob": [
      {
        "id": 900,
        "title": "Backend Engineer",
        "experience_name": "2-4 years",
        "department_name": "Engineering",
        "role_type_name": "Full Time",
        "vacancy": 2,
        "slug": "backend-engineer",
        "country_name": "India",
        "state_name": "Maharashtra",
        "city_name": "Mumbai",
        "designation_name": "Software Engineer",
        "salary": "10-15 LPA",
        "no_of_application": 12,
        "create_date": "2025-01-10 10:00:00",
        "urgent": 0
      }
    ],
    "topCompany": [
      {
        "id": 11,
        "profile": "https://cdn.../x.png",
        "name": "Beta Ltd",
        "individual_id": "CC11",
        "slug": "beta-ltd",
        "city_name": "Pune",
        "state_name": "Maharashtra",
        "country_name": "India",
        "followData": { "following": 1, "follower": 9 },
        "followStatus": {
          "requestSend": false,
          "requestApproved": false,
          "id": null,
          "followerRequest": false,
          "followerRequestApproved": false
        }
      }
    ],
    "topUser": [
      {
        "id": 101,
        "individual_id": "U101",
        "profile": "https://cdn.../u.jpg",
        "name": "John Doe",
        "slug": "john-doe",
        "city_name": "Mumbai",
        "rating": 4.2,
        "state_name": "Maharashtra",
        "country_name": "India",
        "work_status": "Employed",
        "designation_name": "Engineer",
        "company_name": "Acme",
        "followData": { "following": 2, "follower": 5 },
        "followStatus": {
          "requestSend": true,
          "requestApproved": true,
          "id": 55
        }
      }
    ],
    "allGallery": [
      {
        "id": 1,
        "name": "Office",
        "image": "https://cdn.../g.jpg"
      }
    ],
    "allBenefits": [
      {
        "id": 1,
        "name": "Health Insurance",
        "image": "https://cdn.../b.png"
      }
    ],
    "followData": { "following": 10, "follower": 200 },
    "exploreTalent": 1,
    "domainPopulate": true,
    "following": {
      "requestSend": false,
      "requestApproved": false,
      "id": null
    }
  }
}
```

> **Key name is `message` (singular), not `messages`.**  
> `following` is **omitted** when viewer is the same company (`userId == request.id`).

### Nested job item fields (required keys)
`id`, `title`, `experience_name`, `department_name`, `role_type_name`, `vacancy`, `slug`, `country_name`, `state_name`, `city_name`, `designation_name`, `salary`, `no_of_application`, `create_date`, `urgent`

### Error — company not found
```json
{ "status": false, "messages": "No Company Found!" }
```

### Error — permission (HTTP 403)
```json
{
  "status": false,
  "message": "<permission helper message>"
}
```

### Error — exception
```json
{ "status": false, "messages": "Error text" }
```

---

## 8. GET `/wapi/general/company-profile/:slug`

**Auth:** Public  
**Handler:** `GeneralApi::companyprofile`  
**Node:** `generalCompanyProfile` / `companyProfileService(slug, { isPublic: true })`

### Success — same core company fields as #7, with these differences
```json
{
  "status": true,
  "message": "company Detail",
  "data": {
    "id": 10,
    "is_verified": true,
    "individual_id": "CC10",
    "company_name": "Acme Corp",
    "contact_person": "Jane Doe",
    "email": "hr@acme.com",
    "email_alternate": "ops@acme.com",
    "phone": "9876543210",
    "profile": "uploads/profile/acme.jpg",
    "website": "https://acme.com",
    "description": "About...",
    "second_phone": "",
    "location": "Mumbai",
    "phone_verified": 1,
    "email_verified": 1,
    "user_type": "company",
    "second_phone_verify": 0,
    "email_alternate_verify": 0,
    "profile_description": "About...",
    "present_address": "Andheri East",
    "country": 101,
    "city": 400001,
    "state": 21,
    "slug": "acme-corp",
    "country_name": "India",
    "city_name": "Mumbai",
    "state_name": "Maharashtra",
    "linkdin": "",
    "youtube": "",
    "instagram": "",
    "facebook": "",
    "tumblr": "",
    "discord": "",
    "twitter": "",
    "snapchat": "",
    "incorporate_date": "2015-01-01",
    "turnover": 3,
    "turnover_name": "1-10 Cr",
    "company_size": 2,
    "company_size_name": "51-200",
    "industry": 5,
    "industry_name": "IT",
    "claim_status": 1,
    "total_employee": 40,
    "allEmploymentCount": 55,
    "alljob": [],
    "topCompany": [],
    "topUser": [],
    "allGallery": [
      {
        "name": "Office",
        "image": "https://cdn.../g.jpg"
      }
    ],
    "allBenefits": [
      {
        "name": "Health Insurance",
        "image": "https://cdn.../b.png"
      }
    ],
    "exploreTalent": 1,
    "followData": { "following": 10, "follower": 200 }
  }
}
```

### Diff vs auth profile (#7)
| Field | Auth (#7) | Public (#8) |
|-------|-----------|-------------|
| `topUser` / `topCompany` | Populated | Always `[]` in current code |
| `following` | Present if other company | **Never** |
| `domainPopulate` | Yes | **No** |
| gallery/benefits `id` | Yes | Often omitted |
| `message` key | singular | singular |

### Errors
```json
{ "status": false, "messages": "No Company Found!" }
```
```json
{ "status": false, "messages": "No company found !" }
```
```json
{ "status": false, "messages": "Error text" }
```

---

## 9. GET `/wapi/people-list-signup`

**Auth:** Public (pass `user_id`)  
**Handler:** `ModuleController::people_list`  
**Auth twin:** `GET /wapi/people-list` (JWT, same body)  
**Node:** `peopleListSignup` (public) / `peopleList` (JWT) → `peopleListService`

### Query
| Param | Required |
|-------|----------|
| `user_id` | Yes when no JWT |

### Success
```json
{
  "status": true,
  "data": {
    "selectedUserList": [
      {
        "id": 101,
        "individual_id": "U101",
        "profile": "https://cdn.../a.jpg",
        "name": "John Doe",
        "checked": 1
      }
    ],
    "selectedCompanyList": [
      {
        "id": 10,
        "individual_id": "CC10",
        "company_logo": "https://cdn.../c.png",
        "company": "Acme Corp",
        "checked": 1
      }
    ],
    "userList": [
      {
        "id": 102,
        "individual_id": "U102",
        "profile": "https://cdn.../b.jpg",
        "name": "Jane Roe",
        "checked": 0
      }
    ],
    "companyList": [
      {
        "id": 11,
        "individual_id": "CC11",
        "company_logo": "https://cdn.../d.png",
        "company": "Beta Ltd",
        "checked": 0
      }
    ]
  }
}
```

> **No `messages` key on success.**  
> `checked` is number `1` or `0`.  
> User card uses `name` + `profile`; company card uses `company` + `company_logo`.

### Error
```json
{ "status": false, "message": "ID is missing" }
```

### Empty lists still success
```json
{
  "status": true,
  "data": {
    "selectedUserList": [],
    "selectedCompanyList": [],
    "userList": [],
    "companyList": []
  }
}
```

---

## 10. DELETE `/wapi/general/delete-message/:id`

**Auth:** Legacy — header `Authorization: <token>` must match `user.token` (not necessarily `Bearer ` JWT filter).  
**Node:** Uses standard `Authorization` middleware (Bearer or raw token accepted). Soft-deletes `cyb_message_history` row.  
**Query required:** `user_type=user` or `user_type=company`

### Example
```
DELETE /wapi/general/delete-message/55?user_type=user
Authorization: <legacy-or-jwt-token-value-as-stored>
```

### Success (note leading space + typo "Sucessfully")
```json
{ "status": true, "messages": " Deleted Sucessfully" }
```

### Errors (copy strings exactly for client parity)
```json
{ "status": false, "messages": "No Message Found" }
```
```json
{ "status": false, "messages": "Try again something went wrong " }
```
```json
{ "status": false, "messages": "User Type required ad should be user or company " }
```
```json
{ "status": false, "messages": "Login Expired" }
```
```json
{ "status": false, "messages": "Token is missing" }
```
```json
{ "status": false, "messages": "Access denied" }
```
```json
{ "status": false, "messages": "Method Not Found" }
```

---

## 11. POST `/wapi/general/send-message`

**Auth:** JWT  
**Also:** `POST /wapi/general/send-message-company` → same handler  
**Node:** both routes call `addMessage` / `addMessageService`  
**Body:** form-data or JSON

### Request
| Field | Required | Notes |
|-------|----------|-------|
| `send_to` | Yes | receiver user id |
| `message` | No | stored encrypted |
| `doc` | No | file(s), max 2MB |

### Success
```json
{ "status": true, "messages": "Successfully added" }
```

### Errors
```json
{ "status": false, "messages": "send to id field is required" }
```
```json
{ "status": false, "messages": "Messaging Disabled for User" }
```
```json
{ "status": false, "messages": "The image file size must not exceed 2MB." }
```
```json
{ "status": false, "messages": "Exception message" }
```

> **No `data` on success** in current API. Node should match unless product decides to return `message_id`.

---

## 12. POST `/wapi/general/follow`

**Auth:** JWT (`followed_id` = current user)  
**Node:** `follow` / `followUserService` — company targets auto-accept (`status=1`); users pending (`status=0`)  
**Body:**
```json
{ "follower_id": 200 }
```
`follower_id` = user/company you want to follow (legacy inverted naming).

### Success
```json
{ "status": true, "messages": "Request Send successfully!" }
```

### Errors
```json
{ "status": false, "messages": "The follower id field is required." }
```
```json
{ "status": false, "messages": "Invalid Follwer Id" }
```
```json
{ "status": false, "messages": "Already Followed" }
```
```json
{ "status": false, "messages": "Request not Send please retry!" }
```
```json
{ "status": false, "messages": "Exception message" }
```

> Side effects (notification, push, email) do **not** change response body.  
> Company targets auto-accept (`status=1`); users stay pending (`status=0`). Still same success message.

---

## 13. PUT `/wapi/general/acceptfollow/:id`

**Auth:** JWT  
**Path `id`:** `follow.id`  
**Node:** `acceptFollow` / `acceptFollowService`

### Success
```json
{ "status": true, "messages": "followed Successfully!" }
```

### Errors
```json
{ "status": false, "messages": "Invalid Id" }
```
```json
{ "status": false, "messages": "Invalid request!" }
```
```json
{ "status": false, "messages": "Something went wrong!" }
```
```json
{ "status": false, "messages": "Exception message" }
```

---

## 14. DELETE `/wapi/general/rejectfollow/:id`

**Auth:** JWT  
**Path `id`:** `follow.id`  
Soft-delete: `is_deleted = 1`  
**Node:** `rejectFollow` / `rejectFollowService`

### Success
```json
{ "status": true, "messages": "Reject Successfully!" }
```

### Errors
```json
{ "status": false, "messages": "Invalid Id" }
```
```json
{ "status": false, "messages": "Invalid Reject request !" }
```
```json
{ "status": false, "messages": "Something went wrong!" }
```
```json
{ "status": false, "messages": "Exception message" }
```

---

## 15. POST `/wapi/multi-acceptfollow`

**Auth:** JWT  
**Node:** `root.route.ts` → `multiAcceptFollow`  
**Body:**
```json
{ "id": [12, 15, 18] }
```

### Success
```json
{ "status": true, "messages": "followed Successfully!" }
```

### Errors
```json
{ "status": false, "messages": "id Required!" }
```
```json
{ "status": false, "messages": "Invalid Id" }
```
```json
{ "status": false, "messages": "Invalid request!" }
```
```json
{ "status": false, "messages": "Something went wrong!" }
```

> First invalid id aborts remaining. Response is not a per-id array.

---

## 16. POST `/wapi/multi-rejectfollow`

**Auth:** JWT  
**Node:** `root.route.ts` → `multiRejectFollow`  
**Body:**
```json
{ "id": [12, 15] }
```

### Success
```json
{ "status": true, "messages": "Reject Successfully!" }
```

### Errors
```json
{ "status": false, "messages": "id Required!" }
```
```json
{ "status": false, "messages": "Invalid Id" }
```
```json
{ "status": false, "messages": "Invalid Reject request !" }
```
```json
{ "status": false, "messages": "Something went wrong!" }
```

---

## 17. POST `/wapi/multi-deleteViewRequest`

**Auth:** JWT (employee)  
**Node:** `multiDeleteViewRequest` / `multiDeleteViewRequestService`  
**Body:**
```json
{ "id": [3, 4] }
```

Soft-deletes rows in `user_profile_view_request` where `userid = currentUser`.

### Success
```json
{ "status": true, "messages": "Delete Successfully!" }
```

### Errors
```json
{ "status": false, "messages": "Access Denied!" }
```
```json
{ "status": false, "messages": "id Required!" }
```
```json
{ "status": false, "messages": "Invalid delete id!" }
```
```json
{ "status": false, "messages": "Delete unsuccessfully!" }
```
```json
{ "status": false, "messages": "Something went wrong!" }
```

---

## 18. POST `/wapi/multi-approvedVeiwRequest`

**Auth:** JWT  
**Node:** `multiApprovedVeiwRequest` (wraps single approve service)  
**Note:** Name is misspelled `Veiw`. Despite `multi-`, body is **single** id.

### Request
```json
{
  "id": 77,
  "access": { "salary": 1, "email": 1 },
  "day": 7
}
```

| Field | Required | Default |
|-------|----------|---------|
| `id` | Yes | |
| `access` | No | `null` (JSON-stringified into DB) |
| `day` | No | `1` |

### Success
```json
{ "status": true, "messages": "Approved successfully!" }
```

### Errors
```json
{ "status": false, "messages": "The id field is required." }
```
```json
{ "status": false, "messages": "Record not found!" }
```
```json
{ "status": false, "messages": "Access denied" }
```

### DB effect
```sql
UPDATE user_profile_view_request
SET status = :toggledOrOne,
    expiry = :nowPlusDays,
    access = :accessJson
WHERE id = :id AND userid = :currentUser;
```
Also inserts a notification to `companyid`.

---

## 19. GET `/wapi/general/skill/:id`

**Auth:** Public  
**Path `id`:** skill **category** id (`skill.category`)  
**Node:** `skillByCategory` / `skillByCategoryService` — schema field `cyb_skill.category`

### Success
```json
{
  "status": true,
  "messages": "",
  "data": [
    {
      "id": 5,
      "department": 2,
      "name": "React"
    },
    {
      "id": 6,
      "department": 2,
      "name": "Node.js"
    }
  ]
}
```

| Field | Source |
|-------|--------|
| `id` | `skill.id` |
| `department` | `skill.category` (same as path id) |
| `name` | `skill.name` |

### Empty category still success
```json
{
  "status": true,
  "messages": "",
  "data": []
}
```

### Wrong HTTP method
```json
{ "status": false, "messages": "Method Not Found" }
```

---

# Node implementation checklist (parity)

1. Always send `Content-Type: application/json` responses.  
2. Prefer **HTTP 200 + `status: false`** for business errors; use **403** only for menu permission.  
3. Copy **message strings and typos** (`Sucessfully`, `Follwer`, `Veiw`, leading spaces) if old clients string-match.  
4. Preserve **key names**: `messages` vs `message`, `company_name` vs `name`, `company_logo` vs `profile`.  
5. Numbers that are 0/1 for flags (`exploreTalent`, `checked`, `urgent`) should stay numbers, not booleans, unless the old JSON already used booleans.  
6. Nullish fields: use `""` or `null` as shown; do not drop required keys from `data` objects on success.  
7. Pagination: `offset` is **page number**, not SQL offset (`page<=1 → 0 else page*limit-limit`).  
8. Encrypt stored chat messages the same way (`encrypt_url`) if clients decrypt with the same helper.  
9. Soft-delete with `is_deleted` / `status=0`; hard-delete only where legacy already does (message).  
10. Keep side effects (SQS, GraphQL) optional, but **response body must not depend on them**.

---

# Related docs

| Topic | File |
|-------|------|
| Doc index (all modules) | [README.md](./README.md) |
| Company connection/wishlist **reads + writes** | `company/company-endpoints.md` |
| Company add-document | `company/company-document-review-endpoints.md` |
| Employee view-request singles + multi | `employee-job-dashboard-viewrequest-endpoints.md` |
| General follow / notify / logout paths | `general/half-of-next-general-api.md` |
| Auth people-list | `common-auth-endpoints.md` |
| Still out of scope (OTP/KYC) | (not ported — separate work) |
