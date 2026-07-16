import { z } from "zod";

export const addJobSchema = z.object({
	id: z.coerce.number().int().positive().optional(),
	job_title: z.string().optional(),
	job_description: z.string().optional(),
	roles_responsibility: z.string().optional(),
	experience: z.coerce.number().int().optional(),
	role_type: z.coerce.number().int().optional(),
	country: z.coerce.number().int().optional(),
	state: z.coerce.number().int().optional(),
	city: z.string().optional(),
	salary: z.coerce.number().int().optional(),
	vacancy: z.coerce.number().int().optional(),
	job_mode: z.coerce.number().int().optional(),
	designation: z.string().optional(),
	department: z.string().optional(),
	industry: z.string().optional(),
	skill: z.array(z.union([z.string(), z.coerce.number()])).optional(),
	urgent: z.coerce.boolean().optional(),
	status: z.coerce.number().int().optional(),
	template_name: z.string().optional(),
	template_id: z.coerce.number().int().optional(),
	slug: z.string().optional(),
});

export const jobIdParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export const allJobQuerySchema = z.object({
	keyword: z.string().optional(),
	limit: z.coerce.number().int().positive().optional(),
	offset: z.coerce.number().int().nonnegative().optional(),
});

export const multiCancelJobSchema = z.object({
	id: z.array(z.coerce.number().int().positive()).min(1, "Id Required"),
});

export const multiJobStatusChangeSchema = z.object({
	id: z.array(z.coerce.number().int().positive()).min(1, "Id Required"),
	status: z.coerce.number().int().optional().default(0),
});

// Combined schema for add-job/:id route (params + body)
export const addJobUpdateSchema = z.object({
	params: jobIdParamsSchema,
	body: addJobSchema,
});

export type AddJobBody = z.infer<typeof addJobSchema>;
export type JobIdParams = z.infer<typeof jobIdParamsSchema>;
export type AllJobQuery = z.infer<typeof allJobQuerySchema>;
export type MultiCancelJobBody = z.infer<typeof multiCancelJobSchema>;
export type MultiJobStatusChangeBody = z.infer<typeof multiJobStatusChangeSchema>;
export type AddJobUpdateCombined = z.infer<typeof addJobUpdateSchema>;
