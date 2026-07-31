
# Debug Guide — company-list & general/all-notification

**Purpose:** Contract source-of-truth for debugging a Node.js reimplementation against the legacy CodeIgniter 4 API. Frontend already depends on these response keys and message strings — **do not rename keys**.

**Authoritative source:** PHP controllers/models below (prefer this file over summary tables in `api-ai-document/` when they conflict).

## Node implementation map (shipped)

| Layer | company-list | all-notification |
|-------|--------------|------------------|
| Routes | `src/routes/root.route.ts` — `GET /company-list` | `src/routes/general.route.ts` — `GET /all-notification` |
| Controllers | `company-employee-request.controller.ts` — `companyList` | `general.controller.ts` — `allNotification` |
| Services | `company-employee-request.service.ts` — `companyListService` | `general.service.ts` — `allNotificationService` |
| Repositery | `company-employee-request.repositery.ts` | `general.repositery.ts` |
| Types | `general.types.ts` — `companyListRootQuerySchema` | none (no query) |
| Node docs | `remaining-misc-crud-endpoints.md` §6 | `general/half-of-next-general-api.md` §4 |

| Route | Auth | Node handler | What it returns |
|-------|------|--------------|-----------------|
| `GET /wapi/company-list` | **JWT** | `companyList` → `companyListService(req.auth.id, …)` | Companies the **logged-in user** is related to (`user_relation`), with verification/follow/role widgets |
| `GET /wapi/general/all-notification` | **JWT** | `allNotification` → `allNotificationService(req.auth.id, token)` | Notification feed for **user + all linked companies**, minus cleared ids, plus unread + message counts |

**Source files:**
- `app/Controllers/CompanyApi.php` — `company_list` (~6451), `check_company_status` (~6629)
- `app/Controllers/GeneralApi.php` — `allNotification` (~1707), `message_count` (~1821)
- `app/Models/CompanyModel.php` — `get_company_relation_by_user`, `get_user_company_basic_details`, `get_user_group`, `get_company_by_user`
- `app/Models/UserModel.php` — `user_verified`, `get_total_follower_count`, `get_check_follow_status`, `get_all_merge_company_id`, `get_all_notification`
- `app/Libraries/traits/ExploringTrait.php` — `show_exploring` (notification sender flags)
- `app/Models/MainModel.php` / `CommonModel` — `fs`, `all_fetch`
- Related clear: `app/Controllers/module/NotificationController.php` — `clearAllNotification`
- Routes: `app/Config/Routes.php` — `company-list` (~211), `general/all-notification` (~277)

**Base path:** `/wapi`  
**Auth:** `Authorization: Bearer <jwt>` on both  
**Acting user:** `$this->request->id` (JWT user; `X-Company` replaces acting id if sent)

**Shared concepts (do not confuse):**

| Concern | company-list | all-notification |
|---------|--------------|------------------|
| `user_relation` | List of companies for switcher | Company ids merged into notification receivers |
| Success `messages` | `"Company list"` | `"Notification List"` |
| Empty `data` | **`[]`** (array) | object with empty `notification: []` |
| Pagination | `limit`/`offset` only for nested employees | **none** |

---

## Global envelope (both)

| Case | HTTP | company-list | all-notification |
|------|------|--------------|------------------|
| Success | **200** | `{ status, messages, data }` | `{ status, messages, data }` |
| Exception | **200** | `messages: <exception>` | `messages: "Access denied"` |
| Auth fail | **401** | filter-dependent | filter-dependent |

- Key is always **`messages`** (plural).
- Exact success strings differ (see table above).

---

## Auth / identity (both)

```text
JWT → user row
If header X-Company present and company valid:
  request.id = company.id
  request.user_id = JWT user.id
Else:
  request.id = request.user_id = JWT user
```

Both endpoints key off **`request.id`**.  
`all-notification` also seeds receivers from `user_relation` for that same id.

---

# 1. GET `/wapi/company-list`

**Handler:** `CompanyApi::company_list` (~6451)  
**Auth:** JWT  
**Path note:** `/wapi/company-list` — **not** `/wapi/company/company-list`  
**Return style:** `$this->response->setJSON($response)`

