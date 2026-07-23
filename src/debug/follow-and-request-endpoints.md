# Debug Guide — Follow / Unfollow / View-Request Multi Ops (Node)

**Purpose:** Contract source-of-truth for debugging the Node.js CollarCheck API against the legacy PHP (CodeIgniter 4) behaviour. Frontend depends on these response keys and message strings — **do not rename keys**.

**Project stack:** Express + Drizzle (MySQL) · base path `/wapi` · JWT via `Authorization: Bearer <token>`

**Node source files (authoritative for this repo):**

| Layer | Files |
|-------|--------|
| Routes | `src/routes/general.route.ts`, `src/routes/root.route.ts` |
| Controllers | `src/controllers/general.controller.ts`, `src/controllers/job-dashboard.controller.ts` |
| Services | `src/services/general.service.ts`, `src/services/job-dashboard.service.ts` |
| Repository | `src/repositery/general.repositery.ts`, `src/repositery/job-dashboard.repositery.ts` |
| Types / Zod | `src/types/general.types.ts`, `src/types/job-dashboard.types.ts` |
| Schema | `src/db/schema.ts` → `cybFollow` (`cyb_follow`), `cybUserProfileViewRequest` |
| Auth | `src/middlewares/Authorization.ts` |

**Base path:** `/wapi`  
**Auth:** `Authorization: Bearer <jwt>` on all endpoints below  
**Acting user:** JWT → `req.auth.id` / `req.auth.user_id`. With `X-Company: {companyId}`, acting id becomes company (`req.auth.id`); original JWT user stays `req.auth.user_id`.

> Follow mutations must use **`req.auth.id`** (acting user), not only `user_id`.

---

## Global envelope (must match)

| Case | HTTP | Body shape |
|------|------|------------|
| Success / business error (almost everything) | **200** | `{ "status": boolean, "messages": string, "data"?: ... }` |
| Company menu permission denied (`followDataList` only, if enforced) | **403** | `{ "status": false, "message": string }` ← key is **`message`**, not `messages` |
| Auth fail | **401** | filter-dependent |
| Zod validation fail | **400** | `{ "error": "Invalid data", "details": [...] }` (Node middleware) |

- Key is almost always **`messages`** (plural).
- **`data` is omitted** on all mutation endpoints (follow/unfollow/accept/reject/multi-*). Only `followDataList` returns `data`.
- Do **not** invent REST 400/404 for business failures when matching PHP — return HTTP 200 + `status: false` from the service.

---

## CRITICAL: inverted `follow` table naming

PHP (and this Node port) column names do **not** match English “follower/following”.

| DB column (Drizzle field) | Real meaning |
|---------------------------|--------------|
| `followed_id` (`followedId`) | User who **initiated** the follow (clicked Follow) |
| `follower_id` (`followerId`) | User who is **being followed** (profile target) |

### When A clicks Follow on B’s profile

```
POST /wapi/general/follow
Authorization: Bearer <A's token>
Body: { "follower_id": <B's user id> }
```

Inserts:

| Column | Value |
|--------|-------|
| `followed_id` | **A** (`req.auth.id`) |
| `follower_id` | **B** (body `follower_id`) |
| `status` | `0` if B is employee (`user_type==1`); **`1` auto-accept** if B is company (`user_type==2`) |
| `is_deleted` | `0` |
| `create_date` / `modify_date` | now |

Counts (UI English is correct even though DB columns are inverted):

| JSON key | SQL condition | Meaning for UI |
|----------|---------------|----------------|
| `follower` | `follower_id = me AND status=1 AND is_deleted=0` | How many people **follow me** |
| `following` | `followed_id = me AND status=1 AND is_deleted=0` | How many people **I follow** |

After A follows B (`followed_id=A`, `follower_id=B`): **A.`following`++**, **B.`follower`++**.

> **Bug magnet #1:** treating `follower_id` as “who clicked follow”. Wrong. Body field is named `follower_id` but stores the **target**.

> **Bug magnet #2:** body key `followed_id` for `POST follow`. **Wrong.** Body key is **`follower_id` only**.

### Mental map for mutations

