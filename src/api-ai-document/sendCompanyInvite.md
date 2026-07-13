
# Employee Send Company Invite API Endpoint

## Overview

Endpoint for an employee to send an invitation to a company's contact person via email. Creates or updates a `company_invite` record and sends an email notification via AWS SQS.

---

## Routes

| Method   | Path                                       | Controller Method                                | Description                    |
|----------|--------------------------------------------|--------------------------------------------------|--------------------------------|
| `POST`   | `/wapi/employee/sendCompanyInvite`         | `sendCompanyInvite`                              | Send invite to a company       |

---

## File Structure

```
src/
├── types/company-invite.types.ts           # Zod schemas
├── repositery/company-invite.repositery.ts # Database queries
├── services/company-invite.service.ts      # Business logic + SQS integration
├── controllers/company-invite.controller.ts # Request handler
├── routes/employee.route.ts               # Route registration
└── utils/sqs.ts                           # AWS SQS utility
```

---

## Zod Validation Schemas

### companyInviteBodySchema

```typescript
z.object({
  company: z.coerce.number().int().positive("Company ID is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  contact_person: z.string().optional(),
  website: z.string().optional(),
}).refine(
  (data) => data.email || data.phone,
  { message: "Either Email or Phone is required" }
).refine(
  (data) => {
    if (data.email && data.email.length > 0) {
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data.email);
    }
    return true;
  },
  { message: "The email field must contain a valid email address.", path: ["email"] }
)
```

### companyInviteRequestSchema

```typescript
z.object({ body: companyInviteBodySchema })
```

---

## Middleware

- **Body Parser:** `express.json()`
- **Auth:** `Authorization` middleware extracts `uid` from JWT → `req.auth.user_id`
- **Validation:** `validateData(companyInviteRequestSchema)`

---

## Database Table: `cyb_company_invite`

| Column           | Type         | Notes                                              |
|------------------|-------------|----------------------------------------------------|
| `id`             | int (PK)    | auto-increment                                     |
| `fname`          | varchar     | First name                                         |
| `lname`          | varchar     | Last name                                          |
| `phone`          | varchar     | Phone of contact person                            |
| `email`          | varchar     | Email of contact person                            |
| `profile`        | varchar     | Profile image                                      |
| `contact_person` | varchar     | Name of contact person at company                  |
| `website`        | varchar     | Company website                                    |
| `company`        | int         | FK to `cyb_user.id` (company)                      |
| `added_by`       | int         | FK to `cyb_user.id` (employee who sent invite)     |
| `status`         | int         | `1` = active                                       |
| `is_deleted`     | int         | `0` = active, `1` = soft-deleted                   |
| `create_date`    | varchar     |                                                    |
| `modify_date`    | varchar     |                                                    |

---

## Repository Methods

```typescript
findByUserAndCompany(userId: number, companyId: number)
  → SELECT * FROM cyb_company_invite
    WHERE added_by = :userId AND company = :companyId AND status = 1 AND is_deleted = 0
    LIMIT 1

create(data)
  → INSERT INTO cyb_company_invite (...) VALUES (...)

update(id, data)
  → UPDATE cyb_company_invite SET ... WHERE id = :id
```

---

## Service Methods

### createCompanyInviteService(userId, data)

1. Check if invite already exists for this employee + company via `findByUserAndCompany`
2. Get employee name for email template
3. **Upsert logic:**
   - If exists → UPDATE existing record
   - If not → INSERT new record
4. Send email via AWS SQS (if email provided):
   - Queue message type: `SEND_EMAIL`
   - Template ID: `50`
   - Includes encrypted invite URL
5. Return success message

### SQS Message Format

```json
{
  "type": "SEND_EMAIL",
  "payload": {
    "mail": {
      "email": "contact@company.com",
      "template": 50,
      "vars": {
        "invite_url": "https://app.collarcheck.com/signup?invite=<encrypted>",
        "employee_name": "John Doe"
      }
    },
    "trigger": {
      "user_id": 123,
      "type": "company_invite",
      "status": 1
    }
  }
}
```

---

## Controller Methods

### sendCompanyInvite

```typescript
async (req, res) => {
  const { user_id } = req.auth as AuthUser
  const { body } = req.validated as CompanyInviteRequest

  const messages = await createCompanyInviteService(user_id, body)

  return res.status(200).json({
    status: true,
    messages,
  })
}
```

---

## Response Mapping

### Success Response

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

### Exception Response

```json
{
  "status": false,
  "messages": "Something went wrong!"
}
```

---

## Implementation Notes

1. **Upsert pattern:** Same employee cannot send duplicate invites to the same company. If a record exists, it updates instead of inserting
2. **At least one contact method required:** Email or phone is mandatory
3. **Email validation:** Uses regex `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`
4. **SQS integration:** Sends email via AWS SQS with template 50
5. **Invite URL format:** `${REACT_SITE}signup?invite=${encryptUrl(inviteId)}`
6. **Error handling:** SQS errors are logged but don't fail the request

---

## Environment Variables Required

```
AWS_KEY=your_access_key
AWS_SECRET=your_secret_key
AWS_REGION=ap-south-1
AWS_SQS_URL=https://sqs.ap-south-1.amazonaws.com/xxxxx/collarcheck-queue.fifo
REACT_SITE=https://app.collarcheck.com/
```

---

## Example Request

### Send Company Invite

```bash
curl -X POST http://localhost:3000/wapi/employee/sendCompanyInvite \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "company": 42,
    "email": "hr@company.com",
    "contact_person": "HR Manager",
    "website": "https://company.com"
  }'
```

### Success Response

```json
{
  "status": true,
  "messages": "Company invite send!"
}
```
