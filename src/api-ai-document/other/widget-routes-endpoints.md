
# Widget Routes Endpoints — discovery feeds, recommendations, impressions

> **Stack:** Node.js + Express + Drizzle ORM  
> **Base path:** `/wapi`  
> **Auth:** JWT on **all** routes (`Authorization` middleware · `X-Company` may swap context)  
> **Status:** Implemented — `src/routes/widget.route.ts`  

Home-feed widgets, discovery lists, and view-impression analytics for employee + company dashboards.

**HTTP:** Almost always **200** with `status: true|false`. Auth failures **401**.

---

## Node file map

| Layer | Path |
|-------|------|
| Routes | `src/routes/widget.route.ts` (mounted at `/wapi` in `app.ts`) |
| Controller | `src/controllers/widget.controller.ts` |
| Service | `src/services/widget.service.ts` |
| Repository | `src/repositery/widget.repositery.ts` |
| Types | `src/types/widget.types.ts` |
| Schema | `cyb_ramdom_widgets`, `cyb_view_impressions`, `cyb_user`, jobs, education, follow, … |

---

## CRUD summary

| Op | Count | Endpoints |
|----|------:|-----------|
| **Create** | **1** | `POST view-impressions` |
| **Read** | **24** | all other GETs |
| **Update / Delete** | **0** | — |
| **Total** | **25** | |

---

## Routes Summary

| # | Method | Full path | Handler | Purpose |
|---|--------|-----------|---------|---------|
| 1 | GET | `/wapi/random-widget` | `randomWidget` | Compose feed from `cyb_ramdom_widgets` |
| 2 | GET | `/wapi/widget-detail/:slug` | `widgetDetail` | “See all” for one widget |
| 3 | GET | `/wapi/nearby-company` | `nearbyCompany` | Geo-near companies |
| 4 | GET | `/wapi/nearby-employee` | `nearbyEmployee` | Geo-near people |
| 5 | GET | `/wapi/similarcompany` | `similarcompany` | Similar companies |
| 6 | GET | `/wapi/people-similar-university` | `peopleSimilarUniversity` | Same universities |
| 7 | GET | `/wapi/user-past-company` | `userPastCompany` | Past company people |
| 8 | GET | `/wapi/user-current-company` | `userCurrentCompany` | Current company people |
| 9 | GET | `/wapi/similaremployee` | `similaremployee` | Similar employees |
| 10 | GET | `/wapi/featured-employee` | `featuredEmployee` | Featured / on_explore talent |
| 11 | GET | `/wapi/people-might-know` | `peopleMightKnow` | People you may know |
| 12 | GET | `/wapi/similar-job` | `similarJob` | Open/urgent jobs (**fixed** vs PHP bug) |
| 13 | GET | `/wapi/immediate-joiner` | `immediateJoiner` | Immediate joiners (company) |
| 14 | GET | `/wapi/notice-period` | `noticePeriod` | On-notice talent (company) |
| 15 | GET | `/wapi/similar-companies-current` | `similarCompaniesCurrent` | Similar to current employer |
| 16 | GET | `/wapi/recommended-employee-general` | `recommendedEmployeeGeneral` | Recommended candidates |
| 17 | GET | `/wapi/people-recentaly-join` | `peopleRecentlyJoin` | Recently joined (**typo kept**) |
| 18 | GET | `/wapi/currentaly-unemployed` | `currentlyUnemployed` | Exploring/unemployed (**typo kept**) |
| 19 | GET | `/wapi/freshers` | `freshers` | Fresher profiles |
| 20 | GET | `/wapi/auth-all-job` | `authAllJob` | Open jobs feed |
| 21 | POST | `/wapi/view-impressions` | `viewImpressions` | **Create** impression |
| 22 | GET | `/wapi/jobs-impressions` | `jobsImpressions` | Job impression aggregates |
| 23 | GET | `/wapi/people-viewed-profile` | `peopleViewedProfile` | People who viewed me |
| 24 | GET | `/wapi/company-viewed-profile` | `companyViewedProfile` | Companies who viewed me |
| 25 | GET | `/wapi/details-jobs-impressions` | `detailsJobsImpressions` | Viewers for one job |

---

## Shared conventions

### Pagination
| Query | Default | Meaning |
|-------|---------|---------|
| `limit` | `10` (`widget-detail` default **20**) | Page size |
| `offset` | `0` | **Page number** → SQL offset: `page <= 1 → 0`, else `page * limit - limit` |

### List envelope
```json
{
  "status": true,
  "message": "optional",
  "data": [],
  "totalCounts": 42
}
```

### Nested shapes
- **following:** `{ requestSend, requestApproved }`
- **followData:** `{ following, follower }`
- **profile:** `S3_PREFIX + profile` else `social_image`
- **exploreTalent:** `1` if company has active job

