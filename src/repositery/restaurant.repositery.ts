import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import db from "../db";
import {
	cybCities,
	cybCustomerVisits,
	cybDesignation,
	cybIndustries,
	cybOtp,
	cybRestaurantCategory,
	cybRestaurantCustomers,
	cybRestaurants,
	cybState,
	cybUser,
	cybUserDomains,
	cybUserExperience,
	cybUserExperienceRating,
} from "../db/schema";

type Restaurant = InferSelectModel<typeof cybRestaurants>;
type NewRestaurant = InferInsertModel<typeof cybRestaurants>;
type CustomerVisit = InferSelectModel<typeof cybCustomerVisits>;
type NewCustomerVisit = InferInsertModel<typeof cybCustomerVisits>;
type RestaurantCustomer = InferSelectModel<typeof cybRestaurantCustomers>;

function nowSql() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

class restaurantRepositery {
	// ── restaurants ───────────────────────────────────────────────────────

	async findActiveById(id: number): Promise<Restaurant | undefined> {
		const [row] = await db
			.select()
			.from(cybRestaurants)
			.where(
				and(
					eq(cybRestaurants.id, id),
					eq(cybRestaurants.status, 1),
					eq(cybRestaurants.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findByIdNotDeleted(id: number): Promise<Restaurant | undefined> {
		const [row] = await db
			.select()
			.from(cybRestaurants)
			.where(and(eq(cybRestaurants.id, id), eq(cybRestaurants.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async findByPhone(phone: string): Promise<Restaurant | undefined> {
		const [row] = await db
			.select()
			.from(cybRestaurants)
			.where(and(eq(cybRestaurants.phone, phone), eq(cybRestaurants.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async updateToken(id: number, token: string): Promise<void> {
		await db
			.update(cybRestaurants)
			.set({ token, modifyDate: nowSql() })
			.where(eq(cybRestaurants.id, id));
	}

	async updateProfile(
		id: number,
		data: Partial<
			Pick<
				NewRestaurant,
				"name" | "shortDescription" | "googleMap" | "address" | "profile" | "banner"
			>
		>
	): Promise<boolean> {
		const existing = await this.findByIdNotDeleted(id);
		if (!existing) return false;
		await db
			.update(cybRestaurants)
			.set({ ...data, modifyDate: nowSql() })
			.where(eq(cybRestaurants.id, id));
		return true;
	}

	async getRestaurantsList() {
		return db
			.select({
				id: cybRestaurants.id,
				name: cybRestaurants.name,
				email: cybRestaurants.email,
				phone: cybRestaurants.phone,
				password: cybRestaurants.password,
				token: cybRestaurants.token,
				profile: cybRestaurants.profile,
				address: cybRestaurants.address,
				banner: cybRestaurants.banner,
				shortDescription: cybRestaurants.shortDescription,
				categoryName: cybRestaurantCategory.name,
				createDate: cybRestaurants.createDate,
				discount: cybRestaurants.discount,
				googleMap: cybRestaurants.googleMap,
			})
			.from(cybRestaurants)
			.leftJoin(
				cybRestaurantCategory,
				eq(cybRestaurants.category, cybRestaurantCategory.id)
			)
			.where(
				and(eq(cybRestaurants.isDeleted, 0), eq(cybRestaurantCategory.isDeleted, 0))
			);
	}

	// ── OTP ───────────────────────────────────────────────────────────────

	async findOtpByPhone(phone: string) {
		const [row] = await db
			.select()
			.from(cybOtp)
			.where(and(eq(cybOtp.phone, phone), eq(cybOtp.isDeleted, 0)))
			.orderBy(desc(cybOtp.id))
			.limit(1);
		return row;
	}

	async upsertOtp(phone: string, otp: string, expiry: string) {
		const existing = await this.findOtpByPhone(phone);
		const now = nowSql();
		if (existing) {
			await db
				.update(cybOtp)
				.set({ otp, status: 1, expiry, createDate: now, isDeleted: 0 })
				.where(eq(cybOtp.id, existing.id));
			return existing.id;
		}
		const [{ id }] = await db
			.insert(cybOtp)
			.values({
				phone,
				otp,
				expiry,
				status: 1,
				isDeleted: 0,
				type: "LOGIN",
				createDate: now,
			})
			.$returningId();
		return id;
	}

	async deleteOtpsByPhone(phone: string) {
		await db
			.update(cybOtp)
			.set({ isDeleted: 1 })
			.where(and(eq(cybOtp.phone, phone), eq(cybOtp.isDeleted, 0)));
	}

	// ── users / levels ────────────────────────────────────────────────────

	async findUserById(userId: number) {
		const [row] = await db
			.select({ id: cybUser.id })
			.from(cybUser)
			.where(and(eq(cybUser.id, userId), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async findUserByIndividualId(individualId: string) {
		const [row] = await db
			.select({ id: cybUser.id, individualId: cybUser.individualId })
			.from(cybUser)
			.where(eq(cybUser.individualId, individualId))
			.limit(1);
		return row;
	}

	/** Current employments used for reward level (still_working=1, status=1). */
	async getLevelWithExperience(userId: number) {
		const companyUser = alias(cybUser, "company_user");
		return db
			.select({
				id: cybUserExperience.id,
				user: cybUserExperience.user,
				company: cybUserExperience.company,
				workEmail: cybUserExperience.workEmail,
				salary: cybUserExperience.salary,
				approved: cybUserExperience.approved,
			})
			.from(cybUserExperience)
			.innerJoin(companyUser, eq(companyUser.id, cybUserExperience.company))
			.where(
				and(
					eq(cybUserExperience.user, userId),
					eq(cybUserExperience.isDeleted, 0),
					eq(cybUserExperience.status, 1),
					eq(cybUserExperience.stillWorking, 1)
				)
			);
	}

	async getExperienceForVerification(experienceId: number) {
		const [row] = await db
			.select({
				id: cybUserExperience.id,
				user: cybUserExperience.user,
				company: cybUserExperience.company,
				workEmail: cybUserExperience.workEmail,
				salary: cybUserExperience.salary,
				approved: cybUserExperience.approved,
			})
			.from(cybUserExperience)
			.where(and(eq(cybUserExperience.id, experienceId), eq(cybUserExperience.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async getCompanyVerifiedDomains(companyId: number) {
		return db
			.select({
				userId: cybUserDomains.userId,
				domain: cybUserDomains.domain,
				email: cybUserDomains.email,
				isVerified: cybUserDomains.isVerified,
			})
			.from(cybUserDomains)
			.where(
				and(
					eq(cybUserDomains.userId, companyId),
					eq(cybUserDomains.isVerified, 1),
					eq(cybUserDomains.isDeleted, 0)
				)
			);
	}

	async countCompanyVerifiedDomainOrEmail(companyId: number) {
		const [row] = await db
			.select({ count: sql<number>`count(*)` })
			.from(cybUserDomains)
			.where(
				and(
					eq(cybUserDomains.userId, companyId),
					eq(cybUserDomains.isVerified, 1),
					eq(cybUserDomains.isDeleted, 0),
					sql`((${cybUserDomains.domain} IS NOT NULL AND ${cybUserDomains.domain} != '') OR (${cybUserDomains.email} IS NOT NULL AND ${cybUserDomains.email} != ''))`
				)
			);
		return Number(row?.count ?? 0);
	}

	async hasApprovedExperienceReview(experienceId: number) {
		const [row] = await db
			.select({ id: cybUserExperienceRating.id })
			.from(cybUserExperienceRating)
			.where(
				and(
					eq(cybUserExperienceRating.experience, experienceId),
					eq(cybUserExperienceRating.approved, 1),
					eq(cybUserExperienceRating.isDeleted, 0)
				)
			)
			.limit(1);
		return !!row;
	}

	async getExperienceDetail(experienceId: number) {
		const companyUser = alias(cybUser, "company");
		const employeeUser = alias(cybUser, "employee");
		const [row] = await db
			.select({
				id: cybUserExperience.id,
				user: cybUserExperience.user,
				company: cybUserExperience.company,
				workEmail: cybUserExperience.workEmail,
				workEmailDate: cybUserExperience.workEmailDate,
				joiningDate: cybUserExperience.joiningDate,
				workedTillDate: cybUserExperience.workedTillDate,
				approved: cybUserExperience.approved,
				stillWorking: cybUserExperience.stillWorking,
				status: cybUserExperience.status,
				companyName: companyUser.fname,
				companyProfile: companyUser.profile,
				companySocialImage: companyUser.socialImage,
				claimStatus: companyUser.claimStatus,
				companySlug: companyUser.slug,
				userSlug: employeeUser.slug,
			})
			.from(cybUserExperience)
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.leftJoin(employeeUser, eq(cybUserExperience.user, employeeUser.id))
			.where(eq(cybUserExperience.id, experienceId))
			.limit(1);
		return row;
	}

	// ── visits ────────────────────────────────────────────────────────────

	async insertCustomerVisit(data: Partial<NewCustomerVisit>): Promise<number | null> {
		const [{ id }] = await db
			.insert(cybCustomerVisits)
			.values({
				restaurantId: data.restaurantId ?? null,
				customerId: data.customerId ?? null,
				visitDate: data.visitDate ?? null,
				groupSize: data.groupSize ?? null,
				billBeforeAmount: data.billBeforeAmount != null ? String(data.billBeforeAmount) : null,
				discount: data.discount != null ? String(data.discount) : null,
				billAfterAmount: data.billAfterAmount != null ? String(data.billAfterAmount) : null,
				isDeleted: 0,
				createDate: data.createDate ?? nowSql(),
			})
			.$returningId();
		return id ?? null;
	}

	async findRestaurantCustomer(restaurantId: number, customerId: string) {
		const [row] = await db
			.select()
			.from(cybRestaurantCustomers)
			.where(
				and(
					eq(cybRestaurantCustomers.restaurantId, restaurantId),
					eq(cybRestaurantCustomers.customerId, customerId),
					eq(cybRestaurantCustomers.isDeleted, 0)
				)
			)
			.limit(1);
		return row as RestaurantCustomer | undefined;
	}

	async insertRestaurantCustomer(data: {
		restaurantId: number;
		customerId: string;
		visitDate: string;
	}) {
		const now = nowSql();
		await db.insert(cybRestaurantCustomers).values({
			restaurantId: data.restaurantId,
			customerId: data.customerId,
			firstVisitDate: data.visitDate,
			lastVisitDate: data.visitDate,
			totalVisits: 1,
			isDeleted: 0,
			createDate: now,
			modifyDate: now,
		});
	}

	async updateRestaurantCustomer(
		id: number,
		data: { lastVisitDate: string; totalVisits: number }
	) {
		await db
			.update(cybRestaurantCustomers)
			.set({
				lastVisitDate: data.lastVisitDate,
				totalVisits: data.totalVisits,
				modifyDate: nowSql(),
			})
			.where(eq(cybRestaurantCustomers.id, id));
	}

	async getCustomerVisitsList(restaurantId: number) {
		return db
			.select({
				id: cybCustomerVisits.id,
				restaurantId: cybCustomerVisits.restaurantId,
				customerId: cybCustomerVisits.customerId,
				customerName: cybUser.fullName,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				visitDate: cybCustomerVisits.visitDate,
				groupSize: cybCustomerVisits.groupSize,
				billBeforeAmount: cybCustomerVisits.billBeforeAmount,
				discount: cybCustomerVisits.discount,
				billAfterAmount: cybCustomerVisits.billAfterAmount,
			})
			.from(cybCustomerVisits)
			.leftJoin(cybUser, eq(cybCustomerVisits.customerId, cybUser.individualId))
			.where(
				and(
					eq(cybCustomerVisits.restaurantId, restaurantId),
					eq(cybCustomerVisits.isDeleted, 0),
					eq(cybUser.isDeleted, 0)
				)
			)
			.orderBy(desc(cybCustomerVisits.id));
	}

	async getCustomerSearch(filter: { keyword: string; limit: number; offset: number }) {
		const companyUser = alias(cybUser, "cmp");
		const conditions = [
			eq(cybUser.userType, 1),
			eq(cybUser.isDeleted, 0),
			eq(cybUser.status, 1),
		];

		const keyword = filter.keyword.trim();
		if (keyword) {
			const words = keyword.split(/\s+/).filter(Boolean);
			const likes = [
				like(cybUser.individualId, `%${keyword}%`),
				...words.map((w) => like(cybUser.individualId, `%${w}%`)),
			];
			conditions.push(or(...likes)!);
		}

		return db
			.select({
				id: cybUser.id,
				name: cybUser.fullName,
				profile: cybUser.profile,
				individualId: cybUser.individualId,
				socialImage: cybUser.socialImage,
				onExplore: cybUser.onExplore,
				cityName: cybCities.name,
				stateName: cybState.name,
				industryName: cybIndustries.name,
				designationName: cybDesignation.name,
				companyName: companyUser.fname,
			})
			.from(cybUser)
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.where(and(...conditions))
			.limit(filter.limit)
			.offset(filter.offset);
	}
}

export default new restaurantRepositery();
