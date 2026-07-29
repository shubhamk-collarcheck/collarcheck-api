
# Restaurant Reward Endpoints — partner OTP, profile, visits & employee discounts

AI porting guide for the **Reward / restaurants** routes in `app/Config/RestaurantsRoutes.php` (included from `Routes.php`).  
These power the **restaurant partner app** (OTP login, profile, customer visits) plus the **employee-facing restaurant list** with level-based discounts.

**Base path:** `/wapi`  
**Content-Type:** `application/json` or `multipart/form-data` (profile upload); handlers mostly use `getVar` / `getGet`  
**HTTP:** Almost always **200** with `status: true|false` (business errors are not 4xx).  
**Auth filter failures (`RestaurantAuth` / `Auth`):** **401**.

> Side effects (MSG91 SMS OTP, S3 image upload) must **not** change the success/error JSON contract below.

---

## Routes Summary

| # | Method | Route | Handler | Auth | Purpose |
|---|--------|-------|---------|------|---------|
| 1 | GET | `restaurant-list` | `ModuleController::getRestaurantList` | **JWT `Auth`** (employee/company) | List restaurants + user’s level-based discount |
| 2 | POST | `restaurant/send-otp` | `restaurants\AuthController::sendOtp` | Public | Send OTP to registered restaurant phone |
| 3 | POST | `restaurant/verify-otp` | `restaurants\AuthController::verifyOtp` | Public | Verify OTP; return restaurant JWT session |
| 4 | GET | `testauth` | `restaurants\AuthController::testauth` | **`RestaurantAuth`** | Debug: plain-text auth check |
| 5 | GET | `restaurant/profile-details` | `restaurants\AuthController::profileDetails` | **`RestaurantAuth`** | Current restaurant profile |
| 6 | POST | `restaurant/update-profile` | `restaurants\AuthController::updateProfile` | **`RestaurantAuth`** | Update name/description/address/images |
| 7 | POST | `restaurant/add-customer-visits` | `restaurants\CustomerVisitController::addCustomerVisit` | **`RestaurantAuth`** | Log a customer visit + upsert customer summary |
| 8 | GET | `restaurant/customer-visits` | `restaurants\CustomerVisitController::getCustomerVisits` | **`RestaurantAuth`** | List visits for this restaurant |
| 9 | GET | `restaurant/customer-search` | `restaurants\CustomerVisitController::customerSearch` | **`RestaurantAuth`** | Search employees by `individual_id` |
| 10 | GET | `restaurant/customer-discount/(:num)` | `restaurants\CustomerVisitController::customerDiscount/$1` | **`RestaurantAuth`** | Discount % for a user by reward level |

**Count:** 10 routes.

**Source map**

| Piece | Location |
|-------|----------|
| Routes | `app/Config/RestaurantsRoutes.php` |
| Restaurant auth filter | `app/Filters/RestaurantsAuth.php` (`RestaurantAuth`) |
| OTP + profile | `app/Controllers/restaurants/AuthController.php` |
| Visits / search / discount | `app/Controllers/restaurants/CustomerVisitController.php` |
| Employee restaurant list | `app/Controllers/ModuleController.php` → `getRestaurantList` |
| Visit / search queries | `app/Models/restaurants/CustomerVisitModel.php` |
| Restaurant list query | `app/Models/ModuleModel.php` → `get_restaurants_list` |
| Restaurant JWT helper | `app/Helpers/general_helper.php` → `generate_jwt` |
| Reward level | `getUserHighestLevel`, `getHighestLevelWithEmployment` |
| SMS OTP | `otpSend` — see `msg91-sms.md` |

---

## Auth models (two different JWTs)

### A. Platform user JWT — filter `Auth`

Used only by **#1 `restaurant-list`**.

| Item | Value |
|------|--------|
| Header | `Authorization: Bearer <loginauth/jwt>` |
| Identity | `$this->request->id` = platform `user.id` (employee/company) |
| Override | `X-Company` may swap company context (same as other Auth routes) |

### B. Restaurant partner JWT — filter `RestaurantAuth`

Used by **#4–#10**.

