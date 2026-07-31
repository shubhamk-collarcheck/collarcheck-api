---
name: debugin-api
description: >
  Correct and optimize CollarCheck Node APIs from user-provided debugging docs
  (PHP→Node port contracts). Reads AGENTS.md + src/api-ai-document for project
  structure, then fixes route/controller/service/repositery/types to match locked
  response keys, messages, auth, and SQL behaviour. Use when the user runs
  /debugin-api, pastes or points at a debug doc under src/debug (or similar),
  asks to "debug the API", "fix from debug docs", "correct the Node API from
  debug guide", "match PHP contract", or "optimise endpoint from debug".
metadata:
  short-description: "Fix Node APIs from debug docs"
---

# /debugin-api — Correct & optimise Node APIs from debug docs

You are fixing **already-ported** (or partially ported) CollarCheck Node endpoints
so they match a **debugging contract doc**, and improving performance/structure
**without breaking client contracts**.

This repo ports PHP APIs to Node. Debug docs are the **locked frontend contract**.
Do not invent new response shapes.

## When invoked

User will typically provide one of:

1. A path: `src/debug/<name>.md` or another debug guide they paste/attach
2. Endpoint names: e.g. `follow`, `employee/dashboard`, `allLanguage`
3. A short symptom: "messages key wrong on educationDataList"

If no doc is given, ask once for the debug file path or paste. Prefer existing
files under `src/debug/**` when the topic matches.

---

## Mandatory orientation (always do first)

Read these **before** editing code. Do not skip.

### 1. Project rules — `AGENTS.md` (repo root)

Internalise and obey:

| Rule | Detail |
|------|--------|
| Layering | `route → controller → service → repositery → db` only |
| No DB in services | Never `db.` / drizzle / schema queries in `src/services/**` |
| Auth | `Authorization` → `req.auth`; acting id = `req.auth.id` (honours `X-Company`); human = `req.auth.user_id` |
| Validation | Zod in `src/types/**` + `validateData` → `req.validated` |
| Controllers | Plain async try/catch; no HOF `handle()` wrappers |
| Repositery | Class + `export default new …()`; spelling **repositery** |
| Imports | Static top-level repositery imports only |
| Contracts | Preserve path typos, message typos, locked keys |
| Coercion | No re-`Number()` on Zod/Drizzle-typed values |

### 2. Living Node map — `src/api-ai-document/`

| Read | Why |
|------|-----|
| `src/api-ai-document/README.md` | Mounts, doc index, response conventions, implemented status |
| Matching domain `*.md` | How this endpoint is documented for Node (files, Zod, handlers) |
| Related domain docs | Avoid fixing one route by breaking a sibling that shares service/repo |

Use api-ai-document to **locate** files and understand intended Node structure.
When a debug doc and an older api-ai-document summary **conflict on client-facing
JSON/messages/paths**, prefer the **debug doc** (see `src/debug/**` purpose notes).
Then update the Node api-ai-document to match what you ship.

### 3. Existing debug examples — `src/debug/`

Skim a similar guide for tone and priority of "LOCKED KEYS" / "Bug magnet" sections.
Reference: [references/debug-doc-anatomy.md](./references/debug-doc-anatomy.md).

---

## Priority of truth (conflicts)

```
1. User-provided / src/debug/** debug guide  →  locked response keys, messages, SQL intent, auth
2. src/debug/** if already present for same route
3. Live Node handlers + tests (what clients may already hit in this branch)
4. src/api-ai-document/** Node docs           →  file map, mounts, Zod shape
5. AGENTS.md                                 →  architecture (never violate)
```

**Never** "fix" a contract by inventing REST 404s / renaming keys to look cleaner
if the debug doc says HTTP 200 + `status: false` + exact `messages` string.

---

## Workflow

### Step 0 — Scope

From the debug doc, list every endpoint in scope:

| # | Method | Full path | Auth | Node handler (if known) | Success envelope notes |
|---|--------|-----------|------|-------------------------|------------------------|