| Action | Acting user (`req.auth.id`) role in row | Path/body IDs |
|--------|----------------------------------------|---------------|
| `follow` | becomes `followed_id` | body `follower_id` = target user |
| `unfollow` | is `followed_id` | path id = target (`follower_id` in row) |
| `removeFollower` | is `follower_id` | path id = initiator (`followed_id` in row) |
| `acceptfollow` / `rejectfollow` | must be row’s `follower_id` | path id = **`follow.id`** (PK), not user id |
| `multi_unfollow` | is `followed_id` | body `id[]` = target user ids |
| `multi_remove_follower` | is `follower_id` | body `id[]` = initiator user ids |
| `multi_acceptfollow` / `multi_rejectfollow` | must be each row’s `follower_id` | body `id[]` = **`follow.id` PKs** |

### Node implementation helpers

```ts
// general.repositery.ts
findFollowRelationship(initiatorId, targetId, requireApproved?)
// → followed_id = initiatorId, follower_id = targetId

// general.service.ts — POST follow insert
createFollow({ followedId: me, followerId: target, status })
```

---

## Routes summary

| # | Method | Route | Node handler | Success `messages` | Has `data`? |
|---|--------|-------|--------------|--------------------|-------------|
| 1 | POST | `/wapi/general/follow` | `follow` → `followUserService` | `Request Send successfully!` | No |
| 2 | GET | `/wapi/general/followDataList` | `followDataListGeneral` → `followDataListGeneralService` | `Follow Data List` | **Yes** |
| 2b | GET | `/wapi/general/company-followDataList` | same as #2 | `Follow Data List` | **Yes** |
| 3 | DELETE | `/wapi/general/unfollow/:id` | `unfollow` → `unfollowService` | `Unfollowed Successfully!` | No |
| 4 | DELETE | `/wapi/general/removeFollower/:id` | `removeFollower` → `removeFollowerService` | `Unfollowed Successfully!` | No |
| 5 | PUT | `/wapi/general/acceptfollow/:id` | `acceptFollow` → `acceptFollowService` | `followed Successfully!` | No |
| 6 | DELETE | `/wapi/general/rejectfollow/:id` | `rejectFollow` → `rejectFollowService` | `Reject Successfully!` | No |
| 7 | POST | `/wapi/general/multi-remove-follower` | `multiRemoveFollower` | `Unfollowed Successfully!` | No |
| 8 | POST | `/wapi/multi-unfollow` | `multiUnfollow` (root route) | `Unfollowed Successfully!` | No |
| 9 | POST | `/wapi/multi-acceptfollow` | `multiAcceptFollow` (root) | `followed Successfully!` | No |
| 10 | POST | `/wapi/multi-deleteViewRequest` | `multiDeleteViewRequest` (root) | `Delete Successfully!` | No |
| 11 | POST | `/wapi/multi-rejectfollow` | `multiRejectFollow` (root) | `Reject Successfully!` | No |
| 12 | POST | `/wapi/multi-approvedVeiwRequest` | `multiApprovedVeiwRequest` (root) | `Approved successfully!` | No |

Spellings that must stay exact (including typos/casing):

- `Request Send successfully!` (not “Sent”)
- `followed Successfully!` (lowercase f)
- `Unfollowed Successfully!`
- `Reject Successfully!`
- `Delete Successfully!` / `Delete unsuccessfully!`
- `Approved successfully!`
- Route: `multi-approvedVeiwRequest` (**Veiw**, not View)
- Route: `multi-remove-follower` (under `general/`) vs `multi-unfollow` (root `/wapi`, no `general/`)

---

# 1. POST `/wapi/general/follow`

**Node:** `general.route.ts` → `follow` → `followUserService`  
**Zod:** `followSchema` — body `{ follower_id: number }`

### Request

```json
{ "follower_id": 200 }
```

### Logic checklist

1. `followed_id = req.auth.id` (acting user)
2. Body `follower_id` required
3. Load target user; missing → `"Invalid Follwer Id"` (**typo preserved**)
4. Existing row `followed_id=me`, `follower_id=target`, `is_deleted=0` → `"Already Followed"`
5. Insert: company target (`user_type==2`) → `status=1`; else `status=0`
6. Side effects (notification/SQS) optional; must not change response body

