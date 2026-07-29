import { z } from "zod";

/** validateData always parses { params, query, body }. Nest fields under the right key. */

export const allReviewQuerySchema = z.object({
	query: z.object({
		keyword: z.string().optional(),
		user_id: z.string().optional(),
	}),
});

export const addReviewBodySchema = z.object({
	experience_id: z.coerce.number().int().positive("Experience ID is required"),
	rating: z.coerce.number().int().min(1).max(5, "Rating must be between 1-5"),
	review: z.string().min(1, "Review text is required"),
	link: z.string().optional(),
	show_review: z.coerce.number().int().optional(),
});
export const addReviewSchema = z.object({ body: addReviewBodySchema });

export const reviewIdParamsInnerSchema = z.object({
	id: z.coerce.number().int().positive("Invalid review ID"),
});
export const reviewIdParamsSchema = z.object({
	params: reviewIdParamsInnerSchema,
});

export const viewReviewParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid experience ID"),
	}),
});

export const addHelpSchema = z.object({
	body: z.object({
		id: z.coerce.number().int().positive("Experience ID is required"),
		subject: z.string().min(1, "Subject is required"),
		message: z.string().min(1, "Message is required"),
	}),
});

// job is optional: PHP only filters app.job when set; FE often sends it, but ?limit=5 alone must work
const optionalJobId = z
	.union([z.string(), z.number()])
	.optional()
	.transform((v) => {
		if (v === undefined || v === null || v === '') return undefined;
		const segment = String(v).split(',')[0].trim();
		if (!segment) return undefined;
		const n = Number(segment);
		if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return undefined;
		return n;
	});

export const allApplicationQuerySchema = z.object({
	query: z.object({
		job: optionalJobId,
		keyword: z.string().optional(),
		limit: z.coerce.number().int().positive().optional().default(50),
		offset: z.coerce.number().int().optional().default(0), // page number, not SQL offset
	}),
});

export const updateBasicExperienceParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid experience update ID"),
	}),
});

// Combined schema for add-review/:id route (params + body)
export const addReviewUpdateSchema = z.object({
	params: reviewIdParamsInnerSchema,
	body: addReviewBodySchema,
});

export type AllReviewQuery = z.infer<typeof allReviewQuerySchema>["query"];
export type AddReviewBody = z.infer<typeof addReviewBodySchema>;
export type ReviewIdParams = z.infer<typeof reviewIdParamsInnerSchema>;
export type AddReviewUpdateCombined = z.infer<typeof addReviewUpdateSchema>;
export type ViewReviewParams = z.infer<typeof viewReviewParamsSchema>["params"];
export type AddHelpBody = z.infer<typeof addHelpSchema>["body"];
export type AllApplicationQuery = z.infer<typeof allApplicationQuerySchema>;
export type UpdateBasicExperienceParams = z.infer<typeof updateBasicExperienceParamsSchema>["params"];
