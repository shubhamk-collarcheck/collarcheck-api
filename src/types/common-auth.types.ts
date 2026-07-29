import { z } from "zod";

/** validateData always parses { params, query, body }. Nest fields under the right key. */

export const sendUserProfileViewRequestSchema = z.object({
	body: z.object({
		userid: z.coerce.number().int().positive("User Id is required"),
	}),
});

export const authUserProfileParamsSchema = z.object({
	params: z.object({
		slug: z.string().min(1),
	}),
});

export const peopleListQuerySchema = z.object({
	query: z.object({
		user_id: z.coerce.number().int().positive().optional(),
	}),
});

export type SendUserProfileViewRequestBody = z.infer<typeof sendUserProfileViewRequestSchema>["body"];
export type AuthUserProfileParams = z.infer<typeof authUserProfileParamsSchema>["params"];
export type PeopleListQuery = z.infer<typeof peopleListQuerySchema>["query"];
