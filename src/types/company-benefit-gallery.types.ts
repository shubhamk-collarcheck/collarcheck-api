import { z } from "zod";

/** validateData always parses { params, query, body }. Nest fields under the right key. */

/**
 * FE sends multipart/form-data: benefit_id (required), optional sortOrder, description.
 * Also accept benefitId / sort_order aliases from alternate clients.
 */
function normalizeAddBenefitBody(raw: unknown): Record<string, unknown> {
	const body: Record<string, unknown> =
		raw != null && typeof raw === "object" && !Array.isArray(raw)
			? { ...(raw as Record<string, unknown>) }
			: {};

	// aliases
	if ((body.benefit_id == null || body.benefit_id === "") && body.benefitId != null) {
		body.benefit_id = body.benefitId;
	}
	if ((body.sortOrder == null || body.sortOrder === "") && body.sort_order != null) {
		body.sortOrder = body.sort_order;
	}

	return body;
}

/** benefit_id: numeric id or free-text name (auto-create). Form always sends strings. */
export const addBenefitBodySchema = z.object({
	benefit_id: z.preprocess(
		(v) => {
			if (v == null || v === "") return undefined;
			// form-data / JSON number both OK
			return String(v).trim();
		},
		z.string().min(1, "Id is required."),
	),
	sortOrder: z.preprocess(
		(v) => (v == null || v === "" ? undefined : String(v)),
		z.string().optional(),
	),
	description: z.preprocess(
		(v) => (v == null || v === "" ? undefined : String(v)),
		z.string().optional(),
	),
});

/** body may be undefined before form parsers run — coerce to {} + fold aliases */
const bodyObject = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((v) => normalizeAddBenefitBody(v), schema);

export const addBenefitSchema = z.object({ body: bodyObject(addBenefitBodySchema) });

export const benefitIdParamsInnerSchema = z.object({
	id: z.coerce.number().int().positive("Invalid benefit ID"),
});
export const benefitIdParamsSchema = z.object({
	params: benefitIdParamsInnerSchema,
});

export const addGalleryBodySchema = z.object({
	title: z
		.preprocess((v) => {
			if (v == null || v === "") return undefined;
			// form-data may send title as string or title[0], title[1]
			if (Array.isArray(v)) return v.map(String);
			return String(v);
		}, z.union([z.string(), z.array(z.string())]).optional()),
});
export const addGallerySchema = z.object({ body: bodyObject(addGalleryBodySchema) });

export const galleryIdParamsInnerSchema = z.object({
	id: z.coerce.number().int().positive("Invalid gallery ID"),
});
export const galleryIdParamsSchema = z.object({
	params: galleryIdParamsInnerSchema,
});

// Combined schema for addBenafit/:id route (params + body)
export const addBenefitUpdateSchema = z.object({
	params: benefitIdParamsInnerSchema,
	body: bodyObject(addBenefitBodySchema),
});

// Combined schema for addGallery/:id route (params + body)
export const addGalleryUpdateSchema = z.object({
	params: galleryIdParamsInnerSchema,
	body: bodyObject(addGalleryBodySchema),
});

export type AddBenefitBody = z.infer<typeof addBenefitBodySchema>;
export type BenefitIdParams = z.infer<typeof benefitIdParamsInnerSchema>;
export type AddBenefitUpdateCombined = z.infer<typeof addBenefitUpdateSchema>;
export type AddGalleryBody = z.infer<typeof addGalleryBodySchema>;
export type GalleryIdParams = z.infer<typeof galleryIdParamsInnerSchema>;
export type AddGalleryUpdateCombined = z.infer<typeof addGalleryUpdateSchema>;
