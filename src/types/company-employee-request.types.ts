import { z } from "zod";

export const addEmployeeSchema = z.object({
	email: z.string().email().optional(),
	phone: z.string().optional(),
	joining_date: z.string().min(1, "Joining date is required"),
	salary: z.string().optional(),
	designation: z.string().optional(),
	department: z.string().optional(),
	employment_type: z.string().optional(),
	skill: z.string().optional(),
	description: z.string().optional(),
}).refine(data => data.email || data.phone, {
	message: "Email or phone is required",
});

export const employeeDetailParamsSchema = z.object({
	id: z.coerce.number().int().positive("Invalid experience ID"),
});

export const rejectEmploymentParamsSchema = z.object({
	id: z.coerce.number().int().positive("Invalid experience ID"),
});

export const rejectEmploymentBodySchema = z.object({
	reason: z.string().optional(),
});

export const rejectPromotionParamsSchema = z.object({
	id: z.coerce.number().int().positive("Invalid experience ID"),
});

export const rejectPromotionBodySchema = z.object({
	type: z.coerce.number().int().min(1).max(3, "Type must be 1, 2, or 3"),
});

export const leaveExperienceSchema = z.object({
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

export const reviewUniqueUserQuerySchema = z.object({
	keyword: z.string().optional(),
});

export const validToReviewParamsSchema = z.object({
	id: z.coerce.number().int().positive("Invalid user ID"),
});

export const followRequestListQuerySchema = z.object({
	limit: z.coerce.number().int().positive().optional().default(6),
	offset: z.coerce.number().int().optional().default(0),
});

export const companyDashboardQuerySchema = z.object({
	limit: z.coerce.number().int().positive().optional().default(10),
	offset: z.coerce.number().int().optional().default(0),
});

export const companyListQuerySchema = z.object({
	limit: z.coerce.number().int().positive().optional().default(16),
	offset: z.coerce.number().int().optional().default(0),
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
	limit: z.coerce.number().int().positive().optional().default(10),
	offset: z.coerce.number().int().optional().default(0),
});

export const allMessageListQuerySchema = z.object({
	slug: z.string().optional(),
	limit: z.coerce.number().int().positive().optional().default(50),
	offset: z.coerce.number().int().optional().default(0),
});

export const addMessageSchema = z.object({
	send_to: z.coerce.number().int().positive("Receiver ID is required"),
	message: z.string().min(1, "Message is required"),
});

export const chatMessageReadParamsSchema = z.object({
	id: z.coerce.number().int().positive("Invalid message ID"),
});

export const followDataListQuerySchema = z.object({
	limit: z.coerce.number().int().positive().optional().default(50),
	offset: z.coerce.number().int().optional().default(0),
});

export const claimCompanySchema = z.object({
	email: z.string().email().optional(),
	phone: z.string().optional(),
	contact_person: z.string().optional(),
	website: z.string().optional(),
	company: z.string().optional(),
	message: z.string().optional(),
}).refine(data => data.email || data.phone, {
	message: "Email or phone is required",
});

export const revokeDeleteAccountSchema = z.object({
	company_id: z.coerce.number().int().optional(),
});

// Combined schemas for routes that need both params and body
export const rejectEmploymentCombinedSchema = z.object({
	params: rejectEmploymentParamsSchema,
	body: rejectEmploymentBodySchema,
});

export const rejectPromotionCombinedSchema = z.object({
	params: rejectPromotionParamsSchema,
	body: rejectPromotionBodySchema,
});

export const addEmployeeUpdateCombinedSchema = z.object({
	params: employeeDetailParamsSchema,
	body: addEmployeeSchema,
});

export type AddEmployeeBody = z.infer<typeof addEmployeeSchema>;
export type EmployeeDetailParams = z.infer<typeof employeeDetailParamsSchema>;
export type RejectEmploymentParams = z.infer<typeof rejectEmploymentParamsSchema>;
export type RejectEmploymentBody = z.infer<typeof rejectEmploymentBodySchema>;
export type RejectPromotionParams = z.infer<typeof rejectPromotionParamsSchema>;
export type RejectPromotionBody = z.infer<typeof rejectPromotionBodySchema>;
export type LeaveExperienceBody = z.infer<typeof leaveExperienceSchema>;
export type ReviewUniqueUserQuery = z.infer<typeof reviewUniqueUserQuerySchema>;
export type ValidToReviewParams = z.infer<typeof validToReviewParamsSchema>;
export type FollowRequestListQuery = z.infer<typeof followRequestListQuerySchema>;
export type CompanyDashboardQuery = z.infer<typeof companyDashboardQuerySchema>;
export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;
export type InviteCompanyBody = z.infer<typeof inviteCompanyBodySchema>;
export type EmploymentRequestQuery = z.infer<typeof employmentRequestQuerySchema>;
export type AllMessageListQuery = z.infer<typeof allMessageListQuerySchema>;
export type AddMessageBody = z.infer<typeof addMessageSchema>;
export type ChatMessageReadParams = z.infer<typeof chatMessageReadParamsSchema>;
export type FollowDataListQuery = z.infer<typeof followDataListQuerySchema>;
export type ClaimCompanyBody = z.infer<typeof claimCompanySchema>;
export type RevokeDeleteAccountBody = z.infer<typeof revokeDeleteAccountSchema>;
export type RejectEmploymentCombined = z.infer<typeof rejectEmploymentCombinedSchema>;
export type RejectPromotionCombined = z.infer<typeof rejectPromotionCombinedSchema>;
export type AddEmployeeUpdateCombined = z.infer<typeof addEmployeeUpdateCombinedSchema>;
