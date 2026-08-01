# POST APIs — multipart/form-data support

> **Stack:** Node.js + Express + multer  
> **Date:** 2026-08-01  
> **Change:** Every POST endpoint accepts `multipart/form-data` fields in `req.body` (in addition to JSON / urlencoded).

---

## What changed

Clients can send body fields as:

| Content-Type | Parser | Notes |
|--------------|--------|--------|
| `application/json` | `express.json()` (global in `app.ts`) | Unchanged — still works |
| `application/x-www-form-urlencoded` | `express.urlencoded()` (global) | Unchanged — still works |
| `multipart/form-data` | `multer().none()` as **`formData`** on the route, **or** file-upload multer (`uploadToS3` / `educationUpload` / etc.) | **New for routes that only had JSON before** |

### How it works

```ts
// In each route file:
const formData = multer().none();

// Middleware order (typical):
// Authorization → formData → validateData(schema) → controller
router.post("/path", Authorization, formData, validateData(schema), handler);
```

- `multer().none()` parses **fields only** (no files) into `req.body`.
- For `application/json`, multer is effectively a no-op; existing JSON body remains.
- Routes that already used file upload middleware already parsed multipart (fields + files); those were **not** double-wrapped with `formData`.

`validateData` already uses `body: req.body ?? {}`, so parsed form fields flow into Zod the same way as JSON keys.

---

## Routes updated in this pass

These POSTs previously had **no** multipart field parser. `formData` (`multer().none()`) was added.

### `src/routes/company.route.ts` → `/wapi/company`

| Method | Path | Middleware added |
|--------|------|------------------|
| POST | `/sendUserProfileViewRequest` | `formData` |
| POST | `/saveSetting` | `formData` |
| POST | `/add-connection` | `formData` |
| POST | `/add-wishlist` | `formData` |
| POST | `/multi-cancel-job` | `formData` |
| POST | `/multi-jobStatusChange` | `formData` |
| POST | `/add-help` | `formData` |
| POST | `/leaveExperience` | `formData` |
| POST | `/revoke-delete-account` | `formData` |

### `src/routes/general.route.ts` → `/wapi/general`

| Method | Path | Middleware added |
|--------|------|------------------|
| POST | `/add-suggestion` | `formData` |
| POST | `/saveDocument` | `formData` |
| POST | `/multi-remove-follower` | `formData` |
| POST | `/follow` | `formData` |

### `src/routes/employee.route.ts` → `/wapi/employee`

| Method | Path | Middleware added |
|--------|------|------------------|
| POST | `/sendCompanyInvite` | `formData` |
| POST | `/changeEmploymentBasic` | `formData` |
| POST | `/apply-job` | `formData` |
| POST | `/approvedVeiwRequest` | `formData` |
| POST | `/leave-reminder-experience` | `formData` |
| POST | `/save-exploring` | `formData` |
| POST | `/edit-profile` | `formData` |

### `src/routes/root.route.ts` → `/wapi`

| Method | Path | Middleware added |
|--------|------|------------------|
| POST | `/data-deletion` | `formData` |
| POST | `/claim-company` | `formData` |
| POST | `/multi-unfollow` | `formData` |
| POST | `/multi-acceptfollow` | `formData` |
| POST | `/multi-rejectfollow` | `formData` |
| POST | `/multi-deleteViewRequest` | `formData` |
| POST | `/multi-approvedVeiwRequest` | `formData` |

### `src/routes/user.route.ts` → `/wapi/user`

| Method | Path | Middleware added |
|--------|------|------------------|
| POST | `/updatePhone` | `formData` |
| POST | `/updateEmail` | `formData` |

### `src/routes/hired.route.ts` → `/wapi/hired`

| Method | Path | Middleware added |
|--------|------|------------------|
| POST | `/` | `formData` |

**Total newly wired:** 30 POST routes.

---

## POST routes that already accepted form-data (no code change)

These already had `formData` and/or a file-upload multer. Listed for completeness so “all POSTs accept form body” is true end-to-end.

### Already had `formData` only

