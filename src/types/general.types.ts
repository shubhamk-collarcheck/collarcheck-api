import { z } from "zod";

export const allJobQuerySchema = z.object({
	query: z.object({
		keyword: z.string().optional(),
		state: z.coerce.number().optional(),
		designation: z.coerce.number().optional(),
		department: z.coerce.number().optional(),
		industry: z.coerce.number().optional(),
		employment_type: z.coerce.number().optional(),
		skill: z.coerce.number().optional(),
		company: z.coerce.number().optional(),
		urgent: z.coerce.number().optional(),
		vacancy: z.coerce.number().optional(),
		job_mode: z.coerce.number().optional(),
		experience: z.coerce.number().optional(),
		role_type: z.coerce.number().optional(),
		job_description: z.string().optional(),
		posted_date: z.coerce.number().optional(),
		closing_date: z.string().optional(),
		starRating: z.coerce.number().optional(),
		yearExperience: z.coerce.number().optional(),
		id_not_in: z.coerce.number().optional(),
		job_slug: z.string().optional(),
		limit: z.coerce.number().optional(),
		offset: z.coerce.number().optional(),
	}),
});

export const jobFilterDataListQuerySchema = z.object({
	query: z.object({
		slug: z.string().optional(),
		type: z.enum(["jobs", "companies"]).optional(),
	}),
});

export const globalSearchQuerySchema = z.object({
	query: z.object({
		keyword: z.string().optional(),
		type: z.enum(["companies", "employees", "jobs"]).optional(),
		limit: z.coerce.number().optional(),
		offset: z.coerce.number().optional(),
		state: z.coerce.number().optional(),
		designation: z.coerce.number().optional(),
		department: z.coerce.number().optional(),
		industry: z.coerce.number().optional(),
		skill: z.coerce.number().optional(),
		company: z.coerce.number().optional(),
		job_mode: z.coerce.number().optional(),
		experience: z.coerce.number().optional(),
		role_type: z.coerce.number().optional(),
	}),
});

export const searchSuggestionParamsSchema = z.object({
	params: z.object({
		usertype: z.string(),
		keyword: z.string(),
	}),
});

export const ratingFilterQuerySchema = z.object({
	query: z.object({
		employment: z.coerce.number(),
		order: z.coerce.number().optional(),
	}),
});

export const starRatingParamsSchema = z.object({
	params: z.object({
		star: z.coerce.number().int().min(1).max(5),
	}),
});

export const inviteDetailParamsSchema = z.object({
	params: z.object({
		token: z.string(),
	}),
});

export const addSuggestionSchema = z.object({
	body: z.object({
		name: z.string().min(1, "Name is required"),
		phone: z.string().min(1, "Phone is required"),
		description: z.string().min(1, "Description is required"),
	}),
});

export const userProfileParamsSchema = z.object({
	params: z.object({
		slug: z.string().min(1),
	}),
});

export const cityQuerySchema = z.object({
	query: z.object({
		state: z.coerce.number().optional(),
	}),
});

export const cityByIdParamsSchema = z.object({
	params: z.object({
		stateId: z.coerce.number().int().positive(),
	}),
});

export const stateQuerySchema = z.object({
	query: z.object({
		country: z.coerce.number().optional(),
	}),
});

export const periodListQuerySchema = z.object({
	query: z.object({
		type: z.string().optional(),
	}),
});

export const jobDetailQuerySchema = z.object({
	params: z.object({
		slug: z.string().min(1),
	}),
	query: z.object({
		userId: z.coerce.number().optional(),
		status: z.string().optional(),
		companyview: z.union([z.boolean(), z.string()]).optional(),
	}),
});

// ====== Verify Auth Token (Endpoint #1) ======

// No additional schema needed - auth middleware handles validation

// ====== Doc List (Endpoint #2) ======

export const docListParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid page number"),
	}),
});

// ====== All Notification (Endpoint #4) ======

// No schema needed - uses authenticated user ID

// ====== Verification Status (Endpoint #5) ======

// No schema needed - uses authenticated user ID

// ====== Follow Data List (Endpoint #6) ======

// No schema needed - uses authenticated user ID

