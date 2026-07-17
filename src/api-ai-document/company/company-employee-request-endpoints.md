# Company Employee Request, Messaging, Dashboard & Misc Endpoints

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** mostly `/wapi/company` · some `/wapi/general` · `/wapi/company-list`  
> **Route files:** `company.route.ts`, `general.route.ts`, `root.route.ts`  
> **Controller:** `company-employee-request.controller.ts` (+ general message/follow handlers)  
> **Service / repo:** `company-employee-request.service.ts` · `company-employee-request.repositery.ts`  
> **Types:** `company-employee-request.types.ts`

## Routes Summary

| Method | Full path | Handler | Description |
|--------|-----------|---------|-------------|
| GET | `/wapi/company/user-detail` | `companyDetail` | Auth company profile summary |
| POST | `/wapi/company/addEmployee` | `addEmployee` | Invite/add employee |
| POST | `/wapi/company/addEmployee/:id` | `addEmployeeUpdate` | Update employee request |
| GET | `/wapi/company/employeeDetail/:id` | `employeeDetail` | Employee request detail |
| PUT | `/wapi/company/rejectEmployement/:id` | `rejectEmployment` | Reject employment |
| DELETE | `/wapi/company/rejectPromotion/:id` | `rejectPromotion` | Reject promotion |
| POST | `/wapi/company/leaveExperience` | `leaveExperience` | Leave/promotion flow |
| GET | `/wapi/company/reviewUniqueUsers` | `reviewUniqueUsers` | Unique review users |
| GET | `/wapi/company/validToReview/:id` | `validToReview` | Can review user? |
| GET | `/wapi/company/followRequestList` | `followRequestList` | Follow requests |
| GET | `/wapi/company/dashboard` | `dashboard` | Company dashboard |
| GET | `/wapi/company/sidebar-count` | `sidebarCount` | Sidebar badges |
| GET | `/wapi/company/employement-request` | `employmentRequest` | Employment requests |
| POST | `/wapi/company/add-company` | `inviteCompany` | Register/invite company |
| POST | `/wapi/company/add-company/:id` | `inviteCompany` | Update invite |
| POST | `/wapi/company/invite-company` | `inviteCompany` | Invite company |
| POST | `/wapi/company/revoke-delete-account` | `revokeDeleteAccount` | Revoke account deletion |
| GET | `/wapi/company-list` | `companyList` | User’s companies list |
| GET | `/wapi/general/all-message-company` | `allMessageList` | Company message threads |
| POST | `/wapi/general/send-message-company` | `addMessage` | Send message |
| PUT | `/wapi/general/chatMessageReadCompany/:id` | `chatMessageRead` | Mark read |
| GET | `/wapi/general/company-followDataList` | `followDataList` | Follow data |
| GET | `/wapi/general/company-verificationStatus` | `verificationStatus` | Verification status |

---

## 1. Company Profile (Authenticated)

**Route:** `POST /wapi/company/company_detail`
**Controller:** `company_detail` ()

Returns the authenticated company's full profile with verification status, domains, emails, connections, and role info.

**DB Tables:** `user`, `user_domains`, `user_permission`, `user_group`, `company_job`, `account_delete_requests`, `user_relation`

**Request:** Auth only. Uses `X-Company` header override.

**Response:**
```json
{
  "status": true,
  "message": "company detail",
  "data": {
    "id": 123,
    "company_name": "...",
    "email": "...",
    "phone": "...",
    "profile": "https://...",
    "website": "...",
    "description": "...",
    "present_address": "...",
    "country": 1, "city": 1, "state": 1,
    "country_name": "...", "city_name": "...", "state_name": "...",
    "slug": "...",
    "incorporate_date": "2020",
    "turnover": 1, "turnover_name": "...",
    "company_size": 1, "company_size_name": "...",
    "industry": 1, "industry_name": "...",
    "totalConnection": 5,
    "profile_percentage": 80,
    "uncomplete": ["field1"],
    "complete": ["field2"],
    "followCount": 10,
    "is_verified": true,
    "exploreTalent": 1,
    "is_user_relation": 1,
    "currentStatus": {...},
    "isSuperAdmin": true,
    "account_deletion": false,
    "company_domains": [{"id":1,"domain":"example.com","is_verified":1}],
    "company_emails": [{"id":1,"email":"hr@example.com","is_verified":1}],
    "verificationProcess": {"level1":true,"level2":false},
    "socialLogin": true,
    "linkdin":"...", "youtube":"...", "instagram":"...", "facebook":"...", "twitter":"..."
  }
}
```
**Side effects:** On first call, if no domains exist, scrapes website URL via AI domain scraper and inserts suggested domains/emails into `user_domains`.

