
# Cron Jobs — Porting Guide

HTTP-triggered maintenance and email-campaign jobs for CollarCheck.  
**Controller:** `app/Controllers/Cronjob.php`  
**Models:** `CronModel`, `FrontModel`, `UserModel`  
**CLI wrappers (production-style curl):** `cron/*.php`  
**Routes:** `app/Config/Routes.php` (public GET — **no Auth filter**)

> Treat these as **internal ops endpoints**. In a new environment, protect them (IP allowlist, shared secret, or queue workers). The PHP app currently exposes them as open `GET` routes.

**HTTP:** Mostly GET. Responses vary: JSON, `echo` of insert id, empty body, or HTTP 500 text.

---

## Architecture overview

Most “marketing / reminder” crons do **not** send email immediately. They **enqueue** a row in `schedulars`. A second pipeline processes the queue:

```
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCERS (build audience + insert schedulars)                  │
│  cron_notice, total_new_job_post, job_viewed_not_applied, ...    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  create_email_schedule                                           │
│  status=1, execute=0, trigger<=now                               │
│  → expand emails JSON into schedular_email_temp (batches of 500) │
│  → set execute=1                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  send_email_schedule                                             │
│  status=1, execute=1                                             │
│  → process up to 30 pending temp rows per schedule               │
│  → cc_send_email (+ some WhatsApp) by schedule.type              │
│  → mark temp status/deliver                                      │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  final_schedule_update                                           │
│  when all temp rows processed → rollup delivered stats           │
│  → status=2, execute=0, delete temp rows                         │
└─────────────────────────────────────────────────────────────────┘
```

### Shared tables

| Table | Role |
|-------|------|
| `schedulars` | Campaign job: audience `emails` (JSON), `type`, `template`, `trigger`, `status`, `execute`, delivery JSON fields |
| `schedular_email_temp` | Per-recipient queue: `schedular_id`, `email`, `status` (0 pending / 1 done), `deliver` (1 ok / 2 fail / 3 not sendable) |
| `schedular_history` | Successful send log |
| `email_templates` | Template id, subject, `template_path`, `short` code |
| `account_setting` | Key `newsletter` — if missing or value `1`, email is allowed |

### `schedulars` lifecycle

| Field | Values |
|-------|--------|
| `status` | `1` active/queued · `2` completed (after final update) · insert often uses `1` |
| `execute` | `0` not expanded · `1` expanded & ready to send · reset to `0` when finished |
| `trigger` | datetime when schedule becomes eligible |
| `type` | String discriminator used in `send_email_schedule` (see matrix below) |
| `emails` | JSON array of recipient emails |
| `template` | FK → `email_templates.id` |
| `name` | Often used as email subject or count label |
| `delivered` / `not_delivered` / `not_send` | JSON email lists after finalization |

### Newsletter opt-in check (send path)

```
notification = account_setting WHERE key='newsletter' AND user_id=?
send if: notification is empty OR notification.value == 1
```

### Env / services used by crons

| Key / service | Used by |
|---------------|---------|
| DB config + `mysqldump` | `backup` |
| `AWS_KEY`, `AWS_SECRET`, `AWS_BUCKET`, `SERVER_TYPE` | `backup` S3 upload |
| `GOOGLEKEY` | `lat_long_update` |
| `REACT_SITE` | Email CTA / unsubscribe links |
| SMTP / `cc_send_email` | `send_email_schedule` |
| SQS / WhatsApp campaigns | Some send types (e.g. candidate match, unlock level) |

---

## Routes summary

