
# Debug Guide — employee/save-exploring

**Purpose:** Contract source-of-truth for debugging a Node.js reimplementation against the legacy CodeIgniter 4 API. Frontend already depends on these response keys and message strings — **do not rename keys**.

**Authoritative source:** PHP controllers/models below (prefer this file over summary tables in `api-ai-document/` when they conflict).

## Node implementation map (shipped)

| Layer | Files |
|-------|--------|
| Routes | `src/routes/employee.route.ts` — `POST /save-exploring` |
| Controllers | `src/controllers/misc.controller.ts` — `saveExploring` |
| Services | `src/services/misc.service.ts` — `saveExploringService` |
| Repositery | `src/repositery/misc.repositery.ts` — `upsertExploringDetails` |
| Types | `src/types/misc.types.ts` — `saveExploringSchema` / `exploring_details` |
| Schema | `cyb_user_details.exploring_details` |
| Node docs | `src/api-ai-document/employee-misc-endpoints.md` § save-exploring |

| Route | Auth | Node handler | What it returns |
|-------|------|--------------|-----------------|
| `POST /wapi/employee/save-exploring` | **JWT** | `saveExploring` → `saveExploringService(req.auth.id, exploring_details)` | Persist **hidden people/companies** list (`user_details.exploring_details` only) |

**Source files:**
- `app/Controllers/IndividualApi.php` — `save_exploring` (~6874)
- `app/Models/CommonModel.php` — `fs`, `insertData`, `updateData` (as `$this->AdminModel`)
- Consumers of the saved field (read path / privacy, not this write):
  - `app/Controllers/ModuleController.php` — `people_list` (~511) reads `exploring_details`
  - `app/Models/UserModel.php` — `get_exporing_option` (~4730), `get_exploring_user_list` (~5258)
  - `app/Libraries/traits/ExploringTrait.php` — `show_exploring` uses option **3/4** + `exploring_details`
- Routes: `app/Config/Routes.php` under employee Auth group (~122)

**Base path:** `/wapi`  
**Auth:** `Authorization: Bearer <jwt>`  
**Acting user:** `$this->request->id` (JWT user, or company if `X-Company` override is active)

---

## Global envelope

| Case | HTTP | Body shape |
|------|------|------------|
| Success (insert or update) | **200** | `{ "status": true, "messages": "Record updated successfully!" }` |
| DB write failed / falsy result | **200** | `{ "status": false, "messages": "Record not update!" }` |
| No acting user id | **200** | `{ "status": false, "messages": "User not found!" }` |
| Exception | **200** | `{ "status": false, "messages": "<exception message>" }` |
| Auth fail | **401** | filter-dependent |

- Key is always **`messages`** (plural).
- Success has **no `data` key**.
- Message strings are **LOCKED** (including the typo **“update”** not “updated” on failure).

> **Node bug magnet #1:** Implementing the `api-ai-document/employee-misc-endpoints.md` version of this route. That doc claims it updates `user.on_explore`, `on_immediate`, `on_notice`, salary, etc. **False.** Live PHP only upserts **`user_details.exploring_details`**.

> **Node bug magnet #2:** Writing body field `exploring_option`. This endpoint does **not** touch `exploring_option` (that lives on profile edit / other flows). Body key is **`exploring_details`**.

---

## Auth / identity

```text
JWT → user row
If header X-Company present and company valid:
  request.id = company.id
Else:
  request.id = JWT user.id

user_id used for user_details.user_id = request.id
```

Normal employee FE does not send `X-Company` here. If it does, exploring_details is saved on the **company’s** `user_details` row.

No menu ACL. No `user` table existence check beyond non-empty `request.id`.

---

## What this endpoint actually does

Saves the **explicit hide list** used by exploring privacy options **3** (hide from selected companies) and **4** (hide from selected people).

