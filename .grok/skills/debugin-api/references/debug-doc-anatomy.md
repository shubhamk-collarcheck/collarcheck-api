# Debug doc anatomy (CollarCheck)

How to read user-provided / `src/debug/**` guides. These are the **contract
source of truth** for `/debugin-api`.

## Typical sections

1. **Purpose** — "Frontend depends on these keys — do not rename"
2. **Node source files table** — routes, controllers, services, repositery, types, schema
3. **Routes summary** — method, path, handler, success `messages`, has `data`?
4. **Global envelope** — HTTP status + `{ status, messages|message, data? }`
5. **Per-endpoint blocks**
   - Auth (public vs JWT, `X-Company`)
   - Request (body / query / params / files)
   - Logic checklist or intended SQL
   - Success **LOCKED KEYS** JSON example
   - Error / empty cases
   - **Common Node mistakes** / **Bug magnet** tables
6. **Spellings that must stay exact** — path typos + message typos

## What is locked vs flexible

| Locked (never "improve") | Flexible (optimise freely if behaviour same) |
|--------------------------|-----------------------------------------------|
| Path strings (incl. typos) | Internal repositery method names |
| JSON keys and nesting | Query plan / indexes / `Promise.all` |
| Message strings (incl. typos) | How many SQL round-trips if result identical |
| Auth requirement | File split within same layer |
| Presence/absence of `data` | Shared helpers for mapping |
| Field types clients parse | Logging, dead code removal |
| Business rules (status flags, limits, RAND) | Implementation language details |

## Envelope variants you will see

```json
// Common success
{ "status": true, "messages": "…", "data": … }

// Business failure (still HTTP 200)
{ "status": false, "messages": "…" }

// Some dashboards — NO messages on success
{ "status": true, "data": { } }

// Rare permission shape (note singular message)
{ "status": false, "message": "…" }

// Zod middleware
{ "error": "Invalid data", "details": [ { "message": "…" } ] }
```

## Priority line often written in the doc

> Prefer this debug file over summary tables in `api-ai-document/` when they conflict.

Honour that for **client-facing** behaviour. Still use api-ai-document for **file map**
and Node layering. After fixes, align api-ai-document with the debug contract.

## Example locked snippets (real project)

**Skill catalog (public):**

```json
{
  "status": true,
  "messages": "skill list",
  "data": [{ "id": 12, "name": "React" }]
}
```

**Follow mutation (no `data` key):**

```json
{
  "status": true,
  "messages": "Request Send successfully!"
}
```

**Employee dashboard success (no `messages` key):**

```json
{
  "status": true,
  "data": {
    "jobsApplieds": 0,
    "currentEmployees": []
  }
}
```

## When the user pastes PHP-oriented debug material

Translate while fixing:

| Debug / PHP language | Node target |
|----------------------|-------------|
| `IndividualApi::dashboard` | Real export in `src/controllers/*.ts` |
| `$this->request->id` | `req.auth.id` |
| `$this->user_id` | `req.auth.user_id` |
| Model SQL | `src/repositery/*.repositery.ts` |
| Form validation | Zod + `validateData` |

Keep product contracts; rewrite implementation map to Node.
