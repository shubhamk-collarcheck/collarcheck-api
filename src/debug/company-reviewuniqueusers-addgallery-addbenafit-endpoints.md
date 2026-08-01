
# Debug Guide — company/reviewUniqueUsers, addGallery, addBenafit

**Purpose:** Contract source-of-truth for debugging a Node.js reimplementation against the legacy CodeIgniter 4 API. Frontend already depends on these response keys and message strings — **do not rename keys**.

**Authoritative source:** PHP controllers/models below (prefer this file over summary tables in `api-ai-document/` when they conflict).

## Node implementation map (shipped)

| Layer | Files |
|-------|--------|
| Routes | `src/routes/company.route.ts` |
| Controllers | `company-employee-request.controller.ts` (`reviewUniqueUsers`), `company-benefit-gallery.controller.ts` (gallery/benefit) |
| Services | `company-employee-request.service.ts`, `company-benefit-gallery.service.ts` |
| Repositery | `company-employee-request.repositery.ts`, `company-benefit-gallery.repositery.ts`, `company.repositery.ts` (menu) |
| Types | `company-employee-request.types.ts`, `company-benefit-gallery.types.ts` |
| Node docs | `src/api-ai-document/company/company-benefit-gallery-endpoints.md`, `company-employee-request-endpoints.md` |

| Route | Auth | Node handler | What it returns |
|-------|------|--------------|-----------------|
| `GET /wapi/company/reviewUniqueUsers` | **JWT** + menu **8** | `reviewUniqueUsers` | Filtered unique employees for review UI |
| `POST /wapi/company/addGallery` | **JWT** | `addGallery` | Upload gallery images |
| `POST /wapi/company/addGallery/:id` | **JWT** | `addGalleryUpdate` | **Ignores id** — always insert |
| `POST /wapi/company/addBenafit` | **JWT** | `addBenefit` | Attach benefit (**typo path**) |
| `POST /wapi/company/addBenafit/:id` | **JWT** | `addBenefitUpdate` | Intended update; duplicate check usually blocks |

| Route | Auth | PHP Controller | What it returns |
|-------|------|----------------|-----------------|
| `GET /wapi/company/reviewUniqueUsers` | **JWT** + menu **8** | `CompanyApi::reviewUniqueUsers` | Users the company can see in review UI (filtered unique employees) |
| `POST /wapi/company/addGallery` | **JWT** (no menu check) | `CompanyApi::addGallery` | Upload one/more gallery images |
| `POST /wapi/company/addGallery/:id` | **JWT** | `CompanyApi::addGallery/$1` | Route exists; **handler ignores `$id`** (always insert) |
| `POST /wapi/company/addBenafit` | **JWT** (no menu check) | `CompanyApi::addBenafit` | Attach a benefit to company (**typo path**) |
| `POST /wapi/company/addBenafit/:id` | **JWT** | `CompanyApi::addBenafit/$1` | Intended update; **duplicate check usually blocks it** |

**Source files:**
- `app/Controllers/CompanyApi.php` — `addBenafit` (~4499), `addGallery` (~4650), `reviewUniqueUsers` (~5820); list siblings `benefit` (~4453), `gallery` (~4610)
- `app/Models/UserModel.php` — `get_unique_user_experience` (~998), `get_all_experience_rating` (~847), `get_skill_based_rating_average` (~298), `getAllEmploymentScore` (~5986), `user_verified` (~3247)
- `app/Models/CompanyModel.php` — `get_all_experience_rating` (~47)
- `app/Models/FrontModel.php` — `check_record_exit` (~14)
- `app/Models/MainModel.php` / CommonModel — `fs`, `insertData`, `updateData`, `allCount`
- `app/Libraries/traits/Awss3.php` — `s3fileUploads` (~9)
- `app/Libraries/traits/ExploringTrait.php` — `show_exploring`
- Routes: `app/Config/Routes.php` company group `['filter' => 'Auth']` (~177–178, ~184–185, ~195)

