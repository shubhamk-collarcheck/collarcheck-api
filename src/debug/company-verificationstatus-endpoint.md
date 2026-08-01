# Debug Guide — company-verificationStatus (and sibling verificationStatus)

**Purpose:** Contract source-of-truth for debugging a Node.js reimplementation against the legacy CodeIgniter 4 API. Frontend already depends on these response keys and message strings — **do not rename keys**.

**Authoritative source:** PHP controllers/models below (prefer this file over summary tables in `api-ai-document/` when they conflict).

## Node implementation map (shipped)

| Layer | File |
|-------|------|
| Routes | `src/routes/general.route.ts` — both paths → `verificationStatus` |
| Controller | `src/controllers/general.controller.ts` — `verificationStatus` |
| Service | `src/services/general.service.ts` — `verificationStatusService` |
| Repositery | `src/repositery/general.repositery.ts` |
| Decrypt | `src/utils/encrypt.ts` — `decryptUrl` |
| Node docs | `src/api-ai-document/general/half-of-next-general-api.md` §5, `company/company-employee-request-endpoints.md` §19 |

| Route | Auth | Node handler | What it returns |
|-------|------|--------------|-----------------|
| `GET /wapi/general/company-verificationStatus` | **JWT** | `verificationStatus` | Verification + job-apply gate for **acting company** (or user if no `X-Company`) |
| `GET /wapi/general/verificationStatus` | **JWT** | `verificationStatus` | **Same handler**, typically employee context |

| Route | Auth | PHP Controller | What it returns |
|-------|------|----------------|-----------------|
| `GET /wapi/general/company-verificationStatus` | **JWT** | `GeneralApi::verificationStatus` | Verification + job-apply gate for **acting company** (or user if no `X-Company`) |
| `GET /wapi/general/verificationStatus` | **JWT** | `GeneralApi::verificationStatus` | **Same handler**, typically employee context |

**Source files:**
- `app/Controllers/GeneralApi.php` — `verificationStatus` (~6680–6830); older commented implementation (~6593–6674) is **dead** — do not port
- `app/Models/UserModel.php` — `get_user_detail` (~1174), `get_verify_detail` (~3223), `get_unverify_detail` (~3235), `check_manual_verify_apply` (~4699), `get_applied_jobs` (~4716)
- `app/Models/CommonModel.php` — `fs` (~31) as `$this->AdminModel`
- `app/Helpers/uri_helper.php` — `decrypt_url` (~50)
- `app/Filters/Authenticate.php` — JWT + optional `X-Company`
- Routes: `app/Config/Routes.php`
  - company group: `general/company-verificationStatus` (~202)
  - general Auth group: `general/verificationStatus` (~311)

**Base path:** `/wapi`  
**Auth:** `Authorization: Bearer <jwt>` on both routes  
**Acting user:** JWT user, or company from `X-Company: {companyId}` → `$this->request->id`. Original JWT user is `$this->request->user_id`. `$this->request->user_type` is the **acting** identity’s type (`1` individual, `2` company).

> **Node bug magnet #1:** Trusting `api-ai-document/general-auth-endpoints.md` or `half-of-next-general-api.md` for this endpoint. Those docs invent completely different success shapes (`aadhar`/`pan`/`gst` counts, or `success`/`overall_status`). **PHP returns none of that.**

> **Node bug magnet #2:** Treating the two URL paths as different logic. They are **aliases** of one method. Behavior differs only by **who** Auth put in `request.id` / `user_type` (and whether the company is unclaimed).

---

## Global envelope

| Case | HTTP | Body shape |
|------|------|------------|
| Success (user row found, or non-claim early return) | **200** | `{ "status": true, "data": { ... } }` ← **no `messages` key** |
| “Empty” / no user detail (main path never sets success) | **200** | `{ "status": false, "data": { partial arr } }` — but may **fatal** first if `$detail` is null (see below) |
| Auth fail | **401** | filter-dependent |
| Menu permission 403 | **N/A** | `checkMenuAccess` block is **commented out** — do not implement 403 unless product re-enables it |

