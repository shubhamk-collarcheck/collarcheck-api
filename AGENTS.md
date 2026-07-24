# CollarCheck API — Agent Rules

Read this before writing or changing code. These rules override convenience shortcuts.

## Layering (mandatory)

```
src/routes/*.ts        → path + middleware only (auth, validate, upload)
src/controllers/*.ts   → req/res only; call service; return JSON
src/services/*.ts      → business rules + response mapping ONLY
src/repositery/*.ts    → ALL Drizzle / SQL / DB access
src/types/*.ts         → Zod schemas + TS types
src/db/schema.ts       → table definitions
```

### NEVER put database access in services

**Forbidden in `src/services/**`:**

- `import db from '../db'` / `from '../db'`
- `import { … } from 'drizzle-orm'` (except pure type-only imports if unavoidable)
- `db.select` / `db.insert` / `db.update` / `db.delete` / `db.transaction`
- Importing table symbols from `src/db/schema` for queries
- Dynamic `await import('../repositery/...')` — use **static** top-level imports

**Required pattern:**

```ts
// service — static import + repositery call
import fooRepositery from '../repositery/foo.repositery';

export async function fooService(userId: number) {
  const rows = await fooRepositery.getByUser(userId);
  return rows.map(/* response shape only */);
}
```

```ts
// repositery — all SQL lives here
import db from '../db';
import { eq } from 'drizzle-orm';
import { cybFoo } from '../db/schema';

class fooRepositery {
  async getByUser(userId: number) {
    return db.select().from(cybFoo).where(eq(cybFoo.user, userId));
  }
}
export default new fooRepositery();
```

If a query does not exist yet: **add a repositery method first**, then call it from the service. Do not inline Drizzle in the service “just this once”.

## Imports

- Prefer:

```ts
import generalRepositery from '../repositery/general.repositery';
```

- Do **not** use:

```ts
const generalRepositery = (await import('../repositery/general.repositery')).default;
```

## Types & Zod (mandatory)

This project already validates and coerces request input with **Zod** (`validateData` + schemas in `src/types/**`).

### Do not re-coerce what Zod / Drizzle already typed

**Forbidden (noise):**

```ts
// BAD — Zod already coerced query.limit to number
const limit = Number(query.limit);

// BAD — row.userId is already number from Drizzle select
const remoteUserId = Number(row.userId);
const userType = Number(row.userType ?? 1);
const onExplore = Number(row.onExplore || 0) === 1 ? 1 : 0;
```

**Required:**

```ts
// types
export const followDataListGeneralQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().optional().default(50),
    offset: z.coerce.number().int().optional().default(0),
  }),
});
export type FollowDataListGeneralQuery = z.infer<typeof followDataListGeneralQuerySchema>;

// controller — use inferred type from req.validated
const { query } = req.validated as FollowDataListGeneralQuery;
await followDataListGeneralService(actingUserId, query.limit, query.offset);

// service — accept numbers; use repositery row types
type FollowListRow = Awaited<ReturnType<typeof generalRepositery.getFollowerList>>[number];

async function mapFollowCard(row: FollowListRow, actingUserId: number) {
  const remoteUserId = row.userId;       // already number
  const userType = row.userType ?? 1;    // already number | null
  const onExplore = row.onExplore === 1 ? 1 : 0;
  // ...
}
```

### Rules

1. **Request body / query / params:** define Zod schema + `z.infer` type in `src/types/**`. Use `z.coerce.number()` when the client may send strings. Controllers cast `req.validated` to that type — **do not** `Number()` again in service.
2. **Repositery rows:** type from `Awaited<ReturnType<typeof repo.method>>[number]` (or an explicit interface). Use fields as typed; compare flags with `=== 1` / `=== 0`.
3. **Auth:** use `req.auth` (`AuthUser`) — `id` / `user_id` are already numbers.
4. **Only coerce at the boundary** when something is still untyped (e.g. raw header, optional path not in Zod). Prefer adding Zod instead of scattering `Number()`.
5. **Avoid `any` on rows** — it forces useless casts and hides bugs.

## Response contracts

When debugging or porting PHP endpoints:

1. Prefer `src/debug/*.md` over older summary docs when they conflict.
2. Keep locked response keys and message strings (including typos).
3. Use `req.auth.id` for acting user (honours `X-Company`).

## Scope discipline

- Only change files needed for the task.
- Do not refactor unrelated modules “while here” unless asked.
- Match existing naming: `repositery` (project spelling), default-exported class instances.

## Checklist before finishing a change

- [ ] No `db.` / drizzle queries in `src/services/**`
- [ ] New queries live under `src/repositery/**`
- [ ] Static repositery imports at top of service files
- [ ] Controllers use `req.validated` + `z.infer` types (no redundant `Number()` / `String()`)
- [ ] Services use typed repositery rows / Zod-inferred args
- [ ] Controllers stay thin
- [ ] `npx tsc --noEmit` passes
