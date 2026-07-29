# CollarCheck API — Agent Instructions

You **port APIs from another project (PHP)** into this **Node.js** codebase.

The user will give you **API docs written for the PHP project** (file path, paste, or attachment). You must:

1. Understand **this** Node project (structure, auth, Zod, layering — below + existing Node docs).
2. **Implement** the endpoints here end-to-end (route → controller → service → repositery).
3. **Write or rewrite Node api-docs** under `src/api-ai-document/**` so they describe the **Node** implementation — not a copy of the PHP doc.

Do not invent a new architecture. Match existing patterns in this repo. Read this file before writing code.

---

## Primary workflow: PHP docs → Node code + Node docs

```
User provides PHP api-docs (other project)
        │
        ▼
Read this AGENTS.md + src/api-ai-document/README.md
(how Node is structured, what already exists)
        │
        ▼
Read the PHP doc fully (contracts to preserve)
        │
        ▼
Implement in Node (types → repositery → service → controller → route)
        │
        ▼
Create/update src/api-ai-document/** as NODE docs
(paths, Zod, Authorization, file map, responses as shipped)
        │
        ▼
npx tsc --noEmit
```

| Input | Output |
|-------|--------|
| PHP api-docs from the other project (paths, body, responses, DB notes, PHP controller names) | Working Node endpoints in `src/**` |
| | **New/updated** Node-oriented markdown under `src/api-ai-document/**` |
| | `README.md` index row / mounts / **implemented** status when relevant |

The PHP doc is the **contract source** (URLs, payloads, messages, business rules).  
The Node doc is the **implementation map** for this repo (real files, Zod, middleware, handlers).

---

## Understand this Node project first

Before porting, orient yourself in **this** repo so you wire PHP contracts into the right layers.

### 1. This file (`AGENTS.md`)

Layering, auth, Zod/`validateData`, controller style, repositery rules, examples.

### 2. Existing Node api-docs — `src/api-ai-document/`

Living map of what is **already ported**. Use it to avoid duplicates and to match doc style.

| Read | For |
|------|-----|
| `src/api-ai-document/README.md` | Index of modules, route mounts under `/wapi`, PHP path quirks, response conventions, implemented vs not-ported |
| Domain `*.md` already here | Same-area endpoints, file naming, how Node docs are written |
| `src/debug/*.md` | Locked response shapes when they conflict with looser notes |

### Doc tree

```
src/api-ai-document/
├── README.md                 # START — index + mounts + conventions
├── common-auth-endpoints.md
├── login-registration-endpoints.md
├── verify.md
├── employee-*.md             # employee domain
├── company/                  # company domain
├── general/                  # general + dashboard
├── ai-api/
└── other/
```

### 3. Code mirrors of the same domain

If the PHP path is under employee/company/general/…, open existing:

- `src/routes/<domain>.route.ts`
- `src/controllers/*`, `src/services/*`, `src/repositery/*`, `src/types/*`

Reuse mounts, naming, and helpers. Prefer extending existing modules over new top-level routers.

---

## Your job when the user provides PHP api-docs