### Company / person cards
See service `mapCompanyCard` / `mapPersonCard` — include verify, follow, geo `distance` when applicable.

---

# A. Widget orchestration

## GET `/wapi/random-widget`

1. Audience from `user_type` (`USER` vs `COMPANY`).
2. Load `cyb_ramdom_widgets` (`ORDER BY RAND()`, status=1, type match or `BOTH`).
3. Dispatch each row’s `api` key in-process (no HTTP loopback).
4. Keep block only if `list.length >= min_limit`.
5. Return `{ status, data: [{ heading, widget, placement, version, slug, list }] }`.

Registry `api` keys mapped in `API_DISPATCH` (near, top_company, urgent_job, university, past_company, …).

## GET `/wapi/widget-detail/:slug`

1. Lookup widget by `slug`.
2. Sidebar: in-memory cache `random-widget-user-{id}-{date}` TTL **2h** from fixed-order `randomWidget(true)`.
3. Resolve list via `api_slug` / `api` dispatch with pagination.
4. Envelope: `message: "widget detail"`, `data`, `totalCounts`, `widgetList`.
5. Widget ids **25** / **26** set `profile_view: true`.
6. Empty list → `status: false`, `data: []`.

---

# B. Discovery lists (3–20)

Shared: JWT → optional user/company context (city, lat/lng, industry, current company) → query → enrich cards.

| Route | Notes |
|-------|--------|
| nearby-company | Message `"Near by company list"`; distance; turnover/size; invalid → `"invalid User"` |
| nearby-employee | Distance; invalid → `"invalid User"` |
| similarcompany | Same industry, random |
| people-similar-university | Shared education institutions |
| user-past-company | Past employment companies’ people |
| user-current-company | Same `current_company` |
| similaremployee | Industry + city |
| featured-employee | `on_explore=1` |
| people-might-know | Same city random |
| similar-job | **Node fix:** open/urgent jobs (PHP returned nearby people) |
| immediate-joiner | Company-only; `on_immediate` + `on_explore` |
| notice-period | Company-only; `on_notice` |
| similar-companies-current | Industry of current employer |
| recommended-employee-general | Company-only recommendations |
| people-recentaly-join | Joined in last 90 days (company team if company actor) |
| currentaly-unemployed | `on_explore` proxy |
| freshers | ≤1 experience row |
| auth-all-job | Job cards + `apply` flag |

### Job card (`auth-all-job` / similar-job)
```json
{
  "job_title": "...",
  "individual_id": "C50",
  "profile": "...",
  "slug": "...",
  "city_name": "...",
  "company_name": "...",
  "apply": false,
  "job_description": "truncated 200 chars...",
  "skill": []
}
```

---

# C. Impressions

## POST `/wapi/view-impressions`

| Field | Notes |
|-------|-------|
| `remote_id` | Required; must exist on `cyb_user` |
| `type` | Optional; upper `PROFILE` → store **`Profile`**, else **`Job`** (DB enum) |

Dedupe on `(current_user, remote_id, type)`.  

| Result | Message |
|--------|---------|
| OK | `"You have successfully viewed."` |
| Dup | `"You have already viewed."` |
| Bad remote | `"Invalid remote user"` |

Table: `cyb_view_impressions`.

## GET list impressions
- **jobs-impressions** — jobs under acting company + view counts  
- **people-viewed-profile** — `type=Profile`, viewers `user_type=1`  
- **company-viewed-profile** — viewers `user_type=2`  
- **details-jobs-impressions?job_id=** — people who viewed a job  

---

## Side effects

| Endpoint | Write |
|----------|-------|
| view-impressions | INSERT `cyb_view_impressions` |
| All others | Read only |

---

## Env

| Name | Use |
|------|-----|
| `S3_PREFIX` | Profile / company images |

---

## Node vs PHP notes

| Topic | Node behavior |
|-------|----------------|
| HTTP self-calls | Replaced with in-process service dispatch |
| `similar-job` | Returns jobs list (not nearby people) |
| Table typos | `cyb_ramdom_widgets`, path typos kept |
| Cache | In-process Map 2h (not Redis/file) |
| Impression enum | `Profile` / `Job` (matches MySQL) |

---

## Checklist

- [x] 1 Create + 24 Read  
- [x] JWT on every route  
- [x] Page-based `offset` math  
- [x] Path typos preserved  
- [x] `random-widget` + `min_limit`  
- [x] `widget-detail` cache + in-process list  
- [x] Impression PROFILE/JOB + message strings  
- [x] Shared company/person cards with follow/verify/explore  
- [x] similar-job fixed intentionally  
