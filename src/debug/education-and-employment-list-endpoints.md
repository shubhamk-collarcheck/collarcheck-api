# Debug Guide — educationDataList & employmentList (Node)

**Purpose:** Contract source-of-truth for debugging the Node.js CollarCheck API. Frontend depends on these response keys and message strings — **do not rename keys**.

**Project stack:** Express + Drizzle (MySQL) · base path `/wapi`

**Layering (mandatory — see root `AGENTS.md`):**

```
routes → controllers → services → repositery → db
```

Services must **not** import `db` or write Drizzle. SQL only in `src/repositery/**`.

**Node source files (authoritative for this repo):**

| Layer | Files |
|-------|--------|
| Routes | `src/routes/general.route.ts`, `src/routes/dashboard.route.ts` |
| Controllers | `src/controllers/general.controller.ts`, `src/controllers/dashboard.controller.ts` |
| Services | `src/services/general.service.ts` (`getEducationDataService`, `employmentListService` — orchestration + mapping only) |
| Repositery | `general.repositery.ts`, `institution.repositery.ts`, `course.repositery.ts`, `department.repositery.ts`, `designation.repositery.ts`, `skill.repositery.ts`, `employee.repositery.ts` |
| Schema | `src/db/schema.ts` → `cybInstitutions`, `cybCourses`, `cybCourseType`, `cybCountry`, … |
| Auth helpers | `src/services/users.service.ts` (`user_verified`) |

| Route | Auth | Node handler | What it returns |
|-------|------|--------------|-----------------|
| `GET /wapi/general/educationDataList` | **Public** | `educationDataList` → `getEducationDataService` | Aggregated education dropdowns |
| `GET /wapi/dashboard/employmentList` | **Public** | `employmentList` → `employmentListService` | Aggregated employment-page dropdowns |

**Auth:** None (public). JWT not required; do not reject missing tokens.

---

## Global envelope (must match)

| Case | HTTP | Body shape |
|------|------|------------|
| Success (always for these two) | **200** | `{ "status": true, "messages": string, "data": object }` |

- Key is always **`messages`** (plural), not `message`.
- **`status` is always `true`** — empty child lists still succeed.
- `data` is always an **object** (nested lists), never a top-level array.

### Exact top-level `messages` (LOCKED)

| Endpoint | `messages` |
|----------|------------|
| `educationDataList` | `"Data List"` |
| `employmentList` | `""` (empty string) |

> **Bug magnet #1:** Returning `"Employment List"` / `"Data list"` / using key `message`.

---

## Architecture: aggregators compose child lists

```text
educationDataList
  ├─ institutionList  (institutions, id ASC, limit 30, +image)
  ├─ courseList       (courses, name ASC, limit 30, +image)
  ├─ courseTypeList   (course_type, status=1)
  └─ countryList      (country, India id=101 first)

employmentList
  ├─ designationList     (designation, RAND 30)
  ├─ departmentList      (department, RAND 30)
  ├─ salaryList          (salary, status=1)
  ├─ companyList         (claimed companies, tier-shuffle by employment count)
  ├─ userList            (employees, random window of 10)
  ├─ optional ?id= prepend into companyList or userList
  ├─ skillList           (skill, RAND 30)
  └─ employementTypeList ← spelling! (employement_type)
```

Node calls shared service functions (not HTTP-to-self); **output shape must still match**.

---

## Routes summary

| # | Method | Route | Handler | Success `messages` | Auth |
|---|--------|-------|---------|--------------------|------|
| 1 | GET | `/wapi/general/educationDataList` | `educationDataList` | `Data List` | Public |
| 2 | GET | `/wapi/dashboard/employmentList` | `employmentList` | `""` | Public |

Related public child routes (same shapes as nested `data` pieces):

| Route | Nested key used by |
|-------|--------------------|
| `GET /wapi/general/courseList` | education → `courseList` |
| `GET /wapi/general/courseTypeList` | education → `courseTypeList` |
| `GET /wapi/general/countryList` | education → `countryList` |
| `GET /wapi/general/all-designation` | employment → `designationList` |
| `GET /wapi/general/department` | employment → `departmentList` |
| `GET /wapi/general/salaryList` | employment → `salaryList` |
| `GET /wapi/general/all-skill` | employment → `skillList` |
| `GET /wapi/general/employement-type` | employment → `employementTypeList` |

> `institutionList` is **not** a public route. Only exposed via `educationDataList`.

---

# 1. GET `/wapi/general/educationDataList`

**Node:** `general.route.ts` → `educationDataList` → `getEducationDataService`  
**Auth:** Public  
**Query / body:** None

### Success — **LOCKED KEYS**

```json
{
  "status": true,
  "messages": "Data List",
  "data": {
    "institutionList": [
      { "id": 1, "name": "IIT Delhi", "image": "https://s3.example.com/logo.png" }
    ],
    "courseList": [
      { "id": 2, "name": "B.Tech", "image": "https://s3.example.com/course.png" }
    ],
    "courseTypeList": [
      { "id": 1, "name": "Full Time" }
    ],
    "countryList": [
      { "id": 101, "name": "India" },
      { "id": 231, "name": "United States" }
    ]
  }
}
```