| Concept | Storage | Written by this route? |
|---------|---------|------------------------|
| `exploring_details` | `user_details.exploring_details` JSON string of user/company ids | **Yes** |
| `exploring_option` | `user_details.exploring_option` JSON array of option codes `1–4` | **No** |
| `on_explore` / `on_immediate` / `on_notice` | `user.*` | **No** |
| `notice_period` / `notice_date` / salary fields | `user.*` | **No** |
| `notice_employments` | `user_details.notice_employments` | **No** (`update_notice` / profile edit) |

Related write paths (do not merge into this handler):

| Need | Route / method |
|------|----------------|
| Toggle explore + immediate + notice + salary | Profile edit multi-step (`edit_user_individual` type ~3 area) |
| Notice only | `POST /wapi/update-notice` → `IndividualApi::update_notice` |
| Read picker + selected list | `GET /wapi/people-list` |

---

# 1. POST `/wapi/employee/save-exploring`

**Handler:** `IndividualApi::save_exploring` (~6874)  
**Auth:** JWT  
**Content-Type:** form body or multipart (`getVar`) — JSON body only works if CI parses it the same way FE currently posts

### Request body

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `exploring_details` | no* | array of ids (preferred) | JSON-encoded before save. Empty / missing → store **`NULL`** |

\*Not validated. Omitting or sending empty clears/nulls the field on update.

```
POST /wapi/employee/save-exploring
Authorization: Bearer <jwt>
Content-Type: application/x-www-form-urlencoded

exploring_details[]=101&exploring_details[]=202&exploring_details[]=303
```

Or array-ish frameworks:

```json
{
  "exploring_details": [101, 202, 303]
}
```

(PHP uses `getVar('exploring_details')` then `json_encode(...)`.)

### Stored value

| Input | DB `user_details.exploring_details` |
|-------|-------------------------------------|
| `[101, 202]` | `"[101,202]"` (or spaced equivalent from `json_encode`) |
| missing / empty / falsy | `NULL` |
| already a string | **double-encoded** if truthy string is json_encoded again — prefer raw array from client |

Ids may be **employees** (`user.user_type = 1`) or **companies** (`user_type = 2`). Same JSON array; consumers split by type.

### Logic (debug checklist)

```text
1. user_id = request.id
2. IF empty(user_id) → status false, messages "User not found!"

3. raw = request.exploring_details
   exploring_details =
     if raw truthy → json_encode(raw)
     else → NULL

4. row = SELECT * FROM user_details WHERE user_id = user_id  (fs)

5. IF row exists:
     result = UPDATE user_details
              SET exploring_details = :exploring_details
              WHERE user_id = :user_id
   ELSE:
     result = INSERT INTO user_details (exploring_details, user_id)
              VALUES (:exploring_detail, :user_id)
              // ⚠ PHP variable typo: uses $exploring_detail (undefined)
              //    not $exploring_details — insert path is broken in legacy

6. IF result truthy:
     → status true,  messages "Record updated successfully!"
   ELSE:
     → status false, messages "Record not update!"
```

### SQL (intended / update path)

```sql
-- lookup
SELECT * FROM user_details WHERE user_id = :userId LIMIT 1;

-- update (happy path for existing user_details)
UPDATE user_details
SET exploring_details = :jsonOrNull
WHERE user_id = :userId;

-- insert (intended; live PHP uses wrong variable name on exploring_details column)
INSERT INTO user_details (exploring_details, user_id)
VALUES (:jsonOrNull, :userId);
```

`insertData` returns **`insertID`**.  
`updateData` returns **query builder update bool**.  
Success gate is `if (!empty($result))` — so insert id `0` fails; update `false` fails.

### Success — **LOCKED KEYS**

```json
{
  "status": true,
  "messages": "Record updated successfully!"
}
```

| Key | Type | Notes |
|-----|------|-------|
| `status` | boolean | `true` |
| `messages` | string | exact `"Record updated successfully!"` (exclamation mark) |
| `data` | — | **omitted** |

### Failure — **LOCKED**

