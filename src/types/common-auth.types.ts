import { z } from "zod";

export const sendUserProfileViewRequestSchema = z.object({
	userid: z.coerce.number().int().positive("User Id is required"),
});

export const authUserProfileParamsSchema = z.object({
	slug: z.string().min(1),
});

export const peopleListQuerySchema = z.object({
	user_id: z.coerce.number().int().positive().optional(),
});

export type SendUserProfileViewRequestBody = z.infer<typeof sendUserProfileViewRequestSchema>;
export type AuthUserProfileParams = z.infer<typeof authUserProfileParamsSchema>;
export type PeopleListQuery = z.infer<typeof peopleListQuerySchema>;
