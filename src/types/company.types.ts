import { z } from "zod";

/** validateData always parses { params, query, body }. Nest fields under the right key. */

/** Empty string → undefined so optional numeric fields don't become NaN. */
const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);

/**
 * POST /wapi/company/edit-user?type=1|2|3
 * FE sends `type` as **query** (same as employee edit-user). Also accept body.type as fallback.
 */
export const editCompanyBodySchema = z.object({
	// optional here — resolved from query in editCompanySchema
	type: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(3).optional()),
	company_name: z.string().optional(),
	contact_person: z.string().optional(),
	company_size: z.preprocess(emptyToUndef, z.union([z.string(), z.coerce.number()]).optional()),
	email: z.string().optional(),
	phone: z.string().optional(),
	secondPhone: z.string().optional(),
	emailAlternate: z.string().optional(),
	landline: z.string().optional(),
	incorporate_date: z.string().optional(),
	turnover: z.preprocess(emptyToUndef, z.union([z.string(), z.coerce.number()]).optional()),
	profile_description: z.string().optional(),
	website: z.string().optional(),
	/** ID as number/string or industry name */
	industry: z.preprocess(emptyToUndef, z.union([z.string(), z.coerce.number()]).optional()),
	/** Existing profile URL when no new file upload (multipart uses field `profile`). */
	profile: z.string().optional(),
	present_address: z.string().optional(),
	permanent_address: z.string().optional(),
	country: z.preprocess(emptyToUndef, z.coerce.number().int().optional()),
	state: z.preprocess(emptyToUndef, z.coerce.number().int().optional()),
	city: z.preprocess(emptyToUndef, z.union([z.string(), z.coerce.number()]).optional()),
	linkdin: z.string().optional(),
	youtube: z.string().optional(),
	instagram: z.string().optional(),
	facebook: z.string().optional(),
	twitter: z.string().optional(),
});

export const editCompanySchema = z
	.object({
		query: z.object({
			type: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(3).optional()),
		}).optional().default({}),
		body: editCompanyBodySchema,
	})
	.transform((data) => {
		// Prefer query ?type= — body.type only as legacy fallback
		const type = data.query?.type ?? data.body.type;
		return {
			query: { type },
			body: { ...data.body, type },
		};
	})
	.superRefine((data, ctx) => {
		if (data.query.type == null || Number.isNaN(data.query.type)) {
			ctx.addIssue({
				code: "custom",
				message: "type is required (query ?type=1|2|3)",
				path: ["query", "type"],
			});
		}
	});

/**
 * GET /wapi/company/all-connection
 * offset = **page number** (0 and 1 → first page), not SQL OFFSET.
 * sort_by optional; empty → ue.id DESC in service.
 */
export const allConnectionQuerySchema = z.object({
	query: z.object({
		keyword: z.string().optional().default(''),
		sort_by: z.preprocess(
			(v) => (v === '' || v == null ? undefined : v),
			z.coerce.number().int().optional(),
		),
		limit: z.coerce.number().int().positive().optional().default(10),
		offset: z.coerce.number().int().nonnegative().optional().default(0),
	}),
});

export const updateEmploymentParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive(),
	}),
});

export const addConnectionSchema = z.object({
	body: z.object({
		user: z.coerce.number().int().positive("user is required"),
		designation: z.string().optional(),
		joining_date: z.string().optional(),
		still_working: z.coerce.number().int().optional(),
	}),
});

export const addWishlistSchema = z.object({
	body: z.object({
		user: z.coerce.number().int().positive("user is required"),
	}),
});

export const deleteWishlistParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid Id"),
	}),
});

export const addCompanyDocumentSchema = z.object({
	body: z.object({
		doctype: z.union([
			z.array(z.coerce.number()),
			z.coerce.number(),
			z.array(z.string()),
			z.string(),
		]).optional(),
	}),
});

export type EditCompanyBody = z.infer<typeof editCompanyBodySchema>;
export type AllConnectionQuery = z.infer<typeof allConnectionQuerySchema>["query"];
export type UpdateEmploymentParams = z.infer<typeof updateEmploymentParamsSchema>["params"];
export type AddConnectionBody = z.infer<typeof addConnectionSchema>["body"];
export type AddWishlistBody = z.infer<typeof addWishlistSchema>["body"];
export type DeleteWishlistParams = z.infer<typeof deleteWishlistParamsSchema>["params"];
export type AddCompanyDocumentBody = z.infer<typeof addCompanyDocumentSchema>["body"];
