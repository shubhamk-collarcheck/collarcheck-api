import { z } from "zod";

const optionalString = z
	.union([z.string(), z.number()])
	.optional()
	.transform((v) => (v === undefined || v === null ? undefined : String(v).trim()));

// ====== GET /wapi/home/top-company ======

export const topCompanyQuerySchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().positive().optional().default(10),
		// page number (legacy name "offset"), not SQL offset
		offset: z.coerce.number().int().min(0).optional().default(0),
	}),
});

export type TopCompanyQuery = z.infer<typeof topCompanyQuerySchema>["query"];

// ====== POST contact|career save-enquiry ======
// Soft-validated in service for PHP-compatible { status, messages } on failure.

export const saveEnquiryBodySchema = z.object({
	firstName: z.string().trim().min(1, "The Name field is required."),
	email: z.string().trim().email("The Email field must contain a valid email address."),
	message: optionalString,
	phone: optionalString,
	lastName: optionalString,
	company: optionalString,
});

export type SaveEnquiryBody = z.infer<typeof saveEnquiryBodySchema>;

// ====== GET /wapi/general/sitemap ======

export const sitemapQuerySchema = z.object({
	query: z.object({
		type: z.string().optional(),
	}),
});

export type SitemapQuery = z.infer<typeof sitemapQuerySchema>["query"];
