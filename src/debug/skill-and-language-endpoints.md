# Debug Guide — all-skill & allLanguage (Node)

**Purpose:** Contract source-of-truth for debugging the Node.js CollarCheck API. Frontend depends on these response keys and message strings — **do not rename keys**.

**Project stack:** Express + Drizzle (MySQL) · base path `/wapi` · JWT via `Authorization: Bearer <token>`

**Node source files (authoritative for this repo):**

| Layer | Files |
|-------|--------|
| Routes | `src/routes/general.route.ts`, `src/routes/employee.route.ts` |
| Controllers | `src/controllers/general.controller.ts`, `src/controllers/skill.controller.ts`, `src/controllers/language.controller.ts` |
| Services | `src/services/general.service.ts`, `src/services/skill.service.ts`, `src/services/language.service.ts` |
| Repository | `src/repositery/skill.repositery.ts`, `src/repositery/user-skill.repositery.ts`, `src/repositery/language.repositery.ts` |
| Types / Zod | `src/types/skill.types.ts`, `src/types/language.types.ts`, `src/types/general.types.ts` |
| Schema | `src/db/schema.ts` → `cybSkill`, `cybUserSkill`, `cybLanguages`, `cybUserLanguage` |
| Auth | `src/middlewares/Authorization.ts` |

| Route | Auth | Node handler | What it returns |
|-------|------|--------------|-----------------|
| `GET /wapi/general/all-skill` | **Public** | `allSkill` → `allSkillService` (general) | Master skill **catalog** (random 30) |
| `GET /wapi/general/skill/:id` | **Public** | `skillByCategory` → `skillByCategoryService` | Skills filtered by **category** |
| `GET /wapi/employee/all-skill` | **JWT** | `allSkill` (skill.controller) → `allSkillService` | **My** user skills (`cyb_user_skill`) |
| `GET /wapi/employee/allLanguage` | **JWT** | `allLanguageList` → `allLanguageListService` | **My** languages (`cyb_user_language`) |
| `GET /wapi/general/languageList` | **Public** | `languageList` → `getLanguagesService` | Master **languages** catalog |

> **Bug magnet #1:** Mixing up `general/all-skill` vs `employee/all-skill`. Same-ish path segment, **completely different shapes**.

---

## Global envelope

| Case | HTTP | Body |
|------|------|------|
| Success | **200** | `{ "status": true, "messages": string, "data": ... }` |
| Exception (employee lists) | **200** | `{ "status": false, "messages": "Access denied" }` |
| Auth missing on employee routes | **401** | filter-dependent |
| Zod validation fail | **400** | `{ "error": "Invalid data", "details": [...] }` |

- Always use key **`messages`** (plural) on these endpoints (not `message`).
- `data` is always an **array** (possibly `[]`), never `null`, on success for all list endpoints below.

---

## Do not confuse these

| Client need | Call this | `data[]` item shape |
|-------------|-----------|---------------------|
| Skill typeahead / dropdown | `GET general/all-skill` | `{ id, name }` |
| Skills under a department/category | `GET general/skill/:categoryId` | `{ id, department, name }` |
| Skills on **my profile** | `GET employee/all-skill` | `{ id, skill, rating }` |
| Languages on **my profile** | `GET employee/allLanguage` | full `user_language` row + `language_name` |
| Language master dropdown | `GET general/languageList` | `{ id, name }` |

---

# 1. GET `/wapi/general/all-skill`

**Node:** `general.route.ts` → `allSkill` → `general.service.allSkillService`  
**Auth:** **None** (public)

### Logic

```text
1. SELECT id, name FROM cyb_skill WHERE status = 1 ORDER BY RAND() LIMIT 30
2. Map to { id, name } only
3. Always status true even if empty list
```

> **No** `is_deleted` filter (column not used on master skill).  
> Result set changes every request (random). Do not assert fixed ordering in tests.

### Success — **LOCKED KEYS**

```json
{
  "status": true,
  "messages": "skill list",
  "data": [
    { "id": 12, "name": "React" },
    { "id": 45, "name": "Node.js" }
  ]
}
```

| Key | Type | Source |
|-----|------|--------|
| `messages` | string | exact `"skill list"` (lowercase s) |
| `data[].id` | number | `cyb_skill.id` |
| `data[].name` | string | `cyb_skill.name` |

### Empty catalog still success

```json
{ "status": true, "messages": "skill list", "data": [] }
```

### Common Node mistakes