| Method | Route | Handler | Category |
|--------|-------|---------|----------|
| GET | `/wapi/backup` | `backup` | Ops |
| GET | `/wapi/update-view-request` | `update_view_request` | Data cleanup |
| GET | `/wapi/create-email-schedule` | `create_email_schedule` | Scheduler pipeline |
| GET | `/wapi/create-email-schedule/{id}` | `create_email_schedule/$1` | Scheduler (single) |
| GET | `/wapi/send-email-schedule` | `send_email_schedule` | Scheduler pipeline |
| GET | `/wapi/send-email-schedule/{id}` | `send_email_schedule/$1` | Scheduler (single) |
| GET | `/wapi/final-schedule-update` | `final_schedule_update` | Scheduler pipeline |
| GET | `/wapi/create-reschedule/{id}` | `create_reschedule/$1` | Scheduler retry |
| GET | `/wapi/lat-long-update` | `lat_long_update` | Geo |
| GET | `/wapi/delete-otp` | `delete_otp` | Cleanup + trim |
| GET | `/wapi/cron-notice` | `cron_notice` | Producer |
| GET | `/wapi/total-new-job-post` | `total_new_job_post` | Producer |
| GET | `/wapi/job-viewed-not-applied` | `job_viewed_not_applied` | Producer |
| GET | `/wapi/has-not-applied-any-job` | `has_not_applied_any_job` | Producer |
| GET | `/wapi/new-job-match-your-skill` | `new_job_match_your_skill` | Producer |
| GET | `/wapi/candidate-matches-your-job-requirement` | `candidate_matches_your_job_requirement` | Producer |
| GET | `/wapi/gentle-reminder` | `gentle_reminder` | Producer |
| GET | `/wapi/marked-immidiate-joiner` | `marked_immidiate_joiner` | Producer |
| GET | `/wapi/no-login-or-action` | `no_login_or_action` | Producer |
| GET | `/wapi/got-a-message` | `got_a_message` | Producer |
| GET | `/wapi/unified-email` | `unified_email_send` | Producer |
| GET | `/wapi/send-email-import-employee` | `send_email_import_employee` | Producer |
| GET | `/wapi/update-percentage` | `update_percentage` | Profile % |
| GET | `/wapi/percentage_status_reset` | `percentage_status_reset` | Profile % |
| GET | `/wapi/update-account-setting` | `update_account_setting` | Settings backfill |

**Route note:** `final-schedule-update` is registered as `Cronjob::final_schedule_update/$1` but the method takes **no** argument — the `$1` is unused.

Suggested shell pattern (matches `cron/*.php`):

```bash
curl -sS "https://{host}/wapi/{route}"
```

---

# A. Ops & data maintenance

## 1. GET `/wapi/backup` → `backup`

**Purpose:** Dump MySQL DB and upload SQL dump to S3.

### Steps

1. Read CodeIgniter default DB config.
2. `mysqldump --single-transaction --quick --no-tablespaces` →  
   `WRITEPATH/backups/db-backup-YYYY-mm-dd_HH-ii-ss.sql`
3. Upload via AWS SDK S3:
   - Region: `ap-south-1`
   - Credentials: `AWS_KEY` / `AWS_SECRET`
   - Bucket: `AWS_BUCKET`
   - Key path:
     - If `SERVER_TYPE == 'STAGING'` → `database-backups/{filename}`
     - Else → `database-backups-staging/{filename}`  
       *(names look inverted vs label — document as coded)*
4. Delete local file after successful put.
5. Return JSON success with `s3_url`, or HTTP **500** text on failure.

### Response

```json
{ "status": true, "message": "Backup uploaded to S3 successfully", "s3_url": "..." }
```

### Env

`AWS_KEY`, `AWS_SECRET`, `AWS_BUCKET`, `SERVER_TYPE`, DB credentials, `/usr/bin/mysqldump` on host.

---

## 2. GET `/wapi/update-view-request` → `update_view_request`

**Purpose:** Expire old profile view requests.

### Logic

`UserModel::update_veiw_request_status()`:

```
UPDATE user_profile_view_request
SET status = 0
WHERE is_deleted = 0 AND DATE(expiry) < today
```

No structured JSON response (void return).

---

## 3. GET `/wapi/lat-long-update` → `lat_long_update`

**Purpose:** Geocode user addresses missing lat/long.

### Logic

1. `FrontModel::get_lat_long_user()` — users needing coordinates.
2. For each: `get_lat_long(address)` → Google Geocoding API:

```
GET https://maps.googleapis.com/maps/api/geocode/json?address={slugified}&key={GOOGLEKEY}
```

