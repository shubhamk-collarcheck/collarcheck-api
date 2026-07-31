
# Debug Guide — employee/dashboard

**Purpose:** Contract source-of-truth for debugging a Node.js reimplementation against the legacy CodeIgniter 4 API. Frontend already depends on these response keys and message strings — **do not rename keys**.

**Authoritative source:** PHP controllers/models below (prefer this file over summary tables in `api-ai-document/` when they conflict).

## Node implementation map (shipped)

| Layer | Files |
|-------|--------|
| Routes | `src/routes/employee.route.ts` — `GET /dashboard` + `Authorization` |
| Controllers | `src/controllers/job-dashboard.controller.ts` — `dashboard` |
| Services | `src/services/job-dashboard.service.ts` — `dashboardService`, `profilePercentageService`, `buildCurrentEmployees` |
| Repositery | `src/repositery/job-dashboard.repositery.ts` (+ `employee`, `company`, `review`, `skill`) |
| Types | none (no query/body) |
| Schema tables | `cyb_application`, `cyb_company_job`, `cyb_follow`, `cyb_message_history`, `cyb_user_skill`, `cyb_user_experience`, `cyb_user`, … |
| Node docs | `src/api-ai-document/employee-job-dashboard-viewrequest-endpoints.md` (Endpoint 11 + 4) |

| Route | Auth | Node handler | What it returns |
|-------|------|--------------|-----------------|
| `GET /wapi/employee/dashboard` | **JWT** | `dashboard` → `dashboardService(req.auth.id, req.auth.user_id)` | Employee home widgets: counts + profile % + pending follows + skills + current employments |

**PHP source (contract origin):**
- `app/Controllers/IndividualApi.php` — `dashboard` (~5047), `get_experience_detail` (~5165), `check_hired` (~5150)
- `app/Controllers/GeneralApi.php` — `ProfilePercentage` (~5102) — **employee** branch (`user_type == 1`)
- `app/Models/UserModel.php` — count/list helpers listed in checklist below
- `app/Filters/Authenticate.php` — JWT + optional `X-Company` identity

**Base path:** `/wapi`  
**Auth:** `Authorization: Bearer <jwt>`  
**Acting user:** JWT user, or company from `X-Company: {companyId}` → `req.auth.id`. Original JWT user is `req.auth.user_id`.

> Employee dashboard is meant for **individual** (`user_type = 1`). If `X-Company` swaps `request.id` to a company, counts/lists run against that company id (legacy side-effect — FE normally does not send `X-Company` here).

---

## Global envelope

| Case | HTTP | Body shape |
|------|------|------------|
| Success | **200** | `{ "status": true, "data": object }` ← **no `messages` key** |
| Exception | **200** | `{ "status": false, "messages": "<exception message>" }` |
| Auth fail | **401** | filter-dependent |

> **Node bug magnet #1:** Adding `messages: "Dashboard"` (or any success message). PHP **omits `messages` entirely** on success — same as `company/dashboard`.

> **Node bug magnet #2:** Confusing with `company/dashboard`. Different keys (`jobsApplieds` vs `postedJobs`, `currentEmployees` vs `currentEmployies`, real `followList` vs always-empty company `followRequests` array).

---

## Auth / identity

```text
JWT → user row (status=1, is_deleted=0)
If header X-Company present and company exists (status=1, is_deleted=0):
  request.id        = company.id          ← acting id
  request.user_id   = JWT user.id
  request.user_type = company.user_type   (2)
Else:
  request.id = request.user_id = JWT user
  request.user_type = JWT user.user_type
```

All dashboard queries use **`request.id`** as `$user`.  
`get_experience_detail` also receives `$currentUser = request.user_id` for owner-vs-viewer rating/invite checks.

---

## Query params

**None.** Unlike `company/dashboard`, this endpoint does **not** read `limit` / `offset`.  
Pending follows and skills/employments use hard-coded / model defaults (see below).

```
GET /wapi/employee/dashboard
Authorization: Bearer <jwt>
```

---

## Routes summary