| Mistake | Symptom |
|---------|---------|
| Key `message` instead of `messages` | FE string-match fails |
| Message `"Skill List"` | Toast / debug mismatch |
| Returning all skills (no limit 30) | Heavy payload |
| Shape `{ id, skill, rating }` (employee shape) | Dropdown blank labels |
| Requiring JWT | Public screens fail |

---

# 2. GET `/wapi/general/skill/:id`

**Node:** `skillByCategory` → `skillByCategoryService` → `skillRepositery.findByCategory`  
**Auth:** Public  
**Path `:id`:** skill **category** id, **not** skill id.

### Intended SQL (legacy PHP)

```sql
SELECT * FROM skill
WHERE category = :id AND status = 1;
```

Map:

| Response key | DB |
|--------------|-----|
| `id` | `skill.id` |
| `department` | `skill.category` (same as path) |
| `name` | `skill.name` |

### Success — **LOCKED**

```json
{
  "status": true,
  "messages": "",
  "data": [
    { "id": 5, "department": 2, "name": "React" }
  ]
}
```

> `messages` is **empty string** `""`, not `"skill list"`.

### Production DB note

Live `cyb_skill` columns are currently:

`id, name, status, user_id, user_defined, create_date, modify_date`

There is **no `category` column**. Node therefore returns:

```json
{ "status": true, "messages": "", "data": [] }
```

until the schema is migrated. Envelope keys stay correct so FE does not break on shape.

---

# 3. GET `/wapi/employee/all-skill`

**Node:** `employee.route.ts` → `skill.controller.allSkill` → `skill.service.allSkillService`  
**Auth:** JWT  
**Acting user:** `req.auth.id` (honours `X-Company`)

### Logic

```text
1. userId = req.auth.id
2. Fetch cyb_user_skill WHERE status=1 AND user=userId ORDER BY rating DESC
3. LEFT JOIN cyb_skill for name
4. For each row:
     - SKIP if rating is empty / 0 / null
     - Push:
         id     = user_skill.id     ← NOT skill.id
         skill  = skill.name OR ''  ← STRING name, NOT numeric FK
         rating = user_skill.rating
5. Always return status true with data array (even if empty)
```

### Success — **LOCKED KEYS**

```json
{
  "status": true,
  "messages": "skill History",
  "data": [
    {
      "id": 88,
      "skill": "React",
      "rating": 4
    }
  ]
}
```

| Key | Type | Source | Frontend use |
|-----|------|--------|--------------|
| `messages` | string | exact `"skill History"` | |
| `data[].id` | number | **`cyb_user_skill.id`** | `DELETE employee/delete-skill/:id` |
| `data[].skill` | **string** | `cyb_skill.name` (or `""`) | label display |
| `data[].rating` | number | `cyb_user_skill.rating` | stars / score |

### Empty list still success

```json
{ "status": true, "messages": "skill History", "data": [] }
```

### Exception

```json
{ "status": false, "messages": "Access denied" }
```

### Critical differences vs `general/all-skill`

| | `general/all-skill` | `employee/all-skill` |
|--|---------------------|----------------------|
| Auth | Public | JWT |
| Table | `cyb_skill` | `cyb_user_skill` + join `cyb_skill` |
| Item keys | `id`, `name` | `id`, **`skill`**, `rating` |
| `id` means | skill master id | **user_skill row id** |
| Name field | `name` | **`skill`** (string) |
| `messages` | `"skill list"` | `"skill History"` |
| Limit | 30 random | all rated rows |
| Order | `RAND()` | `rating DESC` |

### Related write/delete

| Method | Route | Node | Notes |
|--------|-------|------|-------|
| POST | `/wapi/employee/add-skill` | `addSkill` | body `skill` (id **or** name string), `rating`; upsert on `(user, skill)` |
| DELETE | `/wapi/employee/delete-skill/:id` | `deleteSkill` | `:id` = **`user_skill.id`** |

`add-skill` success: `"Successfully added"` (HTTP **200**).

After add, list must show **name string** in `skill`, not the id you posted.

---

# 4. GET `/wapi/employee/allLanguage`

**Node:** `allLanguageList` → `allLanguageListService` → `languageRepositery.getAllByUserId`  
**Auth:** JWT  
**Acting user:** `req.auth.id`

### Logic

