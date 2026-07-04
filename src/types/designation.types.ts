import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cybDesignation } from "../../drizzle/schema";

export type Designation = InferSelectModel<typeof cybDesignation>;
export type NewDesignation = InferInsertModel<typeof cybDesignation>;