> **Node bug magnet #3:** Adding `messages: "success"` on success. PHP **never** sets `messages` here.

---

## Auth / identity

```text
JWT → user row (status=1, is_deleted=0 typically via filter)
If header X-Company present and company exists (status=1, is_deleted=0):
  request.id        = company.id          ← $userId for this endpoint
  request.user_id   = JWT user.id         ← $login_user_id (invite lookup only)
  request.user_type = company.user_type   (2)
Else:
  request.id = request.user_id = JWT user
  request.user_type = JWT user.user_type  (1 or 2)
```

Company FE calling `company-verificationStatus` almost always sends **JWT company** or **JWT individual + `X-Company`**.  
Employee FE calling `verificationStatus` uses acting **individual** (`user_type = 1`).

---

## Query / body params

**None.** No query string, no body. GET only by route definition.

```http
GET /wapi/general/company-verificationStatus
Authorization: Bearer <jwt>
X-Company: <companyId>   # optional; company portal often uses this
```

```http
GET /wapi/general/verificationStatus
Authorization: Bearer <jwt>
```

---

## Routes summary

| # | Method | Route | Handler | Notes |
|---|--------|-------|---------|-------|
| 1 | GET | `/wapi/general/company-verificationStatus` | `GeneralApi::verificationStatus` | Company group (`Auth`) |
| 2 | GET | `/wapi/general/verificationStatus` | `GeneralApi::verificationStatus` | General Auth group |

Spellings that must stay exact:
- Key: **`ApplyStatus`** (Pascal **A** and **S**) — not `applyStatus` / `apply_status`
- Key: **`isVerify`** / **`emailVerify`** / **`phoneVerify`** / **`docVerify`** / **`manual_verify`**
- Key: **`jobCount`** (camel **C**)
- Key: **`doc_type_id`**, **`doc_type`**, **`doc_name`**, **`doc_no`**
- Envelope key: **`status`** + **`data`** only (no `messages` on success)

---

# 1. GET `/wapi/general/company-verificationStatus`

**Handler:** `GeneralApi::verificationStatus` (~6680)  
**Auth:** JWT  
**Sibling:** same body as `#2` below

### Logic (debug checklist)

