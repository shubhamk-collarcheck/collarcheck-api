import { z } from "zod";

/** validateData always parses { params, query, body }. Nest fields under the right key. */

export const addEmployeeBodySchema = z.object({
	email: z.string().email().optional(),
	phone: z.string().optional(),
	joining_date: z.string().min(1, "Joining date is required"),
	salary: z.string().optional(),
	designation: z.string().optional(),
	department: z.string().optional(),
	employment_type: z.string().optional(),
	skill: z.string().optional(),
	description: z.string().optional(),
}).refine((data) => data.email || data.phone, {
	message: "Email or phone is required",
});
export const addEmployeeSchema = z.object({ body: addEmployeeBodySchema });

export const employeeDetailIdSchema = z.object({
	id: z.coerce.number().int().positive("Invalid experience ID"),
});
export const employeeDetailParamsSchema = z.object({
	params: employeeDetailIdSchema,
});

export const rejectEmploymentParamsInnerSchema = z.object({
	id: z.coerce.number().int().positive("Invalid experience ID"),
});
export const rejectEmploymentParamsSchema = z.object({
	params: rejectEmploymentParamsInnerSchema,
});

export const rejectEmploymentBodySchema = z.object({
	reason: z.string().optional(),
});

export const rejectPromotionParamsInnerSchema = z.object({
	id: z.coerce.number().int().positive("Invalid experience ID"),
});
export const rejectPromotionParamsSchema = z.object({
	params: rejectPromotionParamsInnerSchema,
});

export const rejectPromotionBodySchema = z.object({
	type: z.coerce.number().int().min(1).max(3, "Type must be 1, 2, or 3"),
});

export const leaveExperienceBodySchema = z.object({
	id: z.coerce.number().int().positive("Experience ID is required"),
	type: z.coerce.number().int().min(1).max(3, "Type must be 1, 2, or 3"),
	worked_till_date: z.string().optional(),
	rating: z.coerce.number().int().min(1).max(5).optional(),
	review: z.string().optional(),
	salary: z.string().optional(),
	designation: z.string().optional(),
	salary_inhand: z.string().optional(),
	salary_mode: z.string().optional(),
});
export const leaveExperienceSchema = z.object({ body: leaveExperienceBodySchema });

export const reviewUniqueUserQuerySchema = z.object({
	query: z.object({
		keyword: z.string().optional(),
	}),
});

export const validToReviewParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid user ID"),
	}),
});

export const followRequestListQuerySchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().positive().optional().default(6),
		offset: z.coerce.number().int().optional().default(0),
	}),
});

export const companyDashboardQuerySchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().positive().optional().default(10),
		offset: z.coerce.number().int().optional().default(0), // page number, not SQL offset
	}),
});

export const companyListQuerySchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().positive().optional().default(16),
		offset: z.coerce.number().int().optional().default(0),
	}),
});

const formString = z
	.union([z.string(), z.number()])
	.transform((v) => String(v).trim());

export const inviteCompanyBodySchema = z.object({
	company_name: formString.pipe(z.string().min(1, "Company name is required")),
	contact_person: formString.pipe(z.string().min(1, "Contact person is required")),
	incorporate_date: formString.pipe(z.string().min(1, "Incorporate date is required")),
	industry: formString.pipe(z.string().min(1, "Industry is required")),
	email: formString.pipe(z.string().email("Valid email is required")),
	phone: formString.pipe(z.string().min(10).max(15, "Phone must be 10-15 digits")),
	website: z
		.union([z.string(), z.number()])
		.optional()
		.transform((v) => (v === undefined || v === null || String(v).trim() === "" ? undefined : String(v).trim())),
	user_relation: z.coerce.number().int().optional(),
});
export const inviteCompanySchema = z.object({ body: inviteCompanyBodySchema });

export const employmentRequestQuerySchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().positive().optional().default(10),
		offset: z.coerce.number().int().optional().default(0),
	}),
});

