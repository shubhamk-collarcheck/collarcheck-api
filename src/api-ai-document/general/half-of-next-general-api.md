
# CollarCheck General / Social / Notification API

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Route files:** `general.route.ts`, `root.route.ts`, `user.route.ts`  
> **Controllers:** `general.controller.ts`, `user.controller.ts`  
> **Services:** `general.service.ts`, `user.service.ts`


> This document describes all API endpoints, their HTTP methods, request/response patterns, and the business logic behind each endpoint. Use this to recreate the API in any tech stack.

---

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Common Response Envelope](#common-response-envelope)
- [GET Endpoints](#get-endpoints)
- [POST Endpoints](#post-endpoints)
- [PUT Endpoints](#put-endpoints)
- [DELETE Endpoints](#delete-endpoints)
- [Common Patterns](#common-patterns)
- [Database Schema Hints](#database-schema-hints)

---

## Authentication

All endpoints (except where noted) require a JWT token in the `Authorization` header as `Bearer <token>`.

---

## Base URL

```
/wapi
```
> **Node note:** All paths below are under `/wapi` (not `/api`). Example: `GET /wapi/general/verify-authtoken`.

---



## Node implementation status

Most general/auth/notification/follow endpoints in this doc are implemented under:

| Area | Route mount | Route file |
|------|-------------|------------|
| General lists + social | `/wapi/general` | `src/routes/general.route.ts` |
| Root multi + logout + company-list | `/wapi` | `src/routes/root.route.ts` |
| User phone/email | `/wapi/user` | `src/routes/user.route.ts` |

**Aligned with PHP (path/method):**
- `GET /wapi/logout` (not POST)
- `DELETE /wapi/notifications/clear-all-notification`
- `POST /wapi/multi-unfollow` (body `user_ids`)
- `POST /wapi/general/multi-remove-follower`
- `DELETE /wapi/employee/removeNotification` (body id)
- `DELETE /wapi/removeNotification/:id`
- `POST /wapi/claim-company` (root, not under general)

**Still out of scope here:** OTP / email OTP / KYC (verifyAadhar, verifyGst, verifyDigilocker, etc.).

---

## Common Response Envelope

Legacy CollarCheck envelope (prefer this over REST status codes):

**Success:**
```json
{
  "status": true,
  "messages": "…",
  "data": { }
}
```

**Business error (usually HTTP 200):**
```json
{
  "status": false,
  "messages": "…"
}
```

**Auth failure:** HTTP **401** from `Authorization` middleware.  
**Menu permission:** HTTP **403** with `{ "status": false, "message": "…" }` (singular `message`).

Validation via Zod may return HTTP **400** with `{ "error": "Invalid data", "details": […] }`.


## GET Endpoints

### 1. `GET /wapi/general/verify-authtoken`

**Function:** `verifyAuthToken`

**Description:** Validates the user's JWT token and returns user information.

**Request:**
```
GET /wapi/general/verify-authtoken
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 101,
    "email": "john@example.com",
    "phone": "+1234567890",
    "full_name": "John Doe",
    "avatar_url": "https://storage.example.com/avatars/101.jpg",
    "role": "user",
    "is_verified": true,
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```
**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired token",
  "code": "AUTH_TOKEN_INVALID"
}
```
**Implementation Notes:**
- Decode the JWT token (using secret key)
- Look up user by the ID/subject from the token
- Return user object if found, else 401

---

### 2. `GET /wapi/general/doc-list/:id`

**Function:** `allDocList`

**Description:** Fetches all documents (paginated) for a given user or category.

**Request:**
```
GET /wapi/general/doc-list/2
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
- Path Parameter: `id` (numeric) — page number or user/category ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "current_page": 2,
    "per_page": 20,
    "total_count": 150,
    "total_pages": 8,
    "documents": [
      {
        "id": 42,
        "title": "Business License",
        "description": "Official business registration document",
        "type": "license",
        "file_url": "https://storage.example.com/docs/42.pdf",
        "user_id": 101,
        "created_at": "2025-03-10T14:22:00Z",
        "updated_at": "2025-03-10T14:22:00Z"
      },
      {
        "id": 43,
        "title": "Tax Certificate",
        "description": "Annual tax compliance certificate",
        "type": "certificate",
        "file_url": "https://storage.example.com/docs/43.pdf",
        "user_id": 101,
        "created_at": "2025-03-12T09:15:00Z",
        "updated_at": "2025-03-12T09:15:00Z"
      }
    ]
  }
}
```
**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid page number",
  "code": "INVALID_PAGE"
}
```
**Implementation Notes:**
- Calls `fs/all_fetch` service
- Returns paginated document list

---

### 3. `GET /wapi/general/all-message`

**Function:** `allMessageList`

**Description:** Returns all messages for the authenticated user. Creates a message connection row if one doesn't exist.

**Request:**
```
GET /wapi/general/all-message
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "connection_id": 501,
        "other_user": {
          "id": 102,
          "full_name": "Jane Smith",
          "avatar_url": "https://storage.example.com/avatars/102.jpg"
        },
        "last_message": {
          "id": 9001,
          "content": "Hey, are you available for a call?",
          "sender_id": 102,
          "is_read": false,
          "created_at": "2025-07-16T08:30:00Z"
        },
        "unread_count": 3
      },
      {
        "connection_id": 502,
        "other_user": {
          "id": 103,
          "full_name": "Bob Johnson",
          "avatar_url": "https://storage.example.com/avatars/103.jpg"
        },
        "last_message": {
          "id": 8950,
          "content": "Thanks for the update!",
          "sender_id": 101,
          "is_read": true,
          "created_at": "2025-07-15T16:45:00Z"
        },
        "unread_count": 0
      }
    ]
  }
}
```
**Implementation Notes:**
- Database reads from messages table
- If no connection/room row exists between the authenticated user and another party, create one
- Returns message list grouped by conversation

---

### 4. `GET /wapi/general/all-notification`

**Function:** `allNotification`

**Description:** Returns all notifications for the authenticated user.

**Request:**
```
GET /wapi/general/all-notification
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 5001,
        "type": "follow",
        "message": "Jane Smith started following you",
        "is_read": false,
        "related_entity_id": 102,
        "related_entity_type": "user",
        "created_at": "2025-07-16T09:00:00Z"
      },
      {
        "id": 5002,
        "type": "document_verified",
        "message": "Your document 'Business License' has been verified",
        "is_read": true,
        "related_entity_id": 42,
        "related_entity_type": "document",
        "created_at": "2025-07-15T14:30:00Z"
      },
      {
        "id": 5003,
        "type": "message",
        "message": "You have a new message from Bob Johnson",
        "is_read": false,
        "related_entity_id": 9001,
        "related_entity_type": "message",
        "created_at": "2025-07-15T10:00:00Z"
      }
    ],
    "unread_count": 2
  }
}
```
**Implementation Notes:**
- Database read from notifications table filtered by authenticated user
- Ordered by `created_at` descending
- Filter out notifications that exist in `clear_notification` table

---

### 5. `GET /wapi/general/verificationStatus`

**Function:** `verificationStatus`

**Description:** Returns the current verification status of the authenticated user.

**Request:**
```
GET /wapi/general/verificationStatus
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "phone_verified": true,
    "email_verified": true,
    "identity_verified": false,
    "documents_verified": false,
    "business_verified": false,
    "overall_status": "partial",
    "pending_items": [
      "identity_verification",
      "document_upload"
    ]
  }
}
```
**Implementation Notes:**
- Database reads from user verification/status tables

---

### 6. `GET /wapi/general/followDataList`

**Function:** `followDataList`

**Description:** Returns the follow/following relationship data for the authenticated user.

**Request:**
```
GET /wapi/general/followDataList
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "id": 102,
        "full_name": "Jane Smith",
        "avatar_url": "https://storage.example.com/avatars/102.jpg",
        "followed_at": "2025-06-01T12:00:00Z"
      },
      {
        "id": 104,
        "full_name": "Alice Brown",
        "avatar_url": "https://storage.example.com/avatars/104.jpg",
        "followed_at": "2025-06-15T08:30:00Z"
      }
    ],
    "following": [
      {
        "id": 103,
        "full_name": "Bob Johnson",
        "avatar_url": "https://storage.example.com/avatars/103.jpg",
        "followed_at": "2025-05-20T16:00:00Z"
      }
    ],
    "followers_count": 2,
    "following_count": 1
  }
}
```
**Implementation Notes:**
- Database reads from follow relationships table

---

## POST Endpoints

### 7. `GET /wapi/logout`

**Function:** `logout`

**Description:** Logs out the authenticated user, invalidates tokens, and records login history.

**Request:**
```
GET /wapi/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```
**Implementation Notes:**
- Update refresh token to null/invalidated in user record
- Insert record into login_history table (action = 'logout', timestamp, user_id)
- Optionally blacklist the JWT if using a blocklist

---

### 8. `POST /wapi/general/saveDocument`

**Function:** `saveDocument`

**Description:** Creates or updates a document record with associated metadata. Performs multi-table internal DB writes.

**Request:**
```
POST /wapi/general/saveDocument
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "id": null,
  "title": "Business License",
  "description": "Official business registration document",
  "type": "license",
  "file_url": "https://storage.example.com/uploads/license.pdf",
  "metadata": {
    "issue_date": "2025-01-01",
    "expiry_date": "2026-01-01",
    "issuing_authority": "City Government"
  }
}
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "title": "Business License",
    "description": "Official business registration document",
    "type": "license",
    "file_url": "https://storage.example.com/uploads/license.pdf",
    "user_id": 101,
    "created_at": "2025-07-16T10:00:00Z",
    "updated_at": "2025-07-16T10:00:00Z",
    "metadata": {
      "issue_date": "2025-01-01",
      "expiry_date": "2026-01-01",
      "issuing_authority": "City Government"
    }
  }
}
```
**Error Response (400):**
```json
{
  "success": false,
  "error": "Title is required",
  "code": "VALIDATION_ERROR"
}
```
**Implementation Notes:**
- Multi-table write operation:
  1. Insert/update into documents table
  2. Insert/update into document_metadata table
  3. Update user document count or related counters
- Use database transaction to ensure atomicity

---

### 9. `POST /wapi/user/updatePhone`

**Function:** `updatePhone`

**Description:** Updates the authenticated user's phone number with duplicate checking.

**Request:**
```
POST /wapi/user/updatePhone
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "phone": "+1234567890",
  "country_code": "+1"
}
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Phone number updated successfully",
    "phone": "+1234567890",
    "verification_required": true
  }
}
```
**Error Response (409):**
```json
{
  "success": false,
  "error": "Phone number already in use",
  "code": "PHONE_DUPLICATE"
}
```
**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid phone number format",
  "code": "PHONE_INVALID"
}
```
**Implementation Notes:**
- Validate phone number format
- Check if phone number already exists in users table (excluding current user)
- If duplicate found, return 409 Conflict
- Update users table with new phone number
- Optionally trigger phone verification flow

---

### 10. `POST /wapi/user/updateEmail`

**Function:** `updateEmail`

**Description:** Updates the authenticated user's email address with duplicate checking.

**Request:**
```
POST /wapi/user/updateEmail
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "email": "newemail@example.com"
}
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Email updated successfully",
    "email": "newemail@example.com",
    "verification_required": true
  }
}
```
**Error Response (409):**
```json
{
  "success": false,
  "error": "Email already in use",
  "code": "EMAIL_DUPLICATE"
}
```
**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid email format",
  "code": "EMAIL_INVALID"
}
```
**Implementation Notes:**
- Validate email format (RFC 5322 or similar)
- Check if email already exists in users table (excluding current user)
- If duplicate found, return 409 Conflict
- Update users table with new email
- Optionally send verification email to new address