### Success (HTTP 200)

```json
{ "status": true, "messages": "Request Send successfully!" }
```

### Errors (HTTP 200)

| Condition | Body |
|-----------|------|
| Validation | `{ "status": false, "messages": "The follower id field is required." }` |
| Target not found | `{ "status": false, "messages": "Invalid Follwer Id" }` |
| Already exists | `{ "status": false, "messages": "Already Followed" }` |
| Insert failed | `{ "status": false, "messages": "Request not Send please retry!" }` |

---

# 2. GET `/wapi/general/followDataList`

**Node:** `followDataListGeneral` → `followDataListGeneralService`  
**Alias:** `GET /wapi/general/company-followDataList` (same handler)  
**Zod:** `followDataListGeneralQuerySchema`

### Query params

| Param | Default | Meaning |
|-------|---------|---------|
| `limit` | `50` | page size |
| `offset` | `0` | **page number**, not SQL offset |

```
page = query.offset || 0
limit = query.limit || 50
sqlOffset = (page <= 1) ? 0 : (page * limit - limit)
```

### Success (HTTP 200)

```json
{
  "status": true,
  "messages": "Follow Data List",
  "data": {
    "followerList": [ /* card objects */ ],
    "followerCount": 12,
    "followingList": [ /* card objects */ ],
    "followingCount": 5
  }
}
```

### SQL semantics (do not “fix”)

**Follower list** (`getFollowerList`):

```sql
SELECT fl.*, ur...., ur.id AS user_id
FROM cyb_follow fl
JOIN cyb_user ur ON fl.followed_id = ur.id
WHERE fl.follower_id = :userId
  AND fl.status = 1
  AND fl.is_deleted = 0
  AND ur.is_deleted = 0
ORDER BY fl.id DESC
```

**Following list** (`getFollowingList`):

```sql
SELECT fl.*, ur...., ur.id AS user_id
FROM cyb_follow fl
JOIN cyb_user ur ON fl.follower_id = ur.id
WHERE fl.followed_id = :userId
  AND fl.status = 1
  AND fl.is_deleted = 0
  AND ur.is_deleted = 0
ORDER BY fl.id DESC
```

### Card object — **LOCKED KEYS**

Shared:

| Key | Type | Notes |
|-----|------|-------|
| `id` | number | **`follow.id`** (row PK), not user id |
| `individual_id` | string/null | |
| `name` | string | employee: `fname + ' ' + lname`; company: `fname` only |
| `profile` | string/null | `S3_PREFIX + profile` if profile else `social_image` |
| `slug` | string | |
| `user_type` | number | `1` employee, `2` company |
| `user_id` | number | other user’s id |
| `is_verified` | boolean | `user_verified(user_id)` |
| `state_name` / `country_name` | string/null | |
| `followBack` | boolean | both directions exist (any status/is_deleted) |
| `create_date` / `notice_date` | string/null | |

Employee (`user_type==1`) also: `designation_name`, `on_explore`, `on_immediate`, `on_notice`  
Company (`user_type==2`) also: `industry_name`, `exploreTalent`

### `followBack`

```js
exists(follower_id=me, followed_id=remote)
AND exists(followed_id=me, follower_id=remote)
// PHP does NOT filter is_deleted/status here
```

---

# 3. DELETE `/wapi/general/unfollow/:id`

**Meaning:** Acting user stops following target (`:id`).

| Param | DB role |
|-------|---------|
| `:id` | target user id (`follow.follower_id`) |

Acting user = `followed_id`. Requires **`status=1`**.

### Success

```json
{ "status": true, "messages": "Unfollowed Successfully!" }
```

### Errors

- `"Id Required"`
- `"you can't unfollow you are not following yet!"`
- `"Something went wrong!"`

---

# 4. DELETE `/wapi/general/removeFollower/:id`

**Meaning:** Remove someone who follows you (or has a non-deleted row toward you).

| Param | DB role |
|-------|---------|
| `:id` | initiator user id (`follow.followed_id`) |

Acting user = `follower_id`. **No status filter.**

### Success

```json
{ "status": true, "messages": "Unfollowed Successfully!" }
```

### Errors

