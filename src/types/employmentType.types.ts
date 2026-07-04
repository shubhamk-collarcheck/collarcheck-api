import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cybEmployementType } from "../../drizzle/schema";

export type EmploymentType = InferSelectModel<typeof cybEmployementType>;
export type NewEmploymentType = InferInsertModel<typeof cybEmployementType>;