### Query params

| Param | Required | Default | Meaning |
|-------|----------|---------|---------|
| `limit` | no | **16** | Page size for nested `user_details` only |
| `offset` | no | **0** | **Page number** for nested employees (not SQL offset) |

```text
limit  = get('limit')  ?: 16
page   = get('offset') ?: 0
sqlOffset = (page <= 1) ? 0 : (page * limit - limit)
```

| Query | Nested employees SQL offset |
|-------|-----------------------------|
| `?limit=16&offset=1` | 0 |
| `?limit=16&offset=2` | 16 |
| `?limit=16&offset=0` | 0 |

```
GET /wapi/company-list
GET /wapi/company-list?limit=16&offset=1
```

> **Node bug magnet #1:** Empty result shape. After PHP resets `$allCompany = []`, if the user has **no** relations, `data` is **`[]`** (array), **not** `{ "myCompany": [] }`. When there is at least one company, `data` is `{ "myCompany": [ ... ] }`.

> **Node bug magnet #2:** Treating `limit`/`offset` as pagination of the **company list**. They only paginate nested **`user_details`**. Company list itself is **all** relations, unpaginated.

Intended for **employees / multi-company switcher** (people linked into companies), not “search all companies.”

### Logic (debug checklist)

```text
1. user = request.id
2. filter.limit / filter.offset (page math above)  // nested users only

3. companyList = get_company_relation_by_user(user)
   // user_relation: user_id=user, is_deleted=0, GROUP BY company_id, ORDER BY id DESC
   // rows: { company_id, status }

4. allCompany = []   // note: earlier myCompany=[] is overwritten

5. FOR each relation comp in companyList:
     details = get_user_company_basic_details(comp.company_id)
     IF details empty → skip

     // Super admin?
     checkrole = user_permission WHERE user_id=user, added_by=company_id, is_deleted=0
     isSuperAdmin = false
     IF checkrole.group_id:
       checkgroup = user_group WHERE id=group_id, is_deleted=0
       isSuperAdmin = (checkgroup.id == 1)

     Build smarray (see LOCKED keys)

     is_verified = user_verified(company_id)
     followData  = get_total_follower_count(company_id)  // { following, follower }

     follow = get_check_follow_status(user, company_id)
       // followed_id=user, follower_id=company  → "did I follow this company?"
     IF follow:
       following = { requestSend: true, requestApproved: (follow.status==1) }
     ELSE:
       following = { requestSend: false, requestApproved: false }

     exploreTalent = exists company_job (company, status=1, is_deleted=0) ? 1 : 0

     user_group = get_user_group(company_id, user) or []
     user_details = get_company_by_user(company_id, filter)  // limited list
     user_count   = get_company_by_user(company_id)          // COUNT as string

     account_deletion = exists account_delete_requests
       (user_id=company, status=1, is_deleted=0)

     currentStatus = check_company_status(company_id)
     isSuperAdmin = isSuperAdmin

     allCompany.myCompany[] = smarray

6. Return { status:true, messages:"Company list", data: allCompany }
```

### SQL: relations

```sql
SELECT ur.company_id, ur.status
FROM user_relation AS ur
WHERE ur.is_deleted = 0
  AND ur.user_id = :userId
GROUP BY ur.company_id
ORDER BY ur.id DESC;
```

> No filter on relation `status` in the list query — inactive relations still appear; **`status` on the card is relation status** (`comp->status`), not company account status.

### SQL: company card basics

```sql
SELECT
  ur.id, ur.individual_id, ur.claim_status,
  ur.fname AS company_name, ur.fname, ur.lname,
  ur.profile, ur.social_image, ur.slug,
  dg.name AS designation_name,
  cty.name AS city_name, st.name AS state_name, ctry.name AS country_name,
  cs.name AS company_size_name, ind.name AS industry_name, tr.name AS turnover_name
FROM user AS ur
LEFT JOIN cities cty ON ur.city = cty.id
LEFT JOIN state st ON ur.state = st.id
LEFT JOIN country ctry ON ur.country = ctry.id
LEFT JOIN company_size cs ON ur.company_size = cs.id
LEFT JOIN industries ind ON ur.industry = ind.id
LEFT JOIN turnover tr ON ur.turnover = tr.id
LEFT JOIN designation dg ON ur.current_possition = dg.id
WHERE ur.is_deleted = 0 AND ur.id = :companyId;
```

