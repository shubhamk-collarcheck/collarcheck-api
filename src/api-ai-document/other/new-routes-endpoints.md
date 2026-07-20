
# New Routes Endpoints — splash, reviews, delete-account, AI generate, resume, hired, FAQ, follow

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Auth:** `Authorization` JWT where noted · acting user = `req.auth.id`  
> **Status:** Implemented — `src/routes/new-routes.route.ts`  

Public and JWT routes from the legacy “new routes” batch (splash, delete-account, hired popup, resume parse, FAQs, etc.). Response shapes and message strings match client expectations.

**Content-Type:** `application/json`, urlencoded, or `multipart/form-data`  
**HTTP:** Almost always **200** with `status: true|false`. Auth failures **401**.

---

## Node file map

| Layer | Path |
|-------|------|
| Routes | `src/routes/new-routes.route.ts` (mounted at `/wapi` in `app.ts`) |
| Controller | `src/controllers/new-routes.controller.ts` |
| Service | `src/services/new-routes.service.ts` |
| Repository | `src/repositery/new-routes.repositery.ts` |
| Types | `src/types/new-routes.types.ts` |
| Resume helpers | `src/utils/resumeParse.ts` (`pdf-parse` + regex parse) |

---

## Routes Summary

| # | Method | Full path | Auth | Handler |
|---|--------|-----------|------|---------|
| 1 | GET | `/wapi/splace` | Public | `splace` |
| 2 | POST | `/wapi/report-review` | JWT | `reportReview` |
| 3 | GET | `/wapi/all-delete-option` | Public | `allDeleteOption` |
| 4 | POST | `/wapi/request-delete-account` | JWT | `requestDeleteAccount` |
| 5 | POST | `/wapi/ai-generate` | JWT | `aiGenerate` |
| 6 | GET | `/wapi/message-search` | JWT | `messageSearch` |
| 7 | GET | `/wapi/field-suggestion` | Public | `fieldSuggestion` |
| 8 | POST | `/wapi/check-ccid` | Public | `checkCcid` |
| 9 | POST | `/wapi/follow-revoke` | JWT | `followRevoke` |
| 10 | POST | `/wapi/manual-document-submit` | JWT | `manualDocumentSubmit` |
| 11 | GET | `/wapi/faqs` | Public | `faqs` |
| 12 | GET | `/wapi/hired-throw` | JWT | `hiredThrow` |
| 13 | POST | `/wapi/update-hired-status` | JWT | `updateHiredStatus` |
| 14 | POST | `/wapi/decline-hired-status` | JWT | `declineHiredStatus` |
| 15 | GET | `/wapi/download-cv` | JWT | `downloadCv` |
| 16 | POST | `/wapi/auto-fetch` | JWT | `autoFetch` (multipart `resume`) |
| 17 | GET | `/wapi/resume-fetch` | JWT | `resumeFetch` |
| 18 | GET | `/wapi/resume` | JWT | `resume` |
| 19 | GET | `/wapi/resume-parse` | JWT | `resumeParse` |

---

## Global response quirks

| Key | Where |
|-----|--------|
| `messages` | Most validation / business errors (plural) |
| `message` | hired-throw, accept/decline hired, download-cv empty, faqs success |
| `msg` | manual-document-submit success/fail |
| `data` | Success payload |
| `error` / `response` | resume-parse (legacy Assistants-style shape) |

---

# 1. GET `/wapi/splace`

> Path typo **`splace`** kept for clients.

**Auth:** Public  

Reads `cyb_setting` and returns branding:

```json
{
  "status": true,
  "data": {
    "app_name": "CollarCheck",
    "app_tag_line": "...",
    "app_logo": "...",
    "splace_sceen": "...",
    "splace_background_color": "#FFFFFF",
    "app_background_color": "#000000"
  }
}
```

Legacy key typos preserved: `splace_sceen`, `splace_background_color`.

---

