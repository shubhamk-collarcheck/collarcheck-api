# Verify APIs — Email OTP, KYC Document, Aadhaar, GST, DigiLocker (Node)

> **Stack:** Node.js + Express + Drizzle ORM (MySQL)  
> **Status:** Implemented  
> **Base path:** `/wapi`  
> **Auth:** JWT Bearer required (`Authorization` middleware).  
> **HTTP:** Almost always **200** with `status: true|false`.  
> **Postman:** `collarcheck.postman_collection.json` → **verify (KYC + email OTP)**

| | |
|--|--|
| User id (actor) | `req.auth.user_id` |
| Active context id | `req.auth.id` (switches to company when `X-Company` is set) |
| Controllers | `src/controllers/verify.controller.ts` |
| Services | `src/services/verify.service.ts` |
| Repository | `src/repositery/verify.repositery.ts` |
| Types (Zod) | `src/types/verify.types.ts` |
| SurePass client | `src/utils/surepass.ts` |
| AES encrypt | `src/utils/encrypt.ts` (`encryptUrl` / `decryptUrl`) |

---

## Routes summary

| Method | Full path | Route file | Handler | Purpose |
|--------|-----------|------------|---------|---------|
| GET | `/wapi/general/verify-document` | `general.route.ts` | `verifyDocument` | Same as POST (query params) |
| POST | `/wapi/general/verifyDocument` | `general.route.ts` | `verifyDocument` | **Init** GST / PAN / Aadhaar OTP / DigiLocker |
| POST | `/wapi/general/verifyAadhar` | `general.route.ts` | `verifyAadhar` | **Submit** Aadhaar OTP |
| POST | `/wapi/general/verifyGst` | `general.route.ts` | `verifyGst` | **Submit** GST OTP |
| POST | `/wapi/general/verifyDigilocker` | `general.route.ts` | `verifyDigilocker` | **Download** Aadhaar after DigiLocker session |
| POST | `/wapi/user/sendEmailOtp` | `user.route.ts` | `sendEmailOtp` | Send email OTP (account / work / domain) |
| POST | `/wapi/user/verifyEmailOtp` | `user.route.ts` | `verifyEmailOtp` | Verify email OTP + side effects |

> **Related:** `POST /wapi/general/saveDocument` exists for generic user docs; KYC finalize (set `verify=1` from `ref_id`) may still need a dedicated path if clients rely on PHP `saveDocument` KYC behavior — see note at end.

---

## Shared config & tables

### Environment

| Key | Usage |
|-----|--------|
| `SUREPASSTOKEN` (or `SUREPASS_TOKEN`) | SurePass API bearer token |
| `SUREPASS_BASE_URL` | Optional override (default `https://kyc-api.aadhaarkyc.io`) |
| `REACT_SITE` | Frontend base (DigiLocker web redirect) |
| `API_BASE_URL` / `BASE_URL` | DigiLocker mobile redirect → `{base}/wapi/digilocker` |
| `ENCRYPT_SECRET_KEY` / `ENCRYPT_SECRET_IV` | Optional; defaults `COLLARCHECK` / `SECRET@COLLAR` |
| SQS / email worker | Email OTP via `sendEmailViaSQS` template **1** |

Auth header to KYC provider:

```
Authorization: Bearer {SUREPASSTOKEN}
```

### External base URL (all KYC)

```
https://kyc-api.aadhaarkyc.io
```

### `doctype` mapping

| doctype | Meaning |
|---------|---------|
| `1` | Aadhaar (OTP path **or** DigiLocker download) |
| `2` | PAN |
| `4` | GST |

`method_type` on Aadhaar rows: `'aadhar'` (OTP) or `'digilocker'`.

### Tables

| Table | Role |
|-------|------|
| `cyb_verify_document` | Pending/verified KYC docs (`docnumber` encrypted, `client_id`, `verify`) |
| `cyb_logs` | Failed KYC provider calls |
| `cyb_otp` | Email OTP rows (`type` LOGIN \| SIGNUP \| VERIFICATION) |
| `cyb_user_domains` | Company email/domain verification |
| `cyb_user_experience` | Work email on employment |
| `cyb_user` | Account email verified flags |

### Encryption (`src/utils/encrypt.ts`)

PHP-compatible AES-256-CBC:

- secret_key: `COLLARCHECK`
- secret_iv: `SECRET@COLLAR`
- Output: `urlencode(base64_encode(openssl_encrypt(...)))`

`ref_id` in API responses = `encryptUrl(verify_document.id)`.  
Document numbers stored as `encryptUrl(raw_number)`.

### Duplicate document check

- Other user already has same `doctype` + `docnumber` with `verify=1` →  
  `"This document is already verified with another account!"`

---

# Client flows (overview)

### Aadhaar (OTP)

```
1. POST /wapi/general/verifyDocument  { type: "aadhaar", id_number: "12digits" }
   ← data.client_id
2. POST /wapi/general/verifyAadhar    { client_id, otp }
   ← data.ref_id, full_name, current_name
```

### DigiLocker