3. On `status == OK`, upsert `user_details` (`latitude`, `longitude`, `user_id`).

### Response

```json
{ "status": true, "message": "Record update success" }
```
```json
{ "status": false, "message": "Nothing to update" }
```

### Env

`GOOGLEKEY`

---

## 4. GET `/wapi/delete-otp` → `delete_otp`

**Purpose:** Cleanup OTP + normalize master data names.

### Logic

1. Delete from `cyb_otp` where `DATE(create_date) < today`.
2. `UPDATE ... SET name = TRIM(name)` on:
   - `department`, `designation`, `institutions`, `courses`, `skill`, `state`

No JSON return.

---

## 5. GET `/wapi/update-percentage` → `update_percentage`

**Purpose:** Batch recompute profile completion percentage.

### Logic

1. `CronModel::get_user_ids(1000)`:
   - `status=1`, `is_deleted=0`, `percentage_status=0`
   - Includes non-company users **or** companies with `claim_status=1`
   - Limit **1000**, ordered by id ASC
2. For each: `GeneralApi::ProfilePercentage($id)` → take `total`
3. Batch update `user`: `percentage`, `percentage_status=1`

Echoes result of `updateBatch`.

---

## 6. GET `/wapi/percentage_status_reset` → `percentage_status_reset`

**Purpose:** Allow percentage cron to reprocess everyone.

```
UPDATE user SET percentage_status = 0  (all rows)
```

Typical sequence: **reset** → repeated **update-percentage** until done.

---

## 7. GET `/wapi/update-account-setting` → `update_account_setting`

**Purpose:** Backfill default account settings for users missing any `account_setting` row.

### Logic

`CronModel::get_empty_user_account_setting()` — active users with left-join `account_setting` null (employees or claimed companies).

- `user_type == 1` → `FrontModel::create_user_setting($id)`
- else → `FrontModel::create_company_setting($id)`

No JSON return.

---

# B. Email scheduler pipeline

## 8. GET `/wapi/create-email-schedule`  
##     GET `/wapi/create-email-schedule/{id}`

**Handler:** `create_email_schedule($id = false)`

**Purpose:** Expand due schedules into `schedular_email_temp`.

### Selection (`FrontModel::get_upcoming_email_schedule`)

```
schedulars JOIN email_templates
WHERE status = 1 AND execute = 0
  AND (id = :id OR trigger <= now)
```

### Steps per schedule

1. Decode `emails` JSON → unique list.
2. If empty →  
   `{ "status": false, "message": "Scheduler can not create  on empty email list!" }`
3. Set `execute = 1` on schedule.
4. Chunk emails by **500**; `insertBatch` into `schedular_email_temp` (`schedular_id`, `email`).
5. `sleep(2)` between batches.

### Response

```json
{ "status": true, "message": "Scheduler run successfully!" }
```
```json
{ "status": false, "message": "Sechuder not valid Please check Sechuder detail" }
```

(typos in messages are intentional for parity)

---

## 9. GET `/wapi/send-email-schedule`  
##     GET `/wapi/send-email-schedule/{id}`

**Handler:** `send_email_schedule($id = false)`

**Purpose:** Actually send emails (and some WhatsApp) for expanded schedules.

### Selection (`get_execute_email_schedule`)

```
schedulars JOIN email_templates (template_path, short, subject)
WHERE status = 1 AND execute = 1
  AND (id = :id OR trigger <= now)
```

### Batching

For each schedule, load up to **30** rows:

```
schedular_email_temp WHERE status=0 AND schedular_id=? ORDER BY id ASC LIMIT 30
```

### Deliver codes written to temp

| `deliver` | Meaning |
|-----------|---------|
| `1` | Email delivered (`cc_send_email` true) |
| `2` | Send attempted, failed |
| `3` | Not sendable (default / newsletter off / missing user) |

Always sets `status=1` on the temp row after processing that email (when update path runs).

### Behavior by `schedule.type`

