# Optimisation checklist (safe after contract match)

Run only when response shape, messages, auth, and business rules already match
the debug doc.

## Query / repositery

- [ ] All SQL lives in `src/repositery/**` (move any leftover service queries)
- [ ] No N+1 loops: `for (id of ids) await find(id)` → batch `findByIds` / `inArray`
- [ ] Aggregator endpoints (`educationDataList`, `employmentList`, dashboards) load
      child lists via parallel repositery calls when independent
- [ ] Select columns needed for the locked JSON only (still map every locked key)
- [ ] Honour documented `LIMIT` / `ORDER BY` / `RAND()` — do not remove for speed
- [ ] Soft-delete / status filters match debug SQL (`status = 1`, `is_deleted = 0`)
- [ ] Reuse existing repositery methods instead of duplicating similar selects

## Service

- [ ] Pure orchestration + response mapping (no `db`)
- [ ] Static imports of repositery instances
- [ ] Shared mappers for repeated row → JSON transforms
- [ ] Early returns for auth/business failures with **exact** messages
- [ ] No redundant full-entity loads when only existence check needed

## Controller / route

- [ ] Thin: auth + validated + service + `res.status().json()`
- [ ] Middleware order: auth → upload → validate → handler
- [ ] No double-parse of body; use `req.validated` only
- [ ] Correct HTTP status from debug doc (often 200)

## Types

- [ ] Zod coerces at the boundary once
- [ ] Controllers/services use `z.infer` types — no extra `Number()` / `String()`
- [ ] Repositery rows typed via `Awaited<ReturnType<…>>` or InferSelectModel

## Do not optimise by

- Removing random sampling when PHP/debug used `ORDER BY RAND() LIMIT 30`
- Returning full table dumps "for caching later"
- Normalising message casing/punctuation
- Switching plural `messages` ↔ singular `message`
- Adding REST error codes PHP never used
- Collapsing two public endpoints that return different shapes
- Changing `req.auth.id` to always `user_id` (breaks `X-Company`)

## After optimising

- Re-read locked JSON examples from the debug doc
- Mentally walk empty list, not-found, and permission-denied paths
- Run `npx tsc --noEmit`