```
1. POST /wapi/general/verifyDocument  { type: "digilocker", id_number: "<mobile>", ismobile?: 1 }
   ← data.url, data.client_id
2. User completes DigiLocker in browser
3. POST /wapi/general/verifyDigilocker { client_id }
   ← data.ref_id, full_name, current_name
```

### GST (OTP)

```
1. POST /wapi/general/verifyDocument  { type: "gst", id_number: "GSTIN" }
   ← data.client_id, data.mobile (masked)
2. POST /wapi/general/verifyGst       { client_id, otp }
   ← data.ref_id, full_name, current_name
```

### PAN (instant)

```
1. POST /wapi/general/verifyDocument  { type: "pan", id_number: "ABCDE1234F" }
   ← data.ref_id, full_name, category, current_name
```

### Account / work email

```
1. POST /wapi/user/sendEmailOtp   { email, employment_id?, type? }
2. POST /wapi/user/verifyEmailOtp { email, otp, employment_id?, type? }
```

---

# 1. GET `/wapi/general/verify-document`  
#    POST `/wapi/general/verifyDocument`

**Service:** `verifyDocumentService`  
**Auth:** JWT  

Both routes share one implementation. Prefer **POST** with body; GET uses the same fields as query.

### Request

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | string | **Yes** | `gst` \| `pan` \| `aadhaar` \| `digilocker` |
| `id_number` | string | **Yes** | Uppercased server-side |
| `ismobile` | any | No | DigiLocker only: truthy → app redirect URL |

### Pre-checks

1. Load user by JWT context id → missing → `{ "status": false, "messages": "User invalid" }`
2. Call SurePass with `Bearer {SUREPASSTOKEN}`

---

## Branch `type=gst`

1. `POST .../corporate-otp/gstin/init`  
2. Duplicate check on encrypted GSTIN  
3. Empty mobile → `{ "status": false, "message": "Mobile number not link with this gst detail!" }` (**`message` singular**)  
4. `POST .../gstin/generate-otp`  
5. Upsert pending `cyb_verify_document` doctype `4`

### Success

```json
{
  "status": true,
  "messages": "Otp send successfully!",
  "data": { "client_id": "...", "mobile": "98xxxxxx21" }
}
```

---

## Branch `type=pan`

`POST .../pan/pan` → upsert doctype `2` → return `ref_id`.

### Success

```json
{
  "status": true,
  "data": {
    "full_name": "...",
    "category": "...",
    "ref_id": "<encrypted id>",
    "current_name": "<user.fname>"
  }
}
```

### Provider failure

```json
{ "status": false, "message": "Something went wrong please try again letter!" }
```

---

## Branch `type=aadhaar`

Quirk: rejects only when **not** numeric **and** length is 12.

`POST .../aadhaar-v2/generate-otp` — does **not** insert `verify_document` yet.

### Success

```json
{
  "status": true,
  "data": { "client_id": "...", "messages": "OTP Sent" }
}
```

---

## Branch `type=digilocker`

Redirect:

| `ismobile` | `redirect_url` |
|-----------|----------------|
| truthy | `{API_BASE_URL}/wapi/digilocker` |
| else | `{REACT_SITE}verification-page` |

`POST .../digilocker/initialize` → store `client_id` on `cyb_verify_document`.

### Success

```json
{
  "status": true,
  "data": { "url": "https://...", "client_id": "..." }
}
```

---

# 2. POST `/wapi/general/verifyAadhar`

**Service:** `verifyAadharService`  
**Auth:** JWT  

| Field | Required |
|-------|----------|
| `client_id` | Yes* |
| `otp` | Yes* |

\* Zod allows empty for provider-call parity; provider will fail.

Provider: `POST .../aadhaar-v2/submit-otp`  
On success: upsert doctype `1`, `method_type=aadhar`, return `ref_id`.

```json
{
  "status": true,
  "data": {
    "full_name": "...",
    "ref_id": "...",
    "current_name": "First Last"
  }
}
```

Failures → `cyb_logs` `type=adhaar`, `call_method=general/verifyAadhar`.

---

# 3. POST `/wapi/general/verifyGst`

**Service:** `verifyGstService`  
**Auth:** JWT  

| Field | Required |
|-------|----------|
| `client_id` | Yes |
| `otp` | Yes |

Provider: `POST .../gstin/submit-otp`  
Upsert doctype `4`, return `ref_id`.

---

# 4. POST `/wapi/general/verifyDigilocker`

**Service:** `verifyDigilockerService`  
**Auth:** JWT  

| Field | Required |
|-------|----------|
| `client_id` | Yes* |

Provider: `GET .../digilocker/download-aadhaar/{client_id}`  
Status `422` → return provider message.  
On success: upsert Aadhaar (`method_type=digilocker`), return `ref_id`.

---

# 5. POST `/wapi/user/sendEmailOtp`

**Service:** `sendEmailOtpService`  
**Auth:** JWT  
**Throttle:** 3 / minute / IP (`Otp Send limit is reach !`)

