import { z } from "zod";
import { commonIdParamsSchema } from "../utils/validation";

export enum PORTFOLIO_TYPE {
	IMAGE = 1,
	VIDEO = 2,
	URL = 3,
	PDF = 4
}
export const newPortfolioSchema = z.object({
	type: z.number(),
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	youtube: z.string().optional(),
	url: z.string().optional(),
	file: z.unknown().optional(),
}).superRefine((data, ctx) => {
	switch (data.type) {
		case PORTFOLIO_TYPE.IMAGE:
		case PORTFOLIO_TYPE.PDF:
			if (!data.file) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "File is required",
					path: ["file"],
				});
			}
			break;

		case PORTFOLIO_TYPE.VIDEO:
			if (!data.youtube) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Youtube URL is required",
					path: ["youtube"],
				});
			}
			break;

		case PORTFOLIO_TYPE.URL:
			if (!data.url) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "URL is required",
					path: ["url"],
				});
			}
			break;
	}
});

export const portfolioRequestSchema = z.object({
	body: newPortfolioSchema,
});

export const portfolioUpdateRequestSchema = z.object({
	params: commonIdParamsSchema.shape.params,
	body: newPortfolioSchema,
});

export type PortfolioRequestBody = z.infer<typeof newPortfolioSchema>;
export type PortfolioRequest = z.infer<typeof portfolioRequestSchema>;
export type PortfolioUpdateRequest = z.infer<typeof portfolioUpdateRequestSchema>;