### SQL: nested current employees (`user_details` + `user_count`)

```sql
-- list mode (limit present)
SELECT DISTINCT ue.user AS user
FROM user_experience AS ue
INNER JOIN user AS ur ON ur.id = ue.user
WHERE ue.approved = 1
  AND ue.status = 1
  AND ue.still_working = 1
  AND ue.is_deleted = 0
  AND ue.company = :companyId
  AND ur.status = 1
  AND ur.is_deleted = 0
LIMIT :limit OFFSET :sqlOffset;
-- then map each via get_user_company_basic_details → employee card

-- count mode (no filter)
SELECT COUNT(DISTINCT ue.user) AS total
FROM user_experience AS ue
INNER JOIN user AS ur ON ur.id = ue.user
WHERE /* same filters */;
-- returned as STRING e.g. "4"
```

> **Not** collaborators from `user_relation`. Nested list is **approved still-working experiences**.

### Nested `user_details[]` item — **LOCKED**

| Key | Source |
|-----|--------|
| `id` | employee user id |
| `individual_id` | |
| `name` | `fname + ' ' + lname` |
| `profile` | S3+profile or social_image |
| `slug` | |
| `designation` | designation name |
| `city` / `state` / `country` | geo names |

Duplicates de-duped by `id` after map.

### SQL: follow check (acting user → company)

```sql
SELECT fl.*, ...
FROM follow AS fl
LEFT JOIN user ur ON fl.follower_id = ur.id
WHERE fl.followed_id = :actingUserId   -- initiator
  AND fl.follower_id = :companyId      -- target company
  AND fl.is_deleted = 0;
```

Inverted column semantics: **acting user followed company**.

### SQL: follower totals on company

```text
following = COUNT follow WHERE followed_id = company AND status=1 AND is_deleted=0
            // people/companies the company followed
follower  = COUNT follow WHERE follower_id = company AND status=1 AND is_deleted=0
            // who follow the company
→ { following, follower }
```

### `user_group` shape (PHP raw)

`get_user_group` returns **array of assoc rows**:

```json
[
  { "group_id": "3", "group_name": "HR Manager" }
]
```

| Key | Notes |
|-----|-------|
| `group_id` | from `user_permission.group_id` / join |
| `group_name` | from `user_main_group.name` (via `cyb_user_group` → `cyb_user_main_group` in source) |

Empty → **`[]`**.

> **Node bug magnet #3:** Mapping groups to `{ id, name }` as in some `api-ai-document` samples. Live keys are **`group_id` / `group_name`**.

### Super admin flag

```text
user_permission (user_id=me, added_by=company, is_deleted=0)
→ group_id
user_group where id=group_id, is_deleted=0
isSuperAdmin = (that row's id == 1)
```

### `currentStatus` — `check_company_status`

| Value | Condition | FE intent (comments in PHP) |
|-------|-----------|-----------------------------|
| **1** | `user_verified` **and** GST doc (`verify_document` verify=1) | Manage company; hide pending/verify |
| **2** | Manual doc pending (`manual_document_verify` status=1) **and** no GST | Pending + verify button; manage deactive |
| **3** | GST ok **and** not fully `user_verified` | Manage company; hide verify |
| **4** | else | Pending + verify button |

```sql
-- gst_verify
SELECT * FROM verify_document WHERE user_id = :companyId AND verify = 1 LIMIT 1;

-- manual
SELECT * FROM manual_document_verify
WHERE user_id = :companyId AND status = 1 AND is_deleted = 0 LIMIT 1;
```

Plus `UserModel::user_verified($companyId)` (shared helper).