| Route file | Paths (POST) |
|------------|--------------|
| `company.route.ts` | `/register`, `/addBenafit`, `/addBenafit/:id` |
| `general.route.ts` | `/verifyDocument`, `/verifyAadhar`, `/verifyGst`, `/verifyDigilocker` |
| `employee.route.ts` | `/register`, `/signup`, `/add-skill`, `/add_language` |
| `login.route.ts` | `/`, `/sendOtp`, `/verifyOtp`, `/googlelogin`, `/social-login`, `/verify-otp` |
| `user.route.ts` | `/saveSetting`, `/sendEmailOtp`, `/verifyEmailOtp` |
| `new-routes.route.ts` | `/check-ccid`, `/report-review`, `/request-delete-account`, `/ai-generate`, `/follow-revoke`, `/update-hired-status`, `/decline-hired-status` |
| `widget.route.ts` | `/view-impressions` |
| `swipe-collaborator-rating.route.ts` | `/collaborator-request`, `/employee/add-skill-rating`, `/employee/add-skill-rating/:id`, `/update-show-profile-rating`, `/company/add-skill-rating`, `/company/add-skill-rating/:id` |
| `account-migration.route.ts` | `/ai-generate-row`, `/create-user-group`, `/create-user-group/:id`, `/assign-user-permission`, `/assign-user-permission/:id`, `/send-otp-account-merge`, `/otp-verify-account-merge`, `/merge-user-register` |
| `test-routes.route.ts` | `/resume-download`, `/update-notice` |
| `career.route.ts` | `/save-enquiry` |
| `contact.route.ts` | `/save-enquiry` |
| `restaurant.route.ts` | `/restaurant/send-otp`, `/restaurant/verify-otp`, `/restaurant/add-customer-visits` |
| `ai.route.ts` | All AI proxy POSTs (`/semantic/*`, `/chat/*`, `/domain/*`, `/rec_candidates/rank`, `/scrape`) |

### Already had file-upload multer (multipart fields + files)

| Route file | Paths (POST) | Upload middleware |
|------------|--------------|-------------------|
| `company.route.ts` | `/edit-user`, `/add-document`, `/add-job`, `/add-job/:id`, `/add-review`, `/add-review/:id`, `/addGallery`, `/addGallery/:id`, `/addEmployee`, `/addEmployee/:id`, `/add-company`, `/add-company/:id`, `/invite-company` | `educationUpload` / `uploadToS3` / `galleryUpload` / `addEmployeeUpload` |
| `general.route.ts` | `/send-message-company`, `/send-message` | `uploadToS3.single("doc")` |
| `employee.route.ts` | `/final-signup`, `/upload-resume`, `/add-employement`, `/add-employement/:employment_id`, `/add-education`, `/add-education/:id`, `/add-portfolio`, `/add-portfolio/:id`, `/add-certificate`, `/add-certificate/:id`, `/add-document`, `/add-review`, `/add-review/:id`, `/edit-user` | `educationUpload` / `resumeUpload` / `uploadToS3` / fields helpers |
| `new-routes.route.ts` | `/manual-document-submit`, `/auto-fetch` | `manualDocUpload` / `resumeUpload` |
| `test-routes.route.ts` | `/get-slug`, `/save-epfo` | `csvUpload` / `saveEpfoUpload` |
| `restaurant.route.ts` | `/restaurant/update-profile` | `profileUpload` (`restaurantUpload`) |

---

## Client usage

### Multipart form fields (no files)

```http
POST /wapi/employee/apply-job
Authorization: Bearer <token>
Content-Type: multipart/form-data

job_id=123
```

### Multipart with files (upload routes only)

```http
POST /wapi/employee/add-employement
Authorization: Bearer <token>
Content-Type: multipart/form-data

company=1
employment_type=2
joining_date=2024-01-01
document=@file.pdf
```

### JSON still valid

```http
POST /wapi/employee/apply-job
Authorization: Bearer <token>
Content-Type: application/json

{ "job_id": 123 }
```

Field names are the same as the existing Zod / PHP contracts — only the transport of the body changed for form clients.

---

## Files touched

| File | Change |
|------|--------|
| `src/routes/company.route.ts` | `formData` on 9 POSTs |
| `src/routes/general.route.ts` | `formData` on 4 POSTs |
| `src/routes/employee.route.ts` | `formData` on 7 POSTs |
| `src/routes/root.route.ts` | import multer + `formData` on 7 POSTs |
| `src/routes/user.route.ts` | `formData` on 2 POSTs |
| `src/routes/hired.route.ts` | import multer + `formData` on 1 POST |
| `src/api-ai-document/post-form-data-support.md` | This document |
| `src/api-ai-document/README.md` | Index row |

---

## Status

**Done** — all registered POST endpoints under `/wapi` accept form-data fields in the body (via `formData` or existing file-upload multer). JSON and urlencoded remain supported.