| Item | Value |
|------|--------|
| Header | `Authorization: Bearer <restaurant_token>` |
| Token create | `generate_jwt(restaurant.id)` after OTP verify |
| Payload | `{ iat, exp, uid }` where `uid` = `restaurants.id` |
| Secret | `JWT_SECRET` env, algorithm **HS256** |
| Expiry | **30 days** (`time() + 30 * 24 * 60 * 60`) |
| Persist | Token also written to `restaurants.token` on login |
| Filter checks | Decode JWT → load `restaurants` where `id = uid`, `status = 1`, `is_deleted = 0` |
| Identity | `$this->request->id` = restaurant id; `$this->request->token` = raw token |

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

Do **not** mix restaurant tokens with platform `Auth` tokens (and vice versa).

---

## Reward / discount model (shared)

Restaurant has a max discount field `restaurants.discount` (percent, float).  
Employee reward level is `0–4` from `getUserHighestLevel(userId)`:

| Level | Name (product) | Rough unlock (from helper comments) |
|------:|----------------|-------------------------------------|
| 0 | None | Not signed up / not account-verified |
| 1 | Bronze | Signup + account verified |
| 2 | Silver | L1 employment verify + account verified |
| 3 | Gold | L3 or L4 employment verify + account verified |
| 4 | Platinum | Gold conditions + at least one approved experience review |

**Discount formula (both list + customer-discount):**

```
perLevelDiscount = restaurant.discount / 4
finalDiscount    = perLevelDiscount * userMaxLevel
```

Examples: max 20% → per level 5%; level 2 → **10%**. Level 0 → **0**.

`user_next_level` on restaurant-list:

| `user_max_level` | `user_next_level` |
|-----------------:|------------------:|
| 0 | 1 |
| 1 | 2 |
| 2 | 3 |
| 3 | 4 |
| 4 | 0 (completed) |

---

## Tables (logical)

| Table | Role |
|-------|------|
| `restaurants` | Partner accounts (phone login, profile, `discount`, `token`, images) |
| `restaurant_category` | Category join for list (`rc.name as category_name`) |
| `otp` | Phone OTP rows (`phone`, `otp`, `expiry`, `status`, `create_date`) |
| `customer_visits` | Per-visit log (`restaurant_id`, `customer_id` = **individual_id string**, bill fields) |
| `cyb_restaurant_customers` | Per restaurant+customer aggregate (`first_visit_date`, `last_visit_date`, `total_visits`) |
| `user` | Platform employees searched / joined for visit display |

> Model file `CustomerModel` declares table `restaurant_customers`, but **runtime writes use** `cyb_restaurant_customers` via `AdminModel`. Port the **string table names used in controllers**.

---

## Global response quirks (copy exactly)

| Key / shape | Where |
|-------------|--------|
| `message` (singular) | send-otp success/fail (mixed), verify-otp, captcha fail, many CustomerVisit errors/success |
| `messages` (plural) | send-otp validation/throttle/unregistered; update-profile success/fail; profile-details payload (**array in `messages`**, not `data`) |
| `data` | verify-otp session; restaurant-list; customer-visits; customer-search |
| Top-level extra keys | `customer-discount`: `user_max_level`, `discount` (not under `data`) |
| Plain text body | `testauth` → `hello auth{id}` (not JSON) |
| Rate limit | send-otp: **3 requests / minute / IP** via CI throttler |

Many handlers use `return json_encode(...)` rather than `$this->response->setJSON(...)`. Port either way; clients expect JSON strings with the keys above.

---

# 1. GET `/wapi/restaurant-list`

### Auth
JWT **`Auth`** (platform user). Acting user = `$this->request->id`.

### Handler
`ModuleController::getRestaurantList`  
Model: `ModuleModel::get_restaurants_list`

### Request
None.

### Logic
1. Load restaurants:  
   `restaurants rs` LEFT JOIN `restaurant_category rc` ON `rs.category = rc.id`  
   WHERE `rs.is_deleted = 0` AND `rc.is_deleted = 0`.  
   Select: id, name, email, phone, password, token, profile, address, banner, shortDescription, category_name, create_date, discount, google_map.
2. `userMaxLevel = getUserHighestLevel(actingUser)`.
3. For each restaurant:
   - `max_discount` = raw `discount`
   - `discount` = `(float)discount / 4 * userMaxLevel` (not rounded here)
   - Prefix `profile` / `banner` with `S3_PREFIX` when non-empty.
