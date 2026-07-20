
# Account Migration & Management Endpoints

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Auth:** JWT where marked; company context via `X-Company` → `req.auth.id` = company, JWT user = `req.auth.user_id`  
> **Status:** Implemented — `src/routes/account-migration.route.ts`  

Company role/permission admin, account merge OTP, doctypes, delete-revoke, public helpers, and AI generate-row.

---

## Node file map

| Layer | Path |
|-------|------|
| Routes | `src/routes/account-migration.route.ts` (mounted at `/wapi`) |
| Controller | `src/controllers/account-migration.controller.ts` |
| Service | `src/services/account-migration.service.ts` |
| Repository | `src/repositery/account-migration.repositery.ts` |
| Types | `src/types/account-migration.types.ts` |
| Tables | `cyb_user_main_group`, `cyb_user_group`, `cyb_user_permission`, `cyb_user_relation`, `cyb_event_menu`, `cyb_web_menu`, `cyb_doctype`, `cyb_otp`, `cyb_account_delete_requests`, `cyb_notifications` |

---

## Routes Summary

| # | Method | Full path | Auth | CRUD | Handler |
|---|--------|-----------|------|------|---------|
| 1 | GET | `/wapi/switch-account/:token` | Public | — | Stub `{ status: false, messages: "Not implemented" }` |
| 2 | POST | `/wapi/create-user-group` | JWT + company | C | `createUserGroup` |
| 3 | POST | `/wapi/create-user-group/:id` | JWT + company | U | `createUserGroup` |
| 4 | POST | `/wapi/assign-user-permission` | JWT + company | C | `assignUserPermission` |
| 5 | POST | `/wapi/assign-user-permission/:id` | JWT + company | U | `assignUserPermission` |
| 6 | GET | `/wapi/menus/events` | JWT | R | `menuEventList` |
| 7 | GET | `/wapi/user-group` | JWT | R | `userGroupList` |
| 8 | GET | `/wapi/group-user-list` | JWT | R | `groupUserList` |
| 9 | GET | `/wapi/user-permission-list` | JWT | R | `userPermissionList` |
| 10 | GET | `/wapi/edit-user-permission/:id` | JWT | R | `editUserPermission` |
| 11 | PUT | `/wapi/remove-permission` | JWT | D soft | `removePermission` |
| 12 | GET | `/wapi/all-role-group` | JWT | R | `allRoleGroup` |
| 13 | GET | `/wapi/edit-group-role/:id` | JWT | R | `editGroupRole` |
| 14 | PUT | `/wapi/remove-group-role` | JWT | D soft | `removeGroupRole` |
| 15 | GET | `/wapi/checkip` | Public | R | raw IP string |
| 16 | GET | `/wapi/doctype-list` | JWT | R | `doctypeList` |
| 17 | GET | `/wapi/company-doctype-list` | JWT | R | same as #16 |
| 18 | GET | `/wapi/reminder-veification-pending` | Public | — | Stub not implemented |
| 19 | POST | `/wapi/send-otp-account-merge` | JWT + company | C | `sendOtpAccountMerge` |
| 20 | POST | `/wapi/otp-verify-account-merge` | JWT + company | C | `otpVerifyAccountMerge` |
| 21 | POST | `/wapi/merge-user-register` | JWT + company | C | **Implemented** (was missing in PHP) |
| 22 | POST | `/wapi/ai-generate-row` | Public | AI | `aiGenerateRow` |
| 23 | DELETE | `/wapi/revoke-delete-account` | JWT | D | `revokeDeleteAccount` |
| 24 | GET | `/wapi/digilocker` | Public | — | JSON landing info |
| 25 | GET | `/wapi/nonclaim-company` | Public | R | `nonclaimCompany` |
| 26 | GET | `/wapi/default-user-list` | Public | R | `defaultUserList` |

---

## Company context

| Header / field | Maps to |
|----------------|---------|
| `Authorization: Bearer …` | JWT |
| `X-Company: {companyId}` | `req.auth.id` = **company** |
| JWT subject | `req.auth.user_id` = **login person** |
| | `req.auth.user_type` = 1 employee / 2 company |

Permission endpoints reject pure employees with `"Company id is requeired!"` when `user_type == 1` and no company context.

---

# Groups & permissions