# 2. POST `/wapi/report-review`

**Auth:** JWT  

| Field | Required |
|-------|----------|
| `review_id` | Yes |
| `message` | No |

Logic: active review → no duplicate report → insert `cyb_report_reviews`.

| Result | Body |
|--------|------|
| OK | `{ "status": true, "messages": "Report submitted successfully !" }` |
| Bad id | `"Invalid Review ID"` |
| Dup | `"Already Reported!"` |

---

# 3. GET `/wapi/all-delete-option`

**Auth:** Public  

`cyb_delete_options` where `status=1`, `is_deleted=0` → `{ id, name }` (`name` ← `title`).

---

# 4. POST `/wapi/request-delete-account`

**Auth:** JWT  

| Field | Required |
|-------|----------|
| `option_id` | Yes |
| `message` | No |

Inserts `cyb_account_delete_requests` with **expiry = now + 30 days**. Does not hard-delete the user.

Messages: `"Request submitted successfully !"`, `"Invalid Option ID"`, `"Already Requested!"`.

---

# 5. POST `/wapi/ai-generate`

**Auth:** JWT  

| Field | Required |
|-------|----------|
| `query` | Yes |
| `type` | Yes |

Types: `USER_DESCRIPTION`, `COMPANY_DESCRIPTION`, `EMPLOYMENT_DESCRIPTION`, `PORTFOLIO_DESCRIPTION`, `REVIEW_USER`, `REVIEW_COMPANY`, default bullets.

Upstream: OpenAI chat completions (`process.env.GPT` or `OPENAI_API_KEY`), model `GPT_MODEL` or `gpt-4.1-mini`, timeout 10s.

Success: `{ "status": true, "data": "<string>" }` — **data is a string**.

---

# 6. GET `/wapi/message-search?keyword=`

**Auth:** JWT  

In-process `globalSearchService` (no HTTP loopback). Merges employees + companies into one `data[]` array.

---

# 7. GET `/wapi/field-suggestion`

**Auth:** Public  

| Param | Notes |
|-------|-------|
| `keyword` | Search text |
| `field` | `user`, `company`, `benefit_id`, or whitelist: `department`, `designation`, `industry`, `city`, `state`, `benefits` |
| `type` | `nonclaim` for companies |
| `limit` | default 30 |
| `offset` | **page number** (same math as top-company) |

> Node does **not** allow arbitrary SQL table names (security). Only the whitelist above.

---

# 8. POST `/wapi/check-ccid`

**Auth:** Public  

Body: `{ "ccid": "U101" }` — validates `user.individual_id`.

- Valid: `"Valid Referral Code"`
- Invalid: `"Invalid Referral Code"`

---

# 9. POST `/wapi/follow-revoke`

**Auth:** JWT — acting user is **followed_id**.  

Body: `{ "user_id": <followerId> }` → soft-delete `cyb_follow` (`is_deleted=1`).

- OK: `"Revoke Successfully !"`
- Missing: `"Invalid Request !!"`

---

# 10. POST `/wapi/manual-document-submit`

**Auth:** JWT · **multipart**

| Field | Notes |
|-------|-------|
| `document` / `document[]` / `file` | files (educationUpload: PDF/images/docs, 2MB, max 5) |
| `doctype` | required |
| `description` | optional |

Upsert `cyb_manual_document_verify` by user. Success key is **`msg`**: `"Request Submited Successfully"`.

---

# 11. GET `/wapi/faqs`

**Auth:** Public  

```json
{
  "status": true,
  "message": "Faqs Detail",
  "data": [{ "question": "...", "answer": "...", "shorted_order": 1 }]
}
```

---

# 12. GET `/wapi/hired-throw`

**Auth:** JWT  

Returns employment rows where a job application date is **0–120 days after** joining date (likely hired via CollarCheck). Branches employee vs company shapes.

```json
{ "status": true, "message": "Hired from CollarCheck", "data": [ ... ] }
```