**Base path:** `/wapi`  
**Auth:** `Authorization: Bearer <jwt>`  
**Acting company:** JWT user, or `X-Company: {companyId}` → `$this->request->id`. Original JWT user is `$this->request->user_id`.

> **Node bug magnet #1:** Path spelling. Live benefit write path is **`addBenafit`** (missing **e**). Review list is **`reviewUniqueUsers`** (camelCase, not `review-unique-user` as some api-ai docs say).

---

## Global envelope

| Case | Endpoint | HTTP | Body shape |
|------|----------|------|------------|
| Success review list | reviewUniqueUsers | **200** | `{ "status": true, "messages": "review list", "data": [ ... ] }` |
| Success gallery upload | addGallery | **200** | `{ "status": true, "messages": "Successfully added" }` |
| No files / upload empty | addGallery | **200** | `{ "status": true, "messages": "Nothing Modified !" }` ← **status true** |
| Success benefit | addBenafit | **200** | `{ "status": true, "messages": "Successfully added" }` |
| Validation / business fail | add* | **200** | `{ "status": false, "messages": "..." }` |
| Menu denied | reviewUniqueUsers only | **403** | `{ "status": false, "message": "..." }` ← **`message` singular** |
| Exception | all | **200** | `{ "status": false, "messages": "Access denied" }` |
| Auth fail | all | **401** | filter-dependent |

> **Node bug magnet #2:** Returning `status: false` for empty gallery upload. PHP returns **`status: true`** with **`Nothing Modified !`** (spaces around `!`).

---

## Auth / identity (all three)

```text
JWT → user
If X-Company present and company ok:
  request.id = company.id
  request.user_id = JWT user.id
  request.user_type = 2
Else:
  request.id = request.user_id = JWT user
```

| Endpoint | Menu `checkMenuAccess` |
|----------|------------------------|
| `reviewUniqueUsers` | **8** when `user_type == 2` |
| `addGallery` | **none** (list `gallery` uses **9**) |
| `addBenafit` | **none** (list `benefit` uses **10**) |

---

# 1. GET `/wapi/company/reviewUniqueUsers`

**Handler:** `CompanyApi::reviewUniqueUsers` (~5820)  
**Auth:** JWT + menu **8**

### Query params

| Param | Required | Notes |
|-------|----------|-------|
| `keyword` | no | `LIKE %keyword%` on **`user.fname` only** (not full name / designation) |

```http
GET /wapi/company/reviewUniqueUsers?keyword=John
Authorization: Bearer <jwt>
X-Company: <companyId>
```

### Logic (debug checklist)

```text
1. company = request.id
   IF user_type == 2:
     checkMenuAccess(login_user_id, company, 8) → 403 message on fail

2. filter = {
     keyword: GET keyword,
     company: company,
     groupby: 'user',
     approved: 1
   }
   uniqueexperiences = UserModel.get_unique_user_experience(filter)
   // one row per user (GROUP BY uex.user), approved employments only

3. FOR each unique row:
   a. checkStillWorking = COUNT user_experience
        WHERE user, company, is_deleted=0, still_working=1

   b. lastReviewUser = COUNT user_experience
        WHERE user, company, is_deleted=0, lastReview=1

   c. atLeastOneReview = COUNT user_experience_rating
        WHERE experience = unique.id   // ⚠ only THIS grouped experience id
          AND is_deleted=0
          AND added_by != 1

   d. INCLUDE user only if:
        still_working > 0
        OR atLeastOneReview > 0
        OR lastReviewUser > 0
      (PHP: !empty(still) || !empty(atLeastOneReview || lastReviewUser))

   e. If included, aggregate across ALL approved experiences for this user at company:
        unset groupby; filter.user = unique.user
        allexperiences = get_unique_user_experience(filter)  // still company+approved=1

      FOR each experience eval:
        reviews = CompanyModel.get_all_experience_rating(eval.id)
          // status=1, approved <> 2, joins
        FOR each review:
          avg = get_skill_based_rating_average(review.id)
          IF avg > 0: noofrecord++
          // ⚠ rating sum accumulation is COMMENTED OUT → rating stays 0

        pending list = UserModel.get_all_experience_rating({
          experinceId: eval.id,   // typo key in filter
          status: 1,
          approved: 3             // magic → DB approved = 0
        })
        pending += count(pending list)

      employmentScore = getAllEmploymentScore(user, company)
        // avg of skill-based scores across approved stints; number_format 1 decimal as string

   f. EMIT card only if noofrecord is non-empty (> 0):
        // still_working alone is NOT enough without skill ratings counting
        map card → allreview[]

4. return { status:true, messages:"review list", data: allreview }
```

