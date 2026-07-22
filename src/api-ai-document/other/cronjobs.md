# Cron Jobs (Node)

HTTP-triggered maintenance and email-campaign jobs for CollarCheck.

> **Stack:** Node.js + Express + Drizzle ORM  
> **Status:** Implemented  
> **Auth:** **No JWT** — guarded by ops secret (`X-Ops-Key: $OPS_KEY`, or `ALLOW_PUBLIC_OPS=1`, or non-prod without `OPS_KEY`)  
> **Method:** Almost all **GET**  
> **Mount:** `src/routes/cron.route.ts` → `/wapi`  
> **Layers:** `cron.controller.ts` → `cron.service.ts` → `cron.repositery.ts`  
> **Postman:** `collarcheck.postman_collection.json` → **cron / ops**

Treat these as **internal ops endpoints**. Do not expose without `OPS_KEY` in production.

```bash
curl -sS -H "X-Ops-Key: $OPS_KEY" "https://{host}/wapi/{route}"
```

---

## Architecture overview

Most marketing / reminder crons **do not** send email immediately. They **enqueue** a row in `cyb_schedulars`. A second pipeline processes the queue:

```
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCERS (build audience + insert cyb_schedulars)              │
│  cron-notice, total-new-job-post, job-viewed-not-applied, ...    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  create-email-schedule                                           │
│  status=1, execute=0, trigger<=now                               │
│  → expand emails JSON into cyb_schedular_email_temp (≤500/batch) │
│  → set execute=1                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  send-email-schedule                                             │
│  status=1, execute=1                                             │
│  → process up to 30 pending temp rows per schedule               │
│  → SQS SEND_EMAIL (+ some WhatsApp) by schedule.type             │
│  → mark temp status/deliver                                      │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  final-schedule-update                                           │
│  when all temp rows processed → rollup delivered stats           │
│  → status=2, execute=0, delete temp rows                         │
└─────────────────────────────────────────────────────────────────┘
```

### Shared tables

| Table | Role |
|-------|------|
| `cyb_schedulars` | Campaign job: audience `emails` (JSON), `type`, `template`, `trigger`, `status`, `execute`, delivery JSON |
| `cyb_schedular_email_temp` | Per-recipient queue: `schedular_id`, `email`, `status` (0 pending / 1 done), `deliver` (1 ok / 2 fail / 3 not sendable) |
| `cyb_schedular_history` | Successful send log |
| `cyb_email_templates` | Template id, subject, `template_path`, `short` code |
| `cyb_account_setting` | Key `newsletter` — if missing or value `1`, email is allowed |

### `cyb_schedulars` lifecycle

| Field | Values |
|-------|--------|
| `status` | `1` active/queued · `2` completed · reschedule insert may use `0` |
| `execute` | `0` not expanded · `1` expanded & ready to send · reset to `0` when finished |
| `trigger` | datetime when schedule becomes eligible |
| `type` | String discriminator (see producers matrix) |
| `emails` | JSON array of recipient emails |
| `template` | FK → `cyb_email_templates.id` |

### Newsletter opt-in (send path)

```
notification = account_setting WHERE key='newsletter' AND user_id=?
send if: notification is empty OR notification.value == 1
```

### Env

| Key | Used by |
|-----|---------|
| `OPS_KEY` | Header `X-Ops-Key` (required in production) |
| `ALLOW_PUBLIC_OPS=1` | Bypass ops guard (dev only) |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | `backup` mysqldump |
| `MYSQLDUMP_PATH` | Optional path to mysqldump binary |
| `AWS_KEY`, `AWS_SECRET`, `AWS_BUCKET`, `AWS_REGION`, `SERVER_TYPE` | `backup` S3 |
| `GOOGLEKEY` / `GOOGLE_MAPS_KEY` | `lat-long-update` |
| `REACT_SITE` | Unsubscribe links in send path |
| `API_BASE_URL` / `BASE_URL` | Track-email link prefix |
| `AWS_SQS_URL` + worker | Actual email/WhatsApp delivery |

---

## Routes summary

