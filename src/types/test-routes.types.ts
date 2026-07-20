import { z } from "zod";

const optionalString = z
	.union([z.string(), z.number()])
	.optional()
	.transform((v) => (v === undefined || v === null ? undefined : String(v).trim()));

// POST /resume-download — keep templete_id typo for clients
export const resumeDownloadBodySchema = z.object({
	templete_id: z.coerce.number().int().positive("The Templete id field is required."),
});
export const resumeDownloadSchema = z.object({ body: resumeDownloadBodySchema });
export type ResumeDownloadBody = z.infer<typeof resumeDownloadBodySchema>;

// POST /update-notice
export const updateNoticeBodySchema = z
	.object({
		on_notice: z.preprocess((v) => {
			if (v === true || v === "true" || v === "1" || v === 1) return 1;
			if (v === false || v === "false" || v === "0" || v === 0) return 0;
			return Number(v);
		}, z.union([z.literal(0), z.literal(1)])),
		notice_date: optionalString,
		notice_employments: z.preprocess((val) => {
			if (val === undefined || val === null || val === "") return undefined;
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
			return [val];
		}, z.array(z.coerce.number().int().positive()).optional()),
	})
	.superRefine((data, ctx) => {
		if (data.on_notice === 1) {
			if (!data.notice_date) {
				ctx.addIssue({
					code: "custom",
					message: "The Notice date field is required.",
					path: ["notice_date"],
				});
			}
			if (!data.notice_employments?.length) {
				ctx.addIssue({
					code: "custom",
					message: "The Notice employments field is required.",
					path: ["notice_employments"],
				});
			}
		}
	});
export const updateNoticeSchema = z.object({ body: updateNoticeBodySchema });
export type UpdateNoticeBody = z.infer<typeof updateNoticeBodySchema>;

// POST /save-epfo
export const saveEpfoBodySchema = z.object({
	form_type: z.coerce.number().int().min(1).max(5),
}).passthrough();
export type SaveEpfoBody = z.infer<typeof saveEpfoBodySchema> & Record<string, any>;

// GET /resume-details
export const resumeDetailsQuerySchema = z.object({
	query: z.object({
		id: z.coerce.number().int().positive().optional(),
	}),
});