| `type` | Audience intent | Template / subject | Extra |
|--------|-----------------|--------------------|-------|
| `NOTICE` | Notice period near end | Company: `email/schedule/your_notice_period_about_to_end_company`; User: `..._user` | Uses `user_details.notice_employments` company ids |
| `JOB_VIEWED_NOT_APPLIED` | Users who viewed jobs | `email/schedule/employee/job_viewed_but_not_applied`; subject fixed | `CronModel::job_impression_viewed` |
| `NEW_JOB_MATCH_SKILL` | Skill-match jobs | `email/schedule/new_job_match_your_skill`; subject `"{n} New Job Opportunity Matches Your Skills"` | `skill_match_count_company_detail` |
| `CANDIDATE_MATCH_YOUR_JOB` | Companies with matching candidates | `email/schedule/candidate_matches_your_job_requirement` | Per job; WhatsApp campaign **193** (top 3 candidates) via `send_campaigns` |
| `GOT_A_MESSAGE` | Unread chat | `email/schedule/got_new_message`; subject `" You have {n} new message"` | Count last 1 hour unread |
| `GENTLE_REMINDER` | Companies with pending employment | View from `schedule.template_path` | `get_user_experience_details` |
| *(default / other types)* | Generic template path | `view($schedule->template_path)` | Subject/name/CTA by subtype: |

**Default-branch subtypes** (`type` still drives CTA):

| `type` | Notes |
|--------|--------|
| `TOTAL_JOB_POST` / `TOTAL_NEW_USER` | `subject` = schedule `name` (count embedded) |
| `NOT_APPLIED_JOB` | CTA jobs or company employees |
| `IMMIDATE_JOINER` | CTA `candidates` |
| `NO_LOGIN` | CTA login or candidates |
| `IMPORT_EMPLOYEE` | Company name + employee profile link |
| `UNLOCK_LEVEL` | Level unlock email + WA campaigns by `short`: BYVLU=215, UL1U=216, UL2U=217, UL3U=218, UL4U=219 (SQS `SEND_WHATSAPP`) |
| `UNIFIED_MODULE` / others | Generic subject = schedule name |

### Shared mail fields

- `track_link` = `base_url('track-email/{userId}/{scheduleId}')`
- `unsubscribe` = `{REACT_SITE}unsubscribe/{encrypt_url(userId)}`

### Response

```json
{ "status": true, "message": "email send successfully!" }
```

Invalid id:

```json
{ "status": false, "message": "Sechuder not valid Please check Sechuder detail " }
```

---

## 10. GET `/wapi/final-schedule-update` → `final_schedule_update`

**Purpose:** Close finished schedules and snapshot delivery lists.

### Completed schedules

`get_scheduleCompleteList()` — `schedular_email_temp` grouped by `schedular_id` where **no** rows with `status=0` and **no** rows with `deliver=0`.

For each:

1. Collect emails: deliver=1 → `delivered`, deliver=2 → `not_delivered`, deliver=3 → `not_send` (JSON on `schedulars`)
2. Set `execute=0`, `status=2`
3. `DELETE` all temp rows for that schedule

### In-progress snapshot

For `schedulars` with `status=1` and `execute=1`, refresh delivered JSON lists **without** deleting temp (progress update).

Returns `true` (PHP bool / body may be empty-ish).

---

## 11. GET `/wapi/create-reschedule/{id}` → `create_reschedule`

**Purpose:** Retry failed deliveries from a completed schedule.

### Logic

1. Load schedule via `get_reschedule_detail($id)` (`execute=0`).
2. Decode `not_delivered` JSON.
3. If empty → error empty list.
4. Insert **new** `schedulars` row:
   - `emails` = previous `not_delivered`
   - `status=0`, `execute=0`, copy `name` + `template`
   - timestamps now

### Response

```json
{ "status": true, "message": "Scheduler create successfully!" }
```
```json
{ "status": false, "message": "Scheduler not created. Email list is empty." }
```
```json
{ "status": false, "message": "Scheduler not created yet. Please check if the scheduler is complete, then try again" }
```

