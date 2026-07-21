import { z } from "zod";

const optionalString = z
	.union([z.string(), z.number()])
	.optional()
	.transform((v) => (v === undefined || v === null ? undefined : String(v)));

const optionalTruthy = z.any().optional();

// ── KYC init: GET/POST general/verify-document · POST general/verifyDocument
export const verifyDocumentBodySchema = z.object({
	type: z
		.string({ error: "The type field is required." })
		.min(1, "The type field is required.")
		.transform((s) => s.trim().toLowerCase())
		.refine((s) => ["gst", "pan", "aadhaar", "digilocker"].includes(s), {
			message: "The type field must be one of: gst, pan, aadhaar, digilocker",
		}),
	id_number: z
		.union([z.string(), z.number()])
		.transform((v) => String(v).trim().toUpperCase())
		.refine((s) => s.length > 0, { message: "The id_number field is required." }),
	ismobile: optionalTruthy,
});

// Query for GET verify-document (same fields)
export const verifyDocumentQuerySchema = z.object({
	type: z
		.string()
		.min(1)
		.transform((s) => s.trim().toLowerCase())
		.refine((s) => ["gst", "pan", "aadhaar", "digilocker"].includes(s), {
			message: "The type field must be one of: gst, pan, aadhaar, digilocker",
		}),
	id_number: z
		.union([z.string(), z.number()])
		.transform((v) => String(v).trim().toUpperCase()),
	ismobile: optionalTruthy,
});

export const verifyDocumentSchema = z.object({
	body: verifyDocumentBodySchema,
});

export const verifyDocumentGetSchema = z.object({
	query: verifyDocumentQuerySchema,
});

// ── Aadhaar OTP submit
export const verifyAadharBodySchema = z.object({
	client_id: optionalString,
	otp: optionalString,
});

export const verifyAadharSchema = z.object({
	body: verifyAadharBodySchema,
});

// ── GST OTP submit
export const verifyGstBodySchema = z.object({
	client_id: z
		.union([z.string(), z.number()])
		.transform((v) => String(v).trim())
		.refine((s) => s.length > 0, { message: "The client_id field is required." }),
	otp: z
		.union([z.string(), z.number()])
		.transform((v) => String(v).trim())
		.refine((s) => s.length > 0, { message: "The otp field is required." }),
});

export const verifyGstSchema = z.object({
	body: verifyGstBodySchema,
});

// ── DigiLocker download
export const verifyDigilockerBodySchema = z.object({
	client_id: optionalString,
});

export const verifyDigilockerSchema = z.object({
	body: verifyDigilockerBodySchema,
});

// ── Email OTP
export const sendEmailOtpBodySchema = z.object({
	email: z
		.string({ error: "The email field is required." })
		.email("The email field must contain a valid email address.")
		.transform((s) => s.trim().toLowerCase()),
	employment_id: z.coerce.number().int().positive().optional().nullable(),
	type: optionalString,
});

export const sendEmailOtpSchema = z.object({
	body: sendEmailOtpBodySchema,
});

export const verifyEmailOtpBodySchema = z.object({
	email: z
		.string({ error: "The email field is required." })
		.email("The email field must contain a valid email address.")
		.transform((s) => s.trim().toLowerCase()),
	otp: z
		.union([z.string(), z.number()])
		.transform((v) => String(v).trim())
		.refine((s) => s.length > 0, { message: "The otp field is required." }),
	employment_id: z.coerce.number().int().positive().optional().nullable(),
	type: optionalString,
});

export const verifyEmailOtpSchema = z.object({
	body: verifyEmailOtpBodySchema,
});

export type VerifyDocumentBody = z.infer<typeof verifyDocumentBodySchema>;
export type VerifyAadharBody = z.infer<typeof verifyAadharBodySchema>;
export type VerifyGstBody = z.infer<typeof verifyGstBodySchema>;
export type VerifyDigilockerBody = z.infer<typeof verifyDigilockerBodySchema>;
export type SendEmailOtpBody = z.infer<typeof sendEmailOtpBodySchema>;
export type VerifyEmailOtpBody = z.infer<typeof verifyEmailOtpBodySchema>;
