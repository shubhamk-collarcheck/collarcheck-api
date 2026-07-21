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

// ---------------------------------------------------------------------------
// Edit user profile — POST /edit-user?type=1
//
//   query.type  → which section (1=basic, 2=address, 3=employment, 4=social)
//   body        → form fields only (fname, city, …) — never includes type
// ---------------------------------------------------------------------------

export const EditUserType = {
	BASIC: 1,
	ADDRESS: 2,
	EMPLOYMENT: 3,
	SOCIAL: 4,
} as const;

export type EditUserTypeCode = (typeof EditUserType)[keyof typeof EditUserType];

export const EDIT_USER_TYPE_LABEL = {
	[EditUserType.BASIC]: "basic",
	[EditUserType.ADDRESS]: "address",
	[EditUserType.EMPLOYMENT]: "employment",
	[EditUserType.SOCIAL]: "social",
} as const;

const formBoolean = z.preprocess((value) => {
	if (value === "TRUE" || value === "true" || value === true || value === "1" || value === 1) {
		return true;
	}
	return false;
}, z.boolean().default(false));

/** ?type=1 → EditUserType.BASIC, etc. */
export const editUserTypeQuerySchema = z.preprocess(
	(value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
	z.union([
		z.literal(EditUserType.BASIC),
		z.literal(EditUserType.ADDRESS),
		z.literal(EditUserType.EMPLOYMENT),
		z.literal(EditUserType.SOCIAL),
	]),
);

// Form-data body schemas (type is NOT here — it comes from query only)

export const editUserBasicBodySchema = z.object({
	fname: z.string().trim().min(1, "First name is required"),
	lname: z.string().optional(),
	dob: z.string().min(1, "Date of birth is required"),
	gender: z.preprocess((v) => (v == null ? v : String(v)), z.string().min(1, "Gender is required")),
	display_type: z.string().optional(),
	profile_description: z.string().optional(),
});

export const editUserAddressBodySchema = z.object({
	city: idOrText,
	state: z.string().min(1, "State is required"),
	accomodation: z.string().optional(),
	present_address: z.string().optional(),
	same_address: formBoolean,
	permanent_address: z.string().optional(),
	country: z.string().optional(),
});

export const editUserEmploymentBodySchema = z.object({
	work_status: idOrText.optional(),
	current_position: idOrText.optional(),
	current_company: idOrText.optional(),
	expected_salary: z.string().optional(),
	expected_mode: z.string().optional(),
	expected_inhand: z.string().optional(),
	on_immediate: formBoolean,
	notice_period: z.string().optional(),
	on_notice: formBoolean,
	notice_date: z.string().optional(),
	on_explore: formBoolean,
	exploring_option: z.array(z.string()).optional(),
	noticeEmployments: z.string().optional(),
});

export const editUserSocialBodySchema = z.object({
	linkdin: z.string().optional(),
	youtube: z.string().optional(),
	instagram: z.string().optional(),
	facebook: z.string().optional(),
	twitter: z.string().optional(),
});

const bodySchemaByType = {
	[EditUserType.BASIC]: editUserBasicBodySchema,
	[EditUserType.ADDRESS]: editUserAddressBodySchema,
	[EditUserType.EMPLOYMENT]: editUserEmploymentBodySchema,
	[EditUserType.SOCIAL]: editUserSocialBodySchema,
} as const;

/**
 * POST /edit-user?type=N
 * validated shape:
 *   { query: { type: 1|2|3|4 }, body: { …section fields only } }
 */
export const editUserRequestSchema = z
	.object({
		query: z.object({
			type: editUserTypeQuerySchema,
		}),
		body: z.any().default({}),
	})
	.superRefine((data, ctx) => {
		const type = data.query.type as EditUserTypeCode;
		const bodyResult = bodySchemaByType[type].safeParse(data.body ?? {});
		if (!bodyResult.success) {
			for (const issue of bodyResult.error.issues) {
				ctx.addIssue({
					...issue,
					path: ["body", ...issue.path],
				});
			}
		}
	})
	.transform((data) => {
		const type = data.query.type as EditUserTypeCode;
		return {
			query: { type },
			body: bodySchemaByType[type].parse(data.body ?? {}) as EditUserBody,
		};
	});

export type EditUserBasic = z.infer<typeof editUserBasicBodySchema>;
export type EditUserAddress = z.infer<typeof editUserAddressBodySchema>;
export type EditUserEmployment = z.infer<typeof editUserEmploymentBodySchema>;
export type EditUserSocial = z.infer<typeof editUserSocialBodySchema>;
export type EditUserBody = EditUserBasic | EditUserAddress | EditUserEmployment | EditUserSocial;

/** @deprecated aliases */
export type EditUserWorkStatus = EditUserEmployment;
export type EditUserSocialLinks = EditUserSocial;
export type EditUserPayload = EditUserBody;
export const editUserBasicSchema = editUserBasicBodySchema;
export const editUserAddressSchema = editUserAddressBodySchema;
export const editUserEmploymentSchema = editUserEmploymentBodySchema;
export const editUserWorkStatusSchema = editUserEmploymentBodySchema;
export const editUserSocialSchema = editUserSocialBodySchema;
export const editUserSocialLinksSchema = editUserSocialBodySchema;

export type ReviewRequestBody = z.infer<typeof reviewBodySchema>;
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type ReviewUpdateRequest = z.infer<typeof reviewUpdateRequestSchema>;
export type ReviewRemoveDocumentQuery = z.infer<typeof reviewRemoveDocumentQuerySchema>;
export type ShowHomeReviewRequest = z.infer<typeof showHomeReviewRequestSchema>;
export type ChangeEmploymentBasicBody = z.infer<typeof changeEmploymentBasicBodySchema>;
export type ChangeEmploymentBasicRequest = z.infer<typeof changeEmploymentBasicRequestSchema>;
export type EditUserRequest = z.infer<typeof editUserRequestSchema>;
