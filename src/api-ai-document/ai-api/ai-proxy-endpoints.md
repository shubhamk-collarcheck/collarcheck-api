
# AI Proxy Endpoints — semantic, chat, domain, rank, scrape

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Auth:** `AiAuth` middleware — header **`X-API-KEY`** (not JWT)  
> **Status:** Implemented in this repo  

BFF / reverse-proxy routes that validate a key, then forward to the external AI service (`AI_DOMAIN`). One endpoint (`domain/verify`) also writes local relation/permission rows.

---

## Node file map

| Layer | Path |
|-------|------|
| Routes | `src/routes/ai.route.ts` (mounted at `/wapi` in `app.ts`) |
| Auth | `src/middlewares/aiAuth.ts` |
| Controller | `src/controllers/ai.controller.ts` |
| Service | `src/services/ai.service.ts` |
| Repository | `src/repositery/ai.repositery.ts` (domain_verify side effects only) |
| HTTP client | `src/utils/aiProxy.ts` |
| Express typing | `req.aiApiKey` on `src/types/express.d.ts` |

---

## Auth — `AiAuth`

**Not** JWT Bearer. Clients must send:

| Header | Required | Behavior |
|--------|----------|----------|
| `X-API-KEY` | **Yes** | Stored on `req.aiApiKey` and forwarded upstream as `X-API-KEY` |

### Missing key
**HTTP 401**
```json
{
  "status": false,
  "message": "Token Missing!"
}
```

### Notes
- No `Authorization: Bearer` check.
- No user id injection (no `req.auth`).
- Key is pass-through; Node does not validate the key against the DB.

---

## Architecture

```
Client  --X-API-KEY-->  Node /wapi/*  --X-API-KEY + JSON-->  {AI_DOMAIN}/...
                              |
                              +--> (domain/verify only) optional local DB writes
```

| Env | Used by |
|-----|---------|
| `AI_DOMAIN` | Default base URL for all proxy methods |
| `AI_REGISTER_DOMAIN` | Optional override for `domain/register` host (defaults to `AI_DOMAIN` or `https://ai.collarcheck.com`) |

Default timeout: **10 seconds**. `chat/health` uses **no timeout**.

---

## Shared response envelopes

### Semantic + chat (HTTP status checked)

**Success (upstream 2xx):**
```json
{ "status": true, "data": { } }
```
`data` = full JSON body from the AI service (opaque).

**Upstream non-2xx:**
```json
{
  "status": false,
  "code": 400,
  "message": "<upstream error.message or 'Unknown error'>",
  "data": { }
}
```

**Network / timeout:**
```json
{ "status": false, "message": "<error string>" }
```

### Domain / rank / scrape (always success-shaped unless exception)

```json
{ "status": true, "data": <decoded upstream body or null> }
```

On exception only:
```json
{ "status": false, "messages": "<exception message>" }
```
> Plural **`messages`**.

---

## Routes Summary

| # | Method | Full path | Handler | Upstream | Notes |
|---|--------|-----------|---------|----------|-------|
| 1 | POST | `/wapi/semantic/suggest_skills` | `suggestSkills` | `POST {AI_DOMAIN}/semantic/suggest_skills` | |
| 2 | POST | `/wapi/semantic/suggest_designations` | `suggestDesignations` | `…/suggest_designations` | |
| 3 | POST | `/wapi/semantic/suggest_departments` | `suggestDepartments` | `…/suggest_departments` | |
| 4 | POST | `/wapi/semantic/suggest_parameters` | `suggestParameters` | `…/suggest_parameters` | |
| 5 | POST | `/wapi/semantic/suggest_roles` | `suggestRoles` | `…/suggest_roles` | |
| 6 | GET | `/wapi/chat/health` | `chatHealth` | `GET {AI_DOMAIN}/chat` | No timeout |
| 7 | POST | `/wapi/chat` | `simpleChat` | `POST {AI_DOMAIN}/chat/api/chat` | |
| 8 | POST | `/wapi/chat/conversation` | `chatConversation` | `POST …/chat/api/conversation` | Fixed double-slash |
| 9 | POST | `/wapi/chat/refresh-faqs` | `refreshFaqs` | `POST …/chat/api/refresh-faqs` | Was 404 in PHP; now proxied |
| 10 | POST | `/wapi/chat/end-session` | `endSession` | `POST …/chat/api/end-session` | |
| 11 | POST | `/wapi/chat/reset-topic` | `resetTopic` | `POST …/chat/api/reset-topic` | |
| 12 | GET | `/wapi/chat/faqs` | `getAllFaqs` | `GET …/chat/api/faqs` | |
| 13 | GET | `/wapi/chat/faq/:id` | `getFaqById` | `GET …/chat/api/faq/{id}` | |
| 14 | POST | `/wapi/domain/register` | `domainRegister` | `POST {AI_REGISTER_DOMAIN}/verify_domain/domain/register` | |
| 15 | POST | `/wapi/domain/verify` | `domainVerify` | `POST {AI_DOMAIN}/verify_domain/domain/verify` | + local DB side effects |
| 16 | POST | `/wapi/domain/reset` | `domainReset` | `POST {AI_DOMAIN}/verify_domain/domain/reset` | **Fixed** path + body |
| 17 | POST | `/wapi/rec_candidates/rank` | `rankCandidates` | `POST {AI_DOMAIN}/rec_candidates/rank` | Real body + defaults |
| 18 | POST | `/wapi/scrape` | `scrape` | `POST {AI_DOMAIN}/fetch/scrape` | |

