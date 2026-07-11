import { z } from "zod";
import { commonIdParamsSchema } from "../utils/validation";

const idOrText = z.union([
	z.coerce.number()
		.int("ID must be an integer.")
		.positive("ID must be greater than 0."),
	z.string().trim().min(1, "Value cannot be empty."),
]);

// Review schemas

export const reviewBodySchema = z.object({
	experience: z.coerce.number().int().positive("Experience ID is required"),
	rating: z.coerce.number().min(1, "Rating is required").max(5, "Rating must be between 1 and 5"),
	review: z.string().trim().min(1, "Review is required"),
	link: z.string().optional(),
});

export const reviewRequestSchema = z.object({
	body: reviewBodySchema,
});

export const reviewUpdateRequestSchema = z.object({
	params: commonIdParamsSchema.shape.params,
	body: reviewBodySchema,
});

// Review remove document query params
export const reviewRemoveDocumentQuerySchema = z.object({
	query: z.object({
		ratingId: z.coerce.number().int().positive("Rating ID is required"),
		link: z.string().min(1, "Link is required"),
	}),
});

// Show home review toggle
export const showHomeReviewRequestSchema = z.object({
	params: commonIdParamsSchema.shape.params,
});

// Change employment basic schemas
export const changeEmploymentBasicBodySchema = z.object({
	experience_id: z.coerce.number().int().positive("Experience ID is required"),
	type: z.coerce.number().int().min(1).max(3, "Type must be 1, 2, or 3"),
	salary: z.string().optional(),
	salary_inhand: z.string().optional(),
	salary_mode: z.string().optional(),
	designation: idOrText.optional(),
	worked_till_date: z.string().optional(),
	lastReview: z.preprocess(
		(value) => {
			if (value === "TRUE" || value === "true" || value === true || value === "1") return true;
			return false;
		},
		z.boolean().default(false)
	),
});

export const changeEmploymentBasicRequestSchema = z.object({
	body: changeEmploymentBasicBodySchema,
});

// Edit user profile schemas
export const editUserBasicSchema = z.object({
	type: z.literal(1),
	fname: z.string().trim().min(1, "First name is required"),
	lname: z.string().optional(),
	dob: z.string().min(1, "Date of birth is required"),
	gender: z.string().min(1, "Gender is required"),
	display_type: z.string().optional(),
	profile_description: z.string().optional(),
});

export const editUserAddressSchema = z.object({
	type: z.literal(2),
	city: idOrText,
	state: z.string().min(1, "State is required"),
	accomodation: z.string().optional(),
	present_address: z.string().optional(),
	same_address: z.preprocess(
		(value) => {
			if (value === "TRUE" || value === "true" || value === true || value === "1") return true;
			return false;
		},
		z.boolean().default(false)
	),
	permanent_address: z.string().optional(),
	country: z.string().optional(),
});

export const editUserWorkStatusSchema = z.object({
	type: z.literal(3),
	work_status: idOrText.optional(),
	current_position: idOrText.optional(),
	current_company: idOrText.optional(),
	expected_salary: z.string().optional(),
	expected_mode: z.string().optional(),
	expected_inhand: z.string().optional(),
	on_immediate: z.preprocess(
		(value) => {
			if (value === "TRUE" || value === "true" || value === true || value === "1") return true;
			return false;
		},
		z.boolean().default(false)
	),
	notice_period: z.string().optional(),
	on_notice: z.preprocess(
		(value) => {
			if (value === "TRUE" || value === "true" || value === true || value === "1") return true;
			return false;
		},
		z.boolean().default(false)
	),
	notice_date: z.string().optional(),
	on_explore: z.preprocess(
		(value) => {
			if (value === "TRUE" || value === "true" || value === true || value === "1") return true;
			return false;
		},
		z.boolean().default(false)
	),
	exploring_option: z.array(z.string()).optional(),
	noticeEmployments: z.string().optional(),
});

export const editUserSocialLinksSchema = z.object({
	type: z.literal(4),
	linkdin: z.string().optional(),
	youtube: z.string().optional(),
	instagram: z.string().optional(),
	facebook: z.string().optional(),
	twitter: z.string().optional(),
});

export const editUserRequestSchema = z.object({
	body: z.union([
		editUserBasicSchema,
		editUserAddressSchema,
		editUserWorkStatusSchema,
		editUserSocialLinksSchema,
	]),
});

export type ReviewRequestBody = z.infer<typeof reviewBodySchema>;
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ReviewUpdateRequest = z.infer<typeof reviewUpdateRequestSchema>;
export type ReviewRemoveDocumentQuery = z.infer<typeof reviewRemoveDocumentQuerySchema>;
export type ShowHomeReviewRequest = z.infer<typeof showHomeReviewRequestSchema>;
export type ChangeEmploymentBasicBody = z.infer<typeof changeEmploymentBasicBodySchema>;
export type ChangeEmploymentBasicRequest = z.infer<typeof changeEmploymentBasicRequestSchema>;
export type EditUserRequest = z.infer<typeof editUserRequestSchema>;
export type EditUserBasic = z.infer<typeof editUserBasicSchema>;
export type EditUserAddress = z.infer<typeof editUserAddressSchema>;
export type EditUserWorkStatus = z.infer<typeof editUserWorkStatusSchema>;
export type EditUserSocialLinks = z.infer<typeof editUserSocialLinksSchema>;