| Key | Type | Notes |
|-----|------|-------|
| `messages` | string | exact `"Data List"` |
| `data.institutionList` | array | always present (may be `[]`) |
| `data.courseList` | array | always present |
| `data.courseTypeList` | array | always present |
| `data.countryList` | array | always present; **India `id=101` first** when present |

> All four keys **must exist**. Omitting a key breaks FE destructuring.

### Child rules

| List | Table | Order / limit | Item shape |
|------|-------|---------------|------------|
| `institutionList` | `cyb_institutions` status=1 | **`id ASC` LIMIT 30** | `{ id, name, image }` image = S3 prefix or `""` |
| `courseList` | `cyb_courses` status=1 | **name ASC LIMIT 30** | `{ id, name, image }` |
| `courseTypeList` | `cyb_course_type` status=1 | no order/limit | `{ id, name }` |
| `countryList` | `cyb_country` status=1 | force id 101 first | `{ id, name }` |

---

# 2. GET `/wapi/dashboard/employmentList`

**Node:** `dashboard.route.ts` → `employmentList` → `employmentListService`  
**Auth:** Public  

### Query params

| Param | Required | Notes |
|-------|----------|-------|
| `id` | no | Optional **user id** to prepend into `userList` or `companyList` |

```
GET /wapi/dashboard/employmentList
GET /wapi/dashboard/employmentList?id=42
```

### Success — **LOCKED KEYS**

```json
{
  "status": true,
  "messages": "",
  "data": {
    "designationList": [{ "id": 5, "name": "Software Engineer" }],
    "departmentList": [{ "id": 3, "name": "Engineering" }],
    "salaryList": [{ "id": 1, "name": "0-3 LPA" }],
    "companyList": [
      {
        "id": 100,
        "individual_id": "CMP001",
        "company_logo": "https://s3.example.com/logo.png",
        "company": "Acme Corp",
        "contact_person": "Jane Doe",
        "city_name": "Bengaluru",
        "state_name": "Karnataka",
        "industry_name": "IT",
        "is_verified": true,
        "exploreTalent": 1,
        "total_employment": 42
      }
    ],
    "userList": [
      {
        "id": 200,
        "individual_id": "EMP001",
        "profile": "https://s3.example.com/p.png",
        "name": "John Smith",
        "slug": "john-smith",
        "designation_name": "Developer",
        "company_name": "Acme Corp",
        "userRating": 4.2,
        "is_verified": false
      }
    ],
    "skillList": [{ "id": 12, "name": "React" }],
    "employementTypeList": [{ "id": 1, "name": "Full Time" }]
  }
}
```

### Key spelling that must stay exact

| Key | Correct? | Wrong variants |
|-----|----------|----------------|
| `employementTypeList` | **yes** (legacy typo) | `employmentTypeList` |
| `company` (not `name`) on company items | **yes** | `name`, `company_name` |
| `company_logo` | **yes** | `profile`, `logo` |
| `userRating` | **yes** | `rating`, `user_rating` |
| `exploreTalent` | **yes** | `explore_talent` |
| `messages`: `""` | **yes** | `"Employment List"` |
| `is_verified` | **boolean** | `0`/`1` numbers |

---

## 2a–c. Static lists

| Nested key | Source | SQL notes | Item |
|------------|--------|-----------|------|
| `designationList` | `getAllDesignationService` | `status=1 ORDER BY RAND() LIMIT 30` | `{ id, name }` |
| `departmentList` | `allDepartmentService` | `status=1 ORDER BY RAND() LIMIT 30` | `{ id, name }` |
| `salaryList` | `getSalaryService` | `status=1` no limit | `{ id, name }` |
| `skillList` | `allSkillService` | `status=1 ORDER BY RAND() LIMIT 30` | `{ id, name }` |
| `employementTypeList` | `allEmploymentTypeService` | table `cyb_employement_type` | `{ id, name }` |

---

## 2d. `companyList`

### Default list (not pure random)

```text
1. SELECT claimed companies (user_type=2, claim_status=1, status=1, is_deleted=0)
2. total_employment = COUNT experiences for company (status=1, is_deleted=0, user not deleted)
3. ORDER BY total_employment DESC LIMIT 30  (pool)
4. Tier-shuffle: split pool into 3 tiers, shuffle each, merge, take 10
```

| Response key | Source |
|--------------|--------|
| `id` | `cyb_user.id` |
| `individual_id` | |
| `company_logo` | S3+profile if profile else social_image as-is |
| `company` | `fname` (company display name) |
| `contact_person` | |
| `city_name` / `state_name` / `industry_name` | joins |
| `is_verified` | `user_verified(id)` **boolean** |
| `exploreTalent` | `1` if active job exists else `0` |
| `total_employment` | experience count subquery |

If default list empty and no company prepend → **`companyList` key may be omitted** (PHP behaviour). Node matches that.

### Optional prepend when `?id=` is company (`user_type != 1`)

Partial object only:

```json
{
  "id": 100,
  "individual_id": "CMP001",
  "company_logo": "https://...",
  "company": "Acme Corp",
  "contact_person": "Jane Doe"
}
```

---

## 2e. `userList`

### Default list

```text
1. count employees (user_type=1, status=1, is_deleted=0)
2. offset = random in [0, max(0, count-10)]
3. SELECT LIMIT 10 OFFSET offset ORDER BY id
```

| Response key | Source |
|--------------|--------|
| `id` | |
| `individual_id` | |
| `profile` | S3+profile or social_image |
| `name` | **`full_name`** (default list) |
| `slug` | |
| `designation_name` | via `current_possition` |
| `company_name` | company `fname` via `current_company` |
| `userRating` | overall profile score (avg positive per-company employment scores) |
| `is_verified` | `user_verified(id)` **boolean** |

### Optional prepend when `?id=` is employee (`user_type == 1`)

Partial object:

```json
{
  "id": 200,
  "individual_id": "EMP001",
  "profile": "https://...",
  "name": "John Smith"
}
```

Name here is **`fname + ' ' + lname`**, not `full_name`.

---

## Image / S3 rules

| Field source | Rule |
|--------------|------|
| `user.profile` set | `S3_PREFIX + profile` |
| `user.profile` empty | `social_image` as-is (no prefix) |
| course/institution `image` set | `S3_PREFIX + image` |
| course/institution `image` empty | `""` |

---

## Debug playbook

```bash
# Education
curl -sS "$BASE/wapi/general/educationDataList" | jq '{status,messages,keys:(.data|keys),country0:(.data.countryList[0]),inst:(.data.institutionList[0])}'

# Employment
curl -sS "$BASE/wapi/dashboard/employmentList" | jq '{status,messages,keys:(.data|keys),co:(.data.companyList[0]),u:(.data.userList[0]),hasTypo:(.data|has("employementTypeList"))}'

# Prepend
curl -sS "$BASE/wapi/dashboard/employmentList?id=EMPLOYEE_ID" | jq '.data.userList[-1]'
curl -sS "$BASE/wapi/dashboard/employmentList?id=COMPANY_ID" | jq '.data.companyList[-1]'
```

**Assert:**

1. `educationDataList.messages === "Data List"` (key `messages`)
2. Four nested education keys always present
3. First country is India (`id === 101`) when India exists
4. `employmentList.messages === ""`
5. Key is `employementTypeList` (typo)
6. Company items: `company`, `company_logo`, boolean `is_verified`, `exploreTalent` 0/1, `total_employment`
7. User items: `name`, `userRating`, boolean `is_verified`
8. With `?id=`, last element of the appropriate list is the partial prepend object

---

## Fixes applied in Node (this debug pass)

| Bug | Symptom | Fix |
|-----|---------|-----|
| `educationDataList` used key `message` | FE contract fail | `messages: "Data List"` |
| Missing `countryList` in education data | FE crash / empty countries | Include India-first country list |
| Institutions ordered by name | Different first 30 unis | `ORDER BY id ASC LIMIT 30` |
| Course types limited to 30 + name order | Diff vs PHP | status=1 only, no limit/order |
| `employmentList` used key `message` | Contract fail | `messages: ""` |
| Designations ordered by id | Not random sample | `ORDER BY RAND() LIMIT 30` |
| Companies missing `claim_status=1` | Ghost/unclaimed companies | Filter claimed only |
| `total_employment` from `no_of_employee` | Wrong counts | Experience count subquery |
| Companies ordered by id / pure random | Quality mismatch | Tier-shuffle by employment DESC |
| `is_verified` as 0/1 | Type mismatch | `user_verified()` boolean |
| `userRating` from profile `percentage` | Wrong scores | Overall employment score avg |
| Prepend full shapes + full_name | JSON/string mismatch | Partial objects; employee name = fname+lname |
| Always emit empty companyList/userList | Diff vs PHP | Omit keys when empty |

---

## Related endpoints (do not confuse)

| Need | Call | Not this |
|------|------|----------|
| Education form dropdowns | `general/educationDataList` | Employee education CRUD history |
| Employment form dropdowns | `dashboard/employmentList` | `employee/all-employement` experience list |
| Master skills only | `general/all-skill` | Nested same shape under `skillList` |
| Dashboard home aggregates | `dashboard/dataList` | Different keys |

---

## Quick curl fixtures

```bash
BASE=http://localhost:3000

curl -sS "$BASE/wapi/general/educationDataList"
curl -sS "$BASE/wapi/dashboard/employmentList"
curl -sS "$BASE/wapi/dashboard/employmentList?id=42"

# Children (standalone)
curl -sS "$BASE/wapi/general/courseList"
curl -sS "$BASE/wapi/general/courseTypeList"
curl -sS "$BASE/wapi/general/countryList"
curl -sS "$BASE/wapi/general/all-designation"
curl -sS "$BASE/wapi/general/department"
curl -sS "$BASE/wapi/general/salaryList"
curl -sS "$BASE/wapi/general/all-skill"
curl -sS "$BASE/wapi/general/employement-type"
```
