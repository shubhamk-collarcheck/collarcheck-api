# CollarCheck API — AI / Porting Docs (Node)

Documentation for the **Node.js** CollarCheck API in this repository.

| | |
|--|--|
| Runtime | Node.js + Express |
| ORM | Drizzle (MySQL) |
| Base path | `/wapi` |
| Auth | `src/middlewares/Authorization.ts` (JWT `uid`) |
| Company context | Header `X-Company: {companyId}` |
| Validation | Zod + `validateData` middleware |
| Postman | `collarcheck.postman_collection.json` (repo root) |
| OpenAPI UI | `/api-docs` |

## Layering

```
src/routes/*.ts       → path + middleware (auth, upload, validate)
src/controllers/*.ts  → req/res, call service
src/services/*.ts     → business rules + response messages
src/repositery/*.ts   → Drizzle queries
src/types/*.ts        → Zod schemas + TS types
src/db/schema.ts      → table definitions
src/worker/           → SQS consumers
```

## Doc index

### Shared / auth
| Doc | Coverage |
|-----|----------|
| [common-auth-endpoints.md](./common-auth-endpoints.md) | User settings, auth profiles, people-list, view-request |
| [remaining-misc-crud-endpoints.md](./remaining-misc-crud-endpoints.md) | 19 misc CRUD (follow, wishlist writes, company-list, multi-*, etc.) — **all implemented** |
| [login-registration-endpoints.md](./login-registration-endpoints.md) | Login / OTP / register / signup |
| [verify.md](./verify.md) | KYC (SurePass) + email OTP — **implemented** |
| [sendCompanyInvite.md](./sendCompanyInvite.md) | Employee → company invite + SQS |
| [sqs-flow-diagram.md](./sqs-flow-diagram.md) | SQS worker flow |
| [other/frontend-public-misc-endpoints.md](./other/frontend-public-misc-endpoints.md) | top-company, contact/career enquiry, sitemap, data-deletion — **implemented** |
| [other/new-routes-endpoints.md](./other/new-routes-endpoints.md) | splash, report-review, delete-account, ai-generate, hired, resume, FAQ, follow-revoke — **implemented** |
| [other/widget-routes-endpoints.md](./other/widget-routes-endpoints.md) | discovery widgets, random-widget, impressions — **implemented** |
| [other/account-migration-management-endpoints.md](./other/account-migration-management-endpoints.md) | company roles/permissions, merge OTP, doctype, revoke-delete — **implemented** |
| [other/test-routes-endpoints.md](./other/test-routes-endpoints.md) | ops utils + resume/notice/save-epfo (CV popup) — **implemented** |
| [ai-api/ai-proxy-endpoints.md](./ai-api/ai-proxy-endpoints.md) | AI BFF proxy (semantic, chat, domain, rank, scrape) — **X-API-KEY**, **implemented** |

### Employee (`/wapi/employee`)
| Doc | Coverage |
|-----|----------|
| [employee-signup-endpoints.md](./employee-signup-endpoints.md) | Modern signup step 1/2 + upload-resume — **implemented** |
| [employee-employment-endpoints.md](./employee-employment-endpoints.md) | Employment CRUD (`add-employement`, …) |
| [employee-all-employment-new-endpoints.md](./employee-all-employment-new-endpoints.md) | `allEmployementNew` |
| [employee-document-language-endpoints.md](./employee-document-language-endpoints.md) | Documents + languages (`add_language`, `allLanguage`) |
| [employee-certificate-endpoints.md](./employee-certificate-endpoints.md) | Certificates |
| [employee-portfolio-endpoints.md](./employee-portfolio-endpoints.md) | Portfolio |
| [employee-profile-review-endpoints.md](./employee-profile-review-endpoints.md) | Reviews + edit-user + changeEmploymentBasic |
| [employee-job-dashboard-viewrequest-endpoints.md](./employee-job-dashboard-viewrequest-endpoints.md) | Jobs, dashboard, view requests, multi-view |
| [employee-misc-endpoints.md](./employee-misc-endpoints.md) | Sidebar, exploring, CV, company search, hired |

