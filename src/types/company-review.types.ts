import { z } from "zod";

export const allReviewQuerySchema = z.object({
	keyword: z.string().optional(),
	user_id: z.string().optional(),
});

export const addReviewSchema = z.object({
	experience_id: z.coerce.number().int().positive("Experience ID is required"),
	rating: z.coerce.number().int().min(1).max(5, "Rating must be between 1-5"),
	review: z.string().min(1, "Review text is required"),
	link: z.string().optional(),
	show_review: z.coerce.number().int().optional(),
});

export const reviewIdParamsSchema = z.object({
	id: z.coerce.number().int().positive("Invalid review ID"),
});

export const viewReviewParamsSchema = z.object({
	id: z.coerce.number().int().positive("Invalid experience ID"),
});

export const addHelpSchema = z.object({
	id: z.coerce.number().int().positive("Experience ID is required"),
	subject: z.string().min(1, "Subject is required"),
	message: z.string().min(1, "Message is required"),
});

export const allApplicationQuerySchema = z.object({
	job: z.string().min(1, "Job ID is required"),
	keyword: z.string().optional(),
	limit: z.coerce.number().int().positive().optional().default(50),
	offset: z.coerce.number().int().optional().default(0),
});

export const updateBasicExperienceParamsSchema = z.object({
	id: z.coerce.number().int().positive("Invalid experience update ID"),
});

// Combined schema for add-review/:id route (params + body)
export const addReviewUpdateSchema = z.object({
	params: reviewIdParamsSchema,
	body: addReviewSchema,
});

export type AllReviewQuery = z.infer<typeof allReviewQuerySchema>;
export type AddReviewBody = z.infer<typeof addReviewSchema>;
export type ReviewIdParams = z.infer<typeof reviewIdParamsSchema>;
export type AddReviewUpdateCombined = z.infer<typeof addReviewUpdateSchema>;
export type ViewReviewParams = z.infer<typeof viewReviewParamsSchema>;
export type AddHelpBody = z.infer<typeof addHelpSchema>;
export type AllApplicationQuery = z.infer<typeof allApplicationQuerySchema>;
export type UpdateBasicExperienceParams = z.infer<typeof updateBasicExperienceParamsSchema>;
