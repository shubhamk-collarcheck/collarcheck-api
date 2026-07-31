import { z } from "zod";

/**
 * POST /employee/save-exploring — only field is exploring_details (hide-list ids).
 * Accepts array, form exploring_details[], or JSON string. Empty → null in service.
 */
const exploringDetailsField = z.preprocess((val) => {
	if (val === undefined || val === null || val === "") return undefined;
	if (Array.isArray(val)) return val;
	if (typeof val === "string") {
		try {
			const parsed = JSON.parse(val);
			if (Array.isArray(parsed)) return parsed;
		} catch {
			/* fall through */
		}
		// single id or comma-separated
		if (val.includes(",")) {
			return val.split(",").map((s) => s.trim()).filter(Boolean);
		}
		return [val];
	}
	return [val];
}, z.array(z.coerce.number().int()).optional());

export const markViewedParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive(),
	}),
});

/** PHP IndividualApi::save_exploring — body key exploring_details only (not exploring_option / notice_*). */
export const saveExploringBodySchema = z.preprocess((raw) => {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
	const body = raw as Record<string, unknown>;
	// form-urlencoded may use exploring_details[] as the key
	if (body.exploring_details === undefined && body["exploring_details[]"] !== undefined) {
		return { ...body, exploring_details: body["exploring_details[]"] };
	}
	return body;
}, z.object({
	exploring_details: exploringDetailsField,
}));

/** validateData wraps { params, query, body } — body fields must nest under `body`. */
export const saveExploringSchema = z.object({
	body: saveExploringBodySchema.optional().default({}),
});

export const allCompanyQuerySchema = z.object({
	query: z.object({
		search: z.string().optional(),
		limit: z.coerce.number().int().positive().optional(),
		offset: z.coerce.number().int().nonnegative().optional(),
		page: z.coerce.number().int().nonnegative().optional(),
		total: z.coerce.number().int().optional(),
	}),
});

export const editProfileBodySchema = z.object({
	fname: z.string().optional(),
	lname: z.string().optional(),
	dob: z.string().optional(),
	gender: z.string().optional(),
	phone: z.string().optional(),
	second_phone: z.string().optional(),
	profile_description: z.string().optional(),
	country: z.coerce.number().int().optional(),
	state: z.coerce.number().int().optional(),
	city: z.coerce.number().int().optional(),
	present_address: z.string().optional(),
	permanent_address: z.string().optional(),
	same_address: z.coerce.number().int().optional(),
	accomodation: z.string().optional(),
	work_status: z.coerce.number().int().optional(),
	current_possition: z.coerce.number().int().optional(),
	current_company: z.coerce.number().int().optional(),
	industry: z.coerce.number().int().optional(),
	notice_period: z.coerce.number().int().optional(),
	notice_date: z.string().optional(),
	on_explore: z.coerce.number().int().optional(),
	on_immediate: z.coerce.number().int().optional(),
	on_notice: z.coerce.number().int().optional(),
	linkdin: z.string().optional(),
	youtube: z.string().optional(),
	instagram: z.string().optional(),
	facebook: z.string().optional(),
	twitter: z.string().optional(),
});

export const editProfileSchema = z.object({
	body: editProfileBodySchema,
});

export type MarkViewedParams = z.infer<typeof markViewedParamsSchema>["params"];
export type SaveExploringBody = z.infer<typeof saveExploringBodySchema>;
export type SaveExploringRequest = z.infer<typeof saveExploringSchema>;
export type AllCompanyQuery = z.infer<typeof allCompanyQuerySchema>["query"];
export type EditProfileBody = z.infer<typeof editProfileBodySchema>;