```json
{ "status": false, "messages": "Record not update!" }
```

```json
{ "status": false, "messages": "User not found!" }
```

```json
{ "status": false, "messages": "<exception message>" }
```

| Message | When |
|---------|------|
| `Record updated successfully!` | insertID truthy **or** update returns truthy |
| `Record not update!` | falsy write result (typo preserved) |
| `User not found!` | empty `request.id` |
| exception text | catch block |

---

## Legacy PHP bug: insert path variable typo

```php
// update — correct
$result = $this->AdminModel->updateData(
  'user_details',
  array('exploring_details' => $exploring_details),
  array('user_id' => $user_id)
);

// insert — WRONG variable name in source
$result = $this->AdminModel->insertData(
  'user_details',
  array('exploring_details' => $exploring_detail, 'user_id' => $user_id)
);
// $exploring_detail is undefined → notice/null insert or exception
```

| Environment | Practical effect |
|-------------|------------------|
| User already has `user_details` row | Update path works (most real users after signup/profile) |
| Brand-new user with **no** `user_details` | Insert may fail or store null details; Node should still decide product behavior |

**Node recommendation (document for implementers):**

1. **Parity mode:** replicate typo only if you must fail the same way (not recommended).
2. **Sane port (usual):** upsert with correct `exploring_details` value on both insert and update; match response messages. Call out the PHP bug in tests as “legacy insert broken.”

Do **not** silently also write `exploring_option` / `on_explore` “to be helpful.”

---

## How saved data is consumed (read-side context)

### `GET /wapi/people-list`

```text
peopleIds = json_decode(user_details.exploring_details) || []
selected rows = users WHERE id IN peopleIds  → split user_type 1 vs 2
suggestions  = random 10 of each type excluding peopleIds
```

So this POST is the **write side of the people-list hide/select picker**.

### `show_exploring` options 3 & 4

When `exploring_option` JSON includes:

| Option value | Meaning | Uses `exploring_details`? |
|--------------|---------|---------------------------|
| `1` | Hide from current companies | no (derived from still_working experiences) |
| `2` | Hide from coworkers | no (derived) |
| `3` | Hide from **selected companies** | **yes** — ids in details with `user_type=2` |
| `4` | Hide from **selected people** | **yes** — ids in details with `user_type=1` |

Empty / missing `exploring_option` → `show_exploring` returns **true** (show explore flags). That is independent of this endpoint.

---

## Common Node mistakes

| Mistake | Symptom |
|---------|---------|
| Porting full explore form (`on_explore`, salary, notice) | Wrong tables; FE “hide list” still empty |
| Body key `exploring_option` | Privacy options never update from this call |
| Body key `people` / `ids` | Field ignored; details null |
| Storing raw PHP array without JSON string | DB type mismatch; people-list decode fails |
| Double `JSON.stringify` of an already-string body | Nested JSON; decode yields string not array |
| Returning `{ status:true, data:{...} }` | Extra keys; missing exact `messages` |
| Message `"Success!"` / `"Record updated successfully"` without `!` | String mismatch vs PHP |
| Message `"Record not updated!"` (fixed grammar) | Failure toast mismatch |
| HTTP 404 when no user_details | PHP upserts / fails with 200 + status false |
| Requiring non-empty `exploring_details` | PHP allows clear-to-null |
| Only UPDATE never INSERT | First-time users never get a row (PHP tries insert, buggy) |

---

## Full common Node mistake matrix

| Mistake | Symptom |
|---------|---------|
| Trusting `api-ai-document` misc “save exploring preferences” block | Implements wrong columns |
| Confusing with `POST update-notice` | Notice fields move; hide list does not |
| Confusing with profile edit exploring block | `exploring_option` vs `exploring_details` |
| Assuming response includes saved ids | Success is messages-only |
| Treating `User not found!` as missing user row | It is empty `request.id`, not missing DB user |
| Filtering deleted users on write | PHP does not validate ids against `user` table |