4. `userLevelData = getHighestLevelWithEmployment(actingUser)` → `employment_id`.
5. `current_employment` = `get_higest_level_experience_details(employment_id)` → **array of 0 or 1** employment objects (or `[]` if no employment).
6. Set `user_max_level`, `user_next_level` (table above).

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

Notes:
- `current_employment` is **always an array** (empty or one element wrapper from helper).
- Empty restaurant list still returns `status: true` with `restaurants: []` as long as `$finalResult` is non-empty (it always has keys). The `"No details found"` branch is effectively dead for normal paths.

### Errors
```json
{ "status": false, "message": "<exception message>" }
```
```json
{ "status": false, "message": "No details found" }
```

### Porting notes
- This is the **employee app** entry for “which restaurants + how much discount do I get?”
- Do not require `RestaurantAuth` here.

---

# 2. POST `/wapi/restaurant/send-otp`

### Auth
Public.

### Handler
`restaurants\AuthController::sendOtp`

### Request body / form
| Field | Rules | Notes |
|-------|--------|------|
| `phone` | required, min 10, max 15 | Trimmed |
| `g-recaptcha-response` | required (soft) | Google reCAPTCHA; secret = env `RESTAURANT_CAPTCHA_SECRET_KEY` |

### Logic
1. **Throttle:** `throttler->check(md5(ip), 3, MINUTE)` — fail → `"limit is reach please retry after some time !"`.
2. Validate `phone`.
3. Verify reCAPTCHA via Google `siteverify`; fail → `{ status: false, message: "Captcha verification failed" }` (**`message` singular**).
4. Load `restaurants` where `phone = ?` AND `is_deleted = 0`. Empty → `"Phone not registered with us!"`.
5. `send_otp_event(phone)`:
   - Generate 6-digit OTP: `substr(rand(1000000, 9999999), 0, 6)`
   - Upsert `otp` row: `otp`, `status=1`, `expiry = now + 10 minutes`, `create_date`
   - SMS via `otpSend($phone, $otp)` (MSG91 — see `msg91-sms.md`)

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
{ "status": false, "messages": "Phone number is required,..." }
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

### Porting notes
- Only **pre-registered** restaurant phones can log in (admin creates restaurants).
- Preserve exact throttle message spelling (`limit is reach`).
- Env: `RESTAURANT_CAPTCHA_SECRET_KEY`, plus MSG91 keys from `msg91-sms.md`.

---

# 3. POST `/wapi/restaurant/verify-otp`

### Auth
Public.

### Handler
`restaurants\AuthController::verifyOtp`

### Request body / form
| Field | Rules |
|-------|--------|
| `phone` | required, min 10, max **13** (note: tighter than send-otp) |
| `otp` | required, exact_length 6, numeric |

### Logic
1. Validate phone + otp.
2. Load `otp` by phone. Missing → `"invalid phone no."`.
3. If `expiry < now` → `"Otp Expired !"`.
4. If `otp` mismatch → `"Invalid OTP!"`.
5. Load `restaurants` where `phone` + `is_deleted = 0`. Missing → `"User not found"`.
6. `token = generate_jwt(restaurant.id)`; update `restaurants.token = token`.
7. Delete OTP row for phone.
8. Return session `data` (images prefixed with `S3_PREFIX`; `level` JSON-decoded array or `[]`).

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

Client stores `data.token` and sends it as `Authorization: Bearer <token>` for RestaurantAuth routes.

### Errors
```json
{ "status": false, "message": "Phone number is required, ..." }
```
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

### Handler
`restaurants\AuthController::testauth`

### Response
**Plain text** (not JSON):

```
hello auth{restaurant_id}
```

Example: `hello auth12`

### Porting notes
Debug-only. Safe to omit in production ports or keep as a health probe behind the same filter.

---

# 5. GET `/wapi/restaurant/profile-details`

### Auth
`RestaurantAuth`. Restaurant id = `$this->request->id`.

### Handler
`restaurants\AuthController::profileDetails`

### Logic
1. If restaurant id empty → `"Restaurant id required!"`.
2. `all_fetch('restaurants', { id, is_deleted: 0 })` — builds one object (last row wins if multiple).
3. Success wraps profile object in **array** under **`messages`** (not `data`).

