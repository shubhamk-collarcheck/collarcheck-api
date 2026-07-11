
# Employee Send Company Invite

## Overview

Endpoint for an employee to send an invitation to a company's contact person via email. Creates or updates a `company_invite` record.

---

## Authentication

- **Filter:** `Authenticate` (CodeIgniter 4 filter applied to route group `wapi`)
- **Header:** `Authorization: Bearer <jwt_token>`
- **JWT decode:** Extract `uid` claim → look up `user` table WHERE `id = uid`, `status = 1`, `is_deleted = 0`
- **Optional override:** Send `X-Company` header with a different user ID to act on behalf of that user
- **Injected request property:** `$this->request->id` → the acting user ID (the employee sending the invite)

---

## Route

| Method | Path                                  | Controller Method                | Description              |
|--------|---------------------------------------|----------------------------------|--------------------------|
| `POST` | `/wapi/employee/sendCompanyInvite`    | `IndividualApi::sendCompanyInvite` | Send invite to a company |

---

## Common Response Envelope

Returns `Content-Type: application/json`:

| Key        | Type    | Description                            |
|------------|---------|----------------------------------------|
| `status`   | boolean | `true` for success, `false` for errors |
| `messages` | string  | Human-readable status/error message    |

---

## Database Table: `company_invite`

| Column          | Type         | Notes                                      |
|-----------------|--------------|--------------------------------------------|
| `id`            | int (PK)     | auto-increment                             |
| `company`       | int          | FK to `user.id` (company)                  |
| `contact_person`| varchar(?)   | Name of contact person at company          |
| `email`         | varchar(?)   | Email of contact person                    |
| `phone`         | varchar(?)   | Phone of contact person                    |
| `website`       | varchar(?)   | Company website                            |
| `added_by`      | int          | FK to `user.id` (employee who sent invite) |
| `create_date`   | datetime     |                                            |

---

## Request Format

`application/x-www-form-urlencoded` or `multipart/form-data`

### Fields

| Field            | Required         | Type   | Description                                |
|------------------|------------------|--------|--------------------------------------------|
| `company`        | **Yes**          | int    | Company user ID                            |
| `email`          | Conditional      | string | Email of contact person (or phone required)|
| `phone`          | Conditional      | string | Phone of contact person (or email required)|
| `contact_person` | No               | string | Name of contact person                     |
| `website`        | No               | string | Company website                            |

### Validation Logic

1. If **both** `email` and `phone` are empty → return error: `"Either Email or Phone is required"`
2. If `email` matches email regex (`/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`) → validate as valid email
3. Otherwise → validate `phone` as required

---

## Query Logic (Upsert)

```sql
-- 1. Check if invite already exists for this employee + company
SELECT * FROM company_invite WHERE added_by = :authUserId AND company = :companyId

-- 2a. If exists → UPDATE
UPDATE company_invite
SET company = :companyId, contact_person = :contactPerson, email = :email,
    phone = :phone, website = :website, added_by = :authUserId, create_date = NOW()
WHERE id = :existingId

-- 2b. If not → INSERT
INSERT INTO company_invite (company, contact_person, email, phone, website, added_by, create_date)
VALUES (:companyId, :contactPerson, :email, :phone, :website, :authUserId, NOW())
```

---

## Response Examples

### Success (Invite Sent)
```json
{
  "status": true,
  "messages": "Company invite send!"
}
```

### Validation Error (Both Empty)
```json
{
  "status": false,
  "messages": "Either Email or Phone is required"
}
```

### Validation Error (Bad Email)
```json
{
  "status": false,
  "messages": "The email field must contain a valid email address."
}
```

### Exception
```json
{
  "status": false,
  "messages": "Access denied"
}
```

### Fallback Failure
```json
{
  "status": false,
  "messages": "Something went wrong!"
}
```

---

## Implementation Notes for Cross-Language Porting

1. **Upsert pattern:** The same employee cannot send duplicate invites to the same company. If a record exists, it updates instead of inserting. The check is on `added_by + company` unique pair.
2. **At least one contact method required:** Email or phone is mandatory — the endpoint rejects requests where both are empty.
3. **Email vs phone validation:** If the `email` field matches a basic email regex, it validates as a proper email. Otherwise, it treats the input as a phone and validates that field instead.
4. **Side effects:** This endpoint sends an email to the invitee with a signup link (`getenv('REACT_SITE') . 'signup?invite=' . encrypt_url($result)`) via SQS queue (`SEND_EMAIL`, template 50). You may want to handle this separately.