---

## PUT Endpoints

### 11. `PUT /wapi/general/allReadNotification`

**Function:** `allReadNotification`

**Description:** Marks all notifications for the authenticated user as read.

**Request:**
```
PUT /wapi/general/allReadNotification
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "All notifications marked as read",
    "updated_count": 15
  }
}
```
**Implementation Notes:**
- Use `updateData` utility to bulk update notifications table
- Set `is_read = true` for all notifications where `user_id = authenticated_user_id`

---

### 12. `PUT /wapi/general/chatMessageRead/:id`

**Function:** `chatMessageRead`

**Description:** Marks a specific chat message as read by the authenticated user.

**Request:**
```
PUT /wapi/general/chatMessageRead/9001
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
- Path Parameter: `id` (numeric) — message ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Message marked as read",
    "message_id": 9001,
    "is_read": true
  }
}
```
**Error Response (404):**
```json
{
  "success": false,
  "error": "Message not found",
  "code": "MESSAGE_NOT_FOUND"
}
```
**Implementation Notes:**
- Use `updateData` utility to update messages table
- Set `is_read = true` where `id = :id` and user is the receiver
- Optionally update conversation's last_read_at timestamp

---

## DELETE Endpoints

### 13. `DELETE /wapi/employee/removeNotification`

**Function:** `removeNotification`