```text
1. userId       = request.id || ''
   login_user_id = request.user_id || ''
   user_type    = request.user_type || ''

2. response.status = false
   arr = {}
   arr.ApplyStatus = true          // default open for job apply

3. ── BRANCH A: company + non-claim early return ─────────────────
   IF user_type == 2:
     authUser = AdminModel.fs('user', { id: userId, claim_status: 0 })
     IF authUser found:
       invite = AdminModel.fs('company_invite', {
         company: userId,
         added_by: login_user_id
       })
       arr.email         = invite.email || ''
       arr.phone         = invite.phone || ''
       arr.manual_verify = UserModel.check_manual_verify_apply(userId)
       arr.emailVerify   = (bool) authUser.email_verified
       arr.phoneVerify   = (bool) authUser.phone_verified
       arr.doc_type_id   = ''
       arr.doc_type      = ''
       arr.doc_no        = ''
       arr.isVerify      = false
       arr.docVerify     = false
       // ⚠ NO jobCount, NO doc_name on this branch
       response.status = true
       response.data   = arr
       RETURN immediately

4. ── BRANCH B: claimed company OR individual (main path) ──────
   detail = UserModel.get_user_detail(userId)
     // WHERE ur.id = userId AND status = 1 AND is_deleted = 0
     // + many LEFT JOINs (city, state, industry, etc.)

5. appliedJob = UserModel.get_applied_jobs(userId)
     // COUNT application WHERE user = userId AND is_deleted = 0 AND status = 1
   arr.jobCount = (int) appliedJob.count || 0
   IF appliedJob.count > 5:
     arr.ApplyStatus = false
     // ⚠ strict greater-than: count 5 still ApplyStatus true; 6+ false

6. arr.isVerify = false
   arr.email = detail.email || ''     // ⚠ if detail is null → PHP property error
   arr.phone = detail.phone || ''
   arr.emailVerify = FALSE
   arr.phoneVerify = FALSE

7. IF detail is empty:
     // never sets response.status = true
     // still assigns response.data = arr at end
     // often crashes earlier at step 6
   ELSE continue:

8. emailVerify = true IFF email non-empty AND email_verified non-empty AND email_verified == 1
   phoneVerify = true IFF phone non-empty AND phone_verified non-empty AND phone_verified == 1

9. verify = get_verify_detail(userId)
     // verify_document vd JOIN doctype, user
     // WHERE vd.user_id = userId AND vd.verify = 1 AND ur.is_deleted = 0
   IF verify:
     arr.doc_type_id = verify.doctype
     arr.doc_type    = verify.doctype_name
     arr.doc_name    = verify.doc_name
     arr.doc_no      = decrypt_url(verify.docnumber) || ''

10. unverify = get_unverify_detail(userId)
      // verify_document WHERE user_id AND verify != 1, JOIN doctype
    IF unverify:
      // OVERWRITES doc fields from step 9
      arr.doc_type / doc_type_id / doc_name / doc_no from unverify

11. isVerify gate (name-match + contact):
    IF phone_verified==1 AND email_verified==1
       AND verify row exists
       AND name_match(verify.doc_name, detail.full_name):
         arr.isVerify = true
    // name_match PHP is written as:
    //   !empty( strtolower(doc_name) == strtolower(full_name) )
    // which is a boolean equality wrapped in empty() — see Node bug magnet #4

12. IF arr.isVerify == true:
      arr.ApplyStatus = true     // verified always allowed to apply

13. Domain override (companies only):
    IF detail.user_type == 2:
      row = user_domains ud
            LEFT JOIN user ur ON ud.user_id = ur.id
            WHERE ud.user_id = userId
              AND is_verified = 1        // ⚠ column not table-qualified
              AND ur.claim_status = 1
              AND ud.is_deleted = 0
      IF row found: arr.isVerify = true

14. docVerify:
    IF verify exists AND name_match(verify.doc_name, detail.full_name):
      arr.docVerify = true
    ELSE:
      arr.docVerify = false
    // Uses **verified** doc only (step 9), NOT the unverify overwrite for the match.
    // But displayed doc_* fields may still be from unverify (step 10).

15. arr.manual_verify = check_manual_verify_apply(userId)

16. response.status = true
    response.data = arr
    return json_encode(response)
```

### SQL (equivalent)

**Non-claim company probe:**

```sql
SELECT * FROM user
WHERE id = :userId AND claim_status = 0
LIMIT 1;

SELECT * FROM company_invite
WHERE company = :userId AND added_by = :login_user_id
LIMIT 1;
```

**User detail:**

```sql
SELECT ur.*, /* + joined dims */
FROM user ur
LEFT JOIN user_details udt ON udt.user_id = ur.id
LEFT JOIN cities cty ON ur.city = cty.id
-- ... more left joins (state, country, work_type, designation, company, industries, ...)
WHERE ur.id = :userId
  AND ur.status = 1
  AND ur.is_deleted = 0
LIMIT 1;
```

**Applied job count (ApplyStatus gate):**

```sql
SELECT COUNT(id) AS count
FROM application
WHERE user = :userId
  AND is_deleted = 0
  AND status = 1;
```

**Verified document:**

```sql
SELECT vd.*, dt.name AS doctype_name
FROM verify_document vd
LEFT JOIN doctype dt ON vd.doctype = dt.id
LEFT JOIN user ur ON vd.user_id = ur.id
WHERE vd.user_id = :userId
  AND vd.verify = 1
  AND ur.is_deleted = 0
LIMIT 1;   -- getRow: first match only
```

**Unverified document (pending / failed):**

