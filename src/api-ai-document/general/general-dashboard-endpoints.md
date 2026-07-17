# General & Dashboard List Endpoints

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base paths:** `/wapi/dashboard`, `/wapi/general`  
> **Route files:** `dashboard.route.ts`, `general.route.ts`, `root.route.ts`  
> **Controllers:** `dashboard.controller.ts`, `general.controller.ts`  
> **Services:** `dashboard.service.ts`, `general.service.ts`, `job.service.ts`  

Public list endpoints generally do **not** require JWT unless noted.  
Auth endpoints use `Authorization` middleware.

## Routes Summary

### Dashboard / Data Aggregation

| Method | Route | Controller | Source File | Description |
|--------|-------|---------|-------------|-------------|
| GET | `dashboard/dataList` | `dataList` | `controllers/dashboard.controller.ts` | Aggregated dropdowns for dashboard |
| GET | `dashboard/employmentList` | `employmentList` | `controllers/dashboard.controller.ts` | Aggregated dropdowns for employment page |
| GET | `dashboard/jobDataList` | `jobDataList` | `controllers/general.controller.ts` | Aggregated dropdowns for job page |
| GET | `dashboard/jobFilterDataList` | `jobFilterDataList` | `controllers/general.controller.ts` | Dynamic filter data for job list (by slug/type) |
| GET | `general/employeeFilterDataList` | `employeeFilterDataList` | `controllers/general.controller.ts` | Dynamic filter data for employee search |

### Dropdown / Reference Lists

| Method | Route | Controller | DB Table | Notes |
|--------|-------|---------|----------|-------|
| GET | `general/work-status` | `allWorkType` | `cyb_work_type` | |
| GET | `general/employement-type` | `allEmploymentType` | `cyb_employement_type` | |
| GET | `general/course-type` | `allCourseType` | `cyb_course_type` | |
| GET | `general/department` | `allDepartment` | `cyb_department` | RAND(), limit 30 |
| GET | `general/jobType` | `jobTypeList` | `cyb_job_mode` | |
| GET | `general/all-skill` | `allSkill` | `cyb_skill` | RAND(), limit 30 |
| GET | `general/city` | `getAllCities` | `cyb_cities` | Optional `?state=` filter; limit 100 |
| GET | `general/allcity/:stateId` | `getCityById` | `cyb_cities` | Cities by state ID |
| GET | `general/state` | `getAllStates` | `cyb_state` | Optional `?country=` filter |
| GET | `general/turnover` | `allturnover` | `cyb_turnover` | |
| GET | `general/period_list` | `noticePeriodList` | `cyb_notice_period` | Required `?type=` filter |
| GET | `general/companysize` | `allcompanysize` | `cyb_company_size` | |
| GET | `general/languageList` | `languageList` | `cyb_languages` | |
| GET | `general/industryList` | `industryList` | `cyb_industries` | limit 30 |
| GET | `general/salaryList` | `salaryList` | `cyb_salary` | |
| GET | `general/benefitList` | `benefitList` | `cyb_benefits` | Includes S3 `image` field |
| GET | `general/roleTypeList` | `roleTypeList` | `cyb_role_types` | |
| GET | `general/jobExperienceList` | `jobExperienceList` | `cyb_job_experiences` | |
| GET | `general/accomodationList` | `accomodationList` | `cyb_accomodation` | GET only |
| GET | `general/countryList` | `countryListController` | `cyb_country` | India (id=101) always first |
| GET | `general/courseList` | `courseList` | `cyb_courses` | Includes S3 `image`, limit 30 |
| GET | `general/courseTypeList` | `courseTypeList` | `cyb_course_type` | |
| GET | `general/educationDataList` | `educationDataList` | (aggregated) | institutionList + courseList + courseTypeList + countryList |
| GET | `general/all-designation` | `alldesignation` | `cyb_designation` | RAND(), limit 30 |

### Search / Discovery

| Method | Route | Controller | Description |
|--------|-------|---------|-------------|
| GET | `general/all-job` | `allJob` | Job search with filters (MySQL search via `job.service.ts`) |
| GET | `general/job-detail/:slug` | `job_detail` | Job detail by slug |
| GET | `general/suggestion/:usertype/:keyword` | `searchSuggestion` | Search suggestions |
| GET | `general/globalSearch` | `globalSearch` | Global search (users + companies + jobs) |
| GET | `general/ratingFilter` | `ratingFilter` | Filter reviews by employment |
| GET | `general/starRatingEmployies/:star` | `starRatingEmployees` | Star-rated employees |
| GET | `general/user-profile/:slug` | `userProfile` | Public user profile by slug |
| GET | `people-list-signup` | `peopleListSignup` | Public people list (`/wapi/people-list-signup`, query `user_id`) |
| GET | `people-list` | `peopleList` | Auth people list (`/wapi/people-list`) |
| GET | `general/skill/:id` | `skillByCategory` | Skills by `cyb_skill.category` |