- `"Id Required"`
- `"you can't unfollow you are not follower yet!"`
- `"Something went wrong!"`

---

# 5. PUT `/wapi/general/acceptfollow/:id`

**Path `:id`:** **`follow.id` (PK)**, never user id.

Ownership: row’s `follower_id === req.auth.id` (you are the target of the request).

### Success

```json
{ "status": true, "messages": "followed Successfully!" }
```

### Errors

- `"Invalid Id"`
- `"Invalid request!"`
- `"Something went wrong!"`

---

# 6. DELETE `/wapi/general/rejectfollow/:id`

**Path `:id`:** **`follow.id` PK**. Soft-delete (`is_deleted=1`).

### Success

```json
{ "status": true, "messages": "Reject Successfully!" }
```

### Errors

- `"Invalid Id"`
- `"Invalid Reject request !"` (space before `!`)
- `"Something went wrong!"`

---

# 7. POST `/wapi/general/multi-remove-follower`

```json
{ "id": [101, 102, 103] }
```

Each id = initiator (`followed_id`). Acting user = `follower_id`. First invalid aborts.

### Success

```json
{ "status": true, "messages": "Unfollowed Successfully!" }
```

---

# 8. POST `/wapi/multi-unfollow`

**Route is root** `/wapi/multi-unfollow` — **not** under `general/`.

```json
{ "id": [200, 201] }
```

Each id = target (`follower_id`). Acting user = `followed_id`.  
**No `status=1` filter** (unlike single `unfollow`).

### Subtle single vs multi

| Endpoint | Requires `status=1`? |
|----------|----------------------|
| `DELETE unfollow/:id` | **Yes** |
| `POST multi-unfollow` | **No** |

---

# 9. POST `/wapi/multi-acceptfollow`

```json
{ "id": [12, 15, 18] }
```

`id[]` = **`follow.id` PKs**. Empty → `"id Required!"`.

---

# 10. POST `/wapi/multi-deleteViewRequest`

**Table:** `cyb_user_profile_view_request` (not `follow`)

```json
{ "id": [3, 4] }
```

Rows must be owned by acting user (`userid=me`). Soft-delete.

### Success

```json
{ "status": true, "messages": "Delete Successfully!" }
```

### Errors

- `"Access Denied!"` (user missing)
- `"id Required!"`
- `"Invalid delete id!"`
- `"Something went wrong!"`

---

# 11. POST `/wapi/multi-rejectfollow`

```json
{ "id": [12, 15] }
```

`id[]` = **`follow.id` PKs**. Soft-delete each. Same ownership as single reject.

---

# 12. POST `/wapi/multi-approvedVeiwRequest`

**Route spelling `Veiw`.** Body is a **single** id (not array).

```json
{
  "id": 77,
  "access": { "salary": 1, "email": 1 },
  "day": 7
}
```

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `id` | yes | — | `user_profile_view_request.id` |
| `access` | no | default array | JSON-stringified into DB |
| `day` | no | `1` | days until `expiry` |

**Toggle status:** `0 → 1`, `1 → 0` (legacy toggle, not pure approve).

### Success

```json
{ "status": true, "messages": "Approved successfully!" }
```

---

## Side-effect matrix (response-safe)

Side effects must **not** alter the JSON contract.

| Endpoint | Notification / SQS |
|----------|--------------------|
| `follow` / `acceptfollow` / `rejectfollow` | optional in Node |
| `multi_acceptfollow` | optional per id |
| `multi_rejectfollow` | none required |
| `multi_approvedVeiwRequest` | optional |
| unfollow / remove / multi remove / multi unfollow | none |
| `followDataList` / `multi_deleteViewRequest` | none |

---

## Debug checklist when “API gives wrong answer”

1. **Diff response keys**, not only status codes:
   - `messages` vs `message`
   - `followerList` / `followingList` / `followerCount` / `followingCount`
   - mutation responses must **omit** `data`
2. **Confirm body field names** against this file (`follower_id` for follow; `id` arrays for multi-*).
3. **Confirm ID kind**:
   - user id → follow / unfollow / removeFollower / multi-unfollow / multi-remove-follower
   - `follow.id` PK → accept / reject / multi-accept / multi-reject
   - `user_profile_view_request.id` → multi-deleteViewRequest / multi-approvedVeiwRequest