> New row uses `status=0`. Producers usually insert `status=1`. Reschedule may need a status flip or create-email-schedule selection change when porting — match DB ops if production relies on this path.

---

# C. Campaign producers (insert `schedulars` only)

All of these typically:

```
INSERT schedulars (
  create_date, status=1, emails=JSON, trigger=now,
  type=..., template=<email_templates.id>, name=...
)
```

And **echo** insert id. Downstream: create → send → final.

| Endpoint | `type` | Template id / short | Audience selection (CronModel / query) | `name` / subject |
|----------|--------|---------------------|----------------------------------------|------------------|
| `cron-notice` | `NOTICE` | id **81** | Users `on_notice=1` and `notice_date = yesterday` | `Employee/company -> {template.name}` |
| `total-new-job-post` | `TOTAL_JOB_POST` | **99** | Count jobs created **yesterday**; emails = all active employees | `"{count} New Jobs Posted Today..."` |
| *(same method)* | `TOTAL_NEW_USER` | **100** | Count employees created **today**; emails = claimed companies | `"{count} candidates have joined CC today."` |
| `job-viewed-not-applied` | `JOB_VIEWED_NOT_APPLIED` | **101** | Job impressions older than 7 days, user never applied any job | `Job Viewed but Not Applied` |
| `has-not-applied-any-job` | `NOT_APPLIED_JOB` | **102** (users) | Employees with no `application` rows | template subject |
| *(same)* | `NOT_APPLIED_JOB` | **103** (companies) | Companies with no `company_job` | template subject |
| `new-job-match-your-skill` | `NEW_JOB_MATCH_SKILL` | **104** | Exploring employees with skills that match open jobs (filter with match detail) | template name |
| `candidate-matches-your-job-requirement` | `CANDIDATE_MATCH_YOUR_JOB` | **105** | Company emails for jobs posted **today** (`get_job_post_company_emails`) | template name |
| `got-a-message` | `GOT_A_MESSAGE` | **59** | Receivers with unread messages in last **1 hour** | template name |
| `gentle-reminder` | `GENTLE_REMINDER` | **88** | Companies with pending employment (`approved=0`) older than **7 days** | (template only) |
| `marked-immidiate-joiner` | `IMMIDATE_JOINER` | **84** | Claimed companies with jobs; count immediate explorers | `"{n} Verified Immediate Joiners..."` |
| `no-login-or-action` | `NO_LOGIN` | **106** users / **107** companies | `login_time` older than **7 days** | fixed subjects (job vs talent) |
| `unified-email` | `UNIFIED_MODULE` | **110** | All claimed active companies (`claim_status=1`) | template name |
| `send-email-import-employee` | `IMPORT_EMPLOYEE` | short **`CYVPN`** | `user_details.import=1` | template subject |

### Empty-audience notes

- `cron-notice` with no users:  
  `{ "status": true, "messages": "No users found nearing expiry" }`
- `new-job-match-your-skill` with no emails: echoes `no record found!`
- Many others simply do nothing / no insert if empty.

---

# D. Producer detail notes

## Notice period (`cron-notice`)

```
SELECT distinct email FROM user
WHERE status=1, is_deleted=0, on_notice=1, notice_date = CURDATE()-1 day
```

Send path emails **both** linked companies (from `notice_employments` JSON) and the user.

## Total new job / user (`total-new-job-post`)

- Jobs: `company_job` status=1, not deleted, `DATE(create_date)=yesterday`
- New users: employees created **today**
- Company audience: `user_type=2`, `claim_status=1`

## Job viewed not applied

- Source: `view_impressions` type `JOB`, `create_date < now-7 days`
- Skip users who have any application (`check_user_applied`)

## Skill match (user)

- Users: `on_explore=1`, has skills
- Only enqueue if `skill_match_count_company_detail(email)` non-empty

## Candidate match (company)

- Companies that posted jobs on **today**
- Send path expands candidates per job + WA campaign 193

## Got a message

- Unread (`is_viewed=0`) in last hour, grouped by receiver

## Gentle reminder

- Pending employment approvals ≥ 7 days old, group by company

## Immediate joiner

