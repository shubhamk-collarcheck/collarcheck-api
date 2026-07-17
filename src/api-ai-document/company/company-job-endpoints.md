# Company Job Endpoints — CRUD, Templates, Bulk Actions

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi/company`  
> **Route file:** `src/routes/company.route.ts`  
> **Controller:** `src/controllers/company-job.controller.ts`  
> **Service:** `src/services/company-job.service.ts`  
> **Types:** `src/types/company-job.types.ts`  
> **Repo:** `src/repositery/company-job.repositery.ts`

## Routes Summary

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/all-job` | `allJob` | List jobs |
| POST | `/add-job` | `addJob` | Create job (multipart docs) |
| POST | `/add-job/:id` | `addJobUpdate` | Update job |
| PUT | `/jobStatusChange/:id` | `jobStatusChange` | Publish/unpublish |
| DELETE | `/delete-job/:id` | `deleteJob` | Soft-delete |
| DELETE | `/cancel-job/:id` | `cancelJob` | Cancel job |
| GET | `/job-detail/:id` | `jobDetail` | Job detail |
| GET | `/job-template-detail/:id` | `jobTemplateDetail` | Template detail |
| GET | `/job-template` | `jobTemplate` | List templates |
| POST | `/multi-cancel-job` | `multiCancelJob` | Bulk cancel |
| POST | `/multi-jobStatusChange` | `multiJobStatusChange` | Bulk status |

Auth: JWT · `req.auth.id` = company (or via `X-Company`).

---

## 1. GET `company/all-job`

### Route
```
GET /wapi/company/all-job
```
### Auth
JWT required. `req.auth.id` = company ID.
**Permission guard:** `checkMenuAccess(loginUserId, companyId, 7)`. Returns **403** if denied.

### DB Queries
Calls `get_all_job_list(filter)` three times for each status:

```
get_all_job_list() query:
  SELECT cj.id, cj.status FROM company_job AS cj
  LEFT JOIN department AS dp ON cj.department = dp.id
  WHERE cj.is_deleted = 0 AND cj.company = {companyId}
  AND cj.status = {status}
  [AND cj.job_title LIKE '%{keyword}%']
  ORDER BY cj.modify_date DESC
  LIMIT {limit} OFFSET {offset}

  For each result: calls get_job_detail(id, NULL, status, companyview=true)
    → Full JOIN across: cities, state, country, industries, job_experiences,
      role_types, department, designation, application, job_mode, user, salary
    → Returns job detail with applicationCount, collaborator list
```
Called with status: `3` = draft (stored as 0), `1` = published, `2` = cancelled.

### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `keyword` | GET query string | No | Search by job_title or job_description |
| `limit` | GET query string | No | Default: 20 |
| `offset` | GET query string | No | Page-based |

### Response
```json
{
  "status": true,
  "messages": "job List",
  "data": {
    "draftJobs": [
      {
        "id": 10,
        "job_title": "Software Engineer",
        "job_description": "...",
        "department_name": "Engineering",
        "experience_name": "Mid",
        "role_type_name": "Full-time",
        "job_mode_name": "Remote",
        "industry_name": "Technology",
        "designation_name": "Engineer",
        "country_name": "USA",
        "state_name": "NY",
        "city_name": "New York",
        "salary_name": "$80k-$120k",
        "company_name": "Acme Corp",
        "profile": "https://s3.../logo.jpg",
        "applicationCount": 0,
        "status": 0,
        "slug": "software-engineer-new-york-mid-150626-1234",
        "create_date": "2024-06-15",
        "gallery": [],
        "company_slug": "acme-corp",
        "is_verified": true,
        "colloborator": false,
        "collaboratorList": []
      }
    ],
    "publishJobs": [],
    "cancelJobs": [],
    "draftJobsCounts": 1,
    "publishJobsCounts": 0,
    "cancelJobsCounts": 0
  }
}
```
### Notes
- Status mapping: `3` → stored as `0` (draft), `1` → `1` (published), `2` → `2` (cancelled).
- `*JobsCounts` fields are total counts (without pagination) for tab badges.
- `companyview=true` adds collaborator data to each job.

---

## 2. POST `company/add-job` (Create / Update / Template)

### Route
```
POST /wapi/company/add-job         → Create new job
POST /wapi/company/add-job/{id}    → Update existing job
```
### Auth
JWT required. `req.auth.id` = company ID.