// ====== Save Document (Endpoint #8) ======

export const saveDocumentSchema = z.object({
	body: z.object({
		id: z.coerce.number().int().positive().nullable().optional(),
		title: z.string().min(1, "Title is required").optional(),
		description: z.string().optional(),
		type: z.string().optional(),
		docnumber: z.string().optional(),
		file_url: z.string().url().optional(),
	}),
});

// ====== Chat Message Read (Endpoint #12) ======

export const chatMessageReadIdParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid message ID"),
	}),
});

// ====== Remove Notification by ID (Endpoints #13, #15) ======

export const removeNotificationBodySchema = z.object({
	body: z.object({
		id: z.coerce.number().int().positive("Invalid notification ID"),
	}),
});

export const removeNotificationParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid notification ID"),
	}),
});

// ====== Unfollow (Endpoint #16) ======

export const unfollowParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid user ID"),
	}),
});

// ====== Remove Follower (Endpoint #17) ======

export const removeFollowerParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive("Invalid user ID"),
	}),
});

// ====== Multi Unfollow (Endpoint #18) ======

export const multiUnfollowSchema = z.object({
	body: z.object({
		user_ids: z.array(z.coerce.number().int().positive()).min(1, "At least one user ID is required"),
	}),
});

// ====== Multi Remove Follower (Endpoint #19) ======

export const multiRemoveFollowerSchema = z.object({
	body: z.object({
		user_ids: z.array(z.coerce.number().int().positive()).min(1, "At least one user ID is required"),
	}),
});

// ====== Logout (Endpoint #7) ======

export const logoutSchema = z.object({
	body: z.object({
		refresh_token: z.string().optional(),
	}),
});

export type AllJobQuery = z.infer<typeof allJobQuerySchema>;
export type JobFilterDataListQuery = z.infer<typeof jobFilterDataListQuerySchema>;
export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;
export type SearchSuggestionParams = z.infer<typeof searchSuggestionParamsSchema>;
export type RatingFilterQuery = z.infer<typeof ratingFilterQuerySchema>;
export type StarRatingParams = z.infer<typeof starRatingParamsSchema>;
export type InviteDetailParams = z.infer<typeof inviteDetailParamsSchema>;
export type AddSuggestionBody = z.infer<typeof addSuggestionSchema>;
export type UserProfileParams = z.infer<typeof userProfileParamsSchema>;
export type CityQuery = z.infer<typeof cityQuerySchema>;
export type CityByIdParams = z.infer<typeof cityByIdParamsSchema>;
export type StateQuery = z.infer<typeof stateQuerySchema>;
export type PeriodListQuery = z.infer<typeof periodListQuerySchema>;
export type JobDetailQuery = z.infer<typeof jobDetailQuerySchema>;
export type DocListParams = z.infer<typeof docListParamsSchema>;
export type SaveDocumentBody = z.infer<typeof saveDocumentSchema>;
export type ChatMessageReadIdParams = z.infer<typeof chatMessageReadIdParamsSchema>;
export type RemoveNotificationBody = z.infer<typeof removeNotificationBodySchema>;
export type RemoveNotificationParams = z.infer<typeof removeNotificationParamsSchema>;
export type UnfollowParams = z.infer<typeof unfollowParamsSchema>;
export type RemoveFollowerParams = z.infer<typeof removeFollowerParamsSchema>;
export type MultiUnfollowBody = z.infer<typeof multiUnfollowSchema>;
export type MultiRemoveFollowerBody = z.infer<typeof multiRemoveFollowerSchema>;
export type LogoutBody = z.infer<typeof logoutSchema>;

// ====== Update Phone (Endpoint #9) ======

export const updatePhoneSchema = z.object({
	body: z.object({
		phone: z.string().min(1, "Phone number is required"),
		country_code: z.string().optional(),
	}),
});

// ====== Update Email (Endpoint #10) ======

export const updateEmailSchema = z.object({
	body: z.object({
		email: z.string().email("Valid email is required"),
	}),
});

export type UpdatePhoneBody = z.infer<typeof updatePhoneSchema>;
export type UpdateEmailBody = z.infer<typeof updateEmailSchema>;