Confirm scope with the user only if the doc covers many unrelated routes and they
only mentioned one. Otherwise implement the full doc.

### Step 1 — Map PHP/debug → Node files

Search the repo:

```text
src/routes/**          path registration
src/controllers/**     handler exports
src/services/**        business + response mapping
src/repositery/**      Drizzle
src/types/**           Zod
src/db/schema.ts       tables
src/app.ts             mounts under /wapi
```

Cross-check `src/api-ai-document/**` header blocks for the same domain.

Build a file map like the debug guides use:

| Layer | Files |
|-------|--------|
| Routes | … |
| Controllers | … |
| Services | … |
| Repositery | … |
| Types | … |
| Schema tables | … |

If the route is **missing**, port it fully (AGENTS.md implementation order).  
If the route **exists**, diff against the debug contract (Step 2).

### Step 2 — Diff contract vs implementation

For each endpoint, verify in order:

1. **Route** — method, path spelling (typos), middleware order:  
   `Authorization?` → upload? → `validateData(schema)?` → handler
2. **Auth** — public vs JWT; use `req.auth.id` vs `user_id` as debug doc says
3. **Zod** — body/query/params field names (e.g. `follower_id` not `followed_id`)
4. **HTTP status** — often **200** even for business failure; only change if doc says so
5. **Envelope keys** — `status`, `messages` vs `message`, presence/absence of `data`
6. **Exact message strings** — including typos (`Request Send successfully!`, `employement`)
7. **`data` shape** — array vs object, nested keys, field names, types
8. **Business rules** — status flags, `is_deleted`, auto-accept company follow, limits, ORDER BY / RAND
9. **SQL / repositery** — filters, joins, column meaning quirks (see inverted follow columns)
10. **Empty / error paths** — empty list still success? omit `data` on mutations?

Mark each mismatch as:

- **Contract bug** — must fix (wrong key, wrong message, wrong SQL meaning)
- **Structure bug** — violates AGENTS.md (db in service, missing repositery, bad controller)
- **Optimisation** — safe after contract is correct (N+1, over-fetch, missing index usage, dead code)

### Step 3 — Fix (contract first)

Edit only what the scoped endpoints need. Implementation order when creating missing pieces:

1. `src/types/*.types.ts` — Zod + `z.infer`
2. `src/repositery/*.repositery.ts` — all SQL
3. `src/services/*.service.ts` — rules + response mapping **only**
4. `src/controllers/*.controller.ts` — auth + validated + `res.json`
5. `src/routes/*.route.ts` — middleware chain
6. `src/app.ts` — only if new mount required

**Preserve:**

- Legacy path spellings
- Exact message strings (including typos)
- Locked JSON keys from the debug doc
- PHP-style business errors as HTTP 200 + `status: false` when the doc says so

**Do not:**

- Put Drizzle in services
- Re-coerce Zod/Drizzle numbers
- Refactor unrelated modules "while here"
- Rename response keys for "cleanliness"
- Change public vs protected auth without doc support

### Step 4 — Optimise (after contract matches)

Only optimisations that **do not change** external JSON/messages/auth:

| Safe | Unsafe without proof |
|------|----------------------|
| Move SQL from service → repositery | Changing field names / nesting |
| Combine N+1 queries into one repositery method | Dropping `RAND()` / limits the FE expects |
| Select only needed columns if shape still maps 1:1 | Returning extra keys FE might choke on **or** removing locked keys |
| Parallel independent repositery calls (`Promise.all`) when order-independent | Changing default sort if doc specifies order |
| Reuse existing repositery methods | "Fixing" typos in messages/paths |
| Remove dead code / duplicate mappers | New status codes for old business failures |
| Avoid loading full rows when only ids needed | Silent schema renames |

If an optimisation would alter observed client behaviour, **skip it** or ask the user.

See [references/optimisation-checklist.md](./references/optimisation-checklist.md).