```sql
SELECT ul.*, lg.name AS language_name
FROM cyb_user_language AS ul
LEFT JOIN cyb_languages AS lg ON ul.language = lg.id
WHERE ul.status = 1
  AND ul.user = :userId
  AND ul.is_deleted = 0
ORDER BY lg.name ASC;
```

### Success — **LOCKED KEYS**

```json
{
  "status": true,
  "messages": "Language List",
  "data": [
    {
      "id": 1,
      "user": 42,
      "language": 5,
      "verbal": 3,
      "written": 4,
      "status": 1,
      "create_date": "2024-01-15 10:30:00",
      "modify_date": "2024-01-15 10:30:00",
      "language_name": "English"
    }
  ]
}
```

| Key | Type | Source | Notes |
|-----|------|--------|-------|
| `messages` | string | exact `"Language List"` | capital L on both words |
| `data[].id` | number | `cyb_user_language.id` | used by delete |
| `data[].user` | number | `cyb_user_language.user` | acting user id |
| `data[].language` | number | `cyb_user_language.language` | **FK id**, not name |
| `data[].verbal` | number | proficiency (int in this DB) | |
| `data[].written` | number | proficiency (int in this DB) | |
| `data[].status` | number | raw DB | |
| `data[].create_date` / `modify_date` | string/null | | |
| `data[].language_name` | string/null | `cyb_languages.name` | display label |

> **DB note:** production `verbal` / `written` are **int**, not free-text strings. Zod accepts coerced numbers on write.

### Empty list

```json
{ "status": true, "messages": "Language List", "data": [] }
```

### Exception

```json
{ "status": false, "messages": "Access denied" }
```

### Common Node mistakes

| Mistake | Symptom |
|---------|---------|
| Shape like master list `{ id, name }` only | Profile UI missing verbal/written |
| Key `name` instead of `language_name` | Labels blank |
| Key `language` as name string + `languageId` FK | FE expects FK in `language` |
| Ordering by `create_date` instead of name ASC | Different sort vs old app |
| Message `"language list"` (lowercase) | String mismatch |
| Confusing with `GET general/languageList` | Master catalog, not user rows |

### Related write/delete

| Method | Route | Node | Notes |
|--------|-------|------|-------|
| POST | `/wapi/employee/add_language` | `addLanguage` | body `language` (id **or** name), `verbal`, `written`; upsert |
| DELETE | `/wapi/employee/language/:id` | `deleteLanguage` | hard delete by `user_language.id` |

Add success: `"Successfully added"` (including upsert update path).  
List after add must show **`language` as int FK** + **`language_name` string**.

---

# 5. GET `/wapi/general/languageList`

**Node:** `languageList` → `getLanguagesService`  
**Auth:** Public  

### Success — **LOCKED**

```json
{
  "status": true,
  "messages": "language list",
  "data": [
    { "id": 5, "name": "English" },
    { "id": 8, "name": "Hindi" }
  ]
}
```

```sql
SELECT id, name FROM cyb_languages WHERE status = 1;
```

| | `general/languageList` | `employee/allLanguage` |
|--|------------------------|------------------------|
| Who | master lookup | current user’s rows |
| Item | `{ id, name }` | full row + `language_name` |
| `messages` | `"language list"` | `"Language List"` |

---

## Response key freeze (frontend)

### `GET general/all-skill`

```
status, messages, data
data[].id
data[].name
```

### `GET general/skill/:id`

```
status, messages, data
data[].id
data[].department
data[].name
```

### `GET employee/all-skill`

```
status, messages, data
data[].id          // user_skill.id
data[].skill       // skill NAME string
data[].rating
```

### `GET employee/allLanguage`

```
status, messages, data
data[].id
data[].user
data[].language       // FK int
data[].verbal
data[].written
data[].status
data[].create_date
data[].modify_date
data[].language_name  // display string
```

### `GET general/languageList`

```
status, messages, data
data[].id
data[].name
```

---

## Debug playbook when Node “gives wrong answer”

### Step 1 — Confirm which URL the FE actually calls

```text
general/all-skill     → catalog {id, name}
employee/all-skill    → profile {id, skill, rating}
employee/allLanguage  → profile languages
general/languageList  → language dropdown
```

If Node implements one handler for both skill routes, that is almost certainly the bug.

### Step 2 — Diff keys (not just status)

```bash
# Public catalog
curl -s "$BASE/wapi/general/all-skill" | jq '{keys: keys, messages, sample: .data[0]}'

# My skills (JWT)
curl -s "$BASE/wapi/employee/all-skill" \
  -H "Authorization: Bearer $TOKEN" | jq '.messages, .data[0]'

# My languages
curl -s "$BASE/wapi/employee/allLanguage" \
  -H "Authorization: Bearer $TOKEN" | jq '.messages, .data[0]'
```

