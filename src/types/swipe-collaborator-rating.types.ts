import { z } from "zod";

const optionalCoerceNumber = z.preprocess((v) => {
	if (v === undefined || v === null || v === "") return undefined;
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

/** Parse array or JSON-string array or CSV into number[] / mixed[] */
function coerceArray(v: unknown): unknown[] {
	if (v === undefined || v === null || v === "") return [];
	if (Array.isArray(v)) return v;
	if (typeof v === "string") {
		const trimmed = v.trim();
		if (!trimmed) return [];
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed)) return parsed;
		} catch {
			/* fall through to CSV */
		}
		return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
	}
	return [v];
}

const skillIdArraySchema = z.preprocess(coerceArray, z.array(z.union([z.string(), z.number()])).optional().default([]));
const ratingArraySchema = z.preprocess(coerceArray, z.array(z.union([z.string(), z.number()])).optional().default([]));
const idArraySchema = z.preprocess(coerceArray, z.array(z.union([z.string(), z.number()])).optional().default([]));

// ====== PATCH alternate-empty ======
export const alternateEmptyBodySchema = z.object({
	type: z.string().optional(),
});
export const alternateEmptySchema = z.object({ body: alternateEmptyBodySchema });
export type AlternateEmptyBody = z.infer<typeof alternateEmptyBodySchema>;

// ====== POST collaborator-request ======
// job_id validated in service so missing field returns PHP-shaped `{ status: false, message }` (HTTP 200)
export const collaboratorRequestBodySchema = z.object({
	job_id: z.preprocess((v) => {
		if (v === undefined || v === null || v === "") return undefined;
		const n = Number(v);
		return Number.isFinite(n) ? n : undefined;
	}, z.number().optional()),
	user_id: z.preprocess(coerceArray, z.array(z.coerce.number()).optional().default([])),
});
export const collaboratorRequestSchema = z.object({ body: collaboratorRequestBodySchema });
export type CollaboratorRequestBody = z.infer<typeof collaboratorRequestBodySchema>;

// ====== PATCH accept-colloborator/:id ======
export const idParamsSchema = z.object({
	params: z.object({ id: z.coerce.number().int().positive() }),
});

// ====== GET collaborator-list / job-collaborator-list ======
export const listQuerySchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().positive().optional().default(20),
		offset: z.coerce.number().int().min(0).optional().default(0),
		job_id: optionalCoerceNumber,
	}),
});
export type ListQuery = z.infer<typeof listQuerySchema>["query"];

// ====== POST employee/company add-skill-rating ======
export const addSkillRatingBodySchema = z.object({
	experience_id: optionalCoerceNumber,
	experience: optionalCoerceNumber,
	review: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? "" : String(v))),
	skill_id: skillIdArraySchema,
	rating: ratingArraySchema,
	show_review: z.union([z.string(), z.number()]).optional(),
	link: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? undefined : String(v))),
});
export const addSkillRatingSchema = z.object({
	body: addSkillRatingBodySchema,
	params: z.object({ id: z.coerce.number().int().positive().optional() }).optional(),
});
export type AddSkillRatingBody = z.infer<typeof addSkillRatingBodySchema>;

// ====== GET show-rating ======
export const showRatingQuerySchema = z.object({
	query: z.object({
		experience_id: optionalCoerceNumber,
		type: z.string().optional(),
	}),
	body: z
		.object({
			experience_id: optionalCoerceNumber,
			type: z.string().optional(),
		})
		.optional(),
});
export type ShowRatingQuery = {
	experience_id?: number;
	type?: string;
};

// ====== POST update-show-profile-rating ======
export const updateShowProfileRatingBodySchema = z.object({
	experience_id: optionalCoerceNumber,
	review_id: idArraySchema,
	skill_rating_id: idArraySchema,
});
export const updateShowProfileRatingSchema = z.object({ body: updateShowProfileRatingBodySchema });
export type UpdateShowProfileRatingBody = z.infer<typeof updateShowProfileRatingBodySchema>;

// ====== GET clarity ======
export const clarityQuerySchema = z.object({
	query: z.object({
		numOfDays: z.union([z.string(), z.number()]).optional(),
	}),
});
