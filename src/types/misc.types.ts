import { z } from "zod";

export const markViewedParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export const saveExploringSchema = z.object({
	exploring_option: z.string().optional(),
	on_immediate: z.coerce.number().int().optional(),
	on_notice: z.coerce.number().int().optional(),
	notice_period: z.coerce.number().int().optional(),
	notice_date: z.string().optional(),
	expected_salary: z.string().optional(),
	expected_inhand: z.string().optional(),
	expected_mode: z.string().optional(),
	notice_type: z.string().optional(),
	notice_employments: z.array(z.coerce.number().int()).optional(),
});

export const allCompanyQuerySchema = z.object({
	search: z.string().optional(),
	limit: z.coerce.number().int().positive().optional(),
	offset: z.coerce.number().int().nonnegative().optional(),
	page: z.coerce.number().int().nonnegative().optional(),
	total: z.coerce.number().int().optional(),
});

export const editProfileSchema = z.object({
	fname: z.string().optional(),
	lname: z.string().optional(),
	dob: z.string().optional(),
	gender: z.string().optional(),
	phone: z.string().optional(),
	second_phone: z.string().optional(),
	profile_description: z.string().optional(),
	country: z.coerce.number().int().optional(),
	state: z.coerce.number().int().optional(),
	city: z.coerce.number().int().optional(),
	present_address: z.string().optional(),
	permanent_address: z.string().optional(),
	same_address: z.coerce.number().int().optional(),
	accomodation: z.string().optional(),
	work_status: z.coerce.number().int().optional(),
	current_possition: z.coerce.number().int().optional(),
	current_company: z.coerce.number().int().optional(),
	industry: z.coerce.number().int().optional(),
	notice_period: z.coerce.number().int().optional(),
	notice_date: z.string().optional(),
	on_explore: z.coerce.number().int().optional(),
	on_immediate: z.coerce.number().int().optional(),
	on_notice: z.coerce.number().int().optional(),
	linkdin: z.string().optional(),
	youtube: z.string().optional(),
	instagram: z.string().optional(),
	facebook: z.string().optional(),
	twitter: z.string().optional(),
});

export type MarkViewedParams = z.infer<typeof markViewedParamsSchema>;
export type SaveExploringBody = z.infer<typeof saveExploringSchema>;
export type AllCompanyQuery = z.infer<typeof allCompanyQuerySchema>;
export type EditProfileBody = z.infer<typeof editProfileSchema>;
