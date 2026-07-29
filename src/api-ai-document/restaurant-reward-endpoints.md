# Restaurant Reward Endpoints — partner OTP, profile, visits & employee discounts

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Route file:** `src/routes/restaurant.route.ts`  
> **Controller:** `src/controllers/restaurant.controller.ts`  
> **Service:** `src/services/restaurant.service.ts`  
> **Repositery:** `src/repositery/restaurant.repositery.ts`  
> **Types:** `src/types/restaurant.types.ts`  
> **Middleware:** `src/middlewares/RestaurantAuth.ts` (partner JWT) + `Authorization` (platform JWT)  
> **Upload:** `src/utils/restaurantUpload.ts`  
> **Source:** Ported from PHP api-docs / `RestaurantsRoutes.php` — contracts preserved  
> **Status:** **implemented**

These power the **restaurant partner app** (OTP login, profile, customer visits) plus the **employee-facing restaurant list** with level-based discounts.

**Content-Type:** `application/json` or `multipart/form-data` (profile upload)  
**HTTP:** Almost always **200** with `status: true|false` (business errors are not 4xx).  
**Auth filter failures (`RestaurantAuth` / `Authorization`):** **401**.

> Side effects (MSG91 SMS OTP, S3 image upload) must **not** change the success/error JSON contract below.

---

## Routes Summary

| # | Method | Full path | Node handler | Auth | Purpose |
|---|--------|-----------|--------------|------|---------|
| 1 | GET | `/wapi/restaurant-list` | `getRestaurantList` | **JWT `Authorization`** (employee/company) | List restaurants + user’s level-based discount |
| 2 | POST | `/wapi/restaurant/send-otp` | `restaurantSendOtp` | Public | Send OTP to registered restaurant phone |
| 3 | POST | `/wapi/restaurant/verify-otp` | `restaurantVerifyOtp` | Public | Verify OTP; return restaurant JWT session |
| 4 | GET | `/wapi/testauth` | `restaurantTestAuth` | **`RestaurantAuth`** | Debug: plain-text auth check |
| 5 | GET | `/wapi/restaurant/profile-details` | `restaurantProfileDetails` | **`RestaurantAuth`** | Current restaurant profile |
| 6 | POST | `/wapi/restaurant/update-profile` | `restaurantUpdateProfile` | **`RestaurantAuth`** | Update name/description/address/images |
| 7 | POST | `/wapi/restaurant/add-customer-visits` | `restaurantAddCustomerVisit` | **`RestaurantAuth`** | Log a customer visit + upsert customer summary |
| 8 | GET | `/wapi/restaurant/customer-visits` | `restaurantGetCustomerVisits` | **`RestaurantAuth`** | List visits for this restaurant |
| 9 | GET | `/wapi/restaurant/customer-search` | `restaurantCustomerSearch` | **`RestaurantAuth`** | Search employees by `individual_id` |
| 10 | GET | `/wapi/restaurant/customer-discount/:id` | `restaurantCustomerDiscount` | **`RestaurantAuth`** | Discount % for a user by reward level |

**Count:** 10 routes.

### File structure

```
src/routes/restaurant.route.ts
src/controllers/restaurant.controller.ts
src/services/restaurant.service.ts
src/repositery/restaurant.repositery.ts
src/types/restaurant.types.ts
src/middlewares/RestaurantAuth.ts
src/utils/restaurantUpload.ts
src/app.ts                          # mounts restaurantRouter under /wapi
```

---

## Auth models (two different JWTs)

### A. Platform user JWT — `Authorization`

Used only by **#1 `restaurant-list`**.

| Item | Value |
|------|--------|
| Header | `Authorization: Bearer <loginauth/jwt>` |
| Identity | `req.auth.id` = platform user id (honours `X-Company`) |
| Middleware | `src/middlewares/Authorization.ts` |

### B. Restaurant partner JWT — `RestaurantAuth`

Used by **#4–#10**.

| Item | Value |
|------|--------|
| Header | `Authorization: Bearer <restaurant_token>` |
| Token create | `jwt.sign({ uid: restaurant.id }, JWT_SECRET, { expiresIn: "30d" })` after OTP verify |
| Payload | `{ iat, exp, uid }` where `uid` = `cyb_restaurants.id` |
| Secret | `JWT_SECRET` env, algorithm **HS256** |
| Expiry | **30 days** |
| Persist | Token also written to `cyb_restaurants.token` on login |
| Filter checks | Decode JWT → load `cyb_restaurants` where `id = uid`, `status = 1`, `is_deleted = 0` |
| Identity | `req.restaurant.id` = restaurant id; `req.restaurant.token` = raw token |

