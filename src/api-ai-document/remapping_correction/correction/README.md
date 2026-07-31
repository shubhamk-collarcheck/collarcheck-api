# ID correction CSVs

Drop id-remap CSV files **here**. Remap agents must read these files and must not invent mappings.

Path (from repo root):

```text
src/api-ai-document/remapping_correction/correction/
```

## File names

| Master | Example filenames |
|--------|-------------------|
| City (`cyb_cities`) | `city.csv`, `city_correction.csv`, `cities.csv` |
| Designation (`cyb_designation`) | `designation.csv`, `degination.csv` |
| Department (`cyb_department`) | `department.csv` |
| Industry (`cyb_industries`) | `industry.csv`, `industries.csv` |
| Skill (`cyb_skill`) | `skill.csv`, `skills.csv` |

## Required columns

```csv
old_id,keep_id
1,3
6,3
```

Optional: `name`, `old_name` (audit only).

Combined multi-master file needs a type column:

```csv
type,old_id,keep_id
city,1,3
skill,10,22
```

See index: [`../README.md`](../README.md)  
Per-table maps: `../cities_relation.md`, `../designation_relation.md`, `../department_relation.md`, `../industries_relation.md`, `../skill_relation.md`