```sql
SELECT vd.*, dt.name AS doctype_name
FROM verify_document vd
LEFT JOIN doctype dt ON vd.doctype = dt.id
WHERE vd.user_id = :userId
  AND verify != 1
LIMIT 1;
```

**Verified domain (claimed company override):**

```sql
SELECT *
FROM user_domains ud
LEFT JOIN user ur ON ud.user_id = ur.id
WHERE ud.user_id = :userId
  AND is_verified = 1
  AND ur.claim_status = 1
  AND ud.is_deleted = 0
LIMIT 1;
```

**Manual verify flag:**

```sql
SELECT mdv.id
FROM manual_document_verify mdv
WHERE mdv.user_id = :userId
  AND (mdv.is_deleted = 0 OR mdv.is_deleted IS NULL)
LIMIT 1;
-- returns true if any row, else false
```

**`decrypt_url` (doc numbers):** AES-256-CBC, key material `COLLARCHECK` / `SECRET@COLLAR` (see `uri_helper.php`). Input is urldecoded then base64-decoded ciphertext. On failure returns empty-ish → coerced to `''` via `?: ''`.

---

### Success — BRANCH A (non-claim company) — **LOCKED KEYS**

Returned only when `user_type == 2` **and** user row has `claim_status = 0`.

```json
{
  "status": true,
  "data": {
    "ApplyStatus": true,
    "email": "claimer@example.com",
    "phone": "9876543210",
    "manual_verify": false,
    "emailVerify": false,
    "phoneVerify": false,
    "doc_type_id": "",
    "doc_type": "",
    "doc_no": "",
    "isVerify": false,
    "docVerify": false
  }
}
```

| Key | Type | Source / notes |
|-----|------|----------------|
| `ApplyStatus` | boolean | Always **true** on this branch (never runs job count) |
| `email` / `phone` | string | From **`company_invite`** for `(company=userId, added_by=login_user_id)`, else `''` — **not** from `user` |
| `emailVerify` / `phoneVerify` | boolean | `(bool)` of **`user.email_verified` / `phone_verified`** on the unclaimed company row |
| `manual_verify` | boolean | Any non-deleted `manual_document_verify` row |
| `doc_type_id` / `doc_type` / `doc_no` | empty string | Hard-coded `''` |
| `isVerify` / `docVerify` | boolean | Hard-coded **false** |
| `jobCount` | — | **Omitted** |
| `doc_name` | — | **Omitted** |

> **Node bug magnet #5:** Using `user.email` / `user.phone` for unclaimed companies. PHP prefers invite contact fields for display.

---

### Success — BRANCH B (claimed company or individual) — **LOCKED KEYS**

```json
{
  "status": true,
  "data": {
    "ApplyStatus": true,
    "jobCount": 2,
    "isVerify": false,
    "email": "user@example.com",
    "phone": "9876543210",
    "emailVerify": true,
    "phoneVerify": true,
    "doc_type_id": 4,
    "doc_type": "GST",
    "doc_name": "Acme Pvt Ltd",
    "doc_no": "22AAAAA0000A1Z5",
    "docVerify": false,
    "manual_verify": false
  }
}
```

| Key | Type | Source / notes |
|-----|------|----------------|
| `ApplyStatus` | boolean | `true` default; `false` if `jobCount > 5`; forced `true` again if `isVerify` becomes true |
| `jobCount` | number | Count of non-deleted active applications (`application.user`) |
| `isVerify` | boolean | Email+phone verified + verified doc name matches `user.full_name`, **or** claimed company has verified domain |
| `email` / `phone` | string | From `user` row via `get_user_detail` |
| `emailVerify` | boolean | Requires non-empty email **and** `email_verified == 1` |
| `phoneVerify` | boolean | Requires non-empty phone **and** `phone_verified == 1` |
| `doc_type_id` | number \| string | Present only if verify and/or unverify doc row exists; unverify **wins** if both |
| `doc_type` | string | `doctype.name` |
| `doc_name` | string | Document holder name stored on verify_document |
| `doc_no` | string | **Decrypted** document number |
| `docVerify` | boolean | Verified doc exists **and** `doc_name` case-insensitive equals `user.full_name` |
| `manual_verify` | boolean | Pending/applied manual verification row exists |

