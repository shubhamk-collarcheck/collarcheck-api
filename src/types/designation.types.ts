import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cybDesignation } from "../db/schema";

export type Designation = InferSelectModel<typeof cybDesignation>;
export type NewDesignation = InferInsertModel<typeof cybDesignation>;
