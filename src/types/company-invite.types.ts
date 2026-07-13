import { z } from "zod";

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const companyInviteBodySchema = z
	.object({
		company: z.coerce.number().int().positive("Company ID is required"),
		email: z.string().optional(),
		phone: z.string().optional(),
		contact_person: z.string().optional(),
		website: z.string().optional(),
	})
	.refine((data) => data.email || data.phone, {
		message: "Either Email or Phone is required",
	})
	.refine(
		(data) => {
			if (data.email && data.email.length > 0) {
				return emailRegex.test(data.email);
			}
			return true;
		},
		{
			message: "The email field must contain a valid email address.",
			path: ["email"],
		}
	);

export const companyInviteRequestSchema = z.object({
	body: companyInviteBodySchema,
});

export type CompanyInviteBody = z.infer<typeof companyInviteBodySchema>;
export type CompanyInviteRequest = z.infer<typeof companyInviteRequestSchema>;
