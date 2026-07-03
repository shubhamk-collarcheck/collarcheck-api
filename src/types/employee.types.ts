import { z } from "zod";

const idOrText = z.union([
	z.coerce.number()
		.int("ID must be an integer.")
		.positive("ID must be greater than 0."),
	z.string().trim().min(1, "Value cannot be empty."),
]);

export const employmentBodySchema = z.object({
	company: idOrText,

	designation: idOrText,

	department: idOrText,

	skill: z.array(z.string().trim().min(1)).default([]),

	employment_type: z.coerce.number().int().positive(),

	description: z.string().trim().max(5000).default(""),

	joining_date: z.string().date(),

	worked_till_date: z
		.union([z.literal("present"), z.string().date(),])
		.optional(),

	salary: z.string(),

	salary_inhand: z.enum(["In Hand", "CTC",]),

	salary_mode: z.enum(["Per Month", "Annually",]),
	hired: z.preprocess(
		(value) => {
			if (value === "TRUE" || value === "true") return true;
			return false;
		},
		z.boolean().default(false)
	),
	still_working: z.preprocess((value) => {
		if (value === "TRU" || value === "true") return true;
		return false;
	}, z.boolean().default(false))

});

export const employmentParamsSchema = z.object({
	employment_id: z.coerce.number().int().positive().optional(),
});

export const employmentRequestSchema = z.object({
	params: employmentParamsSchema,
	body: employmentBodySchema,
});

export type EmploymentBody =
	z.infer<typeof employmentBodySchema>


export type EmploymentRequestBody = z.infer<typeof employmentRequestSchema>