---

## 2. Add Employee

**Route:** `POST /wapi/company/add-employee`
**Controller:** `addEmployee` ()

Company adds an employee by email/phone. Creates or finds user, creates `user_experience` record with `approved=3` (pending).

**DB Tables:** `user`, `user_experience`, `user_update_experience`

**Request:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| email | string | if no phone | Employee email |
| phone | string | if no phone | Employee phone |
| joining_date | string | yes | Date string |
| salary | string | no | |
| designation | string/int | no | Name or ID |
| department | string/int | no | Name or ID |
| employment_type | string/int | no | Name or ID |
| skill | string | no | Comma-separated IDs |
| description | string | no | |

**Response:**
```json
{"status": true, "messages": "Employee added successfully!"}
```
---

## 3. Employee Detail

**Route:** `PUT /wapi/company/employeeDetail`
**Controller:** `employeeDetail` ()

Get full detail of a single employee experience record for a company.

**DB Tables:** `user_experience`, `user`, `designation`, `department`, `employement_type`, `user_experience_rating`

**Request:** `experience_id` (required)

**Response:**
```json
{
  "status": true,
  "messages": "employee detail",
  "data": {
    "id": 1, "userName": "...", "profile": "...",
    "salary": "...", "designation": "...", "department": "...",
    "employment_type": "...", "joining_date": "...", "worked_till_date": null,
    "still_working": 1, "approved": 1, "skill": ["..."],
    "description": "...", "document": [...], "rating": 4.5,
    "employement_id": 1, "slug": "...", "individual_id": "...",
    "is_verified": true, "user_slug": "...", "lastReview": 0,
    "updateHistory": [...]
  }
}
```
---

## 4. Reject Employment

**Route:** `PUT /wapi/company/reject-employement`
**Controller:** `rejectEmployement` ()

Reject a pending employment request (`approved=3` → `approved=2`).

**DB Tables:** `user_experience`, `user_update_experience`, `user_update_experience_history`

**Request:**
| Field | Type | Required |
|-------|------|----------|
| experience_id | int | yes |
| reason | string | no |

**Response:**
```json
{"status": true, "messages": "Reject successfully!"}
```
---

## 5. Reject Promotion

**Route:** `PUT /wapi/company/reject-promotion`
**Controller:** `rejectPromotion` ()

Reject a pending promotion/update request. Deletes the `user_update_experience` record.

**DB Tables:** `user_update_experience`, `user_experience`

**Request:**
| Field | Type | Required |
|-------|------|----------|
| experience_id | int | yes |
| type | int | yes | Update type |

**Response:**
```json
{"status": true, "messages": "Reject successfully!"}
```
---

## 6. Leave Experience (Company Action)

**Route:** `PUT /wapi/company/leave-experience`
**Controller:** `leaveExperience` ()

Company processes employee leave/promotion. Three modes:
- `type=1` (leave): Sets `still_working=0`, sets `worked_till_date`, auto-reviews via internal curl to `add-review`, updates user's `current_company`/`current_position`. Sets `expiry` to 72 hours from leave date.
- `type=2/3` (promotion): Updates salary, designation, salary_inhand, salary_mode. Triggers Level 4 verification email + WhatsApp to both user and company.

**DB Tables:** `user_experience`, `user`, `user_update_experience`, `user_update_experience_history`, `designation`

**Request:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | int | yes | Experience ID |
| type | int | yes | 1=leave, 2/3=promotion |
| worked_till_date | string | if type=1 | |
| rating | int | if type=1 | For auto-review |
| review | string | if type=1 | For auto-review |
| salary | string | if type=2/3 | |
| designation | string/int | if type=2/3 | Name or ID |
| salary_inhand | string | no | |
| salary_mode | string | no | |