| # | Method | Route | Handler | Success notes |
|---|--------|-------|---------|---------------|
| 1 | GET | `/wapi/employee/dashboard` | `IndividualApi::dashboard` | **no** `messages`; nested `data` object |

Spellings that must stay exact:
- Key: **`jobsApplieds`** (typo plural **Applieds**, not `jobsApplied` / `jobsAppliedsCount`)
- Key: **`currentEmployees`** (correct English — **not** company typo `currentEmployies`)
- Key: **`followList`** / **`skillList`** / **`followRequests`** (camel)
- Nested employment company card uses **`comapny_individual_id`** source typo only in SQL alias → response key is **`individual_id`**
- Profile incomplete label: **`Profile Descripton`** (typo **Descripton**, missing i)

---

# 1. GET `/wapi/employee/dashboard`

**Handler:** `IndividualApi::dashboard` (~5047)  
**Auth:** JWT  
**Method:** GET only (no method check in PHP — any method that hits the route runs the body)

### Logic (debug checklist)

```text
1. user        = request.id
   currentUser = request.user_id

2. data.jobsApplieds   = get_total_applied_job(user)
3. data.connections    = get_all_connections_count(user)
4. data.followRequests = allCount('follow', {
     follower_id: user,
     'status !=': 1,          // NOT status=0 only
     is_deleted: 0
   })
5. data.messages       = allCount('message_history', {
     receiver: user,
     'is_viewed !=': 1
   })
6. data.percentage     = GeneralApi.ProfilePercentage(user)  // employee weights

7. followList rows = get_pending_follower_list(user, 10)
   // ⚠ second arg IGNORED in model — returns ALL pending, not top 10
   Map each row → follow card (see 1b)
   data.followList = mapped array (or [])

8. skill rows = all_fetch('user_skill', { status:1, user }, 'rating', 'desc')
   // no limit; no is_deleted filter on user_skill
   For each: lookup skill.name by skill id
   Map → { id: user_skill.id, skill: name|'', rating }
   data.skillList = mapped

9. experienceIds = get_unique_experience_id({
     user,
     still_working: 1
   })
   // GROUP BY company; still_working=1; is_deleted=0; company join non-null
   For each id:
     currentEmployees[] = get_experience_detail(
       id, NULL, 1, 1, 1, 1, user, currentUser
     )
     // approved=NULL, still_working=1, showSalaryStatus=1,
     // showSalary=1, showReview=1, authuser=user, currentUserId=currentUser

10. Return { status: true, data }
```

### Success — **LOCKED KEYS**

```json
{
  "status": true,
  "data": {
    "jobsApplieds": 15,
    "connections": 42,
    "followRequests": 3,
    "messages": 5,
    "percentage": {
      "total": 78,
      "complete": {
        "profile": 2,
        "email": 2,
        "email_verified": 3
      },
      "uncomplete": ["City", "State"],
      "incomplete": [
        { "key": "City", "value": "2%" },
        { "key": "State", "value": "2%" }
      ]
    },
    "followList": [ /* see 1b */ ],
    "skillList": [
      { "id": 1, "skill": "JavaScript", "rating": 5 },
      { "id": 2, "skill": "React", "rating": 4 }
    ],
    "currentEmployees": [ /* see 1c — nested company groups */ ]
  }
}
```

| Key | Type | Notes |
|-----|------|-------|
| `jobsApplieds` | int | Applications still linked to non-deleted job + company |
| `connections` | int | Accepted follows where **`follower_id = me`** (my followers) |
| `followRequests` | int | Pending-ish follows: `status != 1` (includes rejected `2` if any) |
| `messages` | int | Unviewed inbox (`is_viewed != 1`) |
| `percentage` | object | Profile completion widget (employee weights) |
| `followList` | array | Pending follow **cards** (`status = 0` only — see mismatch) |
| `skillList` | array | My skills ordered by rating DESC |
| `currentEmployees` | array | Still-working employments grouped by company |

---

## 1a — Count helpers

### `jobsApplieds` — `UserModel::get_total_applied_job`

