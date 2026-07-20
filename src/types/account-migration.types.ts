import { z } from "zod";

const optionalString = z
	.union([z.string(), z.number()])
	.optional()
	.transform((v) => (v === undefined || v === null ? undefined : String(v).trim()));

export const createUserGroupBodySchema = z.object({
	group_name: z.union([z.string().trim().min(1), z.coerce.number()]),
	event_permission: z.preprocess((val) => {
		if (val === undefined || val === null || val === "") return [];
		if (Array.isArray(val)) return val;
		if (typeof val === "string") {
			try {
				const p = JSON.parse(val);
				if (Array.isArray(p)) return p;
			} catch {
				/* comma list */
			}
			return val.split(",").map((s) => s.trim()).filter(Boolean);
		}
		return [val];
	}, z.array(z.coerce.number().int().positive())),
});
export const createUserGroupSchema = z.object({
	params: z.object({ id: z.coerce.number().int().positive().optional() }).optional(),
	body: createUserGroupBodySchema,
});
export type CreateUserGroupBody = z.infer<typeof createUserGroupBodySchema>;

export const assignPermissionBodySchema = z.object({
	user_id: z.coerce.number().int().positive(),
	group_id: z.coerce.number().int().positive(),
});
export const assignPermissionSchema = z.object({
	params: z.object({ id: z.coerce.number().int().positive().optional() }).optional(),
	body: assignPermissionBodySchema,
});
export type AssignPermissionBody = z.infer<typeof assignPermissionBodySchema>;

export const paginationQuerySchema = z.object({
	query: z.object({
		limit: z.coerce.number().int().positive().optional().default(50),
		offset: z.coerce.number().int().min(0).optional().default(0),
		company: z.coerce.number().int().positive().optional(),
	}),
});

export const removePermissionBodySchema = z.object({
	permission_id: z.preprocess((val) => {
		if (Array.isArray(val)) return val;
		if (typeof val === "string") {
			try {
				const p = JSON.parse(val);
				if (Array.isArray(p)) return p;
			} catch {
				/* */
			}
			return val.split(",").map((s) => s.trim()).filter(Boolean);
		}
		return val ? [val] : [];
	}, z.array(z.coerce.number().int().positive()).min(1)),
});
export const removePermissionSchema = z.object({ body: removePermissionBodySchema });

export const removeGroupRoleBodySchema = z.object({
	user_group_id: z.preprocess((val) => {
		if (Array.isArray(val)) return val;
		if (typeof val === "string") {
			try {
				const p = JSON.parse(val);
				if (Array.isArray(p)) return p;
			} catch {
				/* */
			}
			return val.split(",").map((s) => s.trim()).filter(Boolean);
		}
		return val ? [val] : [];
	}, z.array(z.coerce.number().int().positive()).min(1)),
});
export const removeGroupRoleSchema = z.object({ body: removeGroupRoleBodySchema });

export const idParamsSchema = z.object({
	params: z.object({ id: z.coerce.number().int().positive() }),
});

export const sendOtpMergeBodySchema = z.object({
	phone: z.string().trim().min(10).optional(),
	email: optionalString,
	skipAssociate: z.preprocess((v) => {
		if (v === true || v === "true" || v === "1" || v === 1) return true;
		return false;
	}, z.boolean().default(false)),
});
export const sendOtpMergeSchema = z.object({ body: sendOtpMergeBodySchema });
export type SendOtpMergeBody = z.infer<typeof sendOtpMergeBodySchema>;

export const verifyOtpMergeBodySchema = z.object({
	phone: z.string().trim().min(8).max(15),
	otp: z.string().trim().min(4).max(6),
	skipAssociate: z.preprocess((v) => {
		if (v === true || v === "true" || v === "1" || v === 1) return true;
		return false;
	}, z.boolean().default(false)),
});
export const verifyOtpMergeSchema = z.object({ body: verifyOtpMergeBodySchema });
export type VerifyOtpMergeBody = z.infer<typeof verifyOtpMergeBodySchema>;

export const mergeUserRegisterBodySchema = z.object({
	phone: z.string().trim().min(10),
	email: optionalString,
	name: optionalString,
	fname: optionalString,
	otp: z.string().trim().optional(),
});
export const mergeUserRegisterSchema = z.object({ body: mergeUserRegisterBodySchema });
export type MergeUserRegisterBody = z.infer<typeof mergeUserRegisterBodySchema>;

export const aiGenerateRowBodySchema = z.object({
	query: z.string().trim().min(1),
	type: z.string().trim().min(1),
	job_title: optionalString,
});
export const aiGenerateRowSchema = z.object({ body: aiGenerateRowBodySchema });
export type AiGenerateRowBody = z.infer<typeof aiGenerateRowBodySchema>;
