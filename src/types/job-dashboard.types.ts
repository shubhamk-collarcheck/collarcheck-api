import { z } from "zod";

export const applyJobSchema = z.object({
	job: z.coerce.number().int().positive("The Job field is required."),
});

export const approvedEmploymentSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export const approvedViewRequestSchema = z.object({
	id: z.coerce.number().int().positive("The id field is required."),
	access: z.union([z.array(z.string()), z.string()]).optional(),
	day: z.coerce.number().int().optional(),
});

export const viewRequestIdSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export const paginationQuerySchema = z.object({
	limit: z.coerce.number().int().positive().optional(),
	offset: z.coerce.number().int().nonnegative().optional(),
});

export const checkCurrentCompanySchema = z.object({
	employment_id: z.coerce.number().int().positive().optional(),
});

export const multiDeleteViewRequestSchema = z.object({
	body: z.object({
		id: z.array(z.coerce.number().int().positive()).min(1, "id Required!"),
	}),
});

export const multiApprovedViewRequestSchema = z.object({
	body: z.object({
		id: z.coerce.number().int().positive("The id field is required."),
		access: z.union([
			z.record(z.string(), z.coerce.number()),
			z.array(z.string()),
			z.string(),
		]).optional(),
		day: z.coerce.number().int().optional(),
	}),
});

export type ApplyJobBody = z.infer<typeof applyJobSchema>;
export type ApprovedEmploymentParams = z.infer<typeof approvedEmploymentSchema>;
export type ApprovedViewRequestBody = z.infer<typeof approvedViewRequestSchema>;
export type ViewRequestIdParams = z.infer<typeof viewRequestIdSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type CheckCurrentCompanyQuery = z.infer<typeof checkCurrentCompanySchema>;
export type MultiDeleteViewRequestBody = z.infer<typeof multiDeleteViewRequestSchema>["body"];
export type MultiApprovedViewRequestBody = z.infer<typeof multiApprovedViewRequestSchema>["body"];