#### `RestaurantAuth` 401 bodies (HTTP 401)

```json
{ "status": false, "message": "Token Missing!" }
```
```json
{ "status": false, "message": "Invalid Token!" }
```
```json
{ "status": false, "message": "Invalid Token Payload!" }
```
```json
{ "status": false, "message": "Unauthorized User!" }
```
```json
{ "status": false, "message": "Token Expired!" }
```

Do **not** mix restaurant tokens with platform `Authorization` tokens (and vice versa).

---

## Middleware order

```
Authorization | RestaurantAuth  →  upload?  →  validateData(schema)  →  controller
```

| Route | Middleware chain |
|-------|------------------|
| `restaurant-list` | `Authorization` → handler |
| `restaurant/send-otp` | `multer().none()` → `validateData` → handler (IP throttle in controller) |
| `restaurant/verify-otp` | `multer().none()` → `validateData` → handler |
| `testauth` | `RestaurantAuth` → handler |
| `restaurant/profile-details` | `RestaurantAuth` → handler |
| `restaurant/update-profile` | `RestaurantAuth` → `restaurantUpload.fields([profile,banner])` → `validateData` → handler |
| `restaurant/add-customer-visits` | `RestaurantAuth` → `multer().none()` → `validateData` → handler |
| `restaurant/customer-visits` | `RestaurantAuth` → handler |
| `restaurant/customer-search` | `RestaurantAuth` → `validateData` → handler |
| `restaurant/customer-discount/:id` | `RestaurantAuth` → `validateData` → handler |

---

## Reward / discount model (shared)

Restaurant max discount: `cyb_restaurants.discount` (percent).  
Employee reward level is `0–4` from `getUserHighestLevel(userId)` in `restaurant.service.ts`:

| Level | Name (product) | Unlock |
|------:|----------------|--------|
| 0 | None | Not signed up / not account-verified |
| 1 | Bronze | Signup + account verified (`user_verified`) |
| 2 | Silver | L1 employment verify + account verified |
| 3 | Gold | L3 or L4 employment verify + account verified |
| 4 | Platinum | Gold conditions + at least one approved experience review |

**Discount formula (list + customer-discount):**

```
perLevelDiscount = restaurant.discount / 4
finalDiscount    = perLevelDiscount * userMaxLevel
```

- **restaurant-list:** does **not** round  
- **customer-discount / add-visit:** `round(..., 2)`

`user_next_level` on restaurant-list:

| `user_max_level` | `user_next_level` |
|-----------------:|------------------:|
| 0 | 1 |
| 1 | 2 |
| 2 | 3 |
| 3 | 4 |
| 4 | 0 (completed) |

---

## Zod schemas (`src/types/restaurant.types.ts`)

| Schema | Used by |
|--------|---------|
| `restaurantSendOtpSchema` | body: `phone` (10–15), optional `g-recaptcha-response` |
| `restaurantVerifyOtpSchema` | body: `phone` (10–13), `otp` (6 digits) |
| `restaurantUpdateProfileSchema` | body: `name`, `shortDescription` required; `google_map`, `address` optional |
| `restaurantAddVisitSchema` | body: `customer_id`, `group_size`, `bill_before_amount`, `discount` (0–100), `bill_after_amount`, optional `visit_date` |
| `restaurantCustomerSearchSchema` | query: `keyword`, `limit` (default 30), `offset` (page number, default 0) |
| `restaurantCustomerDiscountSchema` | params: `id` (platform `user.id`) |

---

## Tables (Drizzle / MySQL)

| Table | Schema symbol | Role |
|-------|---------------|------|
| `cyb_restaurants` | `cybRestaurants` | Partner accounts |
| `cyb_restaurant_category` | `cybRestaurantCategory` | Category join for list |
| `cyb_otp` | `cybOtp` | Phone OTP rows |
| `cyb_customer_visits` | `cybCustomerVisits` | Per-visit log (`customer_id` = **individual_id string**) |
| `cyb_restaurant_customers` | `cybRestaurantCustomers` | Aggregate visits |
| `cyb_user` | `cybUser` | Platform employees |
| `cyb_user_experience` | `cybUserExperience` | Level calculation |
| `cyb_user_experience_rating` | `cybUserExperienceRating` | Platinum review check |
| `cyb_user_domains` | `cybUserDomains` | L1/L2 domain verify |

