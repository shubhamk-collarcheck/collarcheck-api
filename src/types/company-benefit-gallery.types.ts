import { z } from "zod";

export const addBenefitSchema = z.object({
	benefit_id: z.string().min(1, "benefit_id is required"),
	sortOrder: z.string().optional(),
	description: z.string().optional(),
});

export const benefitIdParamsSchema = z.object({
	id: z.coerce.number().int().positive("Invalid benefit ID"),
});

export const addGallerySchema = z.object({
	title: z.union([z.string(), z.array(z.string())]).optional(),
});

export const galleryIdParamsSchema = z.object({
	id: z.coerce.number().int().positive("Invalid gallery ID"),
});

// Combined schema for addBenafit/:id route (params + body)
export const addBenefitUpdateSchema = z.object({
	params: benefitIdParamsSchema,
	body: addBenefitSchema,
});

export type AddBenefitBody = z.infer<typeof addBenefitSchema>;
export type BenefitIdParams = z.infer<typeof benefitIdParamsSchema>;
export type AddBenefitUpdateCombined = z.infer<typeof addBenefitUpdateSchema>;
export type AddGalleryBody = z.infer<typeof addGallerySchema>;
export type GalleryIdParams = z.infer<typeof galleryIdParamsSchema>;