### Misc

| Method | Route | Controller | Description |
|--------|-------|---------|-------------|
| POST | `general/add-suggestion` | `addSuggestion` | Submit a suggestion (inserts into `cyb_suggestion`) |
| GET | `general/inviteDetail/:token` | `inviteDetail` | Fetch invite details from `cyb_company_invite` |
| GET | `general/verify-document-before-registration` | — | **NOT IMPLEMENTED** (OTP/KYC scope) |
| GET | `general/verify-gst-before-registration` | — | **NOT IMPLEMENTED** (OTP/KYC scope) |

> **Note:** `general/skill/:id` is implemented; Drizzle schema includes optional `category` on `cyb_skill`.

---

## 1. GET `dashboard/dataList`

**Controller:** `dataList` — `src/controllers/dashboard.controller.ts` (service: `dataListService` in `src/services/dashboard.service.ts`)

Aggregates multiple dropdown lists for the dashboard: work types, random companies (limit 20), designations, accommodation, countries.

**Response:**
```json
{
  "status": true,
  "data": {
    "employementList": [{"id":1, "name":"Full Time"}, ...],
    "companyList": [{"id":1, "company_logo":"...", "company":"Acme", "contact_person":"..."}],
    "designationList": [{"id":1, "name":"Engineer"}, ...],
    "accomodationList": [{"id":1, "name":"Hostel"}, ...],
    "countryList": [{"id":101, "name":"India"}, ...]
  }
}
```
---

## 2. GET `dashboard/employmentList`

**Controller:** `employmentList` — `src/controllers/dashboard.controller.ts` (service: `employmentListService` in `src/services/general.service.ts`)

Aggregates dropdowns for employment page: designations, departments, salaries, default companies (limit 10 with verification/exploreTalent), default users (limit 10 with ratings), skills, employment types. Optionally prepends the user identified by `?id=` to the appropriate list.

**Query Params:** `id` (optional — current user to prepend)

**Response:**
```json
{
  "status": true,
  "data": {
    "designationList": [...],
    "departmentList": [...],
    "salaryList": [...],
    "companyList": [{"id":1, "company":"Acme", "is_verified":true, "exploreTalent":1, "total_employment":5, ...}],
    "userList": [{"id":1, "name":"John", "userRating":4.2, "is_verified":true, ...}],
    "skillList": [...],
    "employementTypeList": [...]
  }
}
```
---

## 3. GET `dashboard/jobDataList`

**Controller:** `jobDataList` — `src/controllers/general.controller.ts` (service: `jobDataListService` in `src/services/general.service.ts`)

Aggregates dropdowns for job posting/search: industries, role types, salaries, tags (empty), departments, job experiences, skills, job modes, designations, countries.

**Response:**
```json
{
  "status": true,
  "data": {
    "industryList": [...],
    "roleTypeList": [...],
    "salaryList": [...],
    "tagList": [],
    "departmentList": [...],
    "jobExperienceList": [...],
    "skillList": [...],
    "jobModeList": [...],
    "designationList": [...],
    "countryList": [...]
  }
}
```
---

## 4. GET `dashboard/jobFilterDataList`

**Controller:** `jobFilterDataList` — `src/controllers/general.controller.ts` (service: `jobFilterDataListService` in `src/services/general.service.ts`)

Dynamic filter data for job list page. Reads `job_meta` by `?slug=` to get pre-selected country/state/city IDs, then builds filtered dropdowns for designations, departments, skills, industries, salaries, experiences, companies, role types, benefits, and job modes that exist within those geographic filters.

**Query Params:** `slug` (job meta slug), `type` (jobs|companies — determines state list source)

**DB Tables:** `job_meta`, `job_mode`, `role_types`

**Response:**
```json
{
  "status": true,
  "data": {
    "countryList": [...],
    "stateList": [...],
    "cityList": [...],
    "designationList": [...],
    "departmentList": [...],
    "skillList": [...],
    "industryList": [...],
    "salaryList": [...],
    "jobExperienceList": [...],
    "companyList": [...],
    "roleTypeList": [...],
    "company_benefit": [...],
    "jobModeList": [...]
  }
}
```
---

