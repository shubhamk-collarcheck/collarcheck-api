import { z } from "zod";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cybSkill, cybUserSkill } from "../db/schema";

const idOrText = z.union([
	z.coerce.number()
		.int("ID must be an integer.")
		.positive("ID must be greater than 0."),
	z.string().trim().min(1, "Value cannot be empty."),
]);

export const skillBodySchema = z.object({
	skill: idOrText,
	rating: z.coerce.number().int().min(1).max(5),
});

export const skillRequestSchema = z.object({
	body: skillBodySchema,
});

export type SkillBody = z.infer<typeof skillBodySchema>
export type Skill = InferSelectModel<typeof cybSkill>;
export type NewSkill = InferInsertModel<typeof cybSkill>;
export type UserSkill = InferSelectModel<typeof cybUserSkill>
export type NewUserSkill = InferInsertModel<typeof cybUserSkill>