---

# A. Semantic suggestions

All five forward JSON body + `X-API-KEY`. Shared semantic/chat envelope.

| Route | Body fields |
|-------|-------------|
| `POST /wapi/semantic/suggest_skills` | `{ "query": "react native" }` |
| `POST /wapi/semantic/suggest_designations` | `{ "query": "..." }` |
| `POST /wapi/semantic/suggest_departments` | `{ "query": "..." }` |
| `POST /wapi/semantic/suggest_parameters` | `{ "query": "..." }` |
| `POST /wapi/semantic/suggest_roles` | `{ "designation", "department", "company_name", "skills" }` (null if omitted) |

```json
// suggest_roles example
{
  "designation": "Software Engineer",
  "department": "Engineering",
  "company_name": "Acme",
  "skills": ["PHP", "MySQL"]
}
```

---

# B. Chat APIs

| Route | Body / notes |
|-------|----------------|
| `GET /wapi/chat/health` | No body. Upstream path is **`/chat`**, not `/chat/health`. Unlimited timeout. |
| `POST /wapi/chat` | `{ "query": "..." }` → `/chat/api/chat` |
| `POST /wapi/chat/conversation` | `{ "query", "session_id" }` → `/chat/api/conversation` |
| `POST /wapi/chat/refresh-faqs` | Optional body → `/chat/api/refresh-faqs` |
| `POST /wapi/chat/end-session` | `{ "session_id" }` |
| `POST /wapi/chat/reset-topic` | `{ "session_id" }` |
| `GET /wapi/chat/faqs` | FAQ list |
| `GET /wapi/chat/faq/:id` | Single FAQ (`:id` is string, not limited to numeric) |

### Intentional Node fixes vs legacy PHP

| Item | PHP | Node |
|------|-----|------|
| Conversation path | `/chat/api//conversation` (double slash) | `/chat/api/conversation` |
| `refresh-faqs` | Method missing → **404** | Proxied to AI service |

---

# C. Domain verification

### Domain string normalization (`normalizeDomain`)

Applied to request `domain` before register/verify:

1. Strip `http://` / `https://` (case-insensitive).
2. Strip leading `www.`.
3. Take only first path segment (drops `/path`).
4. Lowercase.

| Input | Normalized |
|-------|------------|
| `https://www.Acme.com/about` | `acme.com` |
| `HTTP://FOO.IO` | `foo.io` |

---

## 14. POST `/wapi/domain/register`

### Request
```json
{
  "domain": "https://www.acme.com",
  "user_id": 50,
  "added_by": 101
}
```

### Upstream
`POST {AI_REGISTER_DOMAIN}/verify_domain/domain/register`  
Body: `{ "domain": "acme.com", "user_id": 50, "added_by": 101 }`

### Response
Always-success envelope: `{ "status": true, "data": … }`  
Exception: `{ "status": false, "messages": "..." }`

---

## 15. POST `/wapi/domain/verify`

Same request fields as register.

### Upstream
`POST {AI_DOMAIN}/verify_domain/domain/verify`