---

## Global response quirks (copy exactly)

| Key / shape | Where |
|-------------|--------|
| `message` (singular) | send-otp success/fail (mixed), verify-otp, captcha fail, many visit errors/success |
| `messages` (plural) | send-otp validation/throttle/unregistered; update-profile success/fail; profile-details payload (**array in `messages`**, not `data`) |
| `data` | verify-otp session; restaurant-list; customer-visits; customer-search |
| Top-level extra keys | `customer-discount`: `user_max_level`, `discount` (not under `data`) |
| Plain text body | `testauth` → `hello auth{id}` (not JSON) |
| Rate limit | send-otp: **3 requests / minute / IP** via `isThrottled` |

---

# 1. GET `/wapi/restaurant-list`

### Auth
JWT **`Authorization`**. Acting user = `req.auth.id`.

### Handler
`getRestaurantList` → `restaurantListService`

### Request
None.

### Logic
1. Load restaurants: `cyb_restaurants` LEFT JOIN `cyb_restaurant_category` WHERE both `is_deleted = 0`.
2. `userMaxLevel = getUserHighestLevel(actingUser)`.
3. Per restaurant: `max_discount` = raw discount; `discount = (float)discount / 4 * userMaxLevel`; prefix profile/banner with `S3_PREFIX`.
4. `getHighestLevelWithEmployment` → employment details array (0 or 1 element).
5. `user_max_level`, `user_next_level`.

### Success
```json
{
  "status": true,
  "data": {
    "restaurants": [
      {
        "id": 1,
        "name": "Cafe Demo",
        "email": "cafe@example.com",
        "phone": "9876543210",
        "profile": "https://cdn.../uploads/restaurant/a.jpg",
        "address": "MG Road",
        "google_map": "https://maps.google.com/...",
        "max_discount": 20,
        "discount": 10,
        "banner": "https://cdn.../uploads/restaurant/b.jpg",
        "shortDescription": "Coffee & snacks",
        "category_name": "Cafe",
        "create_date": "2025-01-01 10:00:00"
      }
    ],
    "current_employment": [
      {
        "id": 55,
        "company_logo": "https://cdn.../logo.png",
        "company": "Acme",
        "company_id": 10,
        "work_email": "john@acme.com",
        "work_email_date": "2024-06-01",
        "is_verified": true,
        "joining_date": "2023-01-01",
        "worked_till_date": "",
        "claim_status": 0,
        "added_by": false,
        "approved": 1,
        "still_working": 1,
        "status": 1,
        "company_slug": "acme",
        "user_slug": "john-doe-u101",
        "sendReminder": false
      }
    ],
    "user_max_level": 2,
    "user_next_level": 3
  }
}
```

### Errors
```json
{ "status": false, "message": "<exception message>" }
```

---

# 2. POST `/wapi/restaurant/send-otp`

### Auth
Public.

### Handler
`restaurantSendOtp` → `restaurantSendOtpService`

### Request body
| Field | Rules |
|-------|--------|
| `phone` | required, min 10, max 15 |
| `g-recaptcha-response` | verified against Google siteverify; secret = `RESTAURANT_CAPTCHA_SECRET_KEY` |

### Logic
1. **Throttle:** 3 / minute / IP → `"limit is reach please retry after some time !"`
2. Validate phone (Zod).
3. reCAPTCHA fail → `{ status: false, message: "Captcha verification failed" }`
4. Load restaurant by phone + `is_deleted = 0` → else `"Phone not registered with us!"`
5. 6-digit OTP, 10-minute expiry, upsert `cyb_otp`, SMS via `otpSend` (MSG91)

### Success
```json
{
  "status": true,
  "message": "The OTP has been successfully delivered to your registered phone number."
}
```

### Errors
```json
{ "status": false, "messages": "limit is reach please retry after some time !" }
```
```json
{ "status": false, "message": "Captcha verification failed" }
```
```json
{ "status": false, "messages": "Phone not registered with us!" }
```
```json
{ "status": false, "message": "Something went wrong, try again." }
```

---

# 3. POST `/wapi/restaurant/verify-otp`

### Auth
Public.

### Request body
| Field | Rules |
|-------|--------|
| `phone` | required, min 10, max **13** |
| `otp` | required, exact 6 digits |