**Description:** Removes (soft deletes) a specific notification for the authenticated user.

**Request:**
```
DELETE /wapi/employee/removeNotification
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "id": 5001
}
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Notification removed",
    "notification_id": 5001
  }
}
```
**Error Response (404):**
```json
{
  "success": false,
  "error": "Notification not found",
  "code": "NOTIFICATION_NOT_FOUND"
}
```
**Implementation Notes:**
- Insert into `clear_notification` table (soft delete pattern)
- Do NOT physically delete from notifications table
- Record the notification ID in clear_notification for reference

---

### 14. `DELETE /wapi/notifications/clear-all-notification`

**Function:** `clearAllNotification`

**Description:** Clears all notifications for the authenticated user by recording them in the clear_notification table.

**Request:**
```
DELETE /wapi/notifications/clear-all-notification
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "All notifications cleared",
    "cleared_count": 25
  }
}
```
**Implementation Notes:**
- Read all active notification IDs for the authenticated user
- Insert batch into `clear_notification` table
- This effectively hides all notifications without physical deletion

---

### 15. `DELETE /wapi/removeNotification/:id`

**Function:** `removeNotification`

**Description:** Removes (soft deletes) a specific notification by ID.

**Request:**
```
DELETE /wapi/removeNotification/5001
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
- Path Parameter: `id` (numeric) — notification ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Notification removed",
    "notification_id": 5001
  }
}
```
**Error Response (404):**
```json
{
  "success": false,
  "error": "Notification not found",
  "code": "NOTIFICATION_NOT_FOUND"
}
```
**Implementation Notes:**
- Same as endpoint #13
- Insert into `clear_notification` table