### SQL (core)

```sql
-- unique users (simplified)
SELECT uex.*, ur.profile, ur.slug AS user_slug, ur.social_image,
       ur.fname, ur.lname, ur.on_notice, ur.on_immediate, ur.on_explore,
       dg.name AS designation_name, ...
FROM user_experience uex
LEFT JOIN user ur ON uex.user = ur.id
LEFT JOIN designation dg ON uex.designation = dg.id
-- + company, employment_type, department joins
WHERE uex.is_deleted = 0
  AND ur.is_deleted = 0
  AND ur.user_type = 1
  AND uex.company = :companyId
  AND uex.approved = 1
  AND ur.fname LIKE '%:keyword%'   -- if keyword
GROUP BY uex.user
ORDER BY uex.still_working DESC, uex.joining_date DESC;

-- still working gate
SELECT COUNT(*) FROM user_experience
WHERE user = :user AND company = :company
  AND is_deleted = 0 AND still_working = 1;

-- lastReview gate
SELECT COUNT(*) FROM user_experience
WHERE user = :user AND company = :company
  AND is_deleted = 0 AND lastReview = 1;

-- at least one review (on the GROUP BY representative experience only)
SELECT COUNT(*) FROM user_experience_rating
WHERE experience = :uniqueExperienceId
  AND is_deleted = 0 AND added_by != 1;

-- CompanyModel ratings for score counting
SELECT uer.* FROM user_experience_rating uer
WHERE uer.experience = :expId
  AND uer.status = 1
  AND uer.approved <> 2
  AND ... joins ...
ORDER BY uer.id DESC;

-- pending reviews (UserModel)
SELECT ... FROM user_experience_rating uer
WHERE uer.experience = :expId
  AND uer.status = 1
  AND uer.approved = 0          -- because filter approved=3 → 0
  AND uex.is_deleted = 0 AND uer.is_deleted = 0;
```

### Success — **LOCKED KEYS**

```json
{
  "status": true,
  "messages": "review list",
  "data": [
    {
      "id": 100,
      "user_id": 55,
      "isVerified": true,
      "designation": "Engineer",
      "user_slug": "john-doe",
      "user": "John Doe",
      "profile": "https://s3.../p.jpg",
      "rating": 0,
      "noofrecord": 3,
      "employmentScore": "4.5",
      "pendingReview": 1,
      "on_explore": 0,
      "on_immediate": 0,
      "on_notice": 0
    }
  ]
}
```

| Key | Type | Source / notes |
|-----|------|----------------|
| `id` | number | **experience id** from grouped unique row (`unique->id`), not user id |
| `user_id` | number | employee `user` |
| `isVerified` | boolean | `user_verified(user)` — camel **V** |
| `designation` | string | designation of grouped experience row |
| `user_slug` | string | |
| `user` | string | **display name** `fname + ' ' + lname` (not an id) |
| `profile` | string\|null | S3+profile or social_image |
| `rating` | number | **Always `0`** in live PHP (sum loop commented out) |
| `noofrecord` | number | Count of reviews with skill-based average **> 0** |
| `employmentScore` | number\|string | `getAllEmploymentScore` → `number_format(..., 1)` string like `"4.5"` or `0` |
| `pendingReview` | number | Count of ratings with `approved=0` across user’s company experiences |
| `on_explore` / `on_immediate` / `on_notice` | 0\|1 | same exploring gate as other company lists |