**Side effects (type=2/3):** Sends email (template 124/125) + WhatsApp (campaign 210/211) to user and company about Level 4 verification.

**Response:**
```json
{"status": true, "messages": "Update successfully !"}
```
---

## 7. Review Unique Users

**Route:** `GET /wapi/company/review-unique-user`
**Controller:** `reviewUniqueUsers` ()

List unique employees who have reviews or are still working, with aggregated rating stats and explore status.

**DB Tables:** `user_experience`, `user_experience_rating`, `user`

**Query Params:** `keyword` (optional search)

**Response:**
```json
{
  "status": true,
  "messages": "review list",
  "data": [
    {
      "id": 1, "user_id": 123, "isVerified": true,
      "designation": "Engineer", "user_slug": "...",
      "user": "John Doe", "profile": "...",
      "rating": 0, "noofrecord": 3,
      "employmentScore": 85,
      "pendingReview": 1,
      "on_explore": 1, "on_immediate": 1, "on_notice": 0
    }
  ]
}
```
---

## 8. Valid To Review

**Route:** `GET /wapi/company/valid-to-review/{userid}`
**Controller:** `validToReview` ()

Check if a company can review a specific user (must have approved employment).

**Response:**
```json
{
  "status": true,
  "data": {
    "review": true,
    "experinece_id": 5,
    "requestSend": false,
    "requestApproved": false
  }
}
```
---

## 9. Follow Request List

**Route:** `GET /wapi/company/follow-request-list`
**Controller:** `followRequestList` ()

List pending (unapproved) follower requests for a company.

**DB Tables:** `follow`, `user`

**Query Params:** `limit` (default 6), `offset`

**Response:**
```json
{
  "status": true,
  "messages": "Follower List",
  "data": {
    "follow": [
      {
        "id": 1, "individual_id": "...", "name": "John Doe",
        "profile": "...", "slug": "...", "user_type": 1,
        "create_date": "2024-01-01"
      }
    ]
  }
}
```
---

## 10. Company Dashboard

**Route:** `GET /wapi/company/dashboard`
**Controller:** `dashboard` ()

Aggregated dashboard data: posted jobs count, applications, current employees, unread messages, pending employment requests, profile percentage, most applied jobs, and recent applications list.

**DB Tables:** `company_job`, `job_applied`, `user_experience`, `message_history`, `follow`

**Query Params:** `limit` (default 10), `offset`

**Response:**
```json
{
  "status": true,
  "data": {
    "postedJobs": 5,
    "applications": 20,
    "currentEmployies": 8,
    "followRequests": [],
    "messages": 3,
    "employementRequestList": [{ "id":1, "userName":"...", ... }],
    "percentage": {"total":80,"uncomplete":[...],"complete":[...]},
    "allApplicationList": [{ "id":1, "job":"...", "name":"...", ... }],
    "mostAppliedJob": [...]
  }
}
```
---

## 11. Sidebar Count

**Route:** `GET /wapi/company/sidebarCount`
**Controller:** `sidebarCount` ()

Badge counts for sidebar navigation.

**Response:**
```json
{
  "status": true,
  "data": {
    "reviewRequest": 5,
    "employmentRequest": 3,
    "followList": 2
  }
}
```
---

## 12. Company List

**Route:** `GET /wapi/company/company_list`
**Controller:** `company_list` ()

List all companies the authenticated user has a relation with (via `user_relation`). Returns company details, follow status, explore talent flag, user groups, and company users.

**DB Tables:** `user_relation`, `user`, `user_permission`, `user_group`, `follow`, `company_job`

**Query Params:** `limit` (default 16), `offset`

**Response:**
```json
{
  "status": true,
  "data": {
    "myCompany": [
      {
        "id": 123, "individual_id": "...",
        "profile": "...", "name": "Acme Corp",
        "city_name": "...", "state_name": "...", "country_name": "...",
        "claim_status": 1, "status": 1, "slug": "...",
        "company_size_name": "...", "industry_name": "...",
        "is_verified": true,
        "followData": {"follower":10,"following":5},
        "following": {"requestSend":true,"requestApproved":true},
        "exploreTalent": 1,
        "user_group": [...],
        "user_details": [...],
        "user_count": 5,
        "account_deletion": false,
        "currentStatus": {...},
        "isSuperAdmin": true
      }
    ]
  }
}
```
---