| Field | Required | Notes |
|-------|----------|-------|
| `email` | Yes | lowercased |
| `employment_id` | No | Work email on experience |
| `type` | No | `"VERIFICATION"` = company domain path |

### Modes

| Mode | Rules |
|------|--------|
| `type=VERIFICATION` | Reject verified email/domain (`message` singular) |
| `employment_id` or `type` set | Block public domains (gmail, yahoo, …) |
| `employment_id` | Load experience; `validateWorkEmailDomain` |
| Account (no employment, no type) | Employee uniqueness + already-verified checks |

OTP: 6 digits, 10 min expiry, `cyb_otp` (`SIGNUP` or `VERIFICATION`).  
Delivery: SQS template **1** (bypass list skips send; OTP `123456`).

### Success

```json
{ "status": true, "messages": "OTP Successfully sent to your email address" }
```

---

# 6. POST `/wapi/user/verifyEmailOtp`

**Service:** `verifyEmailOtpService`  
**Auth:** JWT  

Uses `req.auth.user_id` (actor) and `req.auth.id` (company context when `X-Company` set).

| Field | Required |
|-------|----------|
| `email` | Yes |
| `otp` | Yes |
| `employment_id` | No |
| `type` | No (`VERIFICATION`) |

### OTP check

1. Missing → `"Invalid OTP or OTP has expired. Please try again"`  
2. Expired → `"OTP Expired !"` (**`message` singular**)  
3. Mismatch → `"Invalid OTP!"`

### Branches

| Branch | Side effects | Success message |
|--------|--------------|-----------------|
| `type=VERIFICATION` | Insert 2 `user_domains` rows; clear mismatched work emails; SQS `SEND_SCHEDULAR` L2VU/L2VC | `OTP verify successfully !` |
| `employment_id` | Update experience work email; optional domain row; email **119** + WA **205** | `Your given work email domain verified successfully` |
| Account email | Set `email_verified` or `email_alternate_verify` | `OTP verify successfully !` |

---

# SurePass / KYC API quick reference

| App step | Method | Path |
|----------|--------|------|
| GST init | POST | `/api/v1/corporate-otp/gstin/init` |
| GST send OTP | POST | `/api/v1/corporate-otp/gstin/generate-otp` |
| GST submit OTP | POST | `/api/v1/corporate-otp/gstin/submit-otp` |
| PAN | POST | `/api/v1/pan/pan` |
| Aadhaar send OTP | POST | `/api/v1/aadhaar-v2/generate-otp` |
| Aadhaar submit OTP | POST | `/api/v1/aadhaar-v2/submit-otp` |
| DigiLocker init | POST | `/api/v1/digilocker/initialize` |
| DigiLocker download | GET | `/api/v1/digilocker/download-aadhaar/{client_id}` |

All: `Content-Type: application/json`, `Authorization: Bearer {SUREPASSTOKEN}`.

### Env

```bash
SUREPASSTOKEN=<surepass_api_token>
REACT_SITE=https://your-frontend.example/
API_BASE_URL=https://your-api.example
# AWS_SQS_URL + worker for email OTP delivery
```

---

# Related: KYC finalize (`ref_id`)

Typical UI after KYC still expects a finalize step that sets `verify=1` and may rename the user from `doc_name`.  
Legacy PHP used `POST /wapi/general/saveDocument` with `{ ref_id }` (decrypt → row id).  
Current Node `saveDocument` is a **generic user document** upsert — not the same KYC finalize.  
If clients need that finalize, add a dedicated endpoint (or extend saveDocument) that:

1. `decryptRefId(ref_id)` → `cyb_verify_document.id`  
2. Set `verify=1`  
3. Optionally update `user.fname`/`lname` from `doc_name`  
4. Delete other pending rows for the same user  

---

# Node parity checklist

1. All endpoints **JWT Auth**; KYC uses `req.auth.id` (company-aware context).  
2. Preserve mixed **`message` vs `messages`** keys per error.  
3. Encrypt document numbers and `ref_id` with AES params for client compatibility.  
4. Aadhaar OTP two-step; DigiLocker three-step; GST two-step; PAN one-step.  
5. Email OTP: 6 digits, 10 min, `cyb_otp`, throttle 3/min/IP.  
6. Work email: public domain blocklist + company domain check.  
7. Company `type=VERIFICATION` inserts **two** domain rows + schedulers.  
8. Log KYC failures to `cyb_logs`.  
9. GET `verify-document` and POST `verifyDocument` share one service.

---

# Quick mental model

```
┌─ Email ──────────────────────────────────────────────┐
│  sendEmailOtp → (SQS email) → verifyEmailOtp → flags │
└──────────────────────────────────────────────────────┘

┌─ KYC (SurePass via surepass.ts) ─────────────────────┐
│  verifyDocument(type)  ──init──► client_id / url / pan ref
│       ├─ aadhaar  → verifyAadhar(otp)     → ref_id
│       ├─ gst      → verifyGst(otp)        → ref_id
│       ├─ digilocker → browser → verifyDigilocker → ref_id
│       └─ pan      → ref_id immediately
└──────────────────────────────────────────────────────┘
```
