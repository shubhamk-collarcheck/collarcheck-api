
# Employee All Employment New Endpoint

**Base path:** `/wapi` (JWT Bearer token required)

---

## Route

| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| GET | `employee/allEmployementNew` | `IndividualApi::allEmployementNew` | All employment history grouped by company |

---

## GET `employee/allEmployementNew`

### Route
```
GET /wapi/employee/allEmployementNew
```

### Auth
JWT Bearer token required. `$this->request->id` = authenticated user.

### Description
Returns the authenticated user's full employment history, grouped by company. Each company group contains all designations held at that company with per-designation ratings, skills, documents, salary, and verification process. This is the "new" version — the old `allEmployement` endpoint no longer exists in the codebase.

### DB Queries
```
1. UserModel::get_unique_experience_id($filter)
   → Unique experience IDs grouped by company for user
   → SELECT DISTINCT company, id FROM user_experience WHERE user = ? AND is_deleted = 0

2. For each experience ID, calls get_experience_detail($id, NULL, NULL, NULL, true, true, $user, $user_id):
   a. UserModel::get_experience_detail($experienceId)
      → Full JOIN across user_experience, user (company), designation, department, employement_type

   b. UserModel::user_approve_company_list($userId)
      → Companies where user has approved experiences (for sendReminder flag)

   c. UserModel::get_unique_user_experience($filter)
      → All designations at the same company for the same user

   d. For each designation row:
      - UserModel::get_experience_rating_count([$row->id], $authuser)
      - UserModel::get_skill($row->skill)
      - UserModel::get_certificate($row->certificate) (if showReview)
      - UserModel::get_employment_status($row->id)
      - UserModel::get_experience_basic_update_list($row->id)
      - UserModel::getAverageRatingBySkill($row->id) (designation_score)
      - UserModel::get_rating_general($row->id, $authtype) or get_rating($row->id)
      - UserModel::get_verification_process_details($row->id)

   e. UserModel::getAllEmploymentScore($userId, $companyId)
```

### Request
No body params. Auth only.

### Response
```json
{
  "status": true,
  "messages": "Employement History",
  "data": [
    {
      "id": 1,
      "company_logo": "https://s3.../logo.jpg",
      "company": "Acme Corp",
      "company_id": 456,
      "individual_id": "ABC123",
      "is_verified": true,
      "joining_date": "2020-01-01",
      "worked_till_date": "",
      "claim_status": 1,
      "added_by": true,
      "approved": 1,
      "status": 1,
      "company_slug": "acme-corp",
      "user_slug": "john-doe",
      "hired": 1,
      "sendReminder": false,
      "employmentScore": 85,
      "totalExperienceMonths": 36,
      "still_working": 1,
      "lists": [
        {
          "id": 1,
          "haveSalary": true,
          "haveDocument": true,
          "haveReview": true,
          "work_email": "john@acme.com",
          "employment_type": "Full Time",
          "designation": "Senior Engineer",
          "joining_date": "2020-01-01",
          "worked_till_date": "",
          "still_working": 1,
          "approved": 1,
          "description": "...",
          "salary": "80000",
          "salary_inhand": "65000",
          "salary_mode": "monthly",
          "department": "Engineering",
          "claim_status": 1,
          "company_slug": "acme-corp",
          "skill": [{"id":1, "name":"PHP"}, {"id":2, "name":"Node.js"}],
          "document": [{"id":1, "name":"offer-letter.pdf", "url":"https://..."}],
          "added_by": true,
          "employment_status": {},
          "basic_update_list": [],
          "designation_score": 4.2,
          "rating": [
            {"id":1, "rating":5, "review":"Great!", "reviewer":"...", "skill_based_rating":[]}
          ],
          "totalRating": 5,
          "status": 1,
          "verificationProcess": {"level1":true, "level2":false}
        }
      ]
    }
  ]
}
```

### Key Logic Notes
- `get_experience_detail()` is called with `showSalary=true, showReview=true` — salary and review data are always included for the authenticated user's own profile.
- `authtype` for rating access: `1` = self (full access), `2` = granted access user (restricted via `get_rating_general`), `false` = public (uses `get_rating`).
- `totalExperienceMonths` sums month diffs across all designations at the same company. If `still_working`, uses current date as end.
- `sendReminder` is true if the company is in the user's approved company list (for future experience reminders).
- `added_by` checks if the company sent an invitation to this user via `check_invitation_send()`.

---

## Cross-Language Porting Notes

- `get_experience_detail()` is the core helper — port it as a reusable function. It does 8+ DB queries per call.
- `get_unique_experience_id()` groups by `(user, company)` and returns one row per company.
- Rating access control: `authtype` parameter determines which reviews are visible. Self sees all, granted-access sees restricted set, public sees approved-only.
- `totalExperienceMonths` is calculated client-side in the helper using `date_diff` on `joining_date` and `worked_till_date`.
- `getAllEmploymentScore()` and `getAverageRatingBySkill()` are aggregate scoring functions — port their SQL.
- `check_invitation_send()` and `check_hired()` are simple existence checks on `company_invite` and `user_experience` tables.