### Success
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

If no row found, still `status: true` with `messages: [ {} ]` (empty object in array) — legacy behavior.

### Errors
```json
{ "status": false, "message": "Restaurant id required!" }
```
```json
{ "status": false, "messages": "Access denied" }
```

---

# 6. POST `/wapi/restaurant/update-profile`

### Auth
`RestaurantAuth`.

### Handler
`restaurants\AuthController::updateProfile`  
Uploads: `Awss3` trait → `s3fileUploads($file, 'uploads/restaurant/')`.

### Request (`multipart/form-data` when files present)
| Field | Rules | Notes |
|-------|--------|------|
| `name` | required | Sanitized with `escxss` |
| `shortDescription` | required | Sanitized with `escxss` |
| `google_map` | optional | Sanitized with `escxss` |
| `address` | optional | **Not** run through `escxss` |
| `profile` | optional file | S3 path stored on `restaurants.profile` |
| `banner` | optional file | S3 path stored on `restaurants.banner` |

### Logic
1. Restaurant id from JWT; empty → fail.
2. Validate name + shortDescription.
3. Optional file uploads when `$_FILES[...]['name']` non-empty.
4. `updateData('restaurants', $save, { id })`.

### Success
```json
{ "status": true, "messages": "Successfully Updated" }
```