Empty: `{ status:true, messages:"review list", data: [] }`.

### Error cases

```json
// 403
{ "status": false, "message": "<permission text>" }

// catch
{ "status": false, "messages": "Access denied" }
```

### Common Node mistakes (review)

| Mistake | Symptom |
|---------|---------|
| Include every approved employee | List missing gate + `noofrecord > 0` filter |
| Treat `rating` as real average | Live always **0** |
| `approved: 3` as literal DB value | Pending count wrong; must map to **`approved = 0`** |
| `atLeastOneReview` over all experiences | PHP only checks **`unique.id`** (one stint) |
| Keyword on full name | Only **fname** LIKE |
| Route `review-unique-user` | Wrong path; live is **`reviewUniqueUsers`** |
| `id` as user id | `id` is experience; `user_id` is user |

---

# 2. POST `/wapi/company/addGallery`  
#    POST `/wapi/company/addGallery/:id`

**Handler:** `CompanyApi::addGallery($id = false)` (~4650)  
**Auth:** JWT only (no menu 9 on write)  
**Uses:** `Awss3::s3fileUploads`

### Params

| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `file` | multipart | soft | Multi-file: `file[]` / multiple parts. If missing/empty → success **"Nothing Modified !"** |
| `title` | form | no | String → same name all images; **array** → `title[i]` per file; XSS via `escxss()` |
| `:id` | URL | no | **Ignored** — update block is commented out |

```http
POST /wapi/company/addGallery
Authorization: Bearer <jwt>
Content-Type: multipart/form-data

file: <image1>
file: <image2>
title: Office Tour
```

### Logic (debug checklist)

```text
1. companyId = request.id

2. rules = {}
   IF $_FILES['file']['name'] non-empty:
     rules['rules'] = {
       lable: 'file',   // typo key "lable" in PHP rules array (CI field name is literally "rules")
       rules: 'uploaded[file]|max_size[file,3048]|mime_in[file,image/jpg,image/jpeg,image/png,image/webp]',
       errors: {
         uploaded: 'You must upload file as png,jpg,',
         max_size: 'The image file size must not exceed 3MB.',
         mime_in: 'Allowed image types: JPG, JPEG, PNG'
       }
     }
   // max_size 3048 KB ≈ 3MB as message says

3. IF validate fails → status false, messages = implode(',', validator errors)

4. title = escxss(getVar('title'))
   document_img = []

5. IF files present:
     foreach request.getFiles()['file'] as file:
       IF valid and not moved:
         url = s3fileUploads(file, 'uploads/images/')
         // returns S3 object path (path only, not full URL)
         IF url: document_img.push(url)

6. result = ''
   IF document_img non-empty:
     FOR i in 0..len-1:
       INSERT galleries {
         company_id: companyId,
         name: is_array(title) ? (title[i] ?? '') : title,
         image: document_img[i]
       }
       // ⚠ no create_date/modify_date on insert (prepared on unused $save)
       result = last insert result

7. IF result truthy → { status:true, messages:"Successfully added" }
   ELSE → { status:true, messages:"Nothing Modified !" }
   // even failed path is status true when no inserts
```

### SQL

```sql
INSERT INTO galleries (company_id, name, image)
VALUES (:companyId, :name, :imagePath);
```

List sibling (not this request) prefixes image: `S3_PREFIX + image`.

### Success / soft-empty — **LOCKED**

```json
{ "status": true, "messages": "Successfully added" }
```

```json
{ "status": true, "messages": "Nothing Modified !" }
```

### Validation fail — **LOCKED**

```json
{
  "status": false,
  "messages": "You must upload file as png,jpg,"
}
```