| Method | Route | Handler | Category |
|--------|-------|---------|----------|
| GET | `/wapi/backup` | `backupService` | Ops |
| GET | `/wapi/update-view-request` | `updateViewRequestService` | Data cleanup |
| GET | `/wapi/create-email-schedule` | `createEmailScheduleService` | Scheduler pipeline |
| GET | `/wapi/create-email-schedule/:id` | same (single) | Scheduler |
| GET | `/wapi/send-email-schedule` | `sendEmailScheduleService` | Scheduler pipeline |
| GET | `/wapi/send-email-schedule/:id` | same (single) | Scheduler |
| GET | `/wapi/final-schedule-update` | `finalScheduleUpdateService` | Scheduler pipeline |
| GET | `/wapi/create-reschedule/:id` | `createRescheduleService` | Scheduler retry |
| GET | `/wapi/lat-long-update` | `latLongUpdateService` | Geo |
| GET | `/wapi/delete-otp` | `deleteOtpService` | Cleanup + trim |
| GET | `/wapi/cron-notice` | `cronNoticeService` | Producer |
| GET | `/wapi/total-new-job-post` | `totalNewJobPostService` | Producer |
| GET | `/wapi/job-viewed-not-applied` | `jobViewedNotAppliedService` | Producer |
| GET | `/wapi/has-not-applied-any-job` | `hasNotAppliedAnyJobService` | Producer |
| GET | `/wapi/new-job-match-your-skill` | `newJobMatchYourSkillService` | Producer |
| GET | `/wapi/candidate-matches-your-job-requirement` | `candidateMatchesYourJobRequirementService` | Producer |
| GET | `/wapi/gentle-reminder` | `gentleReminderService` | Producer |
| GET | `/wapi/marked-immidiate-joiner` | `markedImmediateJoinerService` | Producer (spelling intentional) |
| GET | `/wapi/no-login-or-action` | `noLoginOrActionService` | Producer |
| GET | `/wapi/got-a-message` | `gotAMessageService` | Producer |
| GET | `/wapi/unified-email` | `unifiedEmailService` | Producer |
| GET | `/wapi/send-email-import-employee` | `sendEmailImportEmployeeService` | Producer |
| GET | `/wapi/update-percentage` | `updatePercentageService` | Profile % |
| GET | `/wapi/percentage_status_reset` | `percentageStatusResetService` | Profile % |
| GET | `/wapi/update-account-setting` | `updateAccountSettingService` | Settings backfill |

---

# A. Ops & data maintenance

## 1. GET `/wapi/backup`

Dump MySQL → upload to S3 → delete local file.

1. `mysqldump --single-transaction --quick --no-tablespaces`
2. S3 key:
   - `SERVER_TYPE == 'STAGING'` → `database-backups/{filename}`
   - else → `database-backups-staging/{filename}` *(names inverted vs label — PHP parity)*
3. Success JSON or HTTP **500** text on failure.

```json
{ "status": true, "message": "Backup uploaded to S3 successfully", "s3_url": "..." }
```

## 2. GET `/wapi/update-view-request`

```
UPDATE cyb_user_profile_view_request SET status = 0
WHERE is_deleted = 0 AND DATE(expiry) < today
```

## 3. GET `/wapi/lat-long-update`

Users with address but missing lat/long → Google Geocoding → upsert `cyb_user_details`.

```json
{ "status": true, "message": "Record update success" }
```
```json
{ "status": false, "message": "Nothing to update" }
```

## 4. GET `/wapi/delete-otp`

1. Delete `cyb_otp` where `DATE(create_date) < today`
2. `TRIM(name)` on department, designation, institutions, courses, skill, state

## 5. GET `/wapi/update-percentage`

Batch of **1000** users with `percentage_status=0` (employees or claimed companies).  
Calls `profilePercentageService` → writes `percentage`, `percentage_status=1`.

## 6. GET `/wapi/percentage_status_reset`

```
UPDATE cyb_user SET percentage_status = 0
```

Typical: **reset** → repeated **update-percentage** until done.

## 7. GET `/wapi/update-account-setting`

Users missing any `account_setting` row → `createDefaultSettings(userId)`.

---

# B. Email scheduler pipeline

## 8. GET `/wapi/create-email-schedule` [/:id]

Expand due schedules into temp table.

**Select:** `status=1 AND execute=0 AND (id=:id OR trigger<=now)`

1. Decode `emails` JSON  
2. Empty → `"Scheduler can not create  on empty email list!"`  
3. `execute=1`  
4. Chunk **500** → `cyb_schedular_email_temp`

```json
{ "status": true, "message": "Scheduler run successfully!" }
```
```json
{ "status": false, "message": "Sechuder not valid Please check Sechuder detail" }
```

## 9. GET `/wapi/send-email-schedule` [/:id]

**Select:** `status=1 AND execute=1`  
Per schedule: up to **30** temp rows with `status=0`.

| `deliver` | Meaning |
|-----------|---------|
| `1` | Queued/sent OK (SQS) |
| `2` | Send failed |
| `3` | Not sendable (no user / newsletter off) |