Keys `doc_*` may be **absent** entirely if user has no verify_document rows (PHP only sets them inside `if (!empty($verify))` / unverify blocks).

Boolean casing: PHP uses `TRUE`/`FALSE` constants and lowercase `true`/`false` interchangeably; JSON encodes both as JSON booleans.

---

### How `isVerify` is decided (Branch B)

```text
start: isVerify = false

A) Contact + verified doc name match:
   phone_verified==1 AND email_verified==1
   AND verified verify_document row exists
   AND lower(verify.doc_name) == lower(user.full_name)
   → isVerify = true

B) Company domain (only if detail.user_type == 2):
   EXISTS user_domains with is_verified=1, is_deleted=0
   AND user.claim_status = 1
   → isVerify = true   (overrides / independent of A)

Note: non-claim companies never reach this (early return with isVerify=false).
```

`docVerify` is **only** the name-match on the verified document — it does **not** require email/phone. So you can have `docVerify: true` with `isVerify: false` (missing email/phone verify).

---

### ApplyStatus / job apply gate

| Condition | `ApplyStatus` |
|-----------|---------------|
| Default | `true` |
| `jobCount > 5` and not fully verified | `false` |
| `isVerify == true` (after step 11–13) | forced `true` (even if jobCount is huge) |
| Non-claim early return | always `true` (jobCount not computed) |

> **Node bug magnet #6:** Using `>= 5` or a “free 5 applies then block” off-by-one. PHP blocks only when count is **strictly greater than 5** (i.e. 6th application and beyond for unverified users).

Legacy comment says “Limit 5 job apply”; the live code is `count > 5`.

---

### Error / empty / edge cases

| Situation | Behavior |
|-----------|----------|
| Auth missing/invalid | **401** from filter |
| Non-claim company, no invite row | Success with `email`/`phone` = `''` |
| Claimed/individual, user missing or `status!=1`/`is_deleted=1` | `$detail` empty → property access on null may **error**; if it survives, `status: false` with partial `data` |
| Multiple verify_document rows | `getRow()` — **first** row only (no ORDER BY) |
| Both verified and unverified docs | Display fields from **unverify**; match logic uses **verify** |
| `checkMenuAccess` for menu 12 | Commented out — never returns 403 from this method |

There is **no** explicit `{ "status": false, "messages": "..." }` business-error path in the live method.

---

### Common Node mistakes

| Mistake | Symptom |
|---------|---------|
| Implement api-ai-document “aadhar/pan/gst counts” shape | FE cannot read `isVerify` / `ApplyStatus` |
| Different handlers for company vs general path | Divergent behavior; double maintenance |
| Claimed-company path without domain override | Claimed + domain-verified company shows `isVerify: false` |
| Unclaimed company using user email instead of invite | Wrong contact shown on claim flow UI |
| Name match on `fname + ' ' + lname` instead of `full_name` | `isVerify` / `docVerify` never true |
| Encrypt/leave doc_no ciphertext | FE shows garbage IDs |
| `jobCount >= 5` for ApplyStatus | Blocks one apply too early |
| Forcing `doc_*` always present | FE shape differs when no documents |
| Returning 404 when unverified | PHP always **200** with flags |

---

# 2. GET `/wapi/general/verificationStatus`

**Handler:** identical to `#1`  
**Auth:** JWT  
**Typical actor:** individual (`user_type = 1`) → always Branch B (Branch A requires `user_type == 2`).

If an individual calls this without `X-Company`, Branch A never runs.  
If someone sends `X-Company` on this path, identity swaps and company Branch A/B rules apply — same as company route.

---

## Side-by-side / do not confuse