```sql
SELECT COUNT(*)
FROM application AS ap
LEFT JOIN company_job AS cj ON ap.job = cj.id
LEFT JOIN user AS cmp ON cj.company = cmp.id
WHERE ap.user = :userId
  AND cj.is_deleted = 0
  AND cmp.is_deleted = 0
  AND ap.is_deleted = 0;
```

> Does **not** require `cj.status = 1`. Inactive jobs still count if not deleted.  
> Table is **`application`** (not `job_applied`).

### `connections` — `UserModel::get_all_connections_count`

```sql
SELECT COUNT(*)
FROM follow AS fl
INNER JOIN user AS ur ON ur.id = fl.followed_id
WHERE fl.follower_id = :userId
  AND fl.status = 1
  AND fl.is_deleted = 0;
```

PHP source uses table names `cyb_follow` / `cyb_user` in this one helper (production tables are often `cyb_*`). Logical tables for Node are **`follow`** / **`user`** if your schema matches the rest of the port.

**Inverted follow columns** (same as follow debug guide):

| DB column | Meaning |
|-----------|---------|
| `followed_id` | User who **clicked Follow** (initiator) |
| `follower_id` | User who is **being followed** (target / me for inbound) |

So `connections` ≈ **accepted followers of me** (people following me), not mutual graph size.

> **Node bug magnet #3:** Counting `followed_id = me` for connections. That is **following** (people I follow), not this key.

### `followRequests` (count)

```sql
SELECT COUNT(*)
FROM follow
WHERE follower_id = :userId
  AND status != 1
  AND is_deleted = 0;
```

| Value of `status` | Included in count? | In `followList`? |
|-------------------|--------------------|------------------|
| `0` pending | yes | yes |
| `1` accepted | no | no |
| `2` rejected (if used) | yes | no |

> **Node bug magnet #4:** Using `status = 0` for the **count** and the **list**. Count is `!= 1`; list is `= 0`. Numbers can disagree.

### `messages`

```sql
SELECT COUNT(*)
FROM message_history
WHERE receiver = :userId
  AND is_viewed != 1;
```

---

## 1b — `followList` (pending follow cards)

**Model:** `UserModel::get_pending_follower_list($follower_id)`  
**Call site:** `$UserModel->get_pending_follower_list($user, 10)` — the `10` is **ignored** (signature has one param, no `LIMIT`).

```sql
SELECT
  fl.*,
  ur.fname, ur.lname, ur.profile, ur.social_image, ur.slug,
  ur.user_type, ur.individual_id,
  dg.name AS designation_name,
  cmp.fname AS company_name,
  st.name AS state_name,
  cnt.name AS country_name
FROM follow AS fl
LEFT JOIN user AS ur ON fl.followed_id = ur.id
LEFT JOIN user AS cmp ON ur.current_company = cmp.id
LEFT JOIN designation AS dg ON ur.current_possition = dg.id
LEFT JOIN state AS st ON ur.state = st.id
LEFT JOIN country AS cnt ON ur.country = cnt.id
WHERE fl.follower_id = :userId
  AND fl.status = 0
  AND fl.is_deleted = 0
ORDER BY fl.id DESC;
-- NO LIMIT in model (despite call-site 10)
```

### Item map — **LOCKED**

| Key | Source |
|-----|--------|
| `id` | `follow.id` (PK — use for accept/reject) |
| `status` | `follow.status` (0) |
| `create_date` | |
| `fname` | initiator user |
| `lname` | |
| `profile` | `S3_PREFIX + profile` if set, else `social_image` as-is |
| `slug` | initiator slug |
| `user_type` | |
| `individual_id` | CC id string |
| `designation_name` | current_possition name or null |
| `company_name` | current_company.fname or null |
| `state_name` | |
| `country_name` | |

Empty → `[]` (key still present).

### Common Node mistakes (`followList`)

| Mistake | Symptom |
|---------|---------|
| Hard `LIMIT 10` because call passes 10 | Fewer cards than PHP |
| Joining initiator as `follower_id` | Wrong people in list |
| Returning count only | FE needs array of cards |
| S3 on `social_image` | Double-prefix / broken avatars |

