import { z } from "zod";

export const paginationQuerySchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().positive().optional().default(10),
		offset: z.coerce.number().int().min(0).optional().default(0),
	}),
});

export const widgetDetailParamsSchema = z.object({
	params: z.object({
		slug: z.string().min(1),
	}),
	query: z.object({
		limit: z.coerce.number().int().positive().optional().default(20),
		offset: z.coerce.number().int().min(0).optional().default(0),
	}),
});

export const viewImpressionsBodySchema = z.object({
	remote_id: z.coerce.number().int().positive("The Remote id field is required."),
	type: z.string().optional(),
});

export const viewImpressionsSchema = z.object({
	body: viewImpressionsBodySchema,
});

export const detailsJobsImpressionsQuerySchema = z.object({
	query: z.object({
		job_id: z.coerce.number().int().positive().optional(),
		limit: z.coerce.number().int().positive().optional().default(10),
		offset: z.coerce.number().int().min(0).optional().default(0),
	}),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>["query"];
export type ViewImpressionsBody = z.infer<typeof viewImpressionsBodySchema>;