### POST `/wapi/create-user-group` [+ `/:id`]
- Body: `group_name` (int main-group id **or** string name), `event_permission` (number[])
- Blocks default names: super admin, admin, hr, manager (create only)
- Maps events → menu IDs; always includes dashboard menu **`1` first**
- Stores JSON `menu_permission` / `event_permission` on `cyb_user_group`
- Create: `"Group created successfully!"` · Update: `"Group Updated successfully!"`
- Dup: `"Group already exists."` (uses `message` singular)

### POST `/wapi/assign-user-permission` [+ `/:id`]
- Body: `user_id`, `group_id` (**user_group row PK**)
- Create: relation + permission; notify + SQS push
- Super-admin guards on update/remove
- Messages: assigned / updated / already assigned / Super Admin guards

### GET lists
- **menus/events** → `{ data: { event: [...] } }`
- **user-group** → groups for company owner
- **group-user-list** → paginated users with roles (`limit` default 50, page `offset`)
- **user-permission-list** → decode menu/event JSON or full catalog
- **edit-user-permission/:id** · **edit-group-role/:id** · **all-role-group**

### PUT remove
- **remove-permission** body `{ permission_id: [] }` → soft-delete permission + relation  
  `"Permissions removed successfully"`
- **remove-group-role** body `{ user_group_id: [] }` → soft-delete users in group, perms, group  
  `"Groups removed successfully"`

---

# Merge OTP flow

### POST `/wapi/send-otp-account-merge`
Company JWT. Modes via `skipAssociate`:
- **false:** phone must exist; not already in company
- **true:** phone must **not** exist (signup path)

Sends SMS OTP (MSG91) + stores `cyb_otp`.  
Success: `"OTP Successfully sent to your phone"` + optional user `data`.

### POST `/wapi/otp-verify-account-merge`
Verify OTP → create `user_relation` + super-admin `user_permission` (unless skipAssociate) → `getStatistics` as `data`.  
Messages: `"OTP verify successfully !"`, `"Otp Expired !"`, `"Invalid OTP!"`, `"invalid phone no."`

### POST `/wapi/merge-user-register` (Node-implemented)
Create new employee from phone/name/email, attach relation + permission, return stats.  
(Was 404 in PHP.)

---

# Other

| Route | Behavior |
|-------|----------|
| GET checkip | Raw IP string (not JSON envelope) |
| GET doctype-list / company-doctype-list | `docfor = user_type OR 0`, `"Doc list"` |
| POST ai-generate-row | OpenAI (`GPT` / `OPENAI_API_KEY`), `JOB_DESCRIPTION` or default bullets |
| DELETE revoke-delete-account | Hard-delete `cyb_account_delete_requests` for self |
| GET digilocker | JSON info + optional `DIGILOCKER_URL` |
| GET nonclaim-company | Random company samples |
| GET default-user-list | Random employee samples |
| switch-account / reminder-veification-pending | Explicit not-implemented stubs |

---

## Side effects

| Endpoint | Writes | External |
|----------|--------|----------|
| create-user-group | main_group, user_group | — |
| assign-user-permission | relation, permission, notification | SQS PUSH |
| remove-* | soft-delete relation/permission/group | — |
| send-otp-account-merge | otp | MSG91 SMS |
| otp-verify / merge-user-register | relation, permission, user | — |
| revoke-delete-account | hard delete account_delete_requests | — |
| ai-generate-row | — | OpenAI |

---

## Env

| Name | Use |
|------|-----|
| `GPT` / `OPENAI_API_KEY` | ai-generate-row |
| `GPT_MODEL` | default `gpt-4.1-mini` |
| `S3_PREFIX` | profiles |
| `DIGILOCKER_URL` | digilocker landing |
| MSG91 env | merge OTP SMS |

---

## Checklist

- [x] Company context via `X-Company`
- [x] Message string parity (including `"requeired!"` typo)
- [x] Super-admin guards on assign/remove
- [x] Soft-delete for permission/group
- [x] Merge OTP + register path
- [x] Doctype dual routes
- [x] Public helpers: nonclaim, default users, checkip, digilocker
- [x] ai-generate-row
- [x] revoke-delete-account
- [x] Stubs for missing PHP switch-account / reminder-veification-pending
- [x] merge-user-register implemented in Node
