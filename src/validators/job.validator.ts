import { z } from "zod";
export const jobDetailSchema = z.object({
	params: z.object({
		slug: z.string(),
	}),

	query: z.object({
		userId: z.coerce.number().optional(),
		status: z.string().optional(),
		companyview: z.coerce.boolean().optional()
	}),
})