(Exact text depends on which CI rule fails; join multiple with commas.)

### Error cases

```json
{ "status": false, "messages": "Access denied" }
```

### Common Node mistakes (gallery)

| Mistake | Symptom |
|---------|---------|
| Implement update by `:id` | PHP always inserts new rows |
| Store full S3 URL in DB | PHP stores **path** from `s3fileUploads` |
| `status: false` when no file | Must be **true** + `Nothing Modified !` |
| Single-file only | Multi-file loop creates **N rows** |
| Require menu 9 on write | List has menu; write does **not** |
| Max size 3072 vs 3048 | CI rule is **`max_size[file,3048]`** |

---

# 3. POST `/wapi/company/addBenafit`  
#    POST `/wapi/company/addBenafit/:id`

**Handler:** `CompanyApi::addBenafit($id = false)` (~4499)  
**Auth:** JWT only (no menu 10 on write)  
**Path spelling:** **`addBenafit`** (typo for Benefit)

### Params

| Field | Source | Required | Notes |
|-------|--------|----------|-------|
| `benefit_id` | form/json | **yes** | Integer id **or** free-text **name** (auto-create benefit type) |
| `sortOrder` | form | no | stored as-is |
| `description` | form | no | company_benefits.description |
| `:id` | URL | no | `company_benefits.id` for intended update |

```http
POST /wapi/company/addBenafit
Authorization: Bearer <jwt>
Content-Type: application/x-www-form-urlencoded

benefit_id=12&sortOrder=1&description=Full coverage
```

```http
POST /wapi/company/addBenafit
benefit_id=Free Snacks
```

### Logic (debug checklist)

```text
1. companyId = request.id

2. Validate benefit_id required (trim|required)
   fail → messages = implode(',', validator errors)
   // default CI message often "Id is required." (label is 'Id')

3. save.company_id = companyId
   save.sortOrder = getVar('sortOrder')
   save.description = getVar('description')

4. Resolve benefit_id:
   IF FILTER_VALIDATE_INT(benefit_id):
     save.benefit_id = benefit_id
   ELSE:
     // treat as new type name
     arr = {
       name: benefit_id string,
       user_defined: 1,
       user_id: companyId,   // set twice in PHP
       status: 1,
       create_date, modify_date: now
     }
     existingId = FrontModel.check_record_exit('benefits', name, 'name')
       // LOWER(TRIM(name)) match
     IF existingId: benefit_id = existingId
     ELSE: benefit_id = INSERT benefits arr
     save.benefit_id = benefit_id

5. save.modify_date = now

6. checkAlready = fs('company_benefits', {
     company_id, benefit_id: save.benefit_id, is_deleted: 0
   })
   IF found → return { status:false, messages:"Record Already added!" }
   // ⚠ runs for BOTH create and update — blocks typical update of same benefit

7. IF id (URL):
     UPDATE company_benefits SET save WHERE id = :id
   ELSE:
     save.create_date = now
     INSERT company_benefits save

8. IF result → { status:true, messages:"Successfully added" }
   ELSE → { status:false, messages:"Something Went Wrong" }
```

### SQL

```sql
-- resolve name → id
SELECT id FROM benefits
WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name))
LIMIT 1;

INSERT INTO benefits (name, user_defined, user_id, status, create_date, modify_date)
VALUES (:name, 1, :companyId, 1, NOW(), NOW());

SELECT * FROM company_benefits
WHERE company_id = :companyId
  AND benefit_id = :benefitId
  AND is_deleted = 0
LIMIT 1;

INSERT INTO company_benefits
  (company_id, benefit_id, sortOrder, description, create_date, modify_date)
VALUES (...);

UPDATE company_benefits
SET benefit_id=..., sortOrder=..., description=..., modify_date=...
WHERE id = :id;
-- note: update does not re-scope by company_id in WHERE
```

### Success / errors — **LOCKED**

```json
{ "status": true, "messages": "Successfully added" }
```