### Success — **LOCKED KEYS** (non-empty)

```json
{
  "status": true,
  "messages": "Company list",
  "data": {
    "myCompany": [
      {
        "id": 10,
        "individual_id": "CC10",
        "profile": "https://s3.example.com/logo.png",
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
          { "group_id": "1", "group_name": "Super Admin" }
        ],
        "user_details": [
          {
            "id": 55,
            "individual_id": "CC55",
            "name": "Jane Doe",
            "profile": "https://s3.example.com/p.jpg",
            "slug": "jane-doe",
            "designation": "Engineer",
            "city": "Mumbai",
            "state": "Maharashtra",
            "country": "India"
          }
        ],
        "user_count": "4",
        "account_deletion": false,
        "currentStatus": 1,
        "isSuperAdmin": false
      }
    ]
  }
}
```

| Key | Type | Notes |
|-----|------|-------|
| `messages` | string | exact **`"Company list"`** |
| `data.myCompany` | array | only when ≥1 relation with resolvable company |
| `status` (card) | number | **relation** status |
| `name` | string | company `fname` |
| `is_verified` | bool | `user_verified` |
| `followData` | object | `{ following, follower }` counts |
| `following` | object | **only** `requestSend`, `requestApproved` booleans |
| `exploreTalent` | 0\|1 | any active job |
| `user_group` | array | `{ group_id, group_name }` or `[]` |
| `user_details` | array | paginated current employees |
| `user_count` | **string** | total distinct current employees |
| `account_deletion` | bool | open delete request on company |
| `currentStatus` | 1–4 | verification UI state |
| `isSuperAdmin` | bool | permission group id == 1 |

### Empty success

```json
{
  "status": true,
  "messages": "Company list",
  "data": []
}
```

### Exception

```json
{
  "status": false,
  "messages": "<exception message>"
}
```

### Quick port recipe (Node) — company-list

```text
// GET /wapi/company-list
const userId = actingUserId(req);
const limit = Number(req.query.limit || 16);
const page = Number(req.query.offset || 0);
const sqlOffset = page <= 1 ? 0 : page * limit - limit;

const relations = await companyRelations(userId);
const data = {};

for (const rel of relations) {
  const c = await companyBasic(rel.company_id);
  if (!c) continue;

  const follow = await followRow(userId /*followed*/, c.id /*follower target*/);
  const card = {
    id: c.id,
    individual_id: c.individual_id,
    profile: c.profile ? S3 + c.profile : c.social_image,
    name: c.fname,
    city_name: c.city_name,
    state_name: c.state_name,
    claim_status: c.claim_status,
    country_name: c.country_name,
    status: rel.status,
    slug: c.slug,
    company_size_name: c.company_size_name,
    industry_name: c.industry_name,
    is_verified: await userVerified(c.id),
    followData: await followerCounts(c.id),
    following: follow
      ? { requestSend: true, requestApproved: follow.status === 1 }
      : { requestSend: false, requestApproved: false },
    exploreTalent: (await hasActiveJob(c.id)) ? 1 : 0,
    user_group: (await userGroups(c.id, userId)) || [],
    user_details: await currentEmployees(c.id, { limit, offset: sqlOffset }),
    user_count: String(await currentEmployeeCount(c.id)),
    account_deletion: await hasDeleteRequest(c.id),
    currentStatus: await checkCompanyStatus(c.id),
    isSuperAdmin: await isSuperAdmin(userId, c.id),
  };
  (data.myCompany ??= []).push(card);
}

return {
  status: true,
  messages: "Company list",
  data: data.myCompany ? data : [],
};
```

---

# 2. GET `/wapi/general/all-notification`

**Handler:** `GeneralApi::allNotification` (~1707)  
**Auth:** JWT  
**Return style:** `json_encode($response)`

### Query / body params

| Param | Effect |
|-------|--------|
| `company` | **None** (read in PHP, then ignored) |
| limit / offset | **None** — full list, no pagination |

```
GET /wapi/general/all-notification
Authorization: Bearer <jwt>
```

