import { z } from "zod";

export const editCompanySchema = z.object({
	type: z.coerce.number().int().min(1).max(3),
	company_name: z.string().optional(),
	contact_person: z.string().optional(),
	company_size: z.string().optional(),
	email: z.string().optional(),
	landline: z.string().optional(),
	incorporate_date: z.string().optional(),
	turnover: z.string().optional(),
	profile_description: z.string().optional(),
	website: z.string().optional(),
	industry: z.string().optional(),
	present_address: z.string().optional(),
	permanent_address: z.string().optional(),
	country: z.coerce.number().int().optional(),
	state: z.coerce.number().int().optional(),
	city: z.string().optional(),
	linkdin: z.string().optional(),
	youtube: z.string().optional(),
	instagram: z.string().optional(),
	facebook: z.string().optional(),
	twitter: z.string().optional(),
});

export const allConnectionQuerySchema = z.object({
	keyword: z.string().optional(),
	sort_by: z.coerce.number().int().optional(),
	limit: z.coerce.number().int().positive().optional(),
	offset: z.coerce.number().int().nonnegative().optional(),
});

export const updateEmploymentParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
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

export type EditCompanyBody = z.infer<typeof editCompanySchema>;
export type AllConnectionQuery = z.infer<typeof allConnectionQuerySchema>;
export type UpdateEmploymentParams = z.infer<typeof updateEmploymentParamsSchema>;
export type AddConnectionBody = z.infer<typeof addConnectionSchema>["body"];
export type AddWishlistBody = z.infer<typeof addWishlistSchema>["body"];
export type DeleteWishlistParams = z.infer<typeof deleteWishlistParamsSchema>["params"];
export type AddCompanyDocumentBody = z.infer<typeof addCompanyDocumentSchema>["body"];