### Step 3 — Assert invariants

**employee/all-skill**

- [ ] `messages === "skill History"`
- [ ] every item has core keys `id`, `skill`, `rating`
- [ ] `typeof skill === "string"` (name)
- [ ] `id` is usable in `DELETE /wapi/employee/delete-skill/{id}`
- [ ] rows with empty/`0` rating are absent
- [ ] sorted by rating descending

**general/all-skill**

- [ ] `messages === "skill list"` (key is **messages**, not message)
- [ ] items are `{ id, name }` only
- [ ] length ≤ 30
- [ ] no auth required

**employee/allLanguage**

- [ ] `messages === "Language List"`
- [ ] `language` is FK (number), `language_name` is label
- [ ] `verbal` and `written` present
- [ ] ordered by `language_name` ASC

### Step 4 — Common wrong Node shapes

**Wrong (employee all-skill as catalog):**

```json
{
  "status": true,
  "messages": "skill list",
  "data": [{ "id": 12, "name": "React" }]
}
```

**Right (employee all-skill):**

```json
{
  "status": true,
  "messages": "skill History",
  "data": [{ "id": 88, "skill": "React", "rating": 4 }]
}
```

**Wrong (allLanguage as dropdown / swapped keys):**

```json
{
  "status": true,
  "messages": "Language List",
  "data": [{ "id": 1, "language": "English", "languageId": 5 }]
}
```

**Right (allLanguage):**

```json
{
  "status": true,
  "messages": "Language List",
  "data": [{
    "id": 1,
    "user": 42,
    "language": 5,
    "verbal": 3,
    "written": 4,
    "status": 1,
    "create_date": "2024-01-15 10:30:00",
    "modify_date": "2024-01-15 10:30:00",
    "language_name": "English"
  }]
}
```

---

## Quick curl fixtures

```bash
BASE=http://localhost:3000
TOKEN=eyJ...

# Public skill sample (random 30)
curl -s "$BASE/wapi/general/all-skill"

# Skills by category/department id=2 (may be empty until category column exists)
curl -s "$BASE/wapi/general/skill/2"

# Language master dropdown
curl -s "$BASE/wapi/general/languageList"

# My profile skills
curl -s "$BASE/wapi/employee/all-skill" \
  -H "Authorization: Bearer $TOKEN"

# My languages
curl -s "$BASE/wapi/employee/allLanguage" \
  -H "Authorization: Bearer $TOKEN"

# Add skill (id or name)
curl -s -X POST "$BASE/wapi/employee/add-skill" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"skill":"React","rating":4}'

# Delete skill by user_skill.id
curl -s -X DELETE "$BASE/wapi/employee/delete-skill/88" \
  -H "Authorization: Bearer $TOKEN"

# Add language
curl -s -X POST "$BASE/wapi/employee/add_language" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language":5,"verbal":3,"written":4}'

# Delete language by user_language.id
curl -s -X DELETE "$BASE/wapi/employee/language/1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Fixes applied in Node (this debug pass)

| Bug | Symptom | Fix |
|-----|---------|-----|
| `general/all-skill` used key `message` + `"Skill List"` | FE mismatch | `messages: "skill list"` |
| `general/languageList` used key `message` | FE mismatch | `messages: "language list"` |
| `employee/allLanguage` returned `language` as name + `languageId` | Forms/labels wrong | PHP shape: `language` FK + `language_name` |
| allLanguage ordered by create_date | Different sort | `ORDER BY languages.name ASC` |
| employee all-skill included rating 0/null | Ghost skills | Filter empty ratings |
| skill name null instead of `""` | Inconsistent labels | Coalesce to `""` |
| add-skill HTTP 201 | Non-PHP status | HTTP 200 |
| language upsert `"Successfully updated"` | Message mismatch | Always `"Successfully added"` |
| Controllers used `user_id` only | Company context wrong | Use `req.auth.id` |
| skill category always empty | Expected until schema has `category` | Documented; envelope stays correct |

---

## Related API docs

- Project overview: `src/api-ai-document/README.md`
- Language module: `src/api-ai-document/employee-document-language-endpoints.md`
- Misc skill-by-category note: `src/api-ai-document/remaining-misc-crud-endpoints.md`
