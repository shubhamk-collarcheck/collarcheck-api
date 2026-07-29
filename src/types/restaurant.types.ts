import { z } from "zod";

// ── send-otp ──────────────────────────────────────────────────────────────
export const restaurantSendOtpBodySchema = z.object({
	phone: z
		.string({ error: "Phone number is required" })
		.trim()
		.min(10, "Phone number must be at least 10 digits")
		.max(15, "Phone number cannot exceed 15 digits"),
	"g-recaptcha-response": z.string().optional().nullable(),
});

export const restaurantSendOtpSchema = z.object({
	body: restaurantSendOtpBodySchema,
});
export type RestaurantSendOtpBody = z.infer<typeof restaurantSendOtpBodySchema>;
export type RestaurantSendOtpRequest = z.infer<typeof restaurantSendOtpSchema>;

// ── verify-otp ────────────────────────────────────────────────────────────
export const restaurantVerifyOtpBodySchema = z.object({
	phone: z
		.string({ error: "Phone number is required" })
		.trim()
		.min(10, "Phone number is required")
		.max(13, "Phone number cannot exceed 13 digits"),
	otp: z
		.string({ error: "OTP is required" })
		.trim()
		.regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});

export const restaurantVerifyOtpSchema = z.object({
	body: restaurantVerifyOtpBodySchema,
});
export type RestaurantVerifyOtpBody = z.infer<typeof restaurantVerifyOtpBodySchema>;
export type RestaurantVerifyOtpRequest = z.infer<typeof restaurantVerifyOtpSchema>;

// ── update-profile ────────────────────────────────────────────────────────
export const restaurantUpdateProfileBodySchema = z.object({
	name: z.string({ error: "The Name field is required" }).trim().min(1, "The Name field is required"),
	shortDescription: z
		.string({ error: "The Description field is required" })
		.trim()
		.min(1, "The Description field is required"),
	google_map: z.string().optional().nullable(),
	address: z.string().optional().nullable(),
});

export const restaurantUpdateProfileSchema = z.object({
	body: restaurantUpdateProfileBodySchema,
});
export type RestaurantUpdateProfileBody = z.infer<typeof restaurantUpdateProfileBodySchema>;
export type RestaurantUpdateProfileRequest = z.infer<typeof restaurantUpdateProfileSchema>;

// ── add-customer-visits ───────────────────────────────────────────────────
export const restaurantAddVisitBodySchema = z.object({
	customer_id: z
		.string({ error: "The Customer Id field is required." })
		.trim()
		.min(1, "The Customer Id field is required."),
	group_size: z.coerce
		.number({ error: "The Group Size field is required." })
		.int()
		.positive("The Group Size field must contain a number greater than 0."),
	bill_before_amount: z
		.union([z.string(), z.number()])
		.refine((v) => v !== "" && v !== null && v !== undefined, {
			message: "The Bill before amount field is required.",
		}),
	discount: z.coerce
		.number({ error: "The Discount field is required." })
		.min(0, "The Discount field must contain a number greater than or equal to 0.")
		.max(100, "The Discount field must contain a number less than or equal to 100."),
	bill_after_amount: z
		.union([z.string(), z.number()])
		.refine((v) => v !== "" && v !== null && v !== undefined, {
			message: "The Bill after amount field is required.",
		}),
	visit_date: z.string().optional().nullable(),
});

export const restaurantAddVisitSchema = z.object({
	body: restaurantAddVisitBodySchema,
});
export type RestaurantAddVisitBody = z.infer<typeof restaurantAddVisitBodySchema>;
export type RestaurantAddVisitRequest = z.infer<typeof restaurantAddVisitSchema>;

// ── customer-search ───────────────────────────────────────────────────────
export const restaurantCustomerSearchQuerySchema = z.object({
	keyword: z.string().optional().default(""),
	limit: z.coerce.number().int().positive().optional().default(30),
	/** Page number (not SQL offset): page <= 1 → 0, else page * limit - limit */
	offset: z.coerce.number().int().min(0).optional().default(0),
});

export const restaurantCustomerSearchSchema = z.object({
	query: restaurantCustomerSearchQuerySchema,
});
export type RestaurantCustomerSearchQuery = z.infer<typeof restaurantCustomerSearchQuerySchema>;
export type RestaurantCustomerSearchRequest = z.infer<typeof restaurantCustomerSearchSchema>;

// ── customer-discount/:id ─────────────────────────────────────────────────
export const restaurantCustomerDiscountParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export const restaurantCustomerDiscountSchema = z.object({
	params: restaurantCustomerDiscountParamsSchema,
});
export type RestaurantCustomerDiscountParams = z.infer<typeof restaurantCustomerDiscountParamsSchema>;
export type RestaurantCustomerDiscountRequest = z.infer<typeof restaurantCustomerDiscountSchema>;