## 13. Invite Company

**Route:** `POST /wapi/company/invite_company/{id}`
**Controller:** `invite_company` ()

Invite or add a company. Two modes:
- If `company_name` is an integer ID: links existing unclaimed company to user via `user_relation`.
- If `company_name` is a string: creates new company user record, creates `user_relation`, assigns Super Admin role, sends invite email.

**DB Tables:** `user`, `user_relation`, `user_permission`, `user_group`, `company_invite`, `industries`

**Request:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| company_name | string/int | yes | Company name or existing ID |
| contact_person | string | yes | |
| incorporate_date | string | yes | 4-digit year |
| industry | string/int | yes | Name or ID |
| email | string | yes | |
| phone | string | yes | 10-15 digits |
| website | string | no | |
| profile | file | no | JPG/PNG, max 10MB |
| user_relation | int | no | If set, skips auto relation creation |

**Side effects:** Creates default user groups, assigns Super Admin permission, sends invite email (template 111).

**Response:**
```json
{
  "status": true,
  "messages": "Successfully Registered",
  "lastCreateId": 456,
  "email": "...",
  "phone": "..."
}
```
---

## 14. Employment Request List (Mobile)

**Route:** `POST /wapi/company/employement_request`
**Controller:** `CompanyMobileController::employement_request` ()

Mobile-optimized employment request list with pending/approved/rejected tabs and basic update list.

**DB Tables:** `user_experience`, `user_update_experience`, `user`, `designation`, `department`, `employement_type`

**Query Params:** `limit` (default 10), `offset`

**Response:**
```json
{
  "status": true,
  "messages": "Employement Requests",
  "data": {
    "pendingList": [{ "id":1, "userName":"...", "approved":3, ... }],
    "approvedList": [{ ... }],
    "rejectList": [{ ... }],
    "newUpdateList": [{ "id":1, "experience_id":1, "salary":"...", ... }],
    "pendingCount": [...],
    "approvedCount": [...],
    "rejectCount": [...],
    "updateList": [...]
  }
}
```
---

## 15. All Message List

**Route:** `POST /wapi/allMessageList`
**Controller:** `allMessageList` ()

Chat list for authenticated user. If `slug` param is provided, creates a new message connection if none exists. Returns all chat threads with unread counts and full message history.

**DB Tables:** `message`, `message_history`, `user`

**Query Params:** `slug` (optional, creates connection), `limit`, `offset`

**Response:**
```json
{
  "status": true,
  "messages": "message list",
  "data": [
    {
      "chat_id": 1,
      "sender": 123,
      "senderName": "Me",
      "receiverName": "John",
      "receiver_profile": "...",
      "receiver": 456,
      "receiver_slug": "...",
      "timestamp": "2024-01-01",
      "user_type": 1,
      "designation_name": "...",
      "industry_name": "...",
      "is_verified": true,
      "on_explore": 0,
      "count": 2,
      "message": [
        {
          "message_id": 1,
          "message": "Hello",
          "document": ["https://..."],
          "sender": 123, "receiver": 456,
          "datetime": "...", "is_viewed": 1,
          "senderName": "...", "receiverName": "...",
          "profile": "...", "receiver_profile": "..."
        }
      ]
    }
  ]
}
```
---

## 16. Add Message

**Route:** `POST /wapi/addMessage`
**Controller:** `addMessage` ()

Send a message (with optional file attachment). Creates message connection if needed. Checks receiver's message privacy setting (`messages` in `account_settings`). Also pushes to GraphQL/Node.js for real-time.

**DB Tables:** `message`, `message_history`, `account_settings`

**Request:** `multipart/form-data`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| send_to | int | yes | Receiver user ID |
| message | string | yes | |
| doc | file | no | PNG/JPG/PDF/Word, max 2MB |

**Side effects:** Pushes message to GraphQL endpoint (`GRAPHQL/api/message/send`) for real-time delivery. Checks receiver's `account_settings.messages` privacy flag.

**Response:**
```json
{"status": true, "messages": "Successfully added"}
```
---