## 5. GET `general/employeeFilterDataList`

**Controller:** `employeeFilterDataList` — `src/controllers/general.controller.ts` (service: `employeeFilterDataListService` in `src/services/general.service.ts`)

Dynamic filter data for employee search page. Builds filtered lists from actual employee data: states with employees, industries, designations, departments, employment types, salaries, skills (merged from `user_skill` and `user_experience.skill` JSON), courses, course types. Accommodation and university lists are currently empty (commented out).

**Response:**
```json
{
  "status": true,
  "data": {
    "accomodationList": [],
    "work_typeList": [...],
    "universityList": [],
    "stateList": [...],
    "industryList": [...],
    "designationList": [...],
    "departmentList": [...],
    "employment_typeList": [...],
    "salaryList": [...],
    "skillList": [...],
    "courseList": [...],
    "courseTypeList": [...]
  }
}
```
---

## 6–28. Dropdown / Reference List Endpoints

All follow the same pattern: `SELECT id, name FROM {table} WHERE status = 1`. Returns `{ "status": true, "data": [{"id":1, "name":"..."}] }`.

| # | Route | Table | Extra |
|---|-------|-------|-------|
| 6 | `general/work-status` | `work_type` | |
| 7 | `general/employement-type` | `employement_type` | |
| 8 | `general/course-type` | `course_type` | |
| 9 | `general/department` | `department` | RAND(), limit 30 |
| 10 | `general/jobType` | `job_mode` | |
| 11 | `general/all-skill` | `skill` | RAND(), limit 30 |
| 12 | `general/skill/{id}` | `skill` | WHERE `category = id`. Response includes `department` field |
| 13 | `general/city` | `cities` | Optional `?state=` filter; limit 100 if no state |
| 14 | `general/allcity/{id}` | `cities` | WHERE `state = id` |
| 15 | `general/state` | `state` | Optional `?country=` filter |
| 16 | `general/turnover` | `turnover` | |
| 17 | `general/period_list` | `notice_period` | Required `?type=` filter |
| 18 | `general/companysize` | `company_size` | |
| 19 | `general/languageList` | `languages` | |
| 20 | `general/industryList` | `industries` | limit 30 |
| 21 | `general/salaryList` | `salary` | |
| 22 | `general/benefitList` | `benefits` | Response includes `image` (S3 URL) |
| 23 | `general/roleTypeList` | `role_types` | |
| 24 | `general/jobExperienceList` | `job_experiences` | |
| 25 | `general/accomodationList` | `accomodation` | GET only |
| 26 | `general/countryList` | `country` | India (id=101) always first via `array_unshift` |
| 27 | `general/courseList` | `courses` | Includes `image` (S3 URL), limit 30 |
| 28 | `general/courseTypeList` | `course_type` | |
| 29 | `general/educationDataList` | (aggregated) | Calls `institutionList()` + `courseList()` + `courseTypeList()` + `countryList()` internally |
| 30 | `general/all-designation` | `designation` | RAND(), limit 30 |

---

## 31. GET `general/all-job`

**Controller:** `allJob` — `src/controllers/general.controller.ts` (service: `allJobService` in `src/services/job.service.ts`)

Job search with extensive filters. Uses MySQL search via `get_search_job_list` (Drizzle); AI search service integration is a `// todo` placeholder. Supports `?job_slug=` for pre-filtered SEO pages (reads `countryId`/`stateId`/`cityId`/`designationId`/`departmentId` from `cyb_job_meta`).

**Query Params:** `keyword`, `state`, `designation`, `department`, `industry`, `employment_type`, `skill`, `company`, `urgent`, `vacancy`, `job_mode`, `experience`, `role_type`, `job_description`, `posted_date`, `closing_date`, `starRating`, `yearExperience`, `id_not_in`, `job_slug`, `limit` (default 16), `offset`

**Response:**
```json
{
  "status": true,
  "data": {
    "alljobList": [
      {
        "id": 1, "job_title": "...", "company_name": "Acme",
        "individual_id": "...", "company_slug": "...",
        "job_description": "...", "profile": "...", "slug": "...",
        "department_name": "...", "experience_name": "...",
        "role_type_name": "...", "job_mode_name": "...",
        "industry_name": "...", "vacancy": 5, "urgent": false,
        "designation_name": "...", "country_name": "...",
        "state_name": "...", "city_name": "...", "salary_name": "...",
        "create_date": "...", "skill": [{"id":1, "name":"PHP"}]
      }
    ],
    "totalJobs": 100,
    "filterApply": 1,
    "filterName": {"department": {"id":1, "name":"..."}, ...},
    "metadata": {...}
  }
}
```
---