Sends via `sendEmailViaSQS(email, templateId, vars)`.  
Optional WhatsApp: `CANDIDATE_MATCH_YOUR_JOB` → campaign **193**; `UNLOCK_LEVEL` shorts → **215–219**.

```json
{ "status": true, "message": "email send successfully!" }
```

## 10. GET `/wapi/final-schedule-update`

Completed schedules (no pending temp): write `delivered` / `not_delivered` / `not_send` JSON, `status=2`, `execute=0`, delete temp.  
In-progress (`execute=1`): snapshot JSON only.

## 11. GET `/wapi/create-reschedule/:id`

From completed schedule `not_delivered` list → new `cyb_schedulars` row (`status=0`).

```json
{ "status": true, "message": "Scheduler create successfully!" }
```

---

# C. Campaign producers

Insert `cyb_schedulars` (`status=1`, `execute=0`) only. Downstream: create → send → final.

| Endpoint | `type` | Template id | Audience |
|----------|--------|-------------|----------|
| `cron-notice` | `NOTICE` | **81** | `on_notice=1`, `notice_date = yesterday` |
| `total-new-job-post` | `TOTAL_JOB_POST` / `TOTAL_NEW_USER` | **99** / **100** | Jobs yesterday → employees; users today → claimed companies |
| `job-viewed-not-applied` | `JOB_VIEWED_NOT_APPLIED` | **101** | Job impressions &gt;7d, never applied |
| `has-not-applied-any-job` | `NOT_APPLIED_JOB` | **102** / **103** | Employees no applications / companies no jobs |
| `new-job-match-your-skill` | `NEW_JOB_MATCH_SKILL` | **104** | Exploring employees with skills + open jobs |
| `candidate-matches-your-job-requirement` | `CANDIDATE_MATCH_YOUR_JOB` | **105** | Companies that posted jobs today |
| `got-a-message` | `GOT_A_MESSAGE` | **59** | Unread messages last 1 hour |
| `gentle-reminder` | `GENTLE_REMINDER` | **88** | Pending employment ≥7 days |
| `marked-immidiate-joiner` | `IMMIDATE_JOINER` | **84** | Companies with jobs; count immediate explorers |
| `no-login-or-action` | `NO_LOGIN` | **106** / **107** | login_time &gt;7 days (user / company) |
| `unified-email` | `UNIFIED_MODULE` | **110** | All claimed companies |
| `send-email-import-employee` | `IMPORT_EMPLOYEE` | short **`CYVPN`** | `user_details.import=1` |

Empty-audience notes:

- `cron-notice`: `{ "status": true, "messages": "No users found nearing expiry" }`
- `new-job-match-your-skill`: `{ "message": "no record found!" }`

---

# D. Recommended cron ordering

| Frequency | Jobs |
|-----------|------|
| Daily (off-peak) | `backup`, `delete-otp`, `update-view-request`, producers, `percentage_status_reset` then multiple `update-percentage` |
| Frequent (1–5 min) | `create-email-schedule` → `send-email-schedule` → `final-schedule-update` |
| Periodic | `lat-long-update`, `update-account-setting`, `got-a-message` |

```bash
curl -sS -H "X-Ops-Key: $OPS_KEY" https://host/wapi/create-email-schedule
curl -sS -H "X-Ops-Key: $OPS_KEY" https://host/wapi/send-email-schedule
curl -sS -H "X-Ops-Key: $OPS_KEY" https://host/wapi/final-schedule-update
```

---

# E. Node parity checklist

1. Ops guard (`X-Ops-Key`) — PHP was open; Node is protected.  
2. Two-phase email: producer → temp → send → final.  
3. Batch sizes: create **500**, send **30**.  
4. Newsletter `account_setting` semantics.  
5. Exact `type` strings including `IMMIDATE_JOINER`.  
6. Template ids 59, 81, 84, 88, 99–107, 110 + short `CYVPN`.  
7. `deliver` codes 1/2/3 drive reschedule.  
8. Profile %: reset then batches of 1000 via `profilePercentageService`.  
9. Backup: mysqldump + S3; lat/long: Google key.  
10. WhatsApp side effects fail soft.  
11. Responses prefer JSON `{ status, message|messages, ... }` (Node-friendly vs PHP echo mix).

---

# F. Quick reference

```
Pipeline:  create-email-schedule → send-email-schedule → final-schedule-update
Producers: insert cyb_schedulars (status=1, execute=0) only
Ops:       backup | lat-long | delete-otp | view-request expire
Profile:   percentage_status_reset → update-percentage (×N)
Settings:  update-account-setting
Retry:     create-reschedule/:id from not_delivered list
Code:      src/routes/cron.route.ts · cron.service.ts · cron.repositery.ts
```
