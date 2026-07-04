import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cybSkill } from "../../drizzle/schema";

export type Skill = InferSelectModel<typeof cybSkill>;
export type NewSkill = InferInsertModel<typeof cybSkill>;
