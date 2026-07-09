import { z } from "zod";
import { commonIdParamsSchema } from "../utils/validation";

export const newDocumentSchema = z.object({
	doctype: z.coerce.number().int().positive("Document type is required"),
});

export const documentRequestSchema = z.object({
	body: newDocumentSchema,
});

export const documentDeleteRequestSchema = z.object({
	params: commonIdParamsSchema.shape.params,
});

export type DocumentRequestBody = z.infer<typeof newDocumentSchema>;
export type DocumentRequest = z.infer<typeof documentRequestSchema>;
export type DocumentDeleteRequest = z.infer<typeof documentDeleteRequestSchema>;