> **Node bug magnet #4:** Returning `data: [ ...notifications ]` as in `api-ai-document`. PHP returns an **object**:
>
> ```json
> {
>   "notificationcount": 3,
>   "notification": [ ... ],
>   "messagecount": 5
> }
> ```

> **Node bug magnet #5:** Success message `"success"`. Locked string is **`"Notification List"`**.

### Logic (debug checklist)

```text
1. user = request.id
2. ids = [user]
3. companies = get_all_merge_company_id(user)
   // user_relation.user_id = user, join user company is_deleted=0
   // append company_id values to ids

4. rows = get_all_notification(ids)
   // notifications WHERE is_deleted=0 AND receiver IN ids
   // ORDER BY create_date DESC
   // join sender + receiver users

5. cleared = all_fetch('cyb_clear_notification', { user_id: user, is_deleted: 0 })
   clearIds = column notification_id
   rows = filter out rows whose id ∈ clearIds

6. notificationcount = 0
   data_array = []
   FOR each val in rows:
     detail = map notification card (LOCKED keys)
     IF sender.user_type == 2:
       detail.exploreTalent = has active job ? 1 : 0
     ELSE:
       detail.on_explore = gated via show_exploring(sender, user)
       detail.on_immediate / on_notice only if on_explore==1 else 0
     detail.isAccess = true   // always (relation check commented out)
     data_array.push(detail)
     IF val.is_viewed != 1: notificationcount++

7. details = {
     notificationcount,
     notification: data_array,
     messagecount: message_count(user)
   }

8. Return { status:true, messages:"Notification List", data: details }
```

### SQL: company ids (notification receivers)

```sql
SELECT urel.company_id
FROM user_relation AS urel
JOIN user AS ur ON ur.id = urel.company_id
WHERE urel.user_id = :userId
  AND ur.is_deleted = 0;
```

> No `urel.is_deleted` / `urel.status` filter here (unlike company-list’s relation query).

### SQL: notifications

```sql
SELECT
  nt.*,
  ur.id AS user_id,                    -- sender
  ur.fname, ur.lname, ur.profile, ur.social_image,
  ur.user_type, ur.on_explore, ur.on_notice, ur.on_immediate,
  usr.slug AS company_slug,            -- receiver
  usr.profile AS receiver_profile,
  usr.social_image AS receiver_social_image,
  usr.full_name AS receiver_name,
  usr.id AS receiver_user_id,
  usr.user_type AS receiver_user_type
FROM notifications AS nt
LEFT JOIN user AS ur  ON nt.sender = ur.id
LEFT JOIN user AS usr ON nt.receiver = usr.id
WHERE nt.is_deleted = 0
  AND nt.receiver IN (:ids)            -- user + company ids
ORDER BY nt.create_date DESC;
```

### SQL: cleared (hidden) notifications

```sql
SELECT * FROM cyb_clear_notification   -- literal table name in PHP all_fetch
WHERE user_id = :userId
  AND is_deleted = 0;
```

Clear-all endpoint inserts into `clear_notification` (see related). Node DB may use one physical table with or without `cyb_` prefix — match production naming.

Filter is **in PHP after query**, not in SQL `NOT IN`.

### Success — **LOCKED KEYS**

```json
{
  "status": true,
  "messages": "Notification List",
  "data": {
    "notificationcount": 2,
    "notification": [
      {
        "id": 1,
        "profile": "https://s3.example.com/sender.jpg",
        "receiver_profile": "https://s3.example.com/recv.jpg",
        "receiver_name": "Acme Corp",
        "message": "John Doe, Accepted your request!",
        "date_time": "2025-01-15 10:30:00",
        "link": "/employee/john-doe",
        "receiver_user_id": 123,
        "user_id": 45,
        "slug": "acme-corp",
        "receiver_user_type": 2,
        "is_viewed": 0,
        "redirect": "...",
        "exploreTalent": 1,
        "isAccess": true
      },
      {
        "id": 2,
        "profile": "https://s3.example.com/p.jpg",
        "receiver_profile": "...",
        "receiver_name": "Jane Doe",
        "message": "Someone viewed your profile",
        "date_time": "2025-01-14 09:00:00",
        "link": "/...",
        "receiver_user_id": 99,
        "user_id": 88,
        "slug": null,
        "receiver_user_type": 1,
        "is_viewed": 1,
        "redirect": null,
        "on_explore": 0,
        "on_immediate": 0,
        "on_notice": 0,
        "isAccess": true
      }
    ],
    "messagecount": 5
  }
}
```