```json
{ "status": false, "messages": "Record Already added!" }
```

```json
{ "status": false, "messages": "Something Went Wrong" }
```

```json
{ "status": false, "messages": "Access denied" }
```

Validation example (exact CI wording may vary):

```json
{ "status": false, "messages": "Id is required." }
```

### Common Node mistakes (benefit)

| Mistake | Symptom |
|---------|---------|
| Path `addBenefit` | 404 |
| Skip name→create branch | Custom perks fail |
| Case-sensitive name match | Duplicate benefit types |
| Allow duplicate company+benefit | PHP rejects with **`Record Already added!`** |
| Expect update by `:id` to always work | Duplicate check finds **same** row first → always “Already added” for same benefit_id |
| Require menu 10 on POST | PHP does not |

> **Node bug magnet #3:** Porting “update mode skips duplicate check” from api-ai-document. Live PHP **always** runs the duplicate check **before** insert/update, so `POST addBenafit/{id}` with the same `benefit_id` typically returns **`Record Already added!`**.

---

## Side-by-side / do not confuse

| Client need | Call this | Related |
|-------------|-----------|---------|
| List people for company reviews UI | `GET company/reviewUniqueUsers` | `GET company/validToReview/:userid`, `POST company/add-review` |
| List gallery | `GET company/gallery` (menu 9) | this write: `addGallery` |
| Upload gallery images | `POST company/addGallery` | `DELETE company/deleteGallery/:id` |
| List benefits | `GET company/benefit` (menu 10) | master list `GET general/benefitList` |
| Add/update company perk | `POST company/addBenafit` | `DELETE company/deleteBenafit/:id` |
| Master benefit catalog | `GET general/benefitList` | not company_benefits |

---

## Full common Node mistake matrix

| Mistake | Symptom |
|---------|---------|
| 403 uses `messages` | Should be **`message`** (review only) |
| Invent REST 4xx for validation | PHP uses **200** + `status:false` |
| `employmentScore` always number | PHP may return **string** `"4.5"` via `number_format` |
| Gallery validation message “polished” | Keep **`You must upload file as png,jpg,`** trailing comma |
| Soft-delete benefits on “already added” | No — reject only |
| Review `is_verified` vs `isVerified` | This endpoint uses **`isVerified`** |

---

## Minimal verification checklist

```bash
# Review list
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Company: $CID" \
  "$BASE/wapi/company/reviewUniqueUsers" | jq '{
    status, messages,
    n: (.data|length),
    sample: .data[0] | {id, user_id, user, rating, noofrecord, employmentScore, pendingReview}
  }'

# Gallery multi-upload
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Company: $CID" \
  -F "file=@./a.jpg" -F "file=@./b.jpg" -F "title=Office" \
  "$BASE/wapi/company/addGallery" | jq .

# Gallery empty
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Company: $CID" \
  -X POST "$BASE/wapi/company/addGallery" | jq .

# Benefit create (typo path)
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Company: $CID" \
  -d "benefit_id=Health%20Insurance&sortOrder=1" \
  "$BASE/wapi/company/addBenafit" | jq .

# Benefit duplicate
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Company: $CID" \
  -d "benefit_id=12" "$BASE/wapi/company/addBenafit" | jq .
```

**Assert:**

1. Review: `messages === "review list"`; every item has `rating === 0` if matching live PHP; `noofrecord >= 1`.
2. Review: 403 body uses **`message`**, not `messages`.
3. Gallery success: `"Successfully added"`; empty: **`status: true`**, `"Nothing Modified !"`.
4. Gallery creates **one DB row per successful file**.
5. Benefit path is **`/wapi/company/addBenafit`**; success `"Successfully added"`.
6. Second create same `benefit_id` → `"Record Already added!"`.
7. String `benefit_id` creates/reuses `benefits` row with `user_defined=1`.

---

## Quick port recipe (Node)