- Email companies exploring talent (have jobs)
- Count users with `on_immediate=1` AND `on_explore=1`

## No login 7 days

- `login_time < today-7 days`, separate templates for user vs company

## Import employee

- `user_details.import = 1`

## Unified email

- Broadcast to all claimed companies (product “unified module” announcement)

---

# E. Recommended cron ordering (ops)

Suggested cadence (adjust to traffic):

| Frequency | Jobs |
|-----------|------|
| Daily (off-peak) | `backup`, `delete-otp`, `update-view-request`, producers (`cron-notice`, `total-new-job-post`, …), `percentage_status_reset` then multiple `update-percentage` |
| Frequent (e.g. every 1–5 min) | `create-email-schedule` → `send-email-schedule` → `final-schedule-update` |
| Periodic | `lat-long-update`, `update-account-setting`, `got-a-message` (hourly-ish; producer uses 1h window) |

Example:

```bash
# Expand queues
curl -sS https://host/wapi/create-email-schedule
# Send batches (repeat until temp empty)
curl -sS https://host/wapi/send-email-schedule
# Close finished
curl -sS https://host/wapi/final-schedule-update
```

Single-schedule debug:

```bash
curl -sS https://host/wapi/create-email-schedule/123
curl -sS https://host/wapi/send-email-schedule/123
```

---

# F. Porting checklist

1. **No Auth** in PHP — re-implement with secrets / private network.  
2. Preserve **two-phase** email: producer → temp queue → send → final.  
3. Batch sizes: create **500**, send **30** per schedule per run.  
4. Honor **newsletter** account_setting semantics.  
5. Keep `type` string values exact (`IMMIDATE_JOINER` spelling included).  
6. Template ids (81, 99, 100, …) and `short` codes are DB-coupled — migrate `email_templates` rows.  
7. `deliver` codes 1/2/3 drive reschedule (`not_delivered`).  
8. Profile percentage: reset flag then process batches of 1000.  
9. Backup needs `mysqldump` + S3; lat/long needs Google Geocoding key.  
10. Side effects (WhatsApp 193, 215–219) should not break email success path if optional.  
11. Mixed responses (`json_encode`, `echo $id`, empty) — normalize only if clients allow.  
12. Table names may use `cyb_` prefix depending on DB prefix config (`cyb_otp`, `cyb_schedular_email_temp` appear in raw SQL).

---

# G. Quick reference card

```
Pipeline:  create-email-schedule → send-email-schedule → final-schedule-update
Producers: insert schedulars (status=1, execute=0) only
Ops:       backup | lat-long | delete-otp | view-request expire
Profile:   percentage_status_reset → update-percentage (×N)
Settings:  update-account-setting
Retry:     create-reschedule/{id} from not_delivered list
```

### CLI scripts under `cron/`

| Script | Typical target |
|--------|----------------|
| `dbbackup.php` | `/wapi/backup` |
| `create_email_schedular.php` | create-email-schedule |
| `email_schedular.php` | send-email-schedule |
| `final_schedular_update.php` | final-schedule-update |
| `delete_otp.php` | delete-otp |
| `lat_long.php` | lat-long-update |
| `notice_period_near_expire.php` | cron-notice |
| `total_new_job_post.php` / `new_jobs_post_today.php` | total-new-job-post |
| `job_viewed_not_applied.php` | job-viewed-not-applied |
| `has_not_applied_any_job.php` | has-not-applied-any-job |
| `new_job_match_your_skill.php` | new-job-match-your-skill |
| `candidate_matches_your_job_requirement.php` | candidate-matches… |
| `got_a_message.php` | got-a-message |
| `update_percentage.php` | update-percentage |
| `update_account_setting.php` | update-account-setting |

---

# Related docs

| Topic | File |
|-------|------|
| Email SMTP send | `email_helper` / login docs (OTP) |
| Profile percentage algorithm | `GeneralApi::ProfilePercentage` |
| Auth APIs | `login-registration-endpoints.md`, `verify.md` |
| Employee signup | `employee-signup-endpoints.md` |