### Step 5 — Update Node docs

After code is correct:

1. Update the matching `src/api-ai-document/**` module so it describes **Node as shipped**  
   (real files, Zod, handlers, response examples). Not a raw PHP paste.
2. If the user gave a new debug guide and it belongs in-repo, save/update under  
   `src/debug/<topic>-endpoints.md` with Node file map + LOCKED examples  
   (match style of existing `src/debug/*.md`).
3. Touch `src/api-ai-document/README.md` index only if a new module file was added  
   or status/mounts changed.

### Step 6 — Verify

```bash
npx tsc --noEmit
```

Optionally grep for locked strings/keys and confirm route registration:

```bash
rg -n "messages|Request Send|allLanguage|add-employement" src/services src/controllers src/routes
rg -n "path-segment" src/routes src/app.ts
```

Fix type errors before finishing.

---

## Output to the user

When done, summarise:

1. **Endpoints touched** — method + path
2. **Contract fixes** — what was wrong vs debug doc (keys, messages, auth, SQL)
3. **Structure fixes** — layering / AGENTS.md violations fixed
4. **Optimisations** — what got faster/cleaner without contract change
5. **Docs updated** — paths under `src/api-ai-document/**` and/or `src/debug/**`
6. **Verify** — `tsc` result

Keep the summary short; do not dump huge diffs unless asked.

---

## Common CollarCheck bug magnets (check every time)

| Symptom / risk | What to check |
|----------------|---------------|
| FE toast / string-match fails | Exact `messages` / `message` key and string |
| Dropdown blank labels | Catalog shape `{id,name}` vs profile shape `{id,skill,rating}` |
| Wrong follow counts | Inverted `followed_id` / `follower_id` meaning |
| Company context wrong | `req.auth.id` vs `user_id` + `X-Company` |
| Public route 401 | Debug says public — strip `Authorization` requirement |
| Heavy payload | Debug says `LIMIT 30` / `RAND()` — restore limits |
| Nested aggregator wrong | e.g. `educationDataList` / `employmentList` child keys and spellings (`employementTypeList`) |
| Success has unexpected `messages` | Some dashboards **omit** `messages` on success entirely |
| Mutation returns `data: null` | Many mutations **omit** `data` key completely |
| Service has `import db` | Move to repositery immediately |

---

## Checklist (complete before claiming done)

**Orientation**

- [ ] Read `AGENTS.md`
- [ ] Read `src/api-ai-document/README.md` + relevant domain doc(s)
- [ ] Read full user debug doc (every endpoint, locked JSON, bug magnets)

**Code**

- [ ] Route path/method/middleware match debug doc
- [ ] Auth identity (`id` vs `user_id`) correct
- [ ] Zod field names match request contract
- [ ] Response keys + message strings exact
- [ ] HTTP status behaviour matches (often 200 + status false)
- [ ] Repositery owns all SQL; service has none
- [ ] Controllers thin; static repositery imports
- [ ] Safe optimisations only; no contract drift
- [ ] `npx tsc --noEmit` passes

**Docs**

- [ ] Node api-ai-document updated for shipped behaviour
- [ ] Debug guide under `src/debug/**` saved/updated if user provided new contract material

---

## Anti-patterns

```ts
// FORBIDDEN in services
import db from '../db';
await db.select()...

// FORBIDDEN — re-coerce validated / Drizzle types
const id = Number(req.validated.body.follower_id);
const uid = Number(row.userId);

// FORBIDDEN — "clean" messages
return { status: true, message: "Request sent successfully" };
// when debug says: messages: "Request Send successfully!"

// FORBIDDEN — controller HOF
export const foo = handle((req) => service(req));
```

---

## Slash usage examples

```text
/debugin-api src/debug/follow-and-request-endpoints.md
/debugin-api fix employee dashboard from this debug paste
/debugin-api src/debug/skill-and-language-endpoints.md — also optimise queries
```