1. **Orient (Node)** — skim `src/api-ai-document/README.md` + this file; find which mount/route file owns the path.
2. **Read the PHP doc fully** — method, path, auth, request body/query/params/files, success/error responses, message strings (keep typos), tables, business rules.
3. **Check overlap** — search `src/api-ai-document/**` and `src/routes/**` for the same path. Extend or skip if already implemented.
4. **Map PHP → Node layers** (see [Project structure](#project-structure) and [Request flow](#request-flow-mandatory)):

   | PHP idea | Node place |
   |----------|------------|
   | Route / URL | `src/routes/*.route.ts` + mount in `app.ts` if needed |
   | Auth middleware | `Authorization` → `req.auth` (already built) |
   | Request validation | Zod in `src/types/*.types.ts` + `validateData` |
   | Controller | Thin handler in `src/controllers/*.controller.ts` |
   | Model / DB / SQL | `src/repositery/*.repositery.ts` only (Drizzle) |
   | Business logic | `src/services/*.service.ts` (no `db.`) |

5. **Implement in order:**
   1. Zod schema + `z.infer` types in `src/types/*.types.ts`
   2. Repositery methods in `src/repositery/*.repositery.ts`
   3. Service in `src/services/*.service.ts`
   4. Controller in `src/controllers/*.controller.ts`
   5. Route in `src/routes/*.route.ts` (`Authorization` → upload? → `validateData` → handler)
   6. `app.ts` mount only if a new router is required
6. **Preserve client contracts** from the PHP doc:
   - Path spellings (including typos like `add-employement`)
   - Response keys and message strings
   - Status codes when the doc specifies them  
   Prefer `src/debug/*.md` if it locks a stricter response shape.
7. **Write Node api-docs** — create or rewrite the matching file under `src/api-ai-document/**` for **this** stack (see next section). Do **not** leave only the raw PHP doc as the project doc.
8. **Verify** — `npx tsc --noEmit` must pass.

---

## Rewrite PHP docs as Node docs (`src/api-ai-document/**`)

The user-supplied material is **PHP**. What you store under `src/api-ai-document/` must be **Node-facing**: same product contracts, this codebase’s files and middleware.

### Translate PHP → Node in the written doc

| PHP doc often says | Node doc must say |
|--------------------|-------------------|
| PHP controller / method names | Real exports: `addExperience`, `src/controllers/….ts` |
| `authenticate` / `$this->user_id` / `req.userId` | `Authorization` → `req.auth` (`user_id` / `id`) |
| Form / manual validation | Zod schema + `validateData(schema)` → `req.validated` |
| Model / raw SQL / CI query builder | `src/repositery/*.repositery.ts` + Drizzle / `src/db/schema.ts` tables |
| PHP file paths | `src/routes`, `controllers`, `services`, `repositery`, `types` |
| “Not implemented” in Node yet | After you ship: mark **implemented** |

Keep from PHP (client-facing):

- Full paths under `/wapi/...` (and legacy typos)
- Request fields, enums, upload field names
- Response JSON keys and **exact** message strings
- Business rules that affect behavior

### Where to put the new Node doc

- Same domain as existing files when possible (`employee-*.md`, `company/…`, `general/…`, `other/…`).
- New file name: `<domain>-<feature>-endpoints.md` (match existing naming).
- Always add/update a row in `src/api-ai-document/README.md` doc index.
- Update README **Route mounts** if you changed `src/app.ts`.

### Required shape of a Node module doc

Header:

```md
> **Stack:** Node.js + Express + Drizzle ORM
> **Base path:** `/wapi`
> **Route file:** `src/routes/<domain>.route.ts`
> **Controller:** `src/controllers/<name>.controller.ts`
> **Service:** `src/services/<name>.service.ts`
> **Repositery:** `src/repositery/<name>.repositery.ts`
> **Types:** `src/types/<name>.types.ts`
> **Source:** Ported from PHP api-docs (user-provided) — contracts preserved
```

Body (minimum):

1. **Overview** — what the endpoints do; auth requirement.
2. **Routes table** — method, full path, **Node** controller export, description.
3. **File structure** — actual files in this repo.
4. **Zod schemas** — as in `src/types/**` (`params` / `query` / `body`; `z.coerce` / preprocess for form-data).
5. **Middleware** — `Authorization`, `validateData`, upload helpers + field names (not PHP middleware names).
6. **Request / response examples** — match what Node controllers return (keep PHP message typos if clients depend on them).
7. **DB tables** — `cyb_*` / schema symbols used.
8. **Status** — **implemented** (or partial list of remaining routes).

Optional but useful: service function names, repositery methods, notes on `X-Company` / SQS / S3.

### Doc accuracy rules

- Write for **Node** readers; PHP is background contract only.
- Never document PHP controllers as if they live in this repo.
- Do not invent paths not registered in `src/routes/**` + `src/app.ts`.
- Preserve legacy path typos in code **and** Node docs.
- If implementation must diverge from PHP (e.g. different status code already used by clients of this Node API), document the divergence explicitly in the Node doc.

---

## Stack (already set up)

| Piece | Location / note |
|-------|-----------------|
| Runtime | Node.js + Express |
| ORM | Drizzle (MySQL) |
| Base path | `/wapi` |
| Auth | `Authorization` middleware — JWT → `req.auth` |
| Company context | Header `X-Company: {companyId}` (switches `req.auth.id`) |
| Request validation | Zod + `validateData` → fills `req.validated` |
| Schema | `src/db/schema.ts` |
| Errors | `HttpError` / `BadRequestError` / etc. in `src/middlewares/errorHandler.ts` |
| Input | User-provided **PHP** api-docs (other project) |
| Node endpoint docs (output) | `src/api-ai-document/**` — rewrite for this repo; start orientation at `README.md` |
| Locked response notes | `src/debug/**` when contracts conflict |
| OpenAPI UI | `/api-docs` |

**Do not re-implement authentication or validation middleware.** Wire them into routes.

---

## Project structure

```
src/
├── app.ts                      # Express app; mounts routers under /wapi/*
├── server.ts                   # process entry
├── db/
│   ├── index.ts                # Drizzle db client
│   └── schema.ts               # ALL table definitions
├── middlewares/
│   ├── Authorization.ts        # JWT auth → req.auth
│   ├── validation.middleware.ts# Zod validateData → req.validated
│   ├── errorHandler.ts         # HttpError classes + global handler
│   └── aiAuth.ts               # X-API-KEY for AI proxy routes
├── routes/*.route.ts           # path + middleware only
├── controllers/*.controller.ts # req/res only; call service; return JSON
├── services/*.service.ts       # business rules + response mapping ONLY
├── repositery/*.repositery.ts  # ALL Drizzle / SQL / DB access  (project spelling)
├── types/*.types.ts            # Zod schemas + z.infer types
├── types/express.d.ts          # AuthUser, req.auth, req.validated
├── utils/                      # upload, helpers, encrypt, S3, etc.
├── worker/                     # SQS consumers
├── api-ai-document/            # endpoint specs you implement from
└── debug/                      # locked response contracts when porting PHP
```

### Route mounts (`src/app.ts`)

| Mount | Route file |
|-------|------------|
| `/wapi/general` | `general.route.ts` |
| `/wapi/dashboard` | `dashboard.route.ts` |
| `/wapi/employee` | `employee.route.ts` |
| `/wapi/company` | `company.route.ts` |
| `/wapi/hired` | `hired.route.ts` |
| `/wapi/user` | `user.route.ts` |
| `/wapi/auth` | `auth.route.ts` |
| `/wapi/home` | `home.route.ts` |
| `/wapi/contact` | `contact.route.ts` |
| `/wapi/career` | `career.route.ts` |
| `/wapi/login` | `login.route.ts` |
| `/wapi` | `root.route.ts`, `new-routes.route.ts`, `widget.route.ts`, `account-migration.route.ts`, `test-routes.route.ts`, `swipe-collaborator-rating.route.ts`, `ai.route.ts` |

---

## Request flow (mandatory)

```
Client
  → Route (auth? upload? validateData?)
    → Controller (read req.auth / req.validated; call service; res.json)
      → Service (business rules; map response; NO db)
        → Repositery (Drizzle only)
          → MySQL
```

| Layer | Responsibility | Must NOT |
|-------|----------------|----------|
| **Route** | Path, HTTP method, middleware order | Business logic, DB, response building |
| **Controller** | Extract auth + validated input; call service; `res.status().json()`; `next(err)` | DB, heavy business rules |
| **Service** | Rules, orchestration, response shape mapping | `db.` / drizzle / schema queries |
| **Repositery** | All SQL via Drizzle | HTTP / Express types |
| **Types** | Zod schemas + inferred TS types | Runtime side effects |

### Naming conventions

- Repositery folder/files: **`repositery`** (project spelling — do not rename to “repository”).
- Default-export **class instance**: `export default new fooRepositery();`
- Static top-level imports only (no dynamic `await import('../repositery/...')`).
- Types file: `src/types/<domain>.types.ts`
- Mirror domain names across layers (`employee.route` → `employee.controller` → `employee.service` → `employee.repositery` → `employee.types`).

---

## Authentication (already implemented)

Middleware: `src/middlewares/Authorization.ts`.

### Behavior

1. Reads `Authorization` header (`Bearer <token>` or raw token).
2. Verifies JWT with `JWT_SECRET`; payload must include `uid`.
3. Loads user; sets `req.auth`:

```ts
// src/types/express.d.ts
export interface AuthUser {
  user_id: number;  // always the logged-in human user
  id: number;       // same as user_id, OR company id when X-Company is set
  user_type: number | null;
  token: string;
}
```

4. Optional header **`X-Company: {companyId}`** — if present and valid, overwrites `req.auth.id` and `req.auth.user_type` with the company. Use **`req.auth.id`** as “acting identity” (company-aware). Use **`req.auth.user_id`** when you need the human user regardless of company context.

### Route usage

```ts
import { Authorization } from "../middlewares/Authorization";

// Protected
router.get("/path", Authorization, handler);

// Protected + validated body/params/query
router.post("/path", Authorization, validateData(schema), handler);

// Public (login/register) — no Authorization
router.post("/register", formData, validateData(schema), handler);
```

### Controller usage

```ts
import type { AuthUser } from "../types/express";

const { user_id } = req.auth as AuthUser;           // human user
const { id: companyId } = req.auth as AuthUser;     // acting id (honours X-Company)
// ids are already numbers — do not Number() again
```

AI proxy routes use `aiAuth` + `X-API-KEY` instead of JWT — see `src/middlewares/aiAuth.ts` and `src/api-ai-document/ai-api/`.

---

## Request validation (Zod + validateData)

Validation is **already implemented**. You only define schemas and attach middleware.

### Middleware (`src/middlewares/validation.middleware.ts`)

```ts
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validateData<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.validated = schema.parse({
        params: req.params,
        query: req.query,
        body: req.body,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue: any) => ({
          message: `${issue.path.join('.')} is ${issue.message}`,
        }));
        res.status(400).json({ error: 'Invalid data', details: errorMessages });
      } else {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };
}
```

### How it works

1. Route attaches `validateData(yourSchema)`.
2. Schema always wraps **`params` / `query` / `body`** (even if some are empty objects).
3. On success, **`req.validated`** is filled with the parsed/coerced object.
4. Controller casts `req.validated` to the **`z.infer`** type — no second parse, no redundant `Number()` / `String()`.

### Schema pattern (`src/types/*.types.ts`)

```ts
import { z } from "zod";

export const employmentBodySchema = z.object({
  company: z.union([
    z.coerce.number().int().positive(),
    z.string().trim().min(1),
  ]),
  employment_type: z.coerce.number().int().positive(),
  joining_date: z.string().date(),
  // use z.coerce.number() when clients may send numeric strings
  // use preprocess for form-data quirks ("true" / "TRUE" → boolean)
});

export const employmentParamsSchema = z.object({
  employment_id: z.coerce.number().int().positive().optional(),
});

export const employmentRequestSchema = z.object({
  params: employmentParamsSchema,
  body: employmentBodySchema,
});

export type EmploymentBody = z.infer<typeof employmentBodySchema>;
export type EmploymentRequestBody = z.infer<typeof employmentRequestSchema>;
```

Shared params helper: `commonIdParamsSchema` in `src/utils/validation.ts`:

```ts
export const commonIdParamsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});
export type CommonIdParams = z.infer<typeof commonIdParamsSchema>;
```

### Do not re-coerce what Zod / Drizzle already typed

**Forbidden:**

```ts
const limit = Number(query.limit);           // Zod already coerced
const remoteUserId = Number(row.userId);     // Drizzle row already number
const onExplore = Number(row.onExplore || 0) === 1 ? 1 : 0;
```

**Required:**

```ts
const { query } = req.validated as FollowDataListGeneralQuery;
await service(actingUserId, query.limit, query.offset);

type FollowListRow = Awaited<ReturnType<typeof generalRepositery.getFollowerList>>[number];
const remoteUserId = row.userId;
const onExplore = row.onExplore === 1 ? 1 : 0;
```

### Typing rules

1. Request body / query / params → Zod schema + `z.infer` in `src/types/**`. Controllers cast `req.validated` only.
2. Repositery rows → `Awaited<ReturnType<typeof repo.method>>[number]` (or explicit interface). Compare flags with `=== 1` / `=== 0`.
3. Auth fields are already numbers.
4. Coerce only at the Zod boundary (or rare untyped headers). Prefer adding Zod over scattering `Number()`.
5. Avoid `any` on rows.

---

## Full example: employment create / update

Reference implementation across all layers. Use this shape when implementing new endpoints.

### 1. Types — `src/types/employee.types.ts`

```ts
export const employmentRequestSchema = z.object({
  params: employmentParamsSchema,
  body: employmentBodySchema,
});
export type EmploymentRequestBody = z.infer<typeof employmentRequestSchema>;
export type EmploymentBody = z.infer<typeof employmentBodySchema>;
```

### 2. Route — `src/routes/employee.route.ts`

Middleware order: **auth → upload (if any) → validateData → controller**.

```ts
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { employmentRequestSchema } from "../types/employee.types";
import { addExperience, updateExperience } from "../controllers/employee.controller";

const employmentUpload = uploadToS3.fields([
  { name: "document", maxCount: 5 },
  { name: "document[]", maxCount: 5 },
  { name: "file", maxCount: 5 },
]);

employRouter.post(
  "/add-employement",
  Authorization,
  employmentUpload,
  validateData(employmentRequestSchema),
  addExperience,
);

employRouter.post(
  "/add-employement/:employment_id",
  Authorization,
  employmentUpload,
  validateData(employmentRequestSchema),
  updateExperience,
);
```

Simple list (auth only, no body schema):

```ts
employRouter.get("/all-employement", Authorization, allExperience);
```

Params only:

```ts
employRouter.get(
  "/employement-detail/:id",
  Authorization,
  validateData(commonIdParamsSchema),
  detailExperience,
);
```

### 3. Controller — `src/controllers/employee.controller.ts`

**Plain async/await only.** No HOF wrappers that hide `req`/`res`/`next`.

```ts
import { NextFunction, Request, Response } from "express";
import {
  employmentCreateService,
  employmentUpdateService,
} from "../services/employee.service";
import { EmploymentRequestBody } from "../types/employee.types";
import { AuthUser } from "../types/express";

export async function addExperience(req: Request, res: Response, next: NextFunction) {
  try {
    const { user_id } = req.auth as AuthUser;
    const { body } = req.validated as EmploymentRequestBody;
    const result = await employmentCreateService(user_id, body, employmentFiles(req));

    return res.status(201).json({ message: "successful", done: result });
  } catch (err) {
    next(err);
  }
}

export async function updateExperience(req: Request, res: Response, next: NextFunction) {
  try {
    const { user_id } = req.auth as AuthUser;
    const { body, params } = req.validated as EmploymentRequestBody;
    const result = await employmentUpdateService(
      user_id,
      params.employment_id!,
      body,
      employmentFiles(req),
    );

    return res.status(201).json({ message: "successful", done: result });
  } catch (err) {
    next(err);
  }
}
```

**Forbidden controller pattern:**

```ts
function handle(fn: (req: Request) => Promise<unknown>) {
  return async (req, res, next) => { ... };
}
export const userPermissionList = handle((req) => svc.userPermissionListService(...));
```

Each exported handler is its own `async` function with try/catch, `await` service, `res.json` / `res.send`, `next(error)`.

### 4. Service — `src/services/employee.service.ts`

Static repositery imports. Business rules + mapping only. Throw `BadRequestError` / `HttpError` for domain failures.

```ts
import employmentRepositery from "../repositery/employee.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import type { EmploymentBody, EmploymentInsert } from "../types/employee.types";

export async function employmentCreateService(
  user_id: number,
  data: EmploymentBody,
  files?: Express.MulterS3.File[],
) {
  // validate business rules…
  const save: Partial<EmploymentInsert> = {
    user: user_id,
    company: companyId,
    // map Zod body fields → DB columns
  };
  return employmentRepositery.create(save);
}

export async function employmentUpdateService(
  user_id: number,
  employment_id: number,
  data: EmploymentBody,
  files?: Express.MulterS3.File[],
) {
  const exist = await employmentRepositery.findById(employment_id);
  if (!exist) throw new BadRequestError("employment_id is wrong");
  return employmentRepositery.update(employment_id, save);
}
```

### 5. Repositery — `src/repositery/employee.repositery.ts`

All Drizzle lives here. Class + default instance export.

```ts
import { and, eq } from "drizzle-orm";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import db from "../db";
import { cybUserExperience } from "../db/schema";

type Employment = InferSelectModel<typeof cybUserExperience>;
type NewEmployment = InferInsertModel<typeof cybUserExperience>;

class employmentRepositery {
  async findById(id: number): Promise<Employment | undefined> {
    const [employment] = await db
      .select()
      .from(cybUserExperience)
      .where(eq(cybUserExperience.id, id));
    return employment;
  }

  async create(data: Partial<NewEmployment>): Promise<Employment> {
    const [{ id }] = await db.insert(cybUserExperience).values(data).$returningId();
    const employment = await this.findById(id);
    if (!employment) {
      throw new Error("Employment was inserted but could not be retrieved.");
    }
    return employment;
  }

  async update(id: number, data: Partial<NewEmployment>): Promise<Employment | undefined> {
    await db.update(cybUserExperience).set(data).where(eq(cybUserExperience.id, id));
    return this.findById(id);
  }
}

export default new employmentRepositery();
```

If a query does not exist yet: **add a repositery method first**, then call it from the service. Never inline Drizzle in the service “just this once”.

---

## NEVER put database access in services

**Forbidden in `src/services/**`:**

- `import db from '../db'`
- `import { … } from 'drizzle-orm'` (except pure type-only if unavoidable)
- `db.select` / `db.insert` / `db.update` / `db.delete` / `db.transaction`
- Importing table symbols from `src/db/schema` for queries
- Dynamic `await import('../repositery/...')` — use **static** top-level imports

**Required:**

```ts
import employmentRepositery from '../repositery/employee.repositery';

export async function fooService(userId: number) {
  const rows = await employmentRepositery.findByUserId(userId);
  return rows.map(/* response shape only */);
}
```

---

## Imports

**Prefer:**

```ts
import generalRepositery from '../repositery/general.repositery';
```

**Do not use:**

```ts
const generalRepositery = (await import('../repositery/general.repositery')).default;
```

---

## Errors

Throw from services; controllers pass to `next(err)`; global `errorHandler` formats JSON.

```ts
import { BadRequestError, NotFoundError, ForbiddenError } from "../middlewares/errorHandler";

throw new BadRequestError("employment_id is wrong");
throw new NotFoundError("User not found");
```

Typical client-facing shape from `HttpError`:

```json
{ "status": false, "message": "…", "code": "…", "details": … }
```

---

## Response contracts

When implementing from api-docs / porting PHP:

1. Prefer `src/debug/*.md` over older summaries when they conflict.
2. Keep locked response keys and message strings (**including typos**).
3. Prefer HTTP **200** + `{ status: true|false, message|messages, data? }` unless the doc specifies otherwise (e.g. employment create returns `201` + `{ message, done }`).
4. Use `req.auth.id` for acting user when company context matters; `req.auth.user_id` for the human user.
5. Preserve legacy path spellings from docs/PHP clients:

| Path | Notes |
|------|--------|
| `POST /wapi/employee/add-employement` | Legacy typo `employement` |
| `POST /wapi/employee/add_language` | Underscore |
| `GET /wapi/employee/allLanguage` | camelCase |
| `POST /wapi/company/addBenafit` | Legacy typo |

---

## Scope discipline

- Only change files needed for the PHP → Node port (code **and** the new/updated Node api-docs).
- Do not refactor unrelated modules “while here” unless asked.
- Match existing naming and file placement.
- Reuse existing repositery methods when they already cover the query.
- Deliverable is always: **Node code + Node-oriented docs** under `src/api-ai-document/**` (not dumping the raw PHP doc unchanged).

---

## Implementation checklist

When finishing a port from **user-provided PHP api-docs**:

**Code (Node)**

- [ ] Schema + `z.infer` types in `src/types/**`
- [ ] Route middleware order correct: `Authorization` (if needed) → upload (if needed) → `validateData(schema)` → controller
- [ ] Controller uses `req.auth` + `req.validated` (no re-parse, no redundant `Number()`)
- [ ] Controller is plain async try/catch (no HOF `handle()` wrappers)
- [ ] Service has **no** `db.` / drizzle / schema queries
- [ ] New queries live under `src/repositery/**`
- [ ] Static repositery imports at top of service files
- [ ] Paths / response keys / messages match the **PHP** contract (including typos)
- [ ] `npx tsc --noEmit` passes

**Node api-docs (`src/api-ai-document/**`) — rewritten from PHP**

- [ ] New or updated module `.md` written for **Node** (not a paste of the PHP doc)
- [ ] Header lists real route / controller / service / repositery / types paths
- [ ] Routes table uses Node handler names and registered `/wapi` paths
- [ ] Zod + middleware sections use `Authorization`, `validateData`, `req.auth`, `req.validated`
- [ ] Response examples match what the Node controller returns
- [ ] Marked **implemented** (or partial) in the module doc
- [ ] `README.md` index updated; mounts table updated if `app.ts` changed
