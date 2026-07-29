import { z } from "zod";

/** validateData always parses { params, query, body }. Nest fields under the right key. */

export const addBenefitBodySchema = z.object({
	benefit_id: z.string().min(1, "benefit_id is required"),
	sortOrder: z.string().optional(),
	description: z.string().optional(),
});
export const addBenefitSchema = z.object({ body: addBenefitBodySchema });

export const benefitIdParamsInnerSchema = z.object({
	id: z.coerce.number().int().positive("Invalid benefit ID"),
});
export const benefitIdParamsSchema = z.object({
	params: benefitIdParamsInnerSchema,
});

export const addGalleryBodySchema = z.object({
	title: z.union([z.string(), z.array(z.string())]).optional(),
});
export const addGallerySchema = z.object({ body: addGalleryBodySchema });

export const galleryIdParamsInnerSchema = z.object({
	id: z.coerce.number().int().positive("Invalid gallery ID"),
});
export const galleryIdParamsSchema = z.object({
	params: galleryIdParamsInnerSchema,
});

// Combined schema for addBenafit/:id route (params + body)
export const addBenefitUpdateSchema = z.object({
	params: benefitIdParamsInnerSchema,
	body: addBenefitBodySchema,
});

// Combined schema for addGallery/:id route (params + body)
export const addGalleryUpdateSchema = z.object({
	params: galleryIdParamsInnerSchema,
	body: addGalleryBodySchema,
});

export type AddBenefitBody = z.infer<typeof addBenefitBodySchema>;
export type BenefitIdParams = z.infer<typeof benefitIdParamsInnerSchema>;
export type AddBenefitUpdateCombined = z.infer<typeof addBenefitUpdateSchema>;
export type AddGalleryBody = z.infer<typeof addGalleryBodySchema>;
export type GalleryIdParams = z.infer<typeof galleryIdParamsInnerSchema>;
export type AddGalleryUpdateCombined = z.infer<typeof addGalleryUpdateSchema>;
