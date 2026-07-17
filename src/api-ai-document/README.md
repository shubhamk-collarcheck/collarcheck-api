# CollarCheck API AI Docs

Contracts and porting notes for the Node Express API in this repo.  
**Live base path:** `/wapi`  
**Collection:** repo root `collarcheck.postman_collection.json`

## How code is structured

```
src/routes/*.ts        → mount paths + auth/validation
src/controllers/*.ts   → thin handlers
src/services/*.ts      → business logic + response messages
src/repositery/*.ts    → Drizzle queries
src/types/*.ts         → Zod schemas
src/db/schema.ts       → table definitions
```

Auth: `Authorization: Bearer <jwt>` (raw token also accepted).  
Acting company: header `X-Company: {companyId}` (see `Authorization` middleware).

## Module index

| Module | Doc | Route file(s) |
|--------|-----|----------------|
| Auth / settings / people-list | [common-auth-endpoints.md](./common-auth-endpoints.md) | `auth.route.ts`, `user.route.ts`, `root.route.ts` |
| Employee employment | [employee-employment-endpoints.md](./employee-employment-endpoints.md) | `employee.route.ts` |
| Employee employment (new list) | [employee-all-employment-new-endpoints.md](./employee-all-employment-new-endpoints.md) | `employee.route.ts` |
| Education / documents / language | [employee-document-language-endpoints.md](./employee-document-language-endpoints.md) | `employee.route.ts` |
| Skills / portfolio / certificate | portfolio / certificate docs | `employee.route.ts` |
| Profile / review | [employee-profile-review-endpoints.md](./employee-profile-review-endpoints.md) | `employee.route.ts` |
| Jobs / dashboard / view requests | [employee-job-dashboard-viewrequest-endpoints.md](./employee-job-dashboard-viewrequest-endpoints.md) | `employee.route.ts`, `root.route.ts` (multi) |
| Misc employee | [employee-misc-endpoints.md](./employee-misc-endpoints.md) | `employee.route.ts`, `hired.route.ts` |
| Company settings / connection / wishlist | [company/company-endpoints.md](./company/company-endpoints.md) | `company.route.ts` |
| Company jobs | [company/company-job-endpoints.md](./company/company-job-endpoints.md) | `company.route.ts` |
| Company reviews / applications | [company/company-document-review-endpoints.md](./company/company-document-review-endpoints.md) | `company.route.ts` |
| Benefits / gallery | [company/company-benefit-gallery-endpoints.md](./company/company-benefit-gallery-endpoints.md) | `company.route.ts` |
| Company employee requests | [company/company-employee-request-endpoints.md](./company/company-employee-request-endpoints.md) | `company.route.ts` |
| Dashboard lists | [general/general-dashboard-endpoints.md](./general/general-dashboard-endpoints.md) | `dashboard.route.ts`, `general.route.ts` |
| General social / notify / token | [general/half-of-next-general-api.md](./general/half-of-next-general-api.md) | `general.route.ts`, `root.route.ts` |
| Remaining misc CRUD (all 19 done) | [remaining-misc-crud-endpoints.md](./remaining-misc-crud-endpoints.md) | see that doc’s Node map |
| Company invite | [sendCompanyInvite.md](./sendCompanyInvite.md) | `employee.route.ts` |
| SQS workers | [sqs-flow-diagram.md](./sqs-flow-diagram.md) | `src/worker/` |

## Path names that match PHP (important)

These Node paths follow the legacy PHP spelling / method:

| Client path | Notes |
|-------------|--------|
| `POST employee/add-employement` | typo `employement` |
| `POST employee/add_language` | underscore |
| `GET employee/allLanguage` | camelCase |
| `DELETE employee/language/:id` | not `delete-language` |
| `GET logout` | not POST |
| `POST claim-company` | under `/wapi` root |
| `DELETE employee/removeNotification` | body `{ id }` |
| `DELETE notifications/clear-all-notification` | under `/wapi` |
| `DELETE removeNotification/:id` | under `/wapi` root |
| `POST multi-unfollow` | under `/wapi` root |
| `POST general/multi-remove-follower` | POST not DELETE |

## Still not in this port

OTP / email OTP, KYC stack (`verifyDocument`, `verifyAadhar`, `verifyGst`, `verifyDigilocker`, pre-registration verify endpoints).

## Response conventions (legacy)

- Prefer **HTTP 200** + `{ status: true|false, messages|message, data? }`
- **403** only for menu permission failures (`message` singular)
- Keep known typos in success strings when clients match them (`Sucessfully`, `Veiw`, etc.)