```js
// reviewUniqueUsers
async function reviewUniqueUsers(req) {
  const company = req.id;
  if (req.user_type == 2) {
    const p = await checkMenuAccess(req.user_id, company, 8);
    if (!p.status) return res403({ status: false, message: p.message });
  }
  const uniques = await get_unique_user_experience({
    company, approved: 1, groupby: 'user', keyword: req.query.keyword,
  });
  const data = [];
  for (const unique of uniques) {
    const still = await countExp({ user: unique.user, company, still_working: 1 });
    const lastR = await countExp({ user: unique.user, company, lastReview: 1 });
    const oneReview = await countRating({
      experience: unique.id, is_deleted: 0, added_by_ne: 1,
    });
    if (!still && !oneReview && !lastR) continue;

    let noofrecord = 0, pending = 0, rating = 0; // rating stays 0
    const exps = await get_unique_user_experience({
      company, approved: 1, user: unique.user,
    });
    for (const eval of exps) {
      const reviews = await companyGetAllExperienceRating(eval.id);
      for (const value of reviews) {
        const avg = await get_skill_based_rating_average(value.id);
        if (avg > 0) noofrecord++;
      }
      const pend = await userGetAllExperienceRating({
        experinceId: eval.id, status: 1, approved: 3, // → 0 in SQL
      });
      pending += pend.length;
    }
    if (!noofrecord) continue;

    const card = {
      id: unique.id,
      user_id: unique.user,
      isVerified: await user_verified(unique.user),
      designation: unique.designation_name,
      user_slug: unique.user_slug,
      user: `${unique.fname} ${unique.lname}`,
      profile: unique.profile ? S3_PREFIX + unique.profile : unique.social_image,
      rating: 0,
      noofrecord,
      employmentScore: await getAllEmploymentScore(unique.user, company),
      pendingReview: pending,
      // exploring gates...
    };
    data.push(card);
  }
  return { status: true, messages: 'review list', data };
}

// addGallery — always insert
// addBenafit — resolve id/name, duplicate check, then insert (or update if you match PHP including the broken update path)
```

---

## Related endpoints

| Area | Route | Notes / debug |
|------|-------|----------------|
| Gallery list | `GET company/gallery` | menu **9**; messages `"gallery list"` |
| Gallery delete | `DELETE company/deleteGallery/:id` | soft `is_deleted=1` |
| Benefit list | `GET company/benefit` | menu **10**; messages `"benefit list"` |
| Benefit delete | `DELETE company/deleteBenafit/:id` | typo **Benafit** |
| Benefit master | `GET general/benefitList` | catalog |
| Valid to review | `GET company/validToReview/:userid` | `experinece_id` typo key |
| Company dashboard | `GET company/dashboard` | `debug/company-allapplication-and-dashboard-endpoints.md` |
| High-level (secondary) | `api-ai-document/company/company-benefit-gallery-endpoints.md`, `company-employee-request-endpoints.md` | Prefer **this** file |

---

## Response key freeze (frontend)

### reviewUniqueUsers
Envelope: `status`, `messages`, `data`  
Item: `id`, `user_id`, `isVerified`, `designation`, `user_slug`, `user`, `profile`, `rating`, `noofrecord`, `employmentScore`, `pendingReview`, `on_explore`, `on_immediate`, `on_notice`

### addGallery
`status`, `messages` — `"Successfully added"` | `"Nothing Modified !"` | validation string | `"Access denied"`

### addBenafit
`status`, `messages` — `"Successfully added"` | `"Record Already added!"` | `"Something Went Wrong"` | validator string | `"Access denied"`

### Frozen path segments
- `company/reviewUniqueUsers`
- `company/addGallery`
- `company/addBenafit` (not `addBenefit`)

---

*Generated from PHP source in this repo (`CompanyApi::reviewUniqueUsers` ~5820, `addGallery` ~4650, `addBenafit` ~4499). When PHP and `api-ai-document/company/*` disagree, trust this debug guide and the controller lines cited above.*