### DB Queries
```
1. Verify company: SELECT * FROM user WHERE id = {companyId} AND status=1 AND user_type=2

2. Auto-create lookup records if string values provided (designation, department, skill, city, industry):
   - check_record_exit(table, name) → check if exists
   - If not: INSERT INTO {table} (name, user_defined=1, user_id, status=1)

3. If status=3 (template):
   IF template_name provided AND no template_id:
     INSERT INTO job_template
   IF template_id provided:
     UPDATE job_template WHERE id = {template_id}

4. If status!=3 (regular job):
   IF id provided (update):
     UPDATE company_job WHERE id = {id}
   ELSE (create):
     INSERT INTO company_job
     Slug auto-generated: {job_title}-{state}-{designation}-{experience}-{date}{random}
```
### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `job_title` | string | Yes | |
| `job_description` | string | Yes | |
| `roles_responsibility` | string | No | |
| `experience` | int | No | Experience level ID |
| `role_type` | int | No | Role type ID |
| `country` | int | No | Country ID |
| `state` | int | No | State ID |
| `city` | string/int | No | ID or name (auto-creates) |
| `salary` | int | No | Salary range ID |
| `vacancy` | int | No | Number of vacancies |
| `job_mode` | int | No | Job mode ID (remote/onsite/hybrid) |
| `designation` | string/int | No | ID or name (auto-creates) |
| `department` | string/int | No | ID or name (auto-creates) |
| `industry` | string/int | No | ID or name (auto-creates) |
| `skill` | array | No | Array of IDs or name strings |
| `urgent` | bool | No | `true`/`false` |
| `document` | file | No | PNG/JPG/PDF/DOC, max 5MB |
| `status` | int | No | `0`=draft, `1`=publish, `2`=close, `3`=template |
| `template_name` | string | No | Required if status=3 |
| `template_id` | int | No | If provided, updates existing template |
| `slug` | string | No | Auto-generated if empty |

### Response
```json
{ "status": true, "messages": "Record created successfully", "jobId": 10 }
```
```json
{ "status": true, "messages": "Record updated successfully", "jobId": 10 }
```
```json
{ "status": true, "messages": "Template created successfully", "jobId": 0 }
```
```json
{ "status": false, "messages": "job_title,job_description are required." }
{ "status": false, "messages": "Invalid Company !" }
```
### Notes
- `status=3` saves to `job_template` table instead of `company_job`.
- Slug includes state, designation, experience, date, and random number for uniqueness.
- Skills stored as JSON-encoded array of IDs in `company_job.skill`.
- Document uploaded to S3 via `s3fileUploads()`.

---

## 3. PUT `company/jobStatusChange/:id`

### Route
```
PUT /wapi/company/jobStatusChange/{id}
```
- `:id` → `id` — job ID

### Auth
JWT required. `req.auth.id` = company ID.

### DB Queries
```
1. SELECT * FROM company_job WHERE id = {id} AND company = {companyId}
   → Verify job exists

2. Toggle status:
   IF current status = 1 → set to 0 (unpublish)
   IF current status != 1 → set to 1 (publish) + update create_date
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `id` | URL segment | Yes | Job ID |

### Response
```json
{ "status": true, "messages": "Record udpated!" }
```
```json
{ "status": false, "messages": "Invalid Record !" }
```
### Notes
- Simple toggle: `1` ↔ `0`. Does NOT affect cancelled jobs (status=2).
- When publishing (0→1), `create_date` is reset to now (re-ranks in listings).

---

## 4. DELETE `company/delete-job/:id`

### Route
```
DELETE /wapi/company/delete-job/{id}
```
- `:id` → `id` — job ID

### Auth
JWT required. `req.auth.id` = company ID.

### DB Queries
```
1. SELECT * FROM user WHERE id = {companyId} AND status = 1
   → Verify company

2. UPDATE company_job SET is_deleted = 1 WHERE company = {companyId} AND id = {id}
   → Soft delete
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `id` | URL segment | Yes | Job ID |

### Response
```json
{ "status": true, "messages": " Job Delete Sucessfully" }
```
```json
{ "status": false, "messages": "Try again something went wrong " }
```
### Notes
- Soft delete only (`is_deleted = 1`). Job still exists in DB.
- No notifications sent.

---

## 5. DELETE `company/cancel-job/:id`

### Route
```
DELETE /wapi/company/cancel-job/{id}
```
- `:id` → `id` — job ID

### Auth
JWT required. `req.auth.id` = company ID.

### Side Effects (Non-CRUD)
Triggers notifications via SQS:
1. **Email** → to company (template 78: "your_job_applied_for_now_closed_company")
2. **WhatsApp** → to company (campaign 176)
3. **Email** → to each applicant (template 77: "your_job_applied_for_now_closed_users")