| Key | Type | Source / notes |
|-----|------|----------------|
| `messages` | string | **`"Notification List"`** |
| `data.notificationcount` | int | count of items with `is_viewed != 1` **after** clear filter |
| `data.notification` | array | mapped cards (order = create_date DESC) |
| `data.messagecount` | number \| **false** | GraphQL unread; `false` if call fails |
| `id` | | `notifications.id` |
| `profile` | string | **sender** S3+profile or social_image |
| `receiver_profile` | string | **receiver** S3+profile or social_image |
| `receiver_name` | string | receiver `full_name` |
| `message` | string | notification body |
| `date_time` | string | `create_date` (key is **`date_time`**, not `create_date`) |
| `link` | | |
| `receiver_user_id` | | receiver user id |
| `user_id` | | **sender** id |
| `slug` | | if `receiver_user_type == 2` → receiver slug (`company_slug`); else `$val->slug` (from `nt.*` if present — sender slug is **not** selected) |
| `receiver_user_type` | 1\|2 | |
| `is_viewed` | 0\|1 | |
| `redirect` | | raw column |
| `isAccess` | bool | **always `true`** in live code |
| `exploreTalent` | 0\|1 | **only if sender `user_type == 2`** |
| `on_explore` / `on_immediate` / `on_notice` | 0\|1 | **only if sender is not company** |

Sender branch mutual exclusion:

| Sender type | Extra keys |
|-------------|------------|
| Company (`user_type == 2`) | `exploreTalent` only (no on_explore trio) |
| Employee / other | `on_explore`, `on_immediate`, `on_notice` |

Explore gating for employee senders:

```text
if sender.on_explore truthy:
  on_explore = show_exploring(senderId, actingUser) ? 1 : 0
else:
  on_explore = 0
if on_explore == 1:
  on_immediate / on_notice from sender flags
else:
  both forced 0
```

### Empty feed still success

```json
{
  "status": true,
  "messages": "Notification List",
  "data": {
    "notificationcount": 0,
    "notification": [],
    "messagecount": false
  }
}
```

(`messagecount` may be `0` or a number if GraphQL works; **`false`** if GraphQL fails.)

### Exception

```json
{
  "status": false,
  "messages": "Access denied"
}
```

### `message_count` (nested)

```text
GET {GRAPHQL}/api/message/unread-count
Authorization: {request.token}

if response.status == true → return response.unreadCount
else → return false

// Unreachable dead code below: legacy DB chat unread walk
```

| Detail | Value |
|--------|-------|
| Env | `GRAPHQL` base URL |
| Timeout | 10s |
| Failure | **`false`** (boolean), not `0` |
| Auth header | `'Authorization: ' + token` |

> **Node bug magnet #6:** Defaulting failed message count to `0`. PHP returns **`false`**.

### Clear-all interaction

`DELETE /wapi/notifications/clear-all-notification` soft-hides by inserting rows into clear table (`notification_id`, `user_id`) for every current notification id for user+companies — **does not** set `notifications.is_deleted` in the active path.

This GET must **exclude** those ids for the same `user_id` used as clear key.

### Quick port recipe (Node) — all-notification