### Success
```json
{
  "status": true,
  "message": "OTP verified successfully",
  "data": {
    "id": 1,
    "name": "Cafe Demo",
    "email": "cafe@example.com",
    "phone": "9876543210",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "profile": "https://cdn.../a.jpg",
    "address": "MG Road",
    "level": [],
    "banner": "https://cdn.../b.jpg",
    "shortDescription": "Coffee & snacks",
    "category": 3,
    "status": 1
  }
}
```

Client stores `data.token` for `RestaurantAuth` routes.

### Errors
```json
{ "status": false, "messages": "invalid phone no." }
```
```json
{ "status": false, "messages": "Otp Expired !" }
```
```json
{ "status": false, "messages": "Invalid OTP!" }
```
```json
{ "status": false, "message": "User not found" }
```

---

# 4. GET `/wapi/testauth`

### Auth
`RestaurantAuth`.

### Response
**Plain text:** `hello auth{restaurant_id}` (e.g. `hello auth12`)

---

# 5. GET `/wapi/restaurant/profile-details`

### Auth
`RestaurantAuth`. Restaurant id = `req.restaurant.id`.

### Success
Payload is under **`messages`** (array), not `data`:

```json
{
  "status": true,
  "messages": [
    {
      "id": 1,
      "name": "Cafe Demo",
      "email": "cafe@example.com",
      "phone": "9876543210",
      "token": "eyJ...",
      "profile": "https://cdn.../a.jpg",
      "address": "MG Road",
      "google_map": "https://maps...",
      "discount": 20,
      "banner": "https://cdn.../b.jpg",
      "shortDescription": "Coffee & snacks",
      "category": 3,
      "create_date": "2025-01-01 10:00:00",
      "modify_date": "2025-06-01 12:00:00"
    }
  ]
}
```

If no row: `status: true` with `messages: [ {} ]`.

---

# 6. POST `/wapi/restaurant/update-profile`

### Auth
`RestaurantAuth`.

### Request (`multipart/form-data` when files present)
| Field | Rules |
|-------|--------|
| `name` | required |
| `shortDescription` | required |
| `google_map` | optional |
| `address` | optional |
| `profile` | optional file → S3 `uploads/restaurant/` |
| `banner` | optional file → S3 `uploads/restaurant/` |

### Success
```json
{ "status": true, "messages": "Successfully Updated" }
```

### Errors
```json
{ "status": false, "message": "Restaurant id required!" }
```
```json
{ "status": false, "messages": "Something Went Wrong!" }
```
```json
{ "status": false, "messages": "Access denied" }
```

---

# 7. POST `/wapi/restaurant/add-customer-visits`

### Auth
`RestaurantAuth`. `restaurant_id` = `req.restaurant.id`.

### Request body
| Field | Rules | Notes |
|-------|--------|------|
| `customer_id` | required | Platform **`user.individual_id`** (e.g. `U101`) |
| `group_size` | required, integer `> 0` | |
| `bill_before_amount` | required | |
| `discount` | required, `0–100` | Validated then **overwritten** by server |
| `bill_after_amount` | required | |
| `visit_date` | optional | Default `Y-m-d` today |

### Logic
1. Resolve customer via `individual_id` → internal `user.id`.
2. Recompute discount via `restaurantCustomerDiscountService` (rounded to 2 decimals).
3. Insert `cyb_customer_visits` with `customer_id` = **individual_id string**.
4. Upsert `cyb_restaurant_customers` on `(restaurant_id, customer_id, is_deleted=0)`.

### Success
```json
{ "status": true, "message": "Customer visit added successfully" }
```

### Errors
```json
{ "status": false, "message": "Restaurant ID is required" }
```
```json
{ "status": false, "message": "Failed to add visit" }
```

---

# 8. GET `/wapi/restaurant/customer-visits`

### Auth
`RestaurantAuth`.

### Query
```
cyb_customer_visits cv
LEFT JOIN cyb_user ur ON cv.customer_id = ur.individual_id
WHERE cv.restaurant_id = ? AND cv.is_deleted = 0 AND ur.is_deleted = 0
ORDER BY cv.id DESC
```

### Success
```json
{
  "status": true,
  "data": [
    {
      "id": 99,
      "customer_id": "U101",
      "customer_name": "John Doe",
      "profile": "https://cdn.../u.jpg",
      "visit_date": "2026-03-01",
      "group_size": 2,
      "bill_before_amount": "1500.00",
      "discount": 10,
      "bill_after_amount": "1350.00"
    }
  ]
}
```