## 32. GET `general/job-detail/:slug`

**Controller:** `job_detail` — `src/controllers/general.controller.ts` (service: `get_job_detail_service` in `src/services/job.service.ts`)

Job detail by slug. Returns full job info, related jobs (max 4, same skills), and company detail.

**DB Tables:** `cyb_company_job`, `cyb_user`

**Response:**
```json
{
  "status": true,
  "data": {
    "detail": { "id":1, "job_title":"...", ... },
    "JobList": [{ "id":2, "job_title":"...", ... }],
    "company": { "id":1, "company_name":"...", ... }
  }
}
```
---

## 33. GET `general/suggestion/:slug/:slug`

**Controller:** `searchSuggestion` — `src/controllers/general.controller.ts`

Search suggestions by `usertype` and `keyword`. Queries `cyb_skill` for matching names (limited to 5).

**Response:**
```json
{"status": true, "data": [...]}
```
---

## 34. GET `general/globalSearch`

**Controller:** `globalSearch` — `src/controllers/general.controller.ts` (service: `globalSearchService` in `src/services/general.service.ts`)

Global search across users, companies, and jobs. Uses MySQL search via `globalSearchService` (Drizzle); AI search service integration is a `// todo` placeholder. Returns counts for each type.

**Query Params:** `keyword`, `type` (companies|employees|jobs — empty = all), `limit` (default 6), `offset`, plus all job filter params.

**Response:**
```json
{
  "status": true,
  "data": {
    "companyList": [{"id":1, "fname":"Acme", "profile":"...", "is_verified":true, "exploreTalent":1, ...}],
    "companyListCount": 50,
    "userList": [{"id":1, "name":"John", "profile":"...", "is_verified":true, ...}],
    "userListCount": 100,
    "jobList": [{"id":1, "job_title":"...", ...}],
    "jobListCount": 30
  }
}
```
---

## 35. GET `general/ratingFilter`

**Controller:** `ratingFilter` — `src/controllers/general.controller.ts` (service: `ratingFilterService` in `src/services/general.service.ts`)

Filter reviews for an employment record. Sort by: `order=2` (highest first), `order=3` (lowest first), else newest.

**Query Params:** `employment` (required — experience ID), `order` (optional: 2=highest, 3=lowest)

**Response:**
```json
{"status": true, "data": [{"id":1, "rating":5, "review":"...", ...}]}
```
---

## 36. GET `general/starRatingEmployies/:id`

**Controller:** `starRatingEmployees` — `src/controllers/general.controller.ts` (service: `starRatingEmployeesService` in `src/services/general.service.ts`)

Employees filtered by star rating bucket (computed from `cyb_user.percentage`). Service: `starRatingEmployeesService`.

**Response:** Raw JSON from model (no standard envelope).

---

## 37. GET `general/user-profile/:slug`

**Controller:** `userProfile` — `src/controllers/general.controller.ts` (service: `publicUserProfileService` in `src/services/common-auth.service.ts`)

Public user profile by slug. Returns full profile with employment history (approved + granted-access only), education, skills, languages, certificates, similar users/companies, and account settings.

**DB Tables:** `user`, `user_experience`, `user_education`, `user_skill`, `user_language`, `user_certificate`

**Response:**
```json
{
  "status": true,
  "data": {
    "id": 1, "name": "John Doe", "profile": "...", "slug": "...",
    "employement": [{ "id":1, "company":"Acme", "lists":[...], ... }],
    "education": [{ "id":1, "university":"...", "course":"...", ... }],
    "skill": [{"id":1, "skill":"PHP", "rating":4}],
    "language": [{"id":1, "name":"English", "verbal":"5", "written":"5"}],
    "certificate": [{"id":1, "course":"...", "document":[...]}],
    "similarUsers": [...],
    "similarCompanies": [...],
    "settings": {...}
  }
}
```
---

## 38. GET `people-list-signup`

**Controller:** `peopleListSignup` — `src/controllers/common-auth.controller.ts` (service: `peopleListService`; routes in `src/routes/root.route.ts`)

| Route | Auth |
|-------|------|
| `GET /wapi/people-list-signup` | Public — requires query `user_id` |
| `GET /wapi/people-list` | JWT — uses auth user id |

