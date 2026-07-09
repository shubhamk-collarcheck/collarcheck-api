import { z } from "zod";
import { InferInsertModel } from "drizzle-orm"
import { cybUserEducation } from "../db/schema";

const idOrText = z.union([
	z.coerce.number()
		.int("ID must be an integer.")
		.positive("ID must be greater than 0."),
	z.string().trim().min(1, "Value cannot be empty."),
]);

export const educationBodySchema = z.object({
	university: idOrText,
	course_type: z.coerce.number().int().positive(),
	course: idOrText,
	city: idOrText.optional(),
	state: z.coerce.number().int().positive().optional(),
	country: z.coerce.number().int().positive().optional(),
	starting_date: z.string().date().optional(),
	ending_date: z.string().date().optional(),
	ishighest: z.preprocess(
		(value) => {
			if (value === "TRUE" || value === "true" || value === true) return true;
			return false;
		},
		z.boolean().default(false)
	),
	ongoing: z.preprocess(
		(value) => {
			if (value === "1" || value === "TRUE" || value === "true" || value === true) return true;
			return false;
		},
		z.boolean().default(false)
	),
});

export const educationParamsSchema = z.object({
	id: z.coerce.number().int().positive().optional(),
});

export const educationRequestSchema = z.object({
	params: educationParamsSchema,
	body: educationBodySchema,
});

export type EducationBody = z.infer<typeof educationBodySchema>
export type EducationRequestBody = z.infer<typeof educationRequestSchema>
export type EducationInsert = InferInsertModel<typeof cybUserEducation>
