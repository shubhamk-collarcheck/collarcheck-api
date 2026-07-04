import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cybDepartment } from "../../drizzle/schema";

export type Department = InferSelectModel<typeof cybDepartment>;
export type NewDepartment = InferInsertModel<typeof cybDepartment>;