---

## Minimal verification checklist

```bash
# Save hide list
curl -sS -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "exploring_details[]=101" \
  --data-urlencode "exploring_details[]=202" \
  "$BASE/wapi/employee/save-exploring" \
  | jq .

# Confirm DB (example)
# SELECT exploring_details FROM user_details WHERE user_id = <id>;
# expect: JSON array string containing 101,202

# Confirm people-list reflects selection
curl -sS -H "Authorization: Bearer $TOKEN" \
  "$BASE/wapi/people-list" \
  | jq '{status, selectedUsers:(.data.selectedUserList|length), selectedCos:(.data.selectedCompanyList|length)}'

# Clear list
curl -sS -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/wapi/employee/save-exploring" \
  | jq .
# exploring_details should become NULL (no body)
```

**Assert:**

1. Success body is **exactly** `{ status: true, messages: "Record updated successfully!" }` (no `data`).
2. Only `user_details.exploring_details` changes — not `user.on_explore` / notice / salary.
3. After save, `people-list` selected lists include those ids (when users exist).
4. Empty body nulls (or clears) details on update path.
5. Failure message spelling: **`Record not update!`**
6. Missing auth → 401 (filter), not business envelope.

---

## Quick port recipe (Node)

```text
// POST /wapi/employee/save-exploring
const userId = actingUserId(req); // request.id
if (!userId) {
  return { status: false, messages: "User not found!" };
}

const raw = req.body.exploring_details; // array preferred
const exploringDetails =
  raw !== undefined && raw !== null && !(Array.isArray(raw) && raw.length === 0) && raw !== ""
    ? JSON.stringify(raw)
    : null;
// Match PHP empty(): treat "", null, undefined, [], 0, false as NULL-ish as needed

const existing = await db.userDetails.findByUserId(userId);

let result;
if (existing) {
  result = await db.userDetails.update(
    { exploring_details: exploringDetails },
    { user_id: userId }
  );
} else {
  // Prefer correct column value (fix PHP $exploring_detail typo on insert)
  result = await db.userDetails.insert({
    user_id: userId,
    exploring_details: exploringDetails,
  });
}

if (result) {
  return { status: true, messages: "Record updated successfully!" };
}
return { status: false, messages: "Record not update!" };
```

---

## Related endpoints (do not confuse)

| Need | Call | Not this |
|------|------|----------|
| Save **who to hide** (ids) | `POST employee/save-exploring` | — |
| Save **privacy option codes** 1–4 | profile edit / signup exploring fields → `exploring_option` | this route |
| Toggle explore / immediate / notice | profile edit multi-step | this route |
| Notice date + employments | `POST /wapi/update-notice` | this route |
| UI picker for ids | `GET /wapi/people-list` | write via save-exploring |
| Viewer sees explore badge? | `show_exploring` (read-time) | not a write API |
| Employee home | `GET employee/dashboard` | `debug/employee-dashboard-endpoint.md` |

---

## Response key freeze (frontend)

```
status
messages
```

Exact success message:

```
Record updated successfully!
```

Exact write-failure message:

```
Record not update!
```

Exact missing-id message:

```
User not found!
```

---

## Side-by-side: docs vs PHP

| Claim in `api-ai-document/employee-misc-endpoints.md` | Actual PHP |
|------------------------------------------------------|------------|
| Updates `user.on_explore = 1` | Does not touch `user` |
| Fields: exploring_option, on_immediate, on_notice, notice_*, salary | **Only** `exploring_details` |
| Success `"Success!"` | **`"Record updated successfully!"`** |
| Failure `"Access denied"` | **`"Record not update!"` / `"User not found!"` / exception |

Trust **this** guide for the Node port.

---

*Generated from PHP source in this repo (`IndividualApi::save_exploring` ~6874). When PHP and `api-ai-document/employee-misc-endpoints.md` disagree, trust this debug guide and the controller lines cited above.*