---

## 1c — `skillList`

```sql
SELECT * FROM user_skill
WHERE status = 1 AND user = :userId
ORDER BY rating DESC;
-- then for each row:
SELECT * FROM skill WHERE id = :user_skill.skill;
```

### Item map — **LOCKED**

| Key | Type | Source |
|-----|------|--------|
| `id` | number | **`user_skill.id`** (not skill master id) |
| `skill` | string | `skill.name` or `""` if missing |
| `rating` | number | `user_skill.rating` |

> Same shape as `GET /wapi/employee/all-skill` (see `debug/skill-and-language-endpoints.md`).  
> **No** `is_deleted` filter on `user_skill` here.

---

## 1d — `currentEmployees` (nested employments)

### Step A — pick one experience id per company

`UserModel::get_unique_experience_id({ user, still_working: 1 })`:

```sql
SELECT uex.id
FROM user_experience AS uex
LEFT JOIN user AS cmp ON uex.company = cmp.id
WHERE cmp.id IS NOT NULL
  AND uex.user = :userId
  AND uex.still_working = 1
  AND uex.is_deleted = 0
GROUP BY uex.company
ORDER BY uex.still_working DESC, uex.joining_date DESC;
```

One representative `user_experience.id` per company where the employee is still working.

### Step B — expand each id via `get_experience_detail`

Dashboard call:

```php
$this->get_experience_detail($id, NULL, 1, 1, 1, 1, $user, $currentUser);
// ($experienceId, $approved=NULL, $still_working=1,
//  $showSalaryStatus=1, $showSalary=1, $showReview=1,
//  $authuser=$user, $currentUserId=$currentUser)
```

Because **`$approved` is NULL**:
- Inner list filter does **not** force `approved=1` or `status=1`
- Still applies `still_working=1` on the company-scoped list
- Ratings use **`get_rating($row->id)`** (not `get_rating_general`)
- Salary fields are included (`showSalary=1`)
- Documents included (`showSalary || showReview`)
- `showSalaryStatus` key is set to `1` on the outer card

### Outer company card — **LOCKED KEYS**

| Key | Type | Source / notes |
|-----|------|----------------|
| `id` | int | Seed experience id (representative row) |
| `company_logo` | string | S3+company profile or company social_image |
| `company` | string | company `fname` |
| `company_id` | int | company user id |
| `individual_id` | string | company CC id (`comapny_individual_id` SQL alias typo) |
| `is_verified` | bool | `user_verified(company)` |
| `joining_date` | string | seed row |
| `worked_till_date` | string | `''` if null |
| `claim_status` | 0\|1 | company claim |
| `added_by` | bool | `check_invitation_send(company, currentUser)` |
| `approved` | int | seed row approved |
| `status` | int | seed row status |
| `company_slug` | string | |
| `user_slug` | string | employee slug |
| `hired` | bool | any `user_experience` with `hired` truthy for (user, company) |
| `sendReminder` | bool | company in `user_approve_company_list(employee)` (pending approved=0 + claimed company) |
| `showSalaryStatus` | 1 | always set on dashboard path |
| `employmentScore` | number\|string | `getAllEmploymentScore(user, company)` — `number_format` string like `"4.5"` or `0` |
| `totalExperienceMonths` | int | sum of month diffs across `lists` |
| `lists` | array | designation stints (see below) |
| `still_working` | 0\|1 | 1 if any list row has still_working=1 and approved!=2 |

### Inner `lists[]` item — **LOCKED KEYS**

