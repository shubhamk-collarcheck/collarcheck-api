import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cybUser } from "../db/schema";

export type User = InferSelectModel<typeof cybUser>;
export type NewUser = InferInsertModel<typeof cybUser>;
