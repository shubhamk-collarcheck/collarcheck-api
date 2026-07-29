import jwt from "jsonwebtoken";
import restaurantRepositery from "../repositery/restaurant.repositery";
import companyRepositery from "../repositery/company.repositery";
import { user_verified } from "./users.service";
import { otpSend } from "../utils/msg91";
import { randomInt } from "../utils/helpers";
import type {
	RestaurantAddVisitBody,
	RestaurantCustomerSearchQuery,
	RestaurantSendOtpBody,
	RestaurantUpdateProfileBody,
	RestaurantVerifyOtpBody,
} from "../types/restaurant.types";

const s3Prefix = process.env.S3_PREFIX || "";

function nowStr() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function todayDate() {
	return new Date().toISOString().slice(0, 10);
}

function stripXss(value: string | null | undefined): string {
	if (value == null) return "";
	return String(value)
		.replace(/</g, "")
		.replace(/>/g, "")
		.replace(/"/g, "&quot;")
		.trim();
}

function withS3(path: string | null | undefined): string {
	if (!path) return "";
	return `${s3Prefix}${path}`;
}

function emailDomainOf(email: string): string {
	if (!email || !email.includes("@")) return "";
	return email.split("@").pop()?.toLowerCase().trim() || "";
}

// ── Reward level helpers (PHP general_helper) ─────────────────────────────

async function getVerificationProcessDetails(experienceId: number) {
	const row = await restaurantRepositery.getExperienceForVerification(experienceId);
	if (!row) {
		return { level1: false, level2: false, level3: false, level4: false };
	}

	const email = (row.workEmail || "").toLowerCase().trim();
	const emailDomain = emailDomainOf(email);
	const companyId = row.company || 0;

	const companyVerifyDetails = companyId
		? await restaurantRepositery.getCompanyVerifiedDomains(companyId)
		: [];
	let level1 = false;

	if (companyVerifyDetails.length > 0) {
		let matchFound = false;
		let hasVerified = false;
		for (const val of companyVerifyDetails) {
			if (val.isVerified === 1) hasVerified = true;
			if (val.domain && val.domain.toLowerCase().trim() === emailDomain) {
				matchFound = true;
				break;
			}
			if (val.email && val.email.includes("@")) {
				if (emailDomainOf(val.email) === emailDomain) {
					matchFound = true;
					break;
				}
			}
		}
		if (!hasVerified) {
			if (email) level1 = true;
		} else {
			level1 = matchFound;
		}
	} else if (email) {
		level1 = true;
	}

	let level2 = false;
	if (level1 && companyId) {
		const existDomain = await restaurantRepositery.countCompanyVerifiedDomainOrEmail(companyId);
		level2 = existDomain > 0;
	}

	const level3 = row.approved === 1;
	const level4 = row.approved === 1 && !!row.salary;

	return { level1, level2, level3, level4 };
}

/** Product reward level 0–4 (Bronze → Platinum). */
export async function getUserHighestLevel(userId: number): Promise<number> {
	let finalLevel = 0;

	const userSignUp = await restaurantRepositery.findUserById(userId);
	const userAccountVerify = await user_verified(userId);

	if (userSignUp && userAccountVerify) {
		finalLevel = Math.max(finalLevel, 1); // Bronze
	}

	const employments = await restaurantRepositery.getLevelWithExperience(userId);
	for (const emp of employments) {
		const levels = await getVerificationProcessDetails(emp.id);
		const atLeastOneReview = await restaurantRepositery.hasApprovedExperienceReview(emp.id);

		const hasL1 = levels.level1;
		const hasGold = levels.level3 || levels.level4;

		if (hasL1 && userAccountVerify) {
			finalLevel = Math.max(finalLevel, 2); // Silver
		}
		if (hasGold && userAccountVerify) {
			finalLevel = Math.max(finalLevel, 3); // Gold
		}
		if (hasGold && userAccountVerify && atLeastOneReview) {
			finalLevel = Math.max(finalLevel, 4); // Platinum
		}
	}

	return finalLevel;
}

/** Employment verification ladder + employment_id that achieved the highest step. */
export async function getHighestLevelWithEmployment(userId: number) {
	const employments = await restaurantRepositery.getLevelWithExperience(userId);
	let finalLevel = 0;
	let employmentId = 0;

	for (const value of employments) {
		const levels = await getVerificationProcessDetails(value.id);

		// Mirrors PHP getHighestLevelWithEmployment (including else overwriting to 1).
		if (levels.level4 && finalLevel < 4) {
			finalLevel = 4;
			employmentId = value.id;
		} else if (levels.level3 && finalLevel < 3) {
			finalLevel = 3;
			employmentId = value.id;
		} else if (levels.level2 && finalLevel < 2) {
			finalLevel = 2;
			employmentId = value.id;
		} else if (levels.level1 && finalLevel < 1) {
			finalLevel = 1;
			employmentId = value.id;
		} else {
			finalLevel = 1;
			employmentId = value.id;
		}
	}

	return { level: finalLevel, employment_id: employmentId };
}

async function getHighestLevelExperienceDetails(
	experienceId: number,
	actingUserId: number
): Promise<Record<string, unknown>[]> {
	if (!experienceId) return [];

	const detail = await restaurantRepositery.getExperienceDetail(experienceId);
	if (!detail) return [];

	const reminderCompanyIds = await companyRepositery.userApproveCompanyList(detail.user || 0);
	const companyId = detail.company || 0;
	const isVerified = companyId ? await user_verified(companyId) : false;
	const addedBy = companyId
		? await companyRepositery.checkInvitationSend(companyId, actingUserId)
		: false;

	return [
		{
			id: detail.id,
			company_logo: detail.companyProfile
				? withS3(detail.companyProfile)
				: detail.companySocialImage || "",
			company: detail.companyName,
			company_id: detail.company,
			work_email: detail.workEmail,
			work_email_date: detail.workEmailDate,
			is_verified: isVerified,
			joining_date: detail.joiningDate,
			worked_till_date: detail.workedTillDate || "",
			claim_status: detail.claimStatus ? 1 : 0,
			added_by: addedBy,
			approved: detail.approved,
			still_working: detail.stillWorking,
			status: detail.status,
			company_slug: detail.companySlug,
			user_slug: detail.userSlug,
			sendReminder: reminderCompanyIds.has(companyId),
		},
	];
}

function userNextLevel(userMaxLevel: number): number {
	if (userMaxLevel === 0) return 1;
	if (userMaxLevel === 1) return 2;
	if (userMaxLevel === 2) return 3;
	if (userMaxLevel === 3) return 4;
	if (userMaxLevel === 4) return 0;
	return 0;
}

function computeDiscount(maxDiscount: number, level: number, round = false): number {
	const perLevel = maxDiscount / 4;
	const final = perLevel * level;
	return round ? Math.round(final * 100) / 100 : final;
}

// ── 1. restaurant-list ────────────────────────────────────────────────────

export async function restaurantListService(actingUserId: number) {
	try {
		const restaurants = await restaurantRepositery.getRestaurantsList();
		const userMaxLevel = await getUserHighestLevel(actingUserId);

		const restaurantRows = restaurants.map((r) => {
			const maxDiscount = r.discount ? parseFloat(String(r.discount)) : 0;
			const discount = Number.isFinite(maxDiscount)
				? computeDiscount(maxDiscount, userMaxLevel, false)
				: 0;

			return {
				id: r.id,
				name: r.name,
				email: r.email,
				phone: r.phone,
				profile: withS3(r.profile),
				address: r.address,
				google_map: r.googleMap,
				max_discount: r.discount,
				discount,
				banner: withS3(r.banner),
				shortDescription: r.shortDescription,
				category_name: r.categoryName,
				create_date: r.createDate,
			};
		});

		const userLevelData = await getHighestLevelWithEmployment(actingUserId);
		const currentEmployment = await getHighestLevelExperienceDetails(
			userLevelData.employment_id,
			actingUserId
		);

		return {
			status: true,
			data: {
				restaurants: restaurantRows,
				current_employment: currentEmployment,
				user_max_level: userMaxLevel,
				user_next_level: userNextLevel(userMaxLevel),
			},
		};
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : "Something went wrong";
		return { status: false, message };
	}
}

// ── 2. send-otp ───────────────────────────────────────────────────────────

async function verifyRecaptcha(captcha: string | null | undefined): Promise<boolean> {
	const secretKey = process.env.RESTAURANT_CAPTCHA_SECRET_KEY;
	if (!secretKey) return false;
	if (!captcha) return false;

	try {
		const url = new URL("https://www.google.com/recaptcha/api/siteverify");
		url.searchParams.set("secret", secretKey);
		url.searchParams.set("response", captcha);

		const res = await fetch(url.toString(), { method: "GET" });
		const data = (await res.json()) as { success?: boolean };
		return data?.success === true;
	} catch {
		return false;
	}
}

export async function restaurantSendOtpService(body: RestaurantSendOtpBody) {
	const phone = body.phone.trim();

	const captchaOk = await verifyRecaptcha(body["g-recaptcha-response"]);
	if (!captchaOk) {
		return { status: false, message: "Captcha verification failed" };
	}

	const restaurant = await restaurantRepositery.findByPhone(phone);
	if (!restaurant) {
		return { status: false, messages: "Phone not registered with us!" };
	}

	const otp = String(randomInt(100000, 999999));
	const expiry = String(Math.floor(Date.now() / 1000) + 10 * 60);

	await restaurantRepositery.upsertOtp(phone, otp, expiry);
	const sent = await otpSend(phone, otp);

	if (sent) {
		return {
			status: true,
			message: "The OTP has been successfully delivered to your registered phone number.",
		};
	}
	return { status: false, message: "Something went wrong, try again." };
}

// ── 3. verify-otp ─────────────────────────────────────────────────────────

function generateRestaurantJwt(restaurantId: number): string {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error("JWT secret is not defined");
	return jwt.sign({ uid: restaurantId }, secret, { expiresIn: "30d" });
}

export async function restaurantVerifyOtpService(body: RestaurantVerifyOtpBody) {
	const phone = body.phone.trim();
	const otp = body.otp.trim();

	const checkdetail = await restaurantRepositery.findOtpByPhone(phone);
	if (!checkdetail) {
		return { status: false, messages: "invalid phone no." };
	}

	const currentTime = Math.floor(Date.now() / 1000);
	const expiry = Number(checkdetail.expiry);
	if (Number.isNaN(expiry) || expiry < currentTime) {
		return { status: false, messages: "Otp Expired !" };
	}

	if (String(checkdetail.otp) !== otp) {
		return { status: false, messages: "Invalid OTP!" };
	}

	const restaurant = await restaurantRepositery.findByPhone(phone);
	if (!restaurant) {
		return { status: false, message: "User not found" };
	}

	const token = generateRestaurantJwt(restaurant.id);
	await restaurantRepositery.updateToken(restaurant.id, token);
	await restaurantRepositery.deleteOtpsByPhone(phone);

	return {
		status: true,
		message: "OTP verified successfully",
		data: {
			id: restaurant.id,
			name: restaurant.name,
			email: restaurant.email,
			phone: restaurant.phone,
			token,
			profile: withS3(restaurant.profile),
			address: restaurant.address,
			level: [],
			banner: withS3(restaurant.banner),
			shortDescription: restaurant.shortDescription,
			category: restaurant.category,
			status: restaurant.status,
		},
	};
}

// ── 4. testauth ───────────────────────────────────────────────────────────
// handled in controller (plain text)

// ── 5. profile-details ────────────────────────────────────────────────────

export async function restaurantProfileDetailsService(restaurantId: number) {
	try {
		if (!restaurantId) {
			return { status: false, message: "Restaurant id required!" };
		}

		const restaurant = await restaurantRepositery.findByIdNotDeleted(restaurantId);
		const arr: Record<string, unknown> = restaurant
			? {
					id: restaurant.id,
					name: restaurant.name,
					email: restaurant.email,
					phone: restaurant.phone,
					token: restaurant.token,
					profile: withS3(restaurant.profile),
					address: restaurant.address,
					google_map: restaurant.googleMap,
					discount: restaurant.discount,
					banner: withS3(restaurant.banner),
					shortDescription: restaurant.shortDescription,
					category: restaurant.category,
					create_date: restaurant.createDate,
					modify_date: restaurant.modifyDate,
				}
			: {};

		return {
			status: true,
			messages: [arr],
		};
	} catch {
		return { status: false, messages: "Access denied" };
	}
}

// ── 6. update-profile ─────────────────────────────────────────────────────

export async function restaurantUpdateProfileService(
	restaurantId: number,
	body: RestaurantUpdateProfileBody,
	files?: { profile?: Express.MulterS3.File; banner?: Express.MulterS3.File }
) {
	try {
		if (!restaurantId) {
			return { status: false, message: "Restaurant id required!" };
		}

		const save: {
			name: string;
			shortDescription: string;
			googleMap?: string | null;
			address?: string | null;
			profile?: string;
			banner?: string;
		} = {
			name: stripXss(body.name),
			shortDescription: stripXss(body.shortDescription),
			googleMap: body.google_map != null ? stripXss(body.google_map) : null,
			address: body.address ?? null,
		};

		if (files?.profile?.key) {
			save.profile = files.profile.key;
		}
		if (files?.banner?.key) {
			save.banner = files.banner.key;
		}

		const result = await restaurantRepositery.updateProfile(restaurantId, save);
		if (result) {
			return { status: true, messages: "Successfully Updated" };
		}
		return { status: false, messages: "Something Went Wrong!" };
	} catch {
		return { status: false, messages: "Access denied" };
	}
}

// ── 7. add-customer-visits ────────────────────────────────────────────────

export async function restaurantAddCustomerVisitService(
	restaurantId: number,
	body: RestaurantAddVisitBody
) {
	if (!restaurantId) {
		return { status: false, message: "Restaurant ID is required" };
	}

	try {
		const customer_id = body.customer_id.trim();
		const visit_date = body.visit_date?.trim() || todayDate();

		const customerDetail = await restaurantRepositery.findUserByIndividualId(customer_id);
		const internalUserId = customerDetail?.id ?? 0;

		const discountResult = await restaurantCustomerDiscountService(
			restaurantId,
			internalUserId
		);
		const discountValue =
			discountResult.status === true && "discount" in discountResult
				? discountResult.discount
				: 0;

		const insertId = await restaurantRepositery.insertCustomerVisit({
			restaurantId,
			customerId: customer_id,
			visitDate: visit_date,
			groupSize: body.group_size,
			billBeforeAmount: String(body.bill_before_amount),
			discount: String(discountValue),
			billAfterAmount: String(body.bill_after_amount),
			createDate: nowStr(),
		});

		if (!insertId) {
			return { status: false, message: "Failed to add visit" };
		}

		const existing = await restaurantRepositery.findRestaurantCustomer(
			restaurantId,
			customer_id
		);
		if (!existing) {
			await restaurantRepositery.insertRestaurantCustomer({
				restaurantId,
				customerId: customer_id,
				visitDate: visit_date,
			});
		} else {
			await restaurantRepositery.updateRestaurantCustomer(existing.id, {
				lastVisitDate: visit_date,
				totalVisits: (existing.totalVisits || 0) + 1,
			});
		}

		return { status: true, message: "Customer visit added successfully" };
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : "Something went wrong";
		return { status: false, message };
	}
}

// ── 8. customer-visits ────────────────────────────────────────────────────

export async function restaurantGetCustomerVisitsService(restaurantId: number) {
	if (!restaurantId) {
		return { status: false, message: "Restaurant ID is required" };
	}

	try {
		const rows = await restaurantRepositery.getCustomerVisitsList(restaurantId);
		const finalResult = rows.map((value) => ({
			id: value.id,
			customer_id: value.customerId,
			customer_name: value.customerName ?? "",
			profile: value.profile ? withS3(value.profile) : value.socialImage || "",
			visit_date: value.visitDate,
			group_size: value.groupSize,
			bill_before_amount: value.billBeforeAmount,
			discount: value.discount,
			bill_after_amount: value.billAfterAmount,
		}));

		if (finalResult.length > 0) {
			return { status: true, data: finalResult };
		}
		return { status: false, message: "No customer visits found" };
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : "Something went wrong";
		return { status: false, message };
	}
}

// ── 9. customer-search ────────────────────────────────────────────────────

export async function restaurantCustomerSearchService(query: RestaurantCustomerSearchQuery) {
	const limit = query.limit;
	const page = query.offset;
	const sqlOffset = page <= 1 ? 0 : page * limit - limit;
	const keyword = (query.keyword || "").trim();

	const result = await restaurantRepositery.getCustomerSearch({
		keyword,
		limit,
		offset: sqlOffset,
	});

	const list = await Promise.all(
		result.map(async (val) => ({
			id: val.id,
			name: val.name,
			profile: val.profile ? withS3(val.profile) : val.socialImage || "",
			individual_id: val.individualId,
			designation_name: val.designationName,
			company_name: val.companyName,
			is_verified: await user_verified(val.id),
		}))
	);

	return { status: true, data: list };
}

// ── 10. customer-discount ─────────────────────────────────────────────────

export async function restaurantCustomerDiscountService(
	restaurantId: number,
	userId: number
) {
	if (!restaurantId) {
		return { status: false, message: "Restaurant ID is required" };
	}

	const finalLevel = userId ? await getUserHighestLevel(userId) : 0;

	const restaurant = await restaurantRepositery.findActiveById(restaurantId);
	const discountRestaurant = restaurant?.discount
		? parseFloat(String(restaurant.discount))
		: 0;
	const base = Number.isFinite(discountRestaurant) ? discountRestaurant : 0;
	const finalDiscount = computeDiscount(base, finalLevel, true);

	return {
		status: true as const,
		user_max_level: finalLevel,
		discount: finalDiscount,
	};
}