| Key | Type | Source / notes |
|-----|------|----------------|
| `id` | int | experience id |
| `haveSalary` | bool | salary non-empty |
| `haveDocument` | bool | certificate non-empty |
| `haveReview` | bool | `get_experience_rating_count([id], authuser==currentUser)` > 0 |
| `work_email` | string | |
| `employment_type` | string | employement_type.name |
| `designation` | string | designation name |
| `joining_date` | | |
| `worked_till_date` | | |
| `still_working` | 0\|1 | |
| `approved` | int | |
| `description` | string | |
| `salary` | mixed | **included** on dashboard (showSalary=1) |
| `salary_inhand` | | |
| `salary_mode` | | |
| `department` | string | department name |
| `claim_status` | 0\|1 | |
| `company_slug` | | |
| `skill` | array | `get_skill(json ids)` → `[{id,name}, ...]` or `[]` |
| `document` | string[] | S3-prefixed certificate paths from CSV |
| `added_by` | bool | invitation from company to **experience.user** |
| `employment_status` | `"complete"`\|`"pending"` | latest rating `added_by==1` → complete |
| `basic_update_list` | array | raw `user_update_experience` rows for experience |
| `designation_score` | number\|string | `getAverageRatingBySkill` — often `"4.5"` string or `0` |
| `rating` | array | full review objects from `get_rating` |
| `totalRating` | object | `{ rating, noofrecord }` from `get_experience_rating` |
| `status` | int | experience status |
| `verificationProcess` | object | `{ level1, level2, level3, level4 }` booleans |

### Month accumulation (`totalExperienceMonths`)

```text
for each list row:
  if joining_date AND worked_till_date:
    totalexp += months between (date_diff %m only — NOT years*12)
  else if joining_date AND still_working == 1:
    totalexp += months from joining_date to today (%m only)
```

> **Node bug magnet #5:** Using full duration in months (`years*12 + months`). PHP only adds the **`%m` remainder** (0–11) per stint — undercounts long tenures. Match PHP for parity tests; fix only if product explicitly wants real months.

### `employment_status`

```text
latest user_experience_rating WHERE experience=id AND status=1 ORDER BY id DESC
if added_by == 1 → "complete" else "pending"
```

### `verificationProcess` (summary)

| Level | Meaning |
|-------|---------|
| `level1` | Work email domain matches company verified domains/emails (or any email if company has no verified domains) |
| `level2` | level1 true AND company has ≥1 verified domain/email row |
| `level3` | experience `approved == 1` |
| `level4` | approved==1 AND salary non-empty |

### `rating` item shape (`get_rating`)

```json
{
  "id": 99,
  "approved": 1,
  "status": "complete",
  "doc": ["https://s3.../file.pdf"],
  "date": "2024-05-01 12:00:00",
  "link": "",
  "show_home": 0,
  "show_review": 1,
  "history": [],
  "skill_rating": [
    { "skill_id": 1, "name": "React", "rating": 5, "show_home": 0 }
  ],
  "rating": 5,
  "review": "Great work"
}
```

`status` string is derived: `approved==1 ? "complete" : "pending"`.

---

## 1e — `percentage` — employee `ProfilePercentage`

`GeneralApi::ProfilePercentage($userId)` when `user_type == 1`:

```php
[
  'total' => int,              // sum of completed weights
  'uncomplete' => string[],    // human labels still missing
  'complete' => object,        // map field key → weight (ints for employee)
  'incomplete' => [ { key, value }, ... ]  // value like "2%"
]
```

### Employee weights (LOCKED labels)

| Check | Points | `uncomplete` / `incomplete.key` label |
|-------|--------|----------------------------------------|
| profile or social_image | 2 | Profile Image |
| email | 2 | Email |
| email_verified | 3 | Email Verification |
| phone | 2 | Phone No. |
| phone_verified | 3 | Phone verification |
| any user_experience (not deleted path) | 5 | Experience |
| approved experience | 10 domestic / **15** international | Experience Approved |
| user_education | 10 | Education |
| user_skill | 2 | Skill |
| user_language | 2 | Language |
| review (only if experience approved already complete) | 10 / **15** intl | Review |
| present_address | 10 | Present Address |
| permanent_address | 2 | Permanent Address |
| resume | 2 | Resume |
| dob | 2 | Date of Birth |
| accomodation | 2 | Accomodation |
| work_status | 2 | Work Status |
| country | 2 | Country |
| city | 2 | City |
| any social link | 2 | Social Media |
| user_verified (domestic only; country == `'101'`) | 10 | Verify Pending |
| profile_description | 5 | **Profile Descripton** (typo) |
| current_company | 2 | Current company |
| current_possition | 2 | Current Position |
| user_certificate | 2 | Certificate |
| expected_salary | 2 | Expected salary |