### DB Queries
```
1. SELECT * FROM user WHERE id = {companyId} AND status = 1

2. UPDATE company_job SET status = 2 WHERE company = {companyId} AND id = {jobId}

3. get_user_company_detail(companyId, jobId)
   → Company + job details for email template

4. SQS push: SEND_EMAIL (company), SEND_WHATSAPP (company)

5. get_applied_detail(jobId)
   → All users who applied to this job

6. For each applicant:
   get_user_applied_details(userId)
   → User details for email
   SQS push: SEND_EMAIL (applicant)
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `id` | URL segment | Yes | Job ID |

### Response
```json
{ "status": true, "messages": " Job cancel Sucessfully" }
```
```json
{ "status": false, "messages": "Try again something went wrong " }
```
### Notes
- Sets `status = 2` (cancelled/closed).
- Notifies company AND all applicants that the position is closed.
- Uses `this->response->setJSON()` (not `json_encode()`).

---

## 6. GET `company/job-detail/:id`

### Route
```
GET /wapi/company/job-detail/{id}
```
- `:id` → `id` — job ID

### Auth
JWT required. `req.auth.id` = company ID.

### DB Queries
```
1. SELECT * FROM company_job WHERE id = {id} AND company = {companyId} AND is_deleted = 0

2. get_job_detail(id, NULL, NULL, companyview=1)
   → Full JOIN query across 12 tables
   → Includes: applicationCount, collaborator list, gallery images, is_verified
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `id` | URL segment | Yes | Job ID |

### Response
```json
{
  "status": true,
  "messages": "Job Detail",
  "data": {
    "id": 10,
    "individual_id": "CMP-001",
    "job_title": "Software Engineer",
    "job_description": "...",
    "roles_responsibility": "...",
    "department_name": "Engineering",
    "experience_name": "Mid",
    "role_type_name": "Full-time",
    "job_mode_name": "Remote",
    "industry_name": "Technology",
    "designation_name": "Engineer",
    "country_name": "USA",
    "state_name": "NY",
    "city_name": "New York",
    "salary_name": "$80k-$120k",
    "company_name": "Acme Corp",
    "profile": "https://s3.../logo.jpg",
    "document": "https://s3.../job-doc.pdf",
    "applicationCount": 15,
    "status": 1,
    "slug": "software-engineer-new-york-mid-150626-1234",
    "create_date": "2024-06-15",
    "gallery": ["https://s3.../img1.jpg"],
    "company_slug": "acme-corp",
    "is_verified": true,
    "apply": false,
    "colloborator": true,
    "collaboratorList": [
      {
        "id": 20,
        "full_name": "Jane Admin",
        "slug": "jane-admin",
        "individual_id": "CMP-001",
        "profile": "https://s3.../img.jpg",
        "designation_name": "HR Manager"
      }
    ],
    "totalCount": 2
  }
}
```
### Error Responses
```json
{ "status": false, "messages": "No Record found!" }
{ "status": false, "messages": "Exception message" }
```
---

## 7. GET `company/job-template-detail/:slug`

### Route
```
GET /wapi/company/job-template-detail/{id}
```
- `:slug` → `id` — template ID

### Auth
JWT required. `req.auth.id` = company ID.

### DB Queries
```
get_job_template_detail(id, companyId)
  → SELECT jt.*, joined with: cities, state, country, industries,
    job_experiences, role_types, department, designation, job_mode, user, salary
  → WHERE jt.id = {id} AND jt.company = {companyId} AND jt.is_deleted = 0
```
### Request
| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `id` | URL segment | Yes | Template ID |

### Response
```json
{
  "status": true,
  "messages": "Job Template Detail",
  "data": {
    "id": 5,
    "individual_id": "CMP-001",
    "job_title": "Software Engineer",
    "template_name": "Standard Engineering Role",
    "job_description": "...",
    "roles_responsibility": "...",
    "department_name": "Engineering",
    "experience_name": "Mid",
    "role_type_name": "Full-time",
    "job_mode_name": "Remote",
    "industry_name": "Technology",
    "designation_name": "Engineer",
    "country_name": "USA",
    "state_name": "NY",
    "city_name": "New York",
    "salary_name": "$80k-$120k",
    "company_name": "Acme Corp",
    "profile": "https://s3.../logo.jpg",
    "document": "https://s3.../doc.pdf",
    "status": 3,
    "slug": "software-engineer-new-york-mid-150626-1234",
    "create_date": "2024-06-15"
  }
}
```
### Notes
- Same structure as `jobDetail` but reads from `job_template` table.
- No application count or collaborator data.
- No `apply` or `gallery` fields.