### Local side effects (after proxy)

When upstream `data.verified` is **truthy**, bootstrap company access:

1. Lookup `cyb_user_relation` where `user_id = added_by` AND `company_id = user_id`.
2. If missing, **INSERT** relation: `type = 1`, timestamps.
3. Load `cyb_user_group` where `added_by = added_by` AND `group_id = 1`.
4. If no matching `cyb_user_permission` for that group, **INSERT** permission:
   - `user_id` = `added_by`
   - `group_id` = usergroup id
   - `added_by` = company `user_id`
   - `parent_id` = `added_by`

### Intentional Node fix

| PHP (as coded) | Node |
|----------------|------|
| Side effects when `verified` is **empty/falsy** (likely inverted) | Side effects when `verified` is **truthy** |

---

## 16. POST `/wapi/domain/reset`

### Request
```json
{ "confirm": "...", "user_id": 50 }
```

### Upstream (fixed)
`POST {AI_DOMAIN}/verify_domain/domain/reset`  
Body: `{ "confirm", "user_id" }`

### Legacy PHP bugs (fixed in Node)

| Issue | PHP behavior |
|-------|----------------|
| Wrong path | Called `/verify_domain/domain/register` |
| Wrong body | Literal `{ "query": "$payload" }` (not interpolated) |

---

# D. Candidate ranking & scrape

## 17. POST `/wapi/rec_candidates/rank`

Accepts a real body from the client. Defaults match the old hard-coded payload:

```json
{
  "job_id": 255,
  "weights": {
    "semantic": 0.5,
    "skill_overlap": 0.2,
    "experience": 0.15,
    "location": 0.1,
    "verification": 0.05
  },
  "shortlist_limit": 200,
  "final_limit": 50
}
```

Upstream: `POST {AI_DOMAIN}/rec_candidates/rank`

---

## 18. POST `/wapi/scrape`

```json
{ "url": "https://example.com/careers" }
```

Upstream: `POST {AI_DOMAIN}/fetch/scrape`  
Always-success envelope (no upstream status check).

---

## Error / HTTP matrix

| Case | HTTP | Body |
|------|------|------|
| Missing `X-API-KEY` | **401** | `{ status: false, message: "Token Missing!" }` |
| Semantic/chat network fail | 200 | `{ status: false, message }` |
| Semantic/chat upstream ≠2xx | 200 | `{ status: false, code, message, data }` |
| Semantic/chat success | 200 | `{ status: true, data }` |
| Domain/rank/scrape path | 200 | `{ status: true, data }` even if upstream failed |
| Domain/rank/scrape exception | 200 | `{ status: false, messages }` |

---

## Side-effect summary

| Endpoint | Local DB | External AI |
|----------|----------|-------------|
| semantic/* | None | Suggest endpoints |
| chat/* | None | Chat service |
| domain/register | None | Domain register |
| domain/verify | Maybe `cyb_user_relation`, `cyb_user_permission` (+ read `cyb_user_group`) | Domain verify |
| domain/reset | None | Domain reset |
| rec_candidates/rank | None | Rank |
| scrape | None | Fetch/scrape |

---

## Env vars

| Name | Purpose |
|------|---------|
| `AI_DOMAIN` | Base URL for AI microservice (e.g. `https://ai.collarcheck.com`) |
| `AI_REGISTER_DOMAIN` | Optional host for `domain/register` only |

Pure proxy methods do not need DB. `domain/verify` needs MySQL for relation/permission writes.

---

## Content-Type

JSON, urlencoded, or multipart fields (`multer().none()` on POST routes). Same as other form-friendly public APIs.

---

## Checklist

- [x] Separate auth scheme: **`X-API-KEY`**, not JWT
- [x] Forward same key to AI service on every call
- [x] Base URL from env (`AI_DOMAIN`)
- [x] Envelope differences: semantic/chat vs domain/rank/scrape
- [x] Domain host normalization before verify/register
- [x] Fixed inverted `domain_verify` permission bootstrap
- [x] Implemented `chat/refresh-faqs` proxy
- [x] Fixed `domain_reset` path + body
- [x] `rank_candidates` accepts real client body with defaults
- [x] Conversation path without double slash
- [x] Timeouts: 10s default; health unlimited