4. **Confirm column direction** using the inverted naming table at the top.
5. **Compare exact message strings** (typos included: `Follwer`, `Veiw`, `Request Send`, `followed Successfully!`).
6. **Pagination:** query param named `offset` is page number.
7. **Card `id`:** must be follow PK so accept/reject keep working from the same list UI.
8. **Acting user:** use `req.auth.id` (honours `X-Company`).

---

## Quick curl fixtures

```bash
# Follow user 200 as me
curl -X POST "$BASE/wapi/general/follow" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"follower_id":200}'

# Lists
curl "$BASE/wapi/general/followDataList?limit=50&offset=1" \
  -H "Authorization: Bearer $TOKEN"

# Unfollow target 200
curl -X DELETE "$BASE/wapi/general/unfollow/200" \
  -H "Authorization: Bearer $TOKEN"

# Remove follower initiator 55
curl -X DELETE "$BASE/wapi/general/removeFollower/55" \
  -H "Authorization: Bearer $TOKEN"

# Accept follow row PK 991
curl -X PUT "$BASE/wapi/general/acceptfollow/991" \
  -H "Authorization: Bearer $TOKEN"

# Reject follow row PK 991
curl -X DELETE "$BASE/wapi/general/rejectfollow/991" \
  -H "Authorization: Bearer $TOKEN"

# Multi unfollow targets
curl -X POST "$BASE/wapi/multi-unfollow" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":[200,201]}'

# Multi remove followers (initiators)
curl -X POST "$BASE/wapi/general/multi-remove-follower" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":[55,56]}'

# Multi accept / reject by follow PKs
curl -X POST "$BASE/wapi/multi-acceptfollow" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":[991,992]}'

curl -X POST "$BASE/wapi/multi-rejectfollow" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":[991]}'

# View request multi-delete / approve
curl -X POST "$BASE/wapi/multi-deleteViewRequest" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":[3,4]}'

curl -X POST "$BASE/wapi/multi-approvedVeiwRequest" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":77,"access":{"salary":1},"day":7}'
```

---

## Fixes applied in Node (this debug pass)

| Bug | Symptom | Fix |
|-----|---------|-----|
| `POST follow` stored English columns (`followed_id=target`) | Lists/counts inverted; accept ownership fails | Insert `followed_id=me`, `follower_id=target` |
| accept/reject checked `followedId === me` | Always `"Invalid request!"` for real PHP rows | Check `followerId === me` |
| `followDataList` wrong keys (`followers` vs `followerList`) | FE list blank | Locked keys + card shape |
| multi body `user_ids` instead of `id` | FE 400 / empty | Zod schemas use `id` |
| Mutations returned `{ data: {...} }` + soft messages | Toast/key mismatch | Return `{ status, messages }` only |
| Controllers used `user_id` not acting `id` | Company context wrong | Use `req.auth.id` |
| Count helpers used English direction | Bad follower/following badges | Aligned with PHP inverted SQL |
| multi-approved double-stringified `access` | FE parse issues | Single `JSON.stringify` of body access |

---

## Related API docs (index)

- Project overview: `src/api-ai-document/README.md`
- Misc CRUD table (includes follow): `src/api-ai-document/remaining-misc-crud-endpoints.md`
- General half-doc (older invented shapes — **prefer this debug file**): `src/api-ai-document/general/half-of-next-general-api.md`

---

## Response key freeze (frontend)

Do not rename without a coordinated FE change:

**Envelope:** `status`, `messages`, `message` (403 only), `data`

**`followDataList` data:**  
`followerList`, `followerCount`, `followingList`, `followingCount`

**List card:**  
`id`, `individual_id`, `name`, `profile`, `slug`, `user_type`, `user_id`, `is_verified`, `state_name`, `country_name`, `followBack`, `create_date`, `notice_date`,  
+ employee: `designation_name`, `on_explore`, `on_immediate`, `on_notice`  
+ company: `industry_name`, `exploreTalent`

**All mutations in this group:** only `status` + `messages` (no `data`, no counts, no ids echoed).