**International:** `user.country != '101'` → higher Experience Approved / Review weights; **skip** Verify Pending block.

> Do not invent a flat `percentage: 78` number — FE expects the object with `total` / `uncomplete` / `complete` / `incomplete`.  
> Same helper as `GET /wapi/employee/ProfilePercentage` (that route may wrap it differently — dashboard embeds the raw array under `data.percentage`).

---

## Shared: image / S3 rules

| Source | Output |
|--------|--------|
| `user.profile` / company profile set | `S3_PREFIX + path` |
| else | `social_image` as-is (no prefix) |
| certificate CSV paths | each `S3_PREFIX + path` |
| empty certificate | `[]` |

---

## CRITICAL: follow naming (inbound requests)

When **A** requests to follow **B** (B is the employee viewing dashboard):

| Column | Value |
|--------|-------|
| `followed_id` | **A** (requester — card person) |
| `follower_id` | **B** (me / dashboard user) |
| `status` | `0` pending |

`followList` joins **`followed_id → user`** to show **who sent** the request.  
`id` on the card is **`follow.id`** for accept/reject endpoints.

---

## Side-by-side: employee vs company dashboard

| | `employee/dashboard` | `company/dashboard` |
|--|----------------------|---------------------|
| Auth | JWT | JWT + optional menu ACL 403 |
| Query limit/offset | **none** | yes (default 10, page math) |
| Success `messages` | **absent** | **absent** |
| Application count key | `jobsApplieds` | `applications` |
| Headcount key | `currentEmployees` (array of objects) | `currentEmployies` (**int** + typo) |
| Follow | `followRequests` **int** + `followList` **array** | `followRequests` always **`[]`** |
| Jobs widget | n/a | `postedJobs`, `mostAppliedJob` |
| Pending employment | n/a (employee side) | `employementRequestList` |
| Profile % branch | employee weights | company weights |

---

## Full common Node mistake matrix

| Mistake | Symptom |
|---------|---------|
| Success body includes `messages` | Contract tests fail; FE may ignore or break |
| `jobsApplied` / `appliedJobs` spelling | Widget shows undefined |
| `currentEmployies` (company typo) on employee | Employment cards missing |
| `followRequests` as array | Badge expects number |
| `followList` limited to 10 | Fewer pending cards than PHP |
| Count uses `status=0` only | Badge ≠ list length when rejected rows exist |
| Connections = people I follow | Wrong badge (use inbound `follower_id=me`) |
| Flat percentage number | Progress UI broken |
| `skillList[].id` = skill master id | Delete/edit hits wrong row |
| `skill` key as object | FE expects name **string** |
| Hiding salary on “own” dashboard | Dashboard always passes showSalary=1 |
| Using `get_rating_general` path | Dashboard uses `get_rating` (approved=NULL branch) |
| Full month tenure math | Month totals disagree with PHP `%m` only |
| Table `job_applied` | Empty `jobsApplieds` |
| Requiring company menu ACL | Employee route has none |
| Omitting nested `lists` / `verificationProcess` | Employment widgets partial |

---

## Minimal verification checklist

```bash
# Employee dashboard
curl -sS -H "Authorization: Bearer $TOKEN" \
  "$BASE/wapi/employee/dashboard" \
  | jq '{
    status,
    hasMessages: (has("messages")),
    keys: (.data|keys),
    jobs: .data.jobsApplieds,
    conn: .data.connections,
    fr: .data.followRequests,
    msg: .data.messages,
    pct: .data.percentage.total,
    followN: (.data.followList|length),
    skillN: (.data.skillList|length),
    empN: (.data.currentEmployees|length),
    firstSkill: .data.skillList[0],
    firstFollow: (.data.followList[0]//null|{id,fname,status}),
    firstEmpKeys: (.data.currentEmployees[0]//null|keys)
  }'
```