## 17. Chat Message Read

**Route:** `PUT /wapi/chatMessageRead/{message_id}`
**Controller:** `chatMessageRead` ()

Mark all messages in a chat thread as read for the authenticated user.

**DB Tables:** `message_history`

**Response:**
```json
{"status": true, "messages": "Successfully updated"}
```
---

## 18. Follow Data List

**Route:** `GET /wapi/followDataList`
**Controller:** `followDataList` ()

Get follower and following lists for a user/company with counts. Includes explore status, follow-back status, and verification.

**DB Tables:** `follow`, `user`, `company_job`

**Query Params:** `limit` (default 50), `offset`

**Response:**
```json
{
  "status": true,
  "messages": "Follow Data List",
  "data": {
    "followerList": [
      {
        "id":1, "individual_id":"...", "name":"John",
        "designation_name":"...", "state_name":"...", "country_name":"...",
        "profile":"...", "slug":"...", "user_type":1, "user_id":123,
        "is_verified":true, "followBack":true,
        "create_date":"...", "notice_date":"...",
        "on_explore":1, "on_immediate":1, "on_notice":0
      }
    ],
    "followerCount": [...],
    "followingList": [...],
    "followingCount": [...]
  }
}
```
---

## 19. Verification Status

**Route:** `GET /wapi/verificationStatus`
**Controller:** `verificationStatus` ()

Get the verification status of authenticated user. For companies: checks claim status, email/phone verify, manual verify. For users: checks email/phone verify, document verify, job apply limit (max 5 if unverified).

**DB Tables:** `user`, `verify_document`, `user_domains`, `company_invite`, `job_applied`

**Response:**
```json
{
  "status": true,
  "data": {
    "isVerify": true,
    "email": "...",
    "phone": "...",
    "emailVerify": true,
    "phoneVerify": true,
    "doc_type_id": 4,
    "doc_type": "GST",
    "doc_name": "...",
    "doc_no": "...",
    "docVerify": true,
    "ApplyStatus": true,
    "jobCount": 2,
    "manual_verify": false
  }
}
```
---

## 20. Claim Company

**Route:** `POST /wapi/claim_company`
**Controller:** `claim_company` ()

Submit a company claim request. Inserts into `claim_company_enquires` and `company_invite`.

**DB Tables:** `claim_company_enquires`, `company_invite`

**Request:**
| Field | Type | Required |
|-------|------|----------|
| email | string | yes (or phone) |
| phone | string | yes (or email) |
| contact_person | string | no |
| website | string | no |
| company | string | no |
| message | string | no |

**Response:**
```json
{"status": true, "msg": "Record saved Successfully"}
```
---

## 21. Revoke Delete Account

**Route:** `POST /wapi/revoke_delete_account`
**Controller:** `AccountController::revoke_delete_account` ()

Cancel a pending account deletion request. If `company_id` is provided, revokes that company's deletion; otherwise revokes own.

**DB Tables:** `account_delete_requests`

**Request:**
| Field | Type | Required |
|-------|------|----------|
| company_id | int | no | Company to revoke deletion for |

**Response:**
```json
{"status": true, "messages": "Account revoked successfully"}
```
---

## Cross-Language Porting Notes

- All endpoints use the same JWT Bearer auth pattern (`Authenticate` filter in `wapi` route group).
- `req.auth.id` = authenticated user ID; `req.auth.user_id` = original JWT user (when `X-Company` header is used).
- `user_experience.approved` states: `1`=approved, `2`=rejected, `3`=pending.
- `user_experience.type`: `1`=leave, `2`=promotion, `3`=other update.
- Message content is encrypted with `encrypt_url()`/`decrypt_url()` — replicate the same encryption in the new language.
- File uploads go to S3 via `this->s3fileUploads(file, 'path/')` — replace with your S3 client.
- Helper `checkMenuAccess(userId, companyId, menuId)` checks permission group access — replicate the permission logic.
- Helper `accountSetting(userId)` reads `account_settings` table for privacy flags.
- SQS service (`SqsService`) pushes email/WhatsApp jobs to queues — replace with your queue client.
- `show_exploring(userId, companyId)` checks if user is actively exploring at a company — replicate the query logic.
