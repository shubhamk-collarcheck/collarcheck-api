import { z } from "zod";
import { commonIdParamsSchema } from "../utils/validation";

const idOrText = z.union([
	z.coerce.number()
		.int("ID must be an integer.")
		.positive("ID must be greater than 0."),
	z.string().trim().min(1, "Value cannot be empty."),
]);

export const newLanguageSchema = z.object({
	language: idOrText,
	verbal: z.coerce.number().int("verbal should be number").positive("verbal should be greater than 0"),
	written: z.coerce.number().int("verbal should be number").positive("verbal should be greater than 0"),
});

export const languageRequestSchema = z.object({
	body: newLanguageSchema,
});

export const languageDeleteRequestSchema = z.object({
	params: commonIdParamsSchema.shape.params,
});

export type LanguageRequestBody = z.infer<typeof newLanguageSchema>;
export type LanguageRequest = z.infer<typeof languageRequestSchema>;
export type LanguageDeleteRequest = z.infer<typeof languageDeleteRequestSchema>;