---

### 16. `DELETE /wapi/general/unfollow/:id`

**Function:** `unfollow`

**Description:** Removes a follow relationship (unfollow a user).

**Request:**
```
DELETE /wapi/general/unfollow/103
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
- Path Parameter: `id` (numeric) — user ID to unfollow

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Unfollowed successfully",
    "unfollowed_user_id": 103
  }
}
```
**Error Response (404):**
```json
{
  "success": false,
  "error": "Follow relationship not found",
  "code": "FOLLOW_NOT_FOUND"
}
```
**Implementation Notes:**
- Use `updateData` to set `is_deleted = true` in the follow relationships table
- Where `follower_id = authenticated_user_id` AND `following_id = :id`
- Do NOT physically delete the row

---

### 17. `DELETE /wapi/general/removeFollower/:id`

**Function:** `removeFollower`

**Description:** Removes a follower from the authenticated user's follower list.

**Request:**
```
DELETE /wapi/general/removeFollower/104
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```
- Path Parameter: `id` (numeric) — follower user ID to remove

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Follower removed",
    "removed_follower_id": 104
  }
}
```
**Error Response (404):**
```json
{
  "success": false,
  "error": "Follow relationship not found",
  "code": "FOLLOW_NOT_FOUND"
}
```
**Implementation Notes:**
- Use `updateData` to set `is_deleted = true` in the follow relationships table
- Where `follower_id = :id` AND `following_id = authenticated_user_id`
- Do NOT physically delete the row

---

### 18. `POST /wapi/multi-unfollow`

**Function:** `multi_unfollow`

**Description:** Unfollows multiple users at once.

**Request:**
```
POST /wapi/multi-unfollow
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "user_ids": [103, 104, 105]
}
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Multiple users unfollowed",
    "unfollowed_count": 3,
    "unfollowed_user_ids": [103, 104, 105]
  }
}
```
**Implementation Notes:**
- Loop through `user_ids` array
- For each user ID, use `updateData` to set `is_deleted = true`
- Where `follower_id = authenticated_user_id` AND `following_id = user_id`
- Optionally use batch update for performance

---

### 19. `DELETE /wapi/general/multi-remove-follower`

**Function:** `multi_remove_follower`

**Description:** Removes multiple followers at once from the authenticated user's follower list.

**Request:**
```
DELETE /wapi/general/multi-remove-follower
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "user_ids": [102, 104, 106]
}
```
**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Multiple followers removed",
    "removed_count": 3,
    "removed_follower_ids": [102, 104, 106]
  }
}
```
**Implementation Notes:**
- Loop through `user_ids` array
- For each user ID, use `updateData` to set `is_deleted = true`
- Where `follower_id = user_id` AND `following_id = authenticated_user_id`
- Optionally use batch update for performance

---

## Common Patterns

### Soft Delete Pattern

Most delete operations use a soft delete pattern:
- Add `is_deleted` (boolean, default: false) and `deleted_at` (timestamp) columns
- "Delete" sets `is_deleted = true` and `deleted_at = current_timestamp`
- Queries should filter by `is_deleted = false` by default
- A `clear_notification` junction table is used for notification soft deletes

### `updateData` Utility

The `updateData` function is a generic data update utility:
- Takes table name, data object (fields to update), and conditions
- Performs a SQL UPDATE with provided fields and WHERE conditions
- Returns affected row count

### `fs` Service

The `fs` service is a filesystem or service abstraction for reading/writing data:
- `fs('user')` — fetch user data
- `fs/all_fetch` — fetch paginated list data

---

## Database Schema Hints

Based on the endpoints, the following tables are implied:

| Table | Key Columns |
|-------|-------------|
| `users` | id, email, phone, full_name, avatar_url, role, is_verified, is_deleted, created_at |
| `documents` | id, user_id, title, description, type, file_url, created_at, updated_at |
| `document_metadata` | id, document_id, key, value |
| `messages` | id, connection_id, sender_id, receiver_id, content, is_read, created_at |
| `message_connections` | id, user1_id, user2_id, created_at |
| `notifications` | id, user_id, type, message, is_read, related_entity_id, related_entity_type, created_at |
| `clear_notification` | id, user_id, notification_id, cleared_at |
| `follows` | id, follower_id, following_id, is_deleted, created_at, deleted_at |
| `login_history` | id, user_id, action, ip_address, user_agent, created_at |