```text
// GET /wapi/general/all-notification
const userId = actingUserId(req);
const companyIds = await mergeCompanyIds(userId);
const receivers = [userId, ...companyIds];

let rows = await getNotificationsForReceivers(receivers);
const cleared = await clearedNotificationIds(userId);
rows = rows.filter(r => !cleared.has(r.id));

const notification = [];
let notificationcount = 0;

for (const val of rows) {
  const detail = {
    id: val.id,
    profile: val.sender_profile ? S3 + val.sender_profile : val.sender_social,
    receiver_profile: val.recv_profile ? S3 + val.recv_profile : val.recv_social,
    receiver_name: val.receiver_name,
    message: val.message,
    date_time: val.create_date,
    link: val.link,
    receiver_user_id: val.receiver_user_id,
    user_id: val.sender_id,
    slug: val.receiver_user_type == 2 ? val.receiver_slug : val.nt_slug,
    receiver_user_type: val.receiver_user_type,
    is_viewed: val.is_viewed,
    redirect: val.redirect,
    isAccess: true,
  };

  if (val.sender_user_type == 2) {
    detail.exploreTalent = (await hasActiveJob(val.sender_id)) ? 1 : 0;
  } else {
    let on_explore = val.on_explore ? (await showExploring(val.sender_id, userId) ? 1 : 0) : 0;
    detail.on_explore = on_explore;
    detail.on_immediate = on_explore ? (val.on_immediate ? 1 : 0) : 0;
    detail.on_notice = on_explore ? (val.on_notice ? 1 : 0) : 0;
  }

  notification.push(detail);
  if (val.is_viewed != 1) notificationcount++;
}

return {
  status: true,
  messages: "Notification List",
  data: {
    notificationcount,
    notification,
    messagecount: await graphqlUnreadCount(req.token), // number or false
  },
};
```

---

## Full common Node mistake matrix

### company-list

| Mistake | Symptom |
|---------|---------|
| Always return `{ myCompany: [] }` when empty | FE switcher branches break |
| Paginate companies with limit/offset | Missing companies |
| `user_count` as number | Type mismatch vs string |
| `following` as follow row / id | FE expects two booleans only |
| `user_group` as `{ id, name }` | Group chips blank |
| Nested users from `user_relation` | Wrong people (need experience still_working) |
| `status` = company user.status | Wrong active/pending relation UI |
| Route `/wapi/company/company-list` | 404 — real path is `/wapi/company-list` |
| `messages`: `"Company List"` | Case mismatch |

### all-notification

| Mistake | Symptom |
|---------|---------|
| `data` as array of notifications | Bell UI missing counts / wrong shape |
| Message `"success"` / `"notification list"` | String mismatch |
| Only `receiver = me` | Missing company-inbox notifications |
| Ignoring clear table | Cleared items reappear |
| Key `create_date` instead of `date_time` | Timestamps blank |
| `user_id` as receiver | Wrong avatar / profile link |
| Always attach both exploreTalent and on_explore | Extra keys / wrong branch |
| `isAccess` from live relation check | PHP hardcodes `true` |
| Paginating without FE change | PHP returns full list |
| Using query `company` filter | No-op in PHP |
| `messagecount: 0` on GraphQL down | Should be `false` |
| Soft-delete on clear instead of clear table | Diverges from clear-all write path |
| `notificationcount` = total length | Badge includes already viewed |
| `notificationcount` before clear filter | Badge counts hidden items |

---

## Minimal verification checklist

```bash
# Company list
curl -sS -H "Authorization: Bearer $TOKEN" \
  "$BASE/wapi/company-list?limit=16&offset=1" \
  | jq '{
    status, messages,
    dataType: (.data|type),
    n: (.data.myCompany//empty|length),
    first: (.data.myCompany[0]//null|{
      id, name, status, user_count, currentStatus, isSuperAdmin,
      following, exploreTalent,
      groupKeys: (.user_group[0]//null|keys),
      empN: (.user_details|length)
    })
  }'

# Notifications
curl -sS -H "Authorization: Bearer $TOKEN" \
  "$BASE/wapi/general/all-notification" \
  | jq '{
    status, messages,
    keys: (.data|keys),
    n: (.data.notification|length),
    unread: .data.notificationcount,
    msg: .data.messagecount,
    first: (.data.notification[0]//null|{
      id, user_id, receiver_user_id, date_time, is_viewed, isAccess,
      hasExploreTalent: has("exploreTalent"),
      hasOnExplore: has("on_explore")
    })
  }'
```

