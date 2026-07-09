import { z } from "zod";
import { commonIdParamsSchema } from "../utils/validation";

export const newCertificateSchema = z.object({
	university: z.union([z.number(), z.string().min(1, "University is required")]),
	course: z.union([z.number(), z.string().min(1, "Course is required")]),
	start_date: z.string().optional(),
	end_date: z.string().optional(),
	certificate_id: z.string().optional(),
	url: z.string().optional(),
	ongoing: z.preprocess(
		(value) => {
			if (value === "TRUE" || value === "true" || value === true || value === "1") return true;
			return false;
		},
		z.boolean().default(false)
	),
});

export const certificateRequestSchema = z.object({
	body: newCertificateSchema,
});

export const certificateUpdateRequestSchema = z.object({
	params: commonIdParamsSchema.shape.params,
	body: newCertificateSchema,
});

export type CertificateRequestBody = z.infer<typeof newCertificateSchema>;
export type CertificateRequest = z.infer<typeof certificateRequestSchema>;
export type CertificateUpdateRequest = z.infer<typeof certificateUpdateRequestSchema>;
