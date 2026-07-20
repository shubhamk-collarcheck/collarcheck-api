import { z } from "zod";

const optionalString = z
	.union([z.string(), z.number()])
	.optional()
	.transform((v) => (v === undefined || v === null ? undefined : String(v).trim()));

// ====== POST report-review ======
export const reportReviewBodySchema = z.object({
	review_id: z.coerce.number().int().positive("The Review Id field is required."),
	message: optionalString,
});
export const reportReviewSchema = z.object({ body: reportReviewBodySchema });
export type ReportReviewBody = z.infer<typeof reportReviewBodySchema>;

// ====== POST request-delete-account ======
export const requestDeleteAccountBodySchema = z.object({
	option_id: z.coerce.number().int().positive("The Option Id field is required."),
	message: optionalString,
});
export const requestDeleteAccountSchema = z.object({ body: requestDeleteAccountBodySchema });
export type RequestDeleteAccountBody = z.infer<typeof requestDeleteAccountBodySchema>;

// ====== POST ai-generate ======
export const aiGenerateBodySchema = z.object({
	query: z.string().trim().min(1, "The Query field is required."),
	type: z.string().trim().min(1, "The Type field is required."),
	position: optionalString,
	company: optionalString,
	department: optionalString,
	designation: optionalString,
	title: optionalString,
	company_name: optionalString,
	industry: optionalString,
	company_size: optionalString,
	incorporate_date: optionalString,
});
export const aiGenerateSchema = z.object({ body: aiGenerateBodySchema });
export type AiGenerateBody = z.infer<typeof aiGenerateBodySchema>;

// ====== GET message-search ======
export const messageSearchQuerySchema = z.object({
	query: z.object({
		keyword: z.string().optional().default(""),
	}),
});

// ====== GET field-suggestion ======
export const fieldSuggestionQuerySchema = z.object({
	query: z.object({
		keyword: z.string().optional().default(""),
		field: z.string().optional().default(""),
		type: z.string().optional(),
		limit: z.coerce.number().int().positive().optional().default(30),
		offset: z.coerce.number().int().min(0).optional().default(0),
	}),
});
export type FieldSuggestionQuery = z.infer<typeof fieldSuggestionQuerySchema>["query"];

// ====== POST check-ccid ======
export const checkCcidBodySchema = z.object({
	ccid: z.string().trim().min(1, "The Ccid field is required.").max(10),
});
export const checkCcidSchema = z.object({ body: checkCcidBodySchema });

// ====== POST follow-revoke ======
export const followRevokeBodySchema = z.object({
	user_id: z.coerce.number().int().positive("The User Id field is required."),
});
export const followRevokeSchema = z.object({ body: followRevokeBodySchema });

// ====== POST manual-document-submit ======
export const manualDocumentBodySchema = z.object({
	doctype: z.coerce.number().int().positive("The Doctype field is required."),
	description: optionalString,
});
export const manualDocumentSchema = z.object({ body: manualDocumentBodySchema });
export type ManualDocumentBody = z.infer<typeof manualDocumentBodySchema>;

// ====== POST update/decline hired ======
export const hiredIdsBodySchema = z.object({
	ids: z.preprocess((val) => {
		if (val === undefined || val === null || val === "") return [];
		if (Array.isArray(val)) return val;
		if (typeof val === "string") {
			try {
				const parsed = JSON.parse(val);
				if (Array.isArray(parsed)) return parsed;
			} catch {
				/* comma-separated */
			}
			return val.split(",").map((s) => s.trim()).filter(Boolean);
		}
		return [val];
	}, z.array(z.coerce.number().int().positive())),
});
export const hiredIdsSchema = z.object({ body: hiredIdsBodySchema });
export type HiredIdsBody = z.infer<typeof hiredIdsBodySchema>;
