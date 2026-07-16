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

export type AllJobQuery = z.infer<typeof allJobQuerySchema>;
export type JobFilterDataListQuery = z.infer<typeof jobFilterDataListQuerySchema>;
export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;
export type SearchSuggestionParams = z.infer<typeof searchSuggestionParamsSchema>;
export type RatingFilterQuery = z.infer<typeof ratingFilterQuerySchema>;
export type StarRatingParams = z.infer<typeof starRatingParamsSchema>;
export type InviteDetailParams = z.infer<typeof inviteDetailParamsSchema>;
export type AddSuggestionBody = z.infer<typeof addSuggestionSchema>;
export type UserProfileParams = z.infer<typeof userProfileParamsSchema>;
