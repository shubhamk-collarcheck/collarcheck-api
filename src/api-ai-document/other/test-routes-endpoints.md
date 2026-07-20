
# Test / Utility Routes Endpoints

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Status:** Implemented — `src/routes/test-routes.route.ts`  

Mix of **ops utilities** (guarded) and **product** resume/notice/CV-popup APIs that lived next to the PHP test group.

---

## Node file map

| Layer | Path |
|-------|------|
| Routes | `src/routes/test-routes.route.ts` |
| Controller | `src/controllers/test-routes.controller.ts` |
| Service | `src/services/test-routes.service.ts` |
| Repository | `src/repositery/test-routes.repositery.ts` |
| Types | `src/types/test-routes.types.ts` |

---

## Security (ops routes)

These are **not** left fully public in production:

| Env / header | Behavior |
|--------------|----------|
| `OPS_KEY` + request header `X-Ops-Key` (or `X-Admin-Key`) | Allowed |
| `ALLOW_PUBLIC_OPS=1` | Allowed (emergency only) |
| Non-production + no `OPS_KEY` set | Allowed for local dev |
| Otherwise | **403** `{ status: false, messages: "Ops endpoint disabled" }` |

**Ops-guarded:** `POST get-slug`, `GET mailtest`, `GET update-ccid`.

---

## Routes Summary

| # | Method | Full path | Auth | Role |
|---|--------|-----------|------|------|
| 1 | POST | `/wapi/get-slug` | Ops key | CSV import → `cyb_message_history` |
| 2 | GET | `/wapi/mailtest` | Ops key | Dev mail payload dump (no send) |
| 3 | GET | `/wapi/update-ccid` | Ops key | Backfill `individual_id` + `slug` |
| 4 | POST | `/wapi/resume-download` | JWT | Log template download (`templete_id` typo) |
| 5 | POST | `/wapi/update-notice` | JWT | Notice-period flags |
| 6 | GET | `/wapi/digilocker` | Public | DigiLocker JSON info |
| 7 | POST | `/wapi/save-epfo` | JWT | CV onboarding popup orchestrator |
| 8 | GET | `/wapi/resume-template` | JWT | List templates |
| 9 | GET | `/wapi/resume-details` | JWT | Template + CV data (+ QR URL) |

---

# 1. POST `/wapi/get-slug`

Misnamed: **CSV import** into `cyb_message_history` (not slug generation).

- Field: `csv` (multipart file) or body string  
- Skips header row  
- Message stored base64 (legacy encrypt stand-in)  
- Response: plain text `ok`  

---

# 2. GET `/wapi/mailtest`

Returns JSON debug payload only — **does not send email**. No SMTP secrets.

---

# 3. GET `/wapi/update-ccid`

Finds users with empty `individual_id`, assigns unique id (`CCE`/`CCC`) + slug.  
Response: `{ status, messages, updated }`.

---

# 4. POST `/wapi/resume-download`

```json
{ "templete_id": 1 }
```

Inserts `cyb_resume_download` (column typo `templete_id` preserved).  
Success: `"Record saved successfully !"`

---

# 5. POST `/wapi/update-notice`

| Field | Notes |
|-------|-------|
| `on_notice` | `0` or `1` |
| `notice_date` | required if on notice |
| `notice_employments` | required array if on notice |

Updates `cyb_user` + `cyb_user_details.notice_employments` (JSON). Clears fields when off notice.  
Success: `"Record update successfully"`

---

# 6. GET `/wapi/digilocker`

JSON landing (same helper as account-migration): info + `DIGILOCKER_URL`.

---

# 7. POST `/wapi/save-epfo`

CV popup orchestrator (name is legacy; not EPFO payroll).

Always: `UPDATE user SET cvPop = 0`.

| form_type | Meaning | In-process services |
|-----------|---------|---------------------|
| 1 | Basic + address | `editUserProfileService` ×2 |
| 2 | Employments | `employmentCreate/UpdateService` |
| 3 | Education | `create/updateEducationService` |
| 4 | Skills + languages | `addSkillService`, `upsertLanguageService` |
| 5 | Certificates | `create/updateCertificateService` |

Success messages match PHP strings (including `"Employmnent not added"` typo on fail).

No HTTP self-calls — services only.

---

# 8. GET `/wapi/resume-template`

`cyb_resume_templates` where `status=1`.  
Thumbnail prefixed with `S3_PREFIX`.  
Empty: `{ status: false, message: "Template data not found" }`.

---

# 9. GET `/wapi/resume-details?id={templateId}`

- Missing template/user → plain string `"Template not found"` / `"User not found"` (PHP parity)
- Else JSON: template meta, `profileUrl`, `qrSrc`, `cc_logo`, `detail` from in-process `downloadCvService`

---

## Env

| Name | Use |
|------|-----|
| `OPS_KEY` | Protect ops routes |
| `ALLOW_PUBLIC_OPS` | Force-open ops (avoid in prod) |
| `S3_PREFIX` | Thumbnails / logo |
| `REACT_SITE` | Profile URL for QR |
| `CC_LOGO_URL` | Optional logo override |
| `DIGILOCKER_URL` | DigiLocker link |
| `MAILTEST_TO` | Label in mailtest payload only |

---

## Checklist

- [x] Ops routes gated (not public in prod by default)
- [x] `templete_id` typo preserved
- [x] `update-notice` clears date/employments when off
- [x] `save-epfo` in-process orchestrator over employee services
- [x] `resume-details` uses download-cv service (no loopback)
- [x] Template table `cyb_resume_templates`
- [x] Docs rewritten for Node