People list for signup/exploring flow. Reads `user_details.exploring_details` (JSON array of IDs) to get selected users/companies, then returns available users/companies not yet selected.

**Query Params:** `user_id` (**required** for public signup route)

**Response:**
```json
{
  "status": true,
  "data": {
    "selectedUserList": [{"id":1, "name":"John", "checked":1}],
    "selectedCompanyList": [{"id":1, "company":"Acme", "checked":1}],
    "userList": [{"id":2, "name":"Jane", "checked":0}],
    "companyList": [{"id":2, "company":"Beta", "checked":0}]
  }
}
```
---

## 39. POST `general/add-suggestion`

**Controller:** `addSuggestion` — `src/controllers/general.controller.ts` (service: `addSuggestionService` in `src/services/general.service.ts`)

Submit a suggestion/feedback. Inserts into `suggestion` table and sends email to site admin via SQS.

**Request:**
| Field | Type | Required |
|-------|------|----------|
| name | string | yes |
| phone | string | yes |
| description | string | yes |

**Side effects:** Sends email to `websetting().contact_email` via SQS queue.

**Response:**
```json
{"status": true, "messages": "Successfully added"}
```
---

## 40. GET `general/inviteDetail/:slug`

**Controller:** `inviteDetail` — `src/controllers/general.controller.ts` (service: `inviteDetailService` in `src/services/general.service.ts`)

Fetch invite details by ID from `cyb_company_invite`. (Legacy PHP used `decrypt_url()` on a token segment; this port looks the invite up directly by the `:token` param.)

**DB Tables:** `cyb_company_invite` (via `inviteDetailService` in `src/services/general.service.ts`)

**Response:**
```json
{"status": true, "data": {"id":1, "company":123, "email":"...", ...}}
```
---

## 41–42. NOT IMPLEMENTED

- `GET general/verify-document-before-registration` — **NOT IMPLEMENTED** (no handler in the Node app)
- `GET general/verify-gst-before-registration` — **NOT IMPLEMENTED** (no handler in the Node app)

---

## Implementation Notes (Node / Express / TypeScript)

- All dropdown endpoints follow the same pattern: `db.select({ id, name }).from(table).where(eq(status, 1))` (Drizzle ORM). Implemented as a per-table service helper in `services/general.service.ts`.
- `dataList`, `employmentList`, `jobDataList` are aggregator services that call other services internally and merge results (`dashboard.service.ts`, `general.service.ts`).
- `jobFilterDataList` and `employeeFilterDataList` are dynamic: they read geographic IDs from `cyb_job_meta` (comma-separated `countryId`/`stateId`/`cityId`) or from actual employee data, then build filtered dropdowns. See `jobFilterDataListService()` in `general.service.ts`.
- `allJob` and `globalSearch` currently use MySQL search via Drizzle (`get_search_job_list`, `globalSearchService`). AI search service integration is left as a `// todo` placeholder — both already fall back to MySQL.
- `job_detail` uses `job_slug` for SEO-friendly URLs; `cyb_job_meta` stores pre-computed filter IDs for SEO pages.
- `countryList` always puts India (id=101) first — done via `[...filter(id===101), ...filter(id!==101)]` in `getCountriesService()`.
- `notice_period_list` requires `?type=` param — filters by notice period `type` column.
- `starRatingEmployies` has no caching layer in this port (kept simple); rating buckets computed in `starRatingEmployeesService()` from `cyb_user.percentage`.
- `user-profile` (public) calls `publicUserProfileService()` which reads only approved (`approved=1`) + granted-access (`approved=2`) experiences and returns limited data (no salary, no private reviews). Compare with `authUserProfileService()` in `common-auth.service.ts` for the authenticated version.
- `people-list` (signup flow) reads `cyb_user_details.exploring_details` (JSON array) — the user's shortlisted people for the exploring feature. Route mounted at `/wapi/people-list` (see `root.route.ts` → `peopleList`).
- `addSuggestion` and `inviteDetail` are the only non-dropdown data-mutation endpoints in this batch. `addSuggestion` inserts into `cyb_suggestion`; `inviteDetail` reads `cyb_company_invite`.
- Auth: most endpoints are public. The `Authorization` middleware (`src/middlewares/Authorization.ts`) injects `req.auth.user_id` for protected routes (e.g. `markViewed`, messaging, people-list).
- Validation: all request params/query/body are validated via Zod schemas in `src/types/general.types.ts`, enforced by `validateData()` in the route layer. Controllers read parsed values from `req.validated`.