**Assert (company-list):**

1. `messages === "Company list"`.
2. Empty user: `data` is `[]`.
3. Non-empty: `data.myCompany` array; card has `following.requestSend`, `followData.follower`.
4. `user_count` is string; `user_group[]` uses `group_id`/`group_name`.
5. `offset=2` changes nested `user_details`, not company set size.
6. `currentStatus` ∈ {1,2,3,4}.

**Assert (all-notification):**

1. `messages === "Notification List"`.
2. `data` has `notificationcount`, `notification`, `messagecount`.
3. No cleared notification ids appear (after clear-all).
4. Unread badge equals items with `is_viewed != 1`.
5. Company-sender items have `exploreTalent`; person-sender have explore trio.
6. `isAccess === true` always.
7. GraphQL down → `messagecount === false`.

---

## Related endpoints

| Need | Call | Notes |
|------|------|-------|
| Multi-company switcher | `GET /wapi/company-list` | §1 |
| List notifications | `GET general/all-notification` | §2 |
| Mark one viewed | `PUT general/markViewed/:id` | `is_viewed=1` |
| Mark all read | `PUT general/allReadNotification` | separate |
| Soft-delete one | `DELETE removeNotification/:id` | `is_deleted=1` |
| Clear all (hide via clear table) | `DELETE notifications/clear-all-notification` | insert clear rows |
| Company dashboard home | `GET company/dashboard` | `debug/company-allapplication-and-dashboard-endpoints.md` |
| Invite / claim company | `invite-company`, `claim-company` | different flows |

---

## Response key freeze (frontend)

### `GET company-list`

```
status
messages
data                          // [] OR { myCompany }
data.myCompany[].id
data.myCompany[].individual_id
data.myCompany[].profile
data.myCompany[].name
data.myCompany[].city_name
data.myCompany[].state_name
data.myCompany[].claim_status
data.myCompany[].country_name
data.myCompany[].status
data.myCompany[].slug
data.myCompany[].company_size_name
data.myCompany[].industry_name
data.myCompany[].is_verified
data.myCompany[].followData.following
data.myCompany[].followData.follower
data.myCompany[].following.requestSend
data.myCompany[].following.requestApproved
data.myCompany[].exploreTalent
data.myCompany[].user_group[].group_id
data.myCompany[].user_group[].group_name
data.myCompany[].user_details[]
data.myCompany[].user_count
data.myCompany[].account_deletion
data.myCompany[].currentStatus
data.myCompany[].isSuperAdmin
```

### `GET general/all-notification`

```
status
messages
data.notificationcount
data.notification
data.messagecount
data.notification[].id
data.notification[].profile
data.notification[].receiver_profile
data.notification[].receiver_name
data.notification[].message
data.notification[].date_time
data.notification[].link
data.notification[].receiver_user_id
data.notification[].user_id
data.notification[].slug
data.notification[].receiver_user_type
data.notification[].is_viewed
data.notification[].redirect
data.notification[].isAccess
data.notification[].exploreTalent          // company sender
data.notification[].on_explore             // person sender
data.notification[].on_immediate
data.notification[].on_notice
```

---

## Side-by-side: api-ai-document vs PHP

| Topic | Wrong / simplified docs | Actual PHP |
|-------|-------------------------|------------|
| company-list empty `data` | often `{ myCompany: [] }` | **`[]`** |
| company-list `user_group` | `{ id, name }` | **`group_id`, `group_name`** |
| company-list `user_count` | number | **string** |
| all-notification `messages` | `"success"` | **`"Notification List"`** |
| all-notification `data` | bare array | **`{ notificationcount, notification, messagecount }`** |
| all-notification date key | `create_date` / `is_read` | **`date_time` / `is_viewed`** |
| all-notification clear | omitted | filters **`cyb_clear_notification`** |

---

*Generated from PHP source in this repo. When PHP and `api-ai-document/remaining-misc-crud-endpoints.md` / `general-auth-endpoints.md` disagree, trust this debug guide and the controller lines cited above.*
