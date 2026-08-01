import { z } from "zod";

/** Shared body fields for create/update job (and template via status=3). */
export const addJobBodySchema = z.object({
	id: z.coerce.number().int().positive().optional(),
	job_title: z.string().optional(),
	job_description: z.string().optional(),
	roles_responsibility: z.string().optional(),
	experience: z.coerce.number().int().optional(),
	role_type: z.coerce.number().int().optional(),
	country: z.coerce.number().int().optional(),
	state: z.coerce.number().int().optional(),
	/** ID as number/string or city name (auto-create). */
	city: z.union([z.string(), z.coerce.number()]).optional(),
	salary: z.coerce.number().int().optional(),
	vacancy: z.coerce.number().int().optional(),
	job_mode: z.coerce.number().int().optional(),
	/** ID as number/string or designation name (auto-create). */
	designation: z.union([z.string(), z.coerce.number()]).optional(),
	/** ID as number/string or department name (auto-create). */
	department: z.union([z.string(), z.coerce.number()]).optional(),
	/** ID as number/string or industry name (auto-create). */
	industry: z.union([z.string(), z.coerce.number()]).optional(),
	skill: z
		.preprocess((val) => {
			if (val == null || val === '') return undefined;
			if (typeof val === 'string') {
				try {
					return JSON.parse(val);
				} catch {
					return [val];
				}
			}
			return val;
		}, z.array(z.union([z.string(), z.coerce.number()])).optional())
		.optional(),
	urgent: z.coerce.boolean().optional(),
	status: z.coerce.number().int().optional(),
	template_name: z.string().optional(),
	template_id: z.coerce.number().int().optional(),
	slug: z.string().optional(),
	/**
	 * Existing document path when no new file upload.
	 * FE often sends `{}` / null / "" when the file field is empty — treat as absent.
	 * Multipart file uploads use the `document` field via multer, not this body value.
	 */
	document: z.preprocess((val) => {
		if (val == null || val === '') return undefined;
		// Empty object / file-picker placeholder from JSON clients
		if (typeof val === 'object' && !Array.isArray(val)) {
			const keys = Object.keys(val as object);
			if (keys.length === 0) return undefined;
			// Sometimes clients send { path: "..." } or { url: "..." }
			const o = val as Record<string, unknown>;
			const path = o.path ?? o.url ?? o.document ?? o.key;
			if (typeof path === 'string' && path.trim()) return path.trim();
			return undefined;
		}
		if (typeof val === 'string') return val;
		return undefined;
	}, z.string().optional()),
});

export const addJobSchema = z.object({
	body: addJobBodySchema,
});

export const jobIdParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive(),
	}),
});

export const allJobQuerySchema = z.object({
	query: z.object({
		keyword: z.string().optional().default(''),
		limit: z.coerce.number().int().positive().optional().default(20),
		/**
		 * 1-based page number (PHP + frontend), NOT a SQL OFFSET.
		 * page 1 → offset 0; page N → (N * limit) - limit.
		 * Frontend default is 1 (`getCompanyJobs(limit, offset=1)`).
		 */
		offset: z.coerce.number().int().nonnegative().optional().default(1),
	}),
});

export const multiCancelJobSchema = z.object({
	body: z.object({
		id: z.array(z.coerce.number().int().positive()).min(1, "Id Required"),
	}),
});

export const multiJobStatusChangeSchema = z.object({
	body: z.object({
		id: z.array(z.coerce.number().int().positive()).min(1, "Id Required"),
		status: z.coerce.number().int().optional().default(0),
	}),
});

export const addJobUpdateSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive(),
	}),
	body: addJobBodySchema,
});

export type AddJobBody = z.infer<typeof addJobBodySchema>;
export type AddJobRequest = z.infer<typeof addJobSchema>;
export type JobIdParamsRequest = z.infer<typeof jobIdParamsSchema>;
export type AllJobQuery = z.infer<typeof allJobQuerySchema>;
export type MultiCancelJobRequest = z.infer<typeof multiCancelJobSchema>;
export type MultiJobStatusChangeRequest = z.infer<typeof multiJobStatusChangeSchema>;
export type AddJobUpdateCombined = z.infer<typeof addJobUpdateSchema>;