**Assert:**

1. Success: **no** top-level `messages`; `status === true`.
2. Keys present: `jobsApplieds`, `connections`, `followRequests`, `messages`, `percentage`, `followList`, `skillList`, `currentEmployees`.
3. `followRequests` is a **number**; `followList` is an **array**.
4. `percentage` has `total`, `complete`, `uncomplete`, `incomplete`.
5. `skillList[]` has `{ id, skill, rating }` with `skill` string.
6. `currentEmployees[]` has nested `lists` array and `employmentScore`.
7. Compare counts against SQL above for a known seed user.
8. Optional: if rejected follows exist, `followRequests` can be **>** `followList.length`.

---

## Quick port recipe (Node)

```text
// GET /wapi/employee/dashboard
const userId = actingUserId(req);       // request.id
const currentUserId = jwtUserId(req);   // request.user_id

const jobsApplieds = await countAppliedJobs(userId);
const connections = await countAcceptedFollowers(userId); // follower_id=me, status=1
const followRequests = await countFollows(userId, { statusNe: 1 });
const messages = await countUnreadMessages(userId);
const percentage = await profilePercentageEmployee(userId);

const followList = (await pendingFollowers(userId)).map(mapFollowCard); // no limit
const skillList = (await userSkills(userId, { orderBy: 'rating desc' }))
  .map(s => ({ id: s.userSkillId, skill: s.name || '', rating: s.rating }));

const expIds = await uniqueStillWorkingExperienceIds(userId); // group by company
const currentEmployees = [];
for (const id of expIds) {
  currentEmployees.push(
    await buildExperienceDetail(id, {
      approved: null,
      stillWorking: true,
      showSalaryStatus: 1,
      showSalary: true,
      showReview: true,
      authUser: userId,
      currentUserId,
    })
  );
}

return {
  status: true,
  data: {
    jobsApplieds,
    connections,
    followRequests,
    messages,
    percentage,
    followList,
    skillList,
    currentEmployees,
  },
};
```

---

## Related endpoints (do not confuse)

| Need | Call | Not this |
|------|------|----------|
| Company home widgets | `company/dashboard` | employee dashboard keys differ |
| Profile % only | `employee/ProfilePercentage` | same helper, different envelope |
| My skills CRUD list | `employee/all-skill` | same item shape as `skillList` |
| Full employment list | `employee/all-employement` / `allEmployementNew` | dashboard only still_working groups |
| Pending follow actions | `general/acceptfollow` / `rejectfollow` | use `followList[].id` |
| Paginated applied jobs | `employee/appliedjob` | dashboard only returns **count** |
| Sidebar badges | `employee/sidebar-count` | different count set |

---

## Response key freeze (frontend)

```
status
data
data.jobsApplieds
data.connections
data.followRequests
data.messages
data.percentage.total
data.percentage.complete
data.percentage.uncomplete
data.percentage.incomplete
data.followList[].id
data.followList[].status
data.followList[].create_date
data.followList[].fname
data.followList[].lname
data.followList[].profile
data.followList[].slug
data.followList[].user_type
data.followList[].individual_id
data.followList[].designation_name
data.followList[].company_name
data.followList[].state_name
data.followList[].country_name
data.skillList[].id
data.skillList[].skill
data.skillList[].rating
data.currentEmployees[].id
data.currentEmployees[].company
data.currentEmployees[].company_id
data.currentEmployees[].company_logo
data.currentEmployees[].lists
data.currentEmployees[].employmentScore
data.currentEmployees[].totalExperienceMonths
data.currentEmployees[].still_working
data.currentEmployees[].verificationProcess  // on lists items
```

---

*Generated from PHP source in this repo. When PHP and `api-ai-document/employee-job-dashboard-viewrequest-endpoints.md` disagree (e.g. followList “Top 10”, success `messages`, simplified `currentEmployees`), trust this debug guide and the controller lines cited above.*