---

# 13. POST `/wapi/update-hired-status`

**Auth:** JWT · Body `{ "ids": [99, 100] }` (experience ids)

Sets `user_experience.hired = 1`, queues SQS emails (templates 93/94) to user + company.

```json
{ "status": true, "message": "Record updated successfully." }
```

---

# 14. POST `/wapi/decline-hired-status`

Same body; sets `hired = 2`. No emails.

| hired | Meaning |
|-------|---------|
| 1 | Accepted via CC |
| 2 | Declined |

---

# 15. GET `/wapi/download-cv`

**Auth:** JWT  

JSON aggregate (not a PDF stream):

```json
{
  "status": true,
  "data": {
    "basic_details": {},
    "experience_details": [],
    "certificate_details": [],
    "education_details": [],
    "portfolio_details": []
  }
}
```

Empty all sections → `"No record found!"` with null keys.

---

# 16. POST `/wapi/auto-fetch`

**Auth:** JWT · multipart field **`resume`** (PDF/DOC/DOCX, 5MB via `resumeUpload`)

1. Store S3 key on `user.resume` / `resumeName`
2. Fetch PDF + `pdf-parse` + heuristic `parseResume`

Success `data` shape: name, email, mobile, skills buckets, education/experience arrays, etc.

Error typo preserved: `"Something went worng"`.

---

# 17. GET `/wapi/resume-fetch`

**Auth:** JWT  

Parse existing `user.resume`. Missing → `"No Resume found !"`.

---

# 18. GET `/wapi/resume`

**Auth:** JWT  

Clean OpenAI chat extract (legacy PHP was debug/`print_r`). Falls back to regex parse if no API key.

```json
{ "status": true, "data": "<text or JSON string>" }
```

---

# 19. GET `/wapi/resume-parse`

**Auth:** JWT  

Replaces broken Assistants stub. Returns:

```json
{ "response": { "parsed": { } } }
```

or `{ "error": "..." }` on failure.

---

## Side-effect summary

| Endpoint | DB writes | External |
|----------|-----------|----------|
| splace | — | — |
| report-review | `cyb_report_reviews` | — |
| all-delete-option | — | — |
| request-delete-account | `cyb_account_delete_requests` | — |
| ai-generate | — | OpenAI (`GPT` / `OPENAI_API_KEY`) |
| message-search | — | in-process globalSearch |
| field-suggestion | — | — |
| check-ccid | — | — |
| follow-revoke | `cyb_follow` soft-delete | — |
| manual-document-submit | `cyb_manual_document_verify` + S3 | S3 |
| faqs | — | — |
| hired-throw | — | — |
| update-hired-status | `hired=1` | SQS email ×2 |
| decline-hired-status | `hired=2` | — |
| download-cv | — | — |
| auto-fetch | `user.resume` + S3 | pdf-parse |
| resume-fetch | — | pdf-parse |
| resume / resume-parse | — | OpenAI optional |

---

## Env

| Name | Used by |
|------|---------|
| `GPT` or `OPENAI_API_KEY` | ai-generate, resume, resume-parse |
| `GPT_MODEL` | default `gpt-4.1-mini` |
| `S3_PREFIX` | profiles / resume URLs |
| `PUBLIC_BASE_URL` | optional splash asset base |
| `REACT_SITE` | hired email deep links |
| `AWS_*` | S3 + SQS |

---

## Checklist

- [x] Route typo `splace` preserved
- [x] Message strings matched (spaces/punctuation)
- [x] `hired`: 1 accept, 2 decline
- [x] Delete-account is request + 30-day expiry
- [x] ai-generate `data` is string
- [x] field-suggestion whitelist (no arbitrary tables)
- [x] manual-document response key `msg`
- [x] download-cv JSON aggregate
- [x] Production-ish regex + pdf-parse; OpenAI resume cleaned up
- [x] follow-revoke: acting user = followed; body `user_id` = follower