| Client need | Call this | Not this |
|-------------|-----------|----------|
| Company portal verification banner / apply gates | `GET general/company-verificationStatus` | Employee-only path is fine too (same handler) but keep FE consistent |
| Employee verification / job apply limit | `GET general/verificationStatus` | — |
| Actually verify documents (write) | `POST general/verifyDocument`, `verifyAadhar`, `verifyGst`, `verifyDigilocker`, `saveDocument` | Do **not** expect this GET to mutate |
| “Is user verified?” helper used elsewhere | `UserModel::user_verified($id)` | Similar rules, **not identical** response object — internal only |
| Company claim submit | `POST claim-company` (`Frontend::claim_company`) | Different resource |

---

## Full common Node mistake matrix

| Mistake | Symptom |
|---------|---------|
| Invent REST 4xx for “not verified” | FE expects 200 + `isVerify: false` |
| Add success `messages` | Extra key; some clients strict-diff against PHP |
| Port commented ~6593 block (`limited`, `count`) | Dead code; live keys are `ApplyStatus` / `jobCount` |
| Ignore `X-Company` | Company dashboard verification wrong user |
| Treat `emailVerify` as truthy of `email_verified` only | PHP also requires non-empty email/phone string on Branch B |
| Case-sensitive name compare | Misses matches PHP would accept via `strtolower` |
| Skip `decrypt_url` | Wrong `doc_no` |
| Qualify domain query differently / drop `claim_status=1` | Domain override never fires |
| Return `manual_verify` only when approved | PHP is “any non-deleted manual row exists” |

---

## Minimal verification checklist

```bash
# Company claimed + domain verified (expect isVerify true, ApplyStatus true)
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Company: $COMPANY_ID" \
  "$BASE/wapi/general/company-verificationStatus" | jq .

# Unclaimed company (expect early branch: no jobCount, isVerify false)
curl -sS -H "Authorization: Bearer $CLAIMER_TOKEN" -H "X-Company: $UNCLAIMED_ID" \
  "$BASE/wapi/general/company-verificationStatus" | jq '{status, keys:(.data|keys), isVerify:.data.isVerify, email:.data.email}'

# Employee with many applications, unverified (jobCount>5 → ApplyStatus false)
curl -sS -H "Authorization: Bearer $EMP_TOKEN" \
  "$BASE/wapi/general/verificationStatus" | jq '{status, jobCount:.data.jobCount, ApplyStatus:.data.ApplyStatus, isVerify:.data.isVerify}'
```

**Assert:**

1. HTTP **200** when JWT valid.
2. Success body has **`status: true`** and **`data` object** — **no `messages`**.
3. Keys use exact casing: `ApplyStatus`, `isVerify`, `emailVerify`, `phoneVerify`, `docVerify`, `manual_verify`, `jobCount` (Branch B).
4. Unclaimed company response **omits** `jobCount` and `doc_name`; includes empty-string doc fields.
5. Branch B: `ApplyStatus === false` only when `jobCount > 5` and `isVerify === false`.
6. When `isVerify === true`, `ApplyStatus === true` regardless of `jobCount`.
7. `doc_no` is plaintext (decrypted), not AES blob.
8. Name match for `docVerify` / `isVerify` uses **`user.full_name`**, case-insensitive.

---

## Quick port recipe (Node)