### Errors
```json
{ "status": false, "message": "Restaurant id required!" }
```
```json
{ "status": false, "message": "The Name field is required, ..." }
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
`RestaurantAuth`. `restaurant_id` = `$this->request->id`.

### Handler
`restaurants\CustomerVisitController::addCustomerVisit`

### Request body / form
| Field | Rules | Notes |
|-------|--------|------|
| `customer_id` | required | **Platform `user.individual_id`** (e.g. `U101`), not internal `user.id` |
| `group_size` | required, integer, `> 0` | |
| `bill_before_amount` | required | |
| `discount` | required, `0–100` | Validated, but **stored value is recomputed** (see logic) |
| `bill_after_amount` | required | |
| `visit_date` | optional | Default `Y-m-d` today |

### Logic
1. Validate fields.
2. Resolve customer: `user` where `individual_id = customer_id` → internal `user.id` (may be empty string if not found).
3. Recompute discount via internal call to `customerDiscount(user.id)` logic:
   - `user_max_level = getUserHighestLevel(user.id)`
   - `discount = round((restaurant.discount / 4) * level, 2)`
   - **Request body `discount` is ignored for storage.**
4. Insert into `customer_visits`:
   - `restaurant_id`, `customer_id` (**individual_id string** as submitted), `visit_date`, `group_size`, amounts, computed `discount`, `create_date`.
5. Upsert `cyb_restaurant_customers` on `(restaurant_id, customer_id, is_deleted=0)`:
   - **Insert:** `first_visit_date`, `last_visit_date`, `total_visits=1`
   - **Update:** `last_visit_date`, `total_visits + 1`, `modify_date`

### Success
```json
{
  "status": true,
  "message": "Customer visit added successfully"
}
```

### Errors
```json
{ "status": false, "message": "Restaurant ID is required" }
```
```json
{
  "status": false,
  "message": "Validation errors",
  "errors": {
    "customer_id": "The Customer Id field is required."
  }
}
```
```json
{ "status": false, "message": "Failed to add visit" }
```
```json
{ "status": false, "message": "<exception message>" }
```

### Porting notes / known quirks
- `customer_id` in visits table is the **public individual_id**, matching the join in `get_customer_visits_list` (`cv.customer_id = ur.individual_id`).
- Discount validation still requires a body `discount` even though the server overwrites it — clients should send a placeholder (e.g. `0`).
- Internal call uses `json_decode($this->customerDiscount($customerId))`; if restaurant missing, early `setJSON` return can break decode — keep restaurant active (`status=1`).

---

# 8. GET `/wapi/restaurant/customer-visits`

### Auth
`RestaurantAuth`.

### Handler
`restaurants\CustomerVisitController::getCustomerVisits`  
Model: `CustomerVisitModel::get_customer_visits_list`

### Request
None (restaurant from JWT).

### Query logic
```
customer_visits cv
LEFT JOIN user ur ON cv.customer_id = ur.individual_id
WHERE cv.restaurant_id = ? AND cv.is_deleted = 0 AND ur.is_deleted = 0
ORDER BY cv.id DESC
```

Profile: `profile ? S3_PREFIX + profile : social_image`.

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

### Errors
```json
{ "status": false, "message": "Restaurant ID is required" }
```
```json
{ "status": false, "message": "No customer visits found" }
```
```json
{ "status": false, "message": "<exception message>" }
```

Empty list → **`status: false`** (not empty `data` array). Port the same.

---

# 9. GET `/wapi/restaurant/customer-search`

### Auth
`RestaurantAuth`.

### Handler
`restaurants\CustomerVisitController::customerSearch`  
Model: `CustomerVisitModel::get_customer_search`

### Query params
| Param | Default | Meaning |
|-------|---------|---------|
| `keyword` | `''` | Search string (trimmed) |
| `limit` | `30` | Page size |
| `offset` | `0` | **Page number**, not SQL offset: `page <= 1 → 0`, else `page * limit - limit` |

### Query logic
- Base: `user` where `user_type = 1`, `is_deleted = 0`, `status = 1`
- Joins (for designation/company names): cities, state, industries, current company user, designation
- If `keyword` non-empty: `LIKE` on `individual_id` (full keyword + each space-split word) — **name is not searched** in current SQL
- Limit/offset applied

Each hit:

| Field | Source |
|-------|--------|
| `id` | `user.id` |
| `name` | `full_name` |
| `profile` | S3 profile or `social_image` |
| `individual_id` | public id |
| `designation_name` | current designation |
| `company_name` | current company `fname` |
| `is_verified` | `UserModel::user_verified(user.id)` |

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

### Porting notes
- Intended UX is “scan / type CollarCheck ID”; SQL only matches `individual_id` (despite joins loading names).
- Pass `individual_id` into **add-customer-visits** as `customer_id`.
- Pass **`user.id`** (numeric) into **customer-discount**.

---

# 10. GET `/wapi/restaurant/customer-discount/{id}`

### Auth
`RestaurantAuth`.

### Handler
`restaurants\CustomerVisitController::customerDiscount/$1`

### Path param
| Param | Meaning |
|-------|---------|
| `id` | Platform **`user.id`** (numeric), **not** `individual_id` |

### Logic
1. Restaurant id from JWT; load restaurant `id` + `is_deleted=0` + `status=1` for max discount.
2. `user_max_level = getUserHighestLevel(id)`.
3. `discount = round((restaurant.discount / 4) * user_max_level, 2)` (missing restaurant → discount base 0).

### Success
```json
{
  "status": true,
  "user_max_level": 2,
  "discount": 10
}
```

(`discount` / `user_max_level` are **top-level**, not nested under `data`.)

### Errors
```json
{ "status": false, "message": "Restaurant ID is required" }
```

### Porting notes
- Use after customer-search (`data[].id`) before confirming a bill.
- Same formula as employee `restaurant-list` per-restaurant `discount`, but **rounded to 2 decimals** here (list does not round).

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
| `JWT_SECRET` | `generate_jwt` + `JwtHelper::decode` in RestaurantAuth |
| `RESTAURANT_CAPTCHA_SECRET_KEY` | send-otp reCAPTCHA |
| `S3_PREFIX` (+ AWS upload config) | Profile/banner URLs and uploads |
| `AUTH_KEY_MSG` / `TEMPLATE_ID` | MSG91 OTP — see `msg91-sms.md` |

---

## Implementation checklist for a new stack

- [ ] Two auth middlewares: platform `Auth` vs restaurant `RestaurantAuth` (`uid` → `restaurants.id`)
- [ ] OTP: 6 digits, 10-minute expiry, local verify only, delete on success
- [ ] reCAPTCHA + 3/min IP throttle on send-otp
- [ ] Discount = `round(maxDiscount/4 * level, 2)` for partner discount endpoint; list may omit round
- [ ] `customer_visits.customer_id` stores **individual_id**; discount path uses **user.id**
- [ ] Preserve plural/singular message keys and profile-details putting payload in `messages`
- [ ] Empty customer-visits → `status: false` + `"No customer visits found"`
- [ ] SMS via same MSG91 contract as login OTP
)