---

## 8. GET `company/job-template`

### Route
```
GET /wapi/company/job-template
```
### Auth
JWT required. `req.auth.id` = company ID.

### DB Queries
```
CompanyModel::get_template_list(companyId)
  SELECT jt.id, jt.template_name FROM job_template AS jt
  WHERE jt.company = {companyId}
  GROUP BY jt.template_name
  ORDER BY jt.id ASC
```
### Request
No body params.

### Response
```json
{
  "status": true,
  "messages": "Template List",
  "data": [
    { "id": 5, "template_name": "Standard Engineering Role" },
    { "id": 8, "template_name": "Marketing Template" }
  ]
}
```
```json
{ "status": false, "messages": "No Record found!" }
```
### Notes
- Returns only `id` and `template_name` — lightweight list for dropdowns.
- Grouped by `template_name` to avoid duplicates.

---

## 9. POST `company/multi-cancel-job`

### Route
```
POST /wapi/company/multi-cancel-job
```
### Auth
JWT required. `req.auth.id` = company ID.

### DB Queries
```
1. ids = req.getVar('id')  → array of job IDs

2. For each id:
   UPDATE company_job SET status = 2 WHERE company = {companyId} AND id = {id}
```
### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | array | Yes | Array of job IDs to cancel |

### Response
```json
{ "status": true, "messages": " Job cancel Sucessfully" }
```
```json
{ "status": false, "messages": "Id Required" }
{ "status": false, "messages": "Try again something went wrong " }
```
### Notes
- Bulk version of `cancelJob` — no notifications sent (unlike single cancel).
- Only sets `status = 2`.

---

## 10. POST `company/multi-jobStatusChange`

### Route
```
POST /wapi/company/multi-jobStatusChange
```
### Auth
JWT required. `req.auth.id` = company ID.

### DB Queries
```
1. ids = req.getVar('id')  → array of job IDs
2. status = req.getVar('status')  → target status

3. For each id:
   SELECT * FROM company_job WHERE id = {id} AND company = {companyId}
   → Verify ownership

4. UPDATE company_job SET status = {status} WHERE id = {id}
```
### Request
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | array | Yes | Array of job IDs |
| `status` | int | No | Target status (default: 0) |

### Response
```json
{ "status": true, "messages": " Job update Sucessfully" }
```
```json
{ "status": false, "messages": "Id Required" }
{ "status": false, "messages": "Invalid Record !" }
{ "status": false, "messages": "Try again something went wrong " }
```
### Notes
- Unlike single `jobStatusChange` (toggle), this sets an explicit target status.
- Validates each job belongs to the company before updating.

---

## Cross-Language Porting Notes

### allJob
- Returns jobs in 3 buckets: draft (status=0), published (status=1), cancelled (status=2).
- Status mapping: frontend uses `3` for draft, stored as `0` in DB.
- Each job calls `get_job_detail()` — heavy JOIN query across 12 tables.
- `*JobsCounts` are unpaginated totals for tab badges.
- `companyview=true` adds collaborator list to each job.

### addJob (Create/Update/Template)
- **Triple-purpose endpoint**: create job, update job, or save template.
- `status=3` saves to `job_template` table; all other statuses save to `company_job`.
- Auto-creates lookup records (designation, department, skill, city, industry) if string values provided.
- Slug auto-generated with state, designation, experience, date, random number.
- `skill` stored as JSON-encoded array of IDs.
- Document uploaded to S3.

### jobStatusChange
- Simple toggle: `1` ↔ `0`. Does NOT affect cancelled jobs (status=2).
- When publishing (0→1), `create_date` is reset to now.

### deleteJob
- Soft delete (`is_deleted = 1`). No notifications.

### cancelJob
- Sets `status = 2`. Notifies company + all applicants via email/WhatsApp.
- Single cancel sends notifications; bulk cancel does NOT.

### jobDetail / jobTemplateDetail
- `jobDetail` includes: applicationCount, collaborator list, gallery, `apply` flag.
- `jobTemplateDetail` is simpler: no applications, no collaborators, no gallery.
- Both use heavy JOIN queries across 12+ lookup tables.

### jobTemplate
- Lightweight list: just `id` and `template_name` for dropdowns.
- Grouped by `template_name` to avoid duplicates.

### multi_cancelJob / multi_jobStatusChange
- Bulk operations: accept array of IDs.
- `multi_cancelJob` sets status=2, no notifications.
- `multi_jobStatusChange` sets explicit target status (not toggle), validates ownership.