```js
async function verificationStatus(req) {
  const userId = req.id;           // acting identity
  const loginUserId = req.user_id;
  const userType = req.user_type;

  const data = { ApplyStatus: true };
  // response starts status:false until success path sets true

  if (userType == 2) {
    const authUser = await db.user.findOne({ id: userId, claim_status: 0 });
    if (authUser) {
      const invite = await db.company_invite.findOne({
        company: userId,
        added_by: loginUserId,
      });
      return {
        status: true,
        data: {
          ApplyStatus: true,
          email: invite?.email || '',
          phone: invite?.phone || '',
          manual_verify: await checkManualVerifyApply(userId),
          emailVerify: Boolean(authUser.email_verified),
          phoneVerify: Boolean(authUser.phone_verified),
          doc_type_id: '',
          doc_type: '',
          doc_no: '',
          isVerify: false,
          docVerify: false,
        },
      };
    }
  }

  const detail = await getUserDetail(userId); // status=1, is_deleted=0
  const applied = await countApplications(userId); // is_deleted=0, status=1
  data.jobCount = applied;
  if (applied > 5) data.ApplyStatus = false;

  data.isVerify = false;
  data.email = detail?.email || '';
  data.phone = detail?.phone || '';
  data.emailVerify = false;
  data.phoneVerify = false;

  if (!detail) {
    return { status: false, data }; // or match PHP crash — prefer status:false if hardening
  }

  if (detail.email && detail.email_verified == 1) data.emailVerify = true;
  if (detail.phone && detail.phone_verified == 1) data.phoneVerify = true;

  const verify = await getVerifyDetail(userId);     // verify=1
  const unverify = await getUnverifyDetail(userId); // verify!=1

  if (verify) {
    data.doc_type_id = verify.doctype;
    data.doc_type = verify.doctype_name;
    data.doc_name = verify.doc_name;
    data.doc_no = decryptUrl(verify.docnumber) || '';
  }
  if (unverify) {
    data.doc_type = unverify.doctype_name;
    data.doc_type_id = unverify.doctype;
    data.doc_name = unverify.doc_name;
    data.doc_no = decryptUrl(unverify.docnumber) || '';
  }

  const nameMatch = (docName, fullName) =>
    String(docName || '').toLowerCase() === String(fullName || '').toLowerCase();

  if (
    detail.phone_verified == 1 &&
    detail.email_verified == 1 &&
    verify &&
    nameMatch(verify.doc_name, detail.full_name)
  ) {
    data.isVerify = true;
  }

  if (data.isVerify === true) data.ApplyStatus = true;

  if (detail.user_type == 2) {
    const domain = await findVerifiedDomain(userId); // is_verified=1, claim_status=1, is_deleted=0
    if (domain) data.isVerify = true;
  }

  data.docVerify = !!(verify && nameMatch(verify.doc_name, detail.full_name));
  data.manual_verify = await checkManualVerifyApply(userId);

  return { status: true, data };
}
```

---

## Related endpoints

| Area | Route / helper | Debug guide |
|------|----------------|-------------|
| Verify write paths | `POST /wapi/general/verifyDocument`, `verifyAadhar`, `verifyGst`, `verifyDigilocker`, `saveDocument` | (not yet in `debug/`) |
| Company dashboard | `GET /wapi/company/dashboard` | `debug/company-allapplication-and-dashboard-endpoints.md` |
| Employee dashboard | `GET /wapi/employee/dashboard` | `debug/employee-dashboard-endpoint.md` |
| Internal boolean | `UserModel::user_verified` | Used by other controllers; similar domain + name rules |
| High-level (secondary, often wrong here) | `api-ai-document/general-auth-endpoints.md` §33, `company-employee-request-endpoints.md` §19 | Prefer **this** file |

---

## Response key freeze (frontend)

**Envelope:** `status`, `data`

**Branch A (`data`):**  
`ApplyStatus`, `email`, `phone`, `manual_verify`, `emailVerify`, `phoneVerify`, `doc_type_id`, `doc_type`, `doc_no`, `isVerify`, `docVerify`

**Branch B (`data`):**  
`ApplyStatus`, `jobCount`, `isVerify`, `email`, `phone`, `emailVerify`, `phoneVerify`, `docVerify`, `manual_verify`  
+ optional: `doc_type_id`, `doc_type`, `doc_name`, `doc_no`

**Do not invent:** `messages`, `limited`, `count` (old commented), `aadhar`/`pan`/`gst`/`total_verified`, `overall_status`, `pending_items`, `success` (non-status)

---

*Generated from PHP source in this repo (`GeneralApi::verificationStatus` ~6680, models cited above). When PHP and `api-ai-document/general-auth-endpoints.md` / `half-of-next-general-api.md` / `company-employee-request-endpoints.md` disagree, trust this debug guide and the controller lines cited above.*