export const allMessageListQuerySchema = z.object({
	query: z.object({
		slug: z.string().optional(),
		limit: z.coerce.number().int().positive().optional().default(50),
		offset: z.coerce.number().int().optional().default(0),
	}),
});

export const addMessageSchema = z.object({
	body: z.object({
		send_to: z.coerce.number().int().positive("Receiver ID is required"),
		message: z.string().min(1, "Message is required"),
	}),
});

export const chatMessageReadParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid message ID"),
	}),
});

export const followDataListQuerySchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().positive().optional().default(50),
		offset: z.coerce.number().int().optional().default(0),
	}),
});

export const claimCompanyBodySchema = z.object({
	email: z.string().email().optional(),
	phone: z.string().optional(),
	contact_person: z.string().optional(),
	website: z.string().optional(),
	company: z.string().optional(),
	message: z.string().optional(),
}).refine((data) => data.email || data.phone, {
	message: "Email or phone is required",
});
export const claimCompanySchema = z.object({ body: claimCompanyBodySchema });

export const revokeDeleteAccountSchema = z.object({
	body: z.object({
		company_id: z.coerce.number().int().optional(),
	}),
});

// Combined schemas for routes that need both params and body
export const rejectEmploymentCombinedSchema = z.object({
	params: rejectEmploymentParamsInnerSchema,
	body: rejectEmploymentBodySchema,
});

export const rejectPromotionCombinedSchema = z.object({
	params: rejectPromotionParamsInnerSchema,
	body: rejectPromotionBodySchema,
});

export const addEmployeeUpdateCombinedSchema = z.object({
	params: employeeDetailIdSchema,
	body: addEmployeeBodySchema,
});

export type AddEmployeeBody = z.infer<typeof addEmployeeBodySchema>;
export type EmployeeDetailParams = z.infer<typeof employeeDetailIdSchema>;
export type RejectEmploymentParams = z.infer<typeof rejectEmploymentParamsInnerSchema>;
export type RejectEmploymentBody = z.infer<typeof rejectEmploymentBodySchema>;
export type RejectPromotionParams = z.infer<typeof rejectPromotionParamsInnerSchema>;
export type RejectPromotionBody = z.infer<typeof rejectPromotionBodySchema>;
export type LeaveExperienceBody = z.infer<typeof leaveExperienceBodySchema>;
export type ReviewUniqueUserQuery = z.infer<typeof reviewUniqueUserQuerySchema>["query"];
export type ValidToReviewParams = z.infer<typeof validToReviewParamsSchema>["params"];
export type FollowRequestListQuery = z.infer<typeof followRequestListQuerySchema>["query"];
export type CompanyDashboardQuery = z.infer<typeof companyDashboardQuerySchema>;
export type CompanyListQuery = z.infer<typeof companyListQuerySchema>["query"];
export type InviteCompanyBody = z.infer<typeof inviteCompanyBodySchema>;
export type EmploymentRequestQuery = z.infer<typeof employmentRequestQuerySchema>["query"];
export type AllMessageListQuery = z.infer<typeof allMessageListQuerySchema>["query"];
export type AddMessageBody = z.infer<typeof addMessageSchema>["body"];
export type ChatMessageReadParams = z.infer<typeof chatMessageReadParamsSchema>["params"];
export type FollowDataListQuery = z.infer<typeof followDataListQuerySchema>["query"];
export type ClaimCompanyBody = z.infer<typeof claimCompanyBodySchema>;
export type RevokeDeleteAccountBody = z.infer<typeof revokeDeleteAccountSchema>["body"];
export type RejectEmploymentCombined = z.infer<typeof rejectEmploymentCombinedSchema>;
export type RejectPromotionCombined = z.infer<typeof rejectPromotionCombinedSchema>;
export type AddEmployeeUpdateCombined = z.infer<typeof addEmployeeUpdateCombinedSchema>;