### Company (`/wapi/company`)
| Doc | Coverage |
|-----|----------|
| [company/company-endpoints.md](./company/company-endpoints.md) | Settings, connections, wishlist |
| [company/company-job-endpoints.md](./company/company-job-endpoints.md) | Jobs + templates + bulk |
| [company/company-document-review-endpoints.md](./company/company-document-review-endpoints.md) | Docs, reviews, applications |
| [company/company-benefit-gallery-endpoints.md](./company/company-benefit-gallery-endpoints.md) | Benefits + gallery |
| [company/company-employee-request-endpoints.md](./company/company-employee-request-endpoints.md) | Employees, dashboard, invites, messaging |

### General / dashboard
| Doc | Coverage |
|-----|----------|
| [general/general-dashboard-endpoints.md](./general/general-dashboard-endpoints.md) | Dropdown lists, jobs, search, profiles |
| [general/half-of-next-general-api.md](./general/half-of-next-general-api.md) | Token, notifications, follow, logout, OTP notes |

## Route mounts (`src/app.ts`)

| Mount | File |
|-------|------|
| `/wapi/general` | `general.route.ts` |
| `/wapi/dashboard` | `dashboard.route.ts` |
| `/wapi/employee` | `employee.route.ts` |
| `/wapi/hired` | `hired.route.ts` |
| `/wapi/user` | `user.route.ts` |
| `/wapi/auth` | `auth.route.ts` |
| `/wapi/company` | `company.route.ts` |
| `/wapi/home` | `home.route.ts` (top-company) |
| `/wapi/contact` | `contact.route.ts` (save-enquiry) |
| `/wapi/career` | `career.route.ts` (save-enquiry) |
| `/wapi` | `new-routes.route.ts` (splace, faqs, hired-throw, resume, delete-account, …) |
| `/wapi` | `widget.route.ts` (random-widget, nearby-*, impressions, discovery feeds — JWT) |
| `/wapi` | `account-migration.route.ts` (roles, permissions, merge OTP, doctype, …) |
| `/wapi` | `test-routes.route.ts` (resume-template, save-epfo, update-notice, ops tools) |
| `/wapi` | `ai.route.ts` (semantic, chat, domain, rec_candidates, scrape — **X-API-KEY**) |
| `/wapi` | `root.route.ts` (people-list, company-list, multi-*, logout, claim-company, data-deletion, …) |
| `/wapi/login` | `login.route.ts` (via `root.route.ts`) |

## PHP path compatibility (keep these spellings)

| Path | Notes |
|------|--------|
| `POST /wapi/employee/add-employement` | Legacy typo |
| `POST /wapi/employee/add_language` | Underscore |
| `GET /wapi/employee/allLanguage` | camelCase |
| `DELETE /wapi/employee/language/:id` | Not `delete-language` |
| `GET /wapi/logout` | GET, not POST |
| `POST /wapi/claim-company` | Root mount |
| `POST /wapi/multi-unfollow` | POST + body |
| `POST /wapi/company/addBenafit` | Legacy typo |
| `DELETE /wapi/notifications/clear-all-notification` | Root under `/wapi` |

## Response conventions

- Prefer **HTTP 200** + `{ status: true|false, messages|message, data? }`
- Use **403** + `{ status: false, message }` only for menu permission (when enforced)
- Preserve legacy message strings / typos when clients match them

## Login & registration (public)

See [login-registration-endpoints.md](./login-registration-endpoints.md) — **implemented** under:

| Path | Route file |
|------|------------|
| `POST /wapi/login`, `/login/*` | `login.route.ts` (mounted from `root.route.ts`) |
| `POST /wapi/employee/register`, `signup`, `final-signup`, `upload-resume` | `employee.route.ts` |
| `POST /wapi/company/register` | `company.route.ts` |

## Auth verification (JWT)

See [verify.md](./verify.md) — **implemented**:

| Path | Route file |
|------|------------|
| `GET/POST /wapi/general/verify-document`, `verifyDocument`, `verifyAadhar`, `verifyGst`, `verifyDigilocker` | `general.route.ts` |
| `POST /wapi/user/sendEmailOtp`, `verifyEmailOtp` | `user.route.ts` |

## Not ported yet (out of scope in these docs)

- Authenticated phone OTP under general (`sendOtp` / `verifyOtp` if separate from login)
- Pre-registration: `verify-document-before-registration`, `verify-gst-before-registration`
- PHP-style KYC finalize via `saveDocument { ref_id }` (current Node `saveDocument` is generic user docs)

## How to update these docs

When you add a route:

1. Register in the correct `src/routes/*.ts` file  
2. Add types / service / controller in the matching layer  
3. Update the module doc route table + Postman collection  
4. Keep path names aligned with the PHP client where required  