Empty list → **`status: false`** + `"No customer visits found"`.

---

# 9. GET `/wapi/restaurant/customer-search`

### Auth
`RestaurantAuth`.

### Query params
| Param | Default | Meaning |
|-------|---------|---------|
| `keyword` | `''` | LIKE on `individual_id` only |
| `limit` | `30` | Page size |
| `offset` | `0` | **Page number**, not SQL offset: `page <= 1 → 0`, else `page * limit - limit` |

### Success
```json
{
  "status": true,
  "data": [
    {
      "id": 101,
      "name": "John Doe",
      "profile": "https://cdn.../u.jpg",
      "individual_id": "U101",
      "designation_name": "Engineer",
      "company_name": "Acme",
      "is_verified": true
    }
  ]
}
```

No matches → still `status: true`, `data: []`.

---

# 10. GET `/wapi/restaurant/customer-discount/:id`

### Auth
`RestaurantAuth`.

### Path param
| Param | Meaning |
|-------|---------|
| `id` | Platform **`user.id`** (numeric), **not** `individual_id` |

### Success
```json
{
  "status": true,
  "user_max_level": 2,
  "discount": 10
}
```

(`discount` / `user_max_level` are **top-level**, not nested under `data`.)

---

## Service / repositery map

| Endpoint | Service | Key repositery methods |
|----------|---------|------------------------|
| restaurant-list | `restaurantListService` | `getRestaurantsList`, level helpers, `getExperienceDetail` |
| send-otp | `restaurantSendOtpService` | `findByPhone`, `upsertOtp` |
| verify-otp | `restaurantVerifyOtpService` | `findOtpByPhone`, `updateToken`, `deleteOtpsByPhone` |
| profile-details | `restaurantProfileDetailsService` | `findByIdNotDeleted` |
| update-profile | `restaurantUpdateProfileService` | `updateProfile` |
| add-customer-visits | `restaurantAddCustomerVisitService` | `insertCustomerVisit`, customer upsert |
| customer-visits | `restaurantGetCustomerVisitsService` | `getCustomerVisitsList` |
| customer-search | `restaurantCustomerSearchService` | `getCustomerSearch` |
| customer-discount | `restaurantCustomerDiscountService` | `findActiveById`, `getUserHighestLevel` |

---

## Suggested client flows

### Employee app
```
Auth login → GET /wapi/restaurant-list
  → show restaurants with personal discount + current employment + next level
```

### Restaurant partner app
```
POST /wapi/restaurant/send-otp { phone, g-recaptcha-response }
POST /wapi/restaurant/verify-otp { phone, otp }
  → store data.token

GET  /wapi/restaurant/profile-details
POST /wapi/restaurant/update-profile (multipart)

GET  /wapi/restaurant/customer-search?keyword=U101
GET  /wapi/restaurant/customer-discount/{user.id}
POST /wapi/restaurant/add-customer-visits
     { customer_id: individual_id, group_size, bill_*, discount: 0, visit_date? }
GET  /wapi/restaurant/customer-visits
```

---

## Env / config checklist

| Key | Used by |
|-----|---------|
| `JWT_SECRET` | restaurant JWT sign/verify |
| `RESTAURANT_CAPTCHA_SECRET_KEY` | send-otp reCAPTCHA |
| `S3_PREFIX` + AWS keys | Profile/banner URLs and uploads |
| `AUTH_KEY_MSG` / `MSG91_TEMPLATE_ID` | MSG91 OTP — see `msg91-sms.md` |

---

## Implementation checklist

- [x] Two auth middlewares: platform `Authorization` vs restaurant `RestaurantAuth`
- [x] OTP: 6 digits, 10-minute expiry, local verify only, soft-delete on success
- [x] reCAPTCHA + 3/min IP throttle on send-otp
- [x] Discount = `round(maxDiscount/4 * level, 2)` for partner discount; list omits round
- [x] `customer_visits.customer_id` stores **individual_id**; discount path uses **user.id**
- [x] Preserve plural/singular message keys and profile-details putting payload in `messages`
- [x] Empty customer-visits → `status: false` + `"No customer visits found"`
- [x] SMS via same MSG91 contract as login OTP
- [x] Node api-docs rewritten; README index updated
)
