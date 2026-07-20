import { and, asc, eq, like, or, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import db from "../db";
import {
	cybSetting,
	cybReportReviews,
	cybUserExperienceRating,
	cybDeleteOptions,
	cybAccountDeleteRequests,
	cybUser,
	cybFollow,
	cybManualDocumentVerify,
	cybFaqs,
	cybUserExperience,
	cybApplication,
	cybCompanyJob,
	cybDesignation,
	cybDepartment,
	cybCities,
	cybState,
	cybIndustries,
	cybBenefits,
} from "../db/schema";

function nowSql() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

class NewRoutesRepositery {
	async getWebSettings(): Promise<Record<string, string>> {
		const rows = await db
			.select({
				key: cybSetting.key,
				value: cybSetting.value,
				code: cybSetting.code,
			})
			.from(cybSetting)
			.where(eq(cybSetting.status, 1));
		const map: Record<string, string> = {};
		for (const row of rows) {
			const k = row.key || row.code;
			if (k && row.value != null) map[k] = String(row.value);
		}
		return map;
	}

	// ---- report review ----
	async findActiveReview(reviewId: number) {
		const [row] = await db
			.select({ id: cybUserExperienceRating.id })
			.from(cybUserExperienceRating)
			.where(
				and(
					eq(cybUserExperienceRating.id, reviewId),
					eq(cybUserExperienceRating.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findExistingReport(userId: number, reviewId: number) {
		const [row] = await db
			.select({ id: cybReportReviews.id })
			.from(cybReportReviews)
			.where(
				and(
					eq(cybReportReviews.userId, userId),
					eq(cybReportReviews.reviewId, reviewId),
					eq(cybReportReviews.isDeleted, 0),
					eq(cybReportReviews.status, 1)
				)
			)
			.limit(1);
		return row;
	}

	async insertReport(data: {
		userId: number;
		reviewId: number;
		message?: string | null;
	}) {
		return db.insert(cybReportReviews).values({
			userId: data.userId,
			reviewId: data.reviewId,
			message: data.message ?? null,
			createDate: nowSql(),
			status: 1,
			isDeleted: 0,
		});
	}

	// ---- delete options / account delete ----
	async listDeleteOptions() {
		return db
			.select({
				id: cybDeleteOptions.id,
				title: cybDeleteOptions.title,
			})
			.from(cybDeleteOptions)
			.where(
				and(eq(cybDeleteOptions.status, 1), eq(cybDeleteOptions.isDeleted, 0))
			);
	}

	async findDeleteOption(optionId: number) {
		const [row] = await db
			.select({ id: cybDeleteOptions.id })
			.from(cybDeleteOptions)
			.where(
				and(
					eq(cybDeleteOptions.id, optionId),
					eq(cybDeleteOptions.status, 1),
					eq(cybDeleteOptions.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findOpenDeleteRequest(userId: number, optionId: number) {
		const [row] = await db
			.select({ id: cybAccountDeleteRequests.id })
			.from(cybAccountDeleteRequests)
			.where(
				and(
					eq(cybAccountDeleteRequests.userId, userId),
					eq(cybAccountDeleteRequests.optionId, optionId),
					eq(cybAccountDeleteRequests.status, 1),
					eq(cybAccountDeleteRequests.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async insertDeleteRequest(data: {
		userId: number;
		optionId: number;
		message?: string | null;
		expiry: string;
	}) {
		return db.insert(cybAccountDeleteRequests).values({
			userId: data.userId,
			optionId: data.optionId,
			message: data.message ?? null,
			expiry: data.expiry,
			createDate: nowSql(),
			status: 1,
			isDeleted: 0,
		});
	}

	// ---- check-ccid ----
	async findByIndividualId(ccid: string) {
		const [row] = await db
			.select({ id: cybUser.id, individualId: cybUser.individualId })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.individualId, ccid),
					eq(cybUser.isDeleted, 0),
					eq(cybUser.status, 1)
				)
			)
			.limit(1);
		return row;
	}

	// ---- follow revoke ----
	async softDeleteFollow(followedId: number, followerId: number) {
		const result = await db
			.update(cybFollow)
			.set({ isDeleted: 1, modifyDate: nowSql() })
			.where(
				and(
					eq(cybFollow.followedId, followedId),
					eq(cybFollow.followerId, followerId),
					eq(cybFollow.isDeleted, 0)
				)
			);
		return result;
	}

	async findFollow(followedId: number, followerId: number) {
		const [row] = await db
			.select({ id: cybFollow.id })
			.from(cybFollow)
			.where(
				and(
					eq(cybFollow.followedId, followedId),
					eq(cybFollow.followerId, followerId),
					eq(cybFollow.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	// ---- manual document verify ----
	async findManualDoc(userId: number) {
		const [row] = await db
			.select()
			.from(cybManualDocumentVerify)
			.where(
				and(
					eq(cybManualDocumentVerify.userId, userId),
					eq(cybManualDocumentVerify.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async insertManualDoc(data: {
		userId: number;
		doctype: number;
		description?: string | null;
		docs: string;
	}) {
		const now = nowSql();
		return db.insert(cybManualDocumentVerify).values({
			userId: data.userId,
			doctype: data.doctype,
			description: data.description ?? null,
			docs: data.docs,
			createDate: now,
			modifyDate: now,
			status: 1,
			isDeleted: 0,
		});
	}

	async updateManualDoc(
		id: number,
		data: { doctype: number; description?: string | null; docs: string }
	) {
		return db
			.update(cybManualDocumentVerify)
			.set({
				doctype: data.doctype,
				description: data.description ?? null,
				docs: data.docs,
				modifyDate: nowSql(),
			})
			.where(eq(cybManualDocumentVerify.id, id));
	}

	// ---- faqs ----
	async listFaqs() {
		return db
			.select({
				question: cybFaqs.question,
				answer: cybFaqs.answer,
				shorted_order: cybFaqs.shortedOrder,
			})
			.from(cybFaqs)
			.where(eq(cybFaqs.status, 1))
			.orderBy(asc(cybFaqs.shortedOrder));
	}

	// ---- hired ----
	async getUserApplications(userId: number) {
		return db
			.select({
				jobId: cybApplication.job,
				createDate: cybApplication.createDate,
				companyId: cybCompanyJob.company,
			})
			.from(cybApplication)
			.leftJoin(cybCompanyJob, eq(cybApplication.job, cybCompanyJob.id))
			.where(
				and(eq(cybApplication.user, userId), eq(cybApplication.isDeleted, 0))
			);
	}

	async getUserEmployments(userId: number) {
		const companyUser = alias(cybUser, "cmp");
		return db
			.select({
				id: cybUserExperience.id,
				user: cybUserExperience.user,
				company: cybUserExperience.company,
				joiningDate: cybUserExperience.joiningDate,
				hired: cybUserExperience.hired,
				designationName: cybDesignation.name,
				companyName: companyUser.fname,
				companyProfile: companyUser.profile,
				companySocial: companyUser.socialImage,
				userFname: cybUser.fname,
				userLname: cybUser.lname,
				userProfile: cybUser.profile,
				userSocial: cybUser.socialImage,
				individualId: cybUser.individualId,
			})
			.from(cybUserExperience)
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.leftJoin(cybUser, eq(cybUserExperience.user, cybUser.id))
			.where(
				and(
					eq(cybUserExperience.user, userId),
					eq(cybUserExperience.isDeleted, 0)
				)
			);
	}

	async getCompanyJobIds(companyId: number) {
		const rows = await db
			.select({ id: cybCompanyJob.id })
			.from(cybCompanyJob)
			.where(
				and(
					eq(cybCompanyJob.company, companyId),
					eq(cybCompanyJob.isDeleted, 0)
				)
			);
		return rows.map((r) => r.id).filter((id): id is number => id != null);
	}

	async getApplicationsForJobs(jobIds: number[]) {
		if (!jobIds.length) return [];
		return db
			.select({
				id: cybApplication.id,
				user: cybApplication.user,
				job: cybApplication.job,
				createDate: cybApplication.createDate,
			})
			.from(cybApplication)
			.where(
				and(
					inArray(cybApplication.job, jobIds),
					eq(cybApplication.isDeleted, 0)
				)
			);
	}

	async getEmploymentsByUserIds(userIds: number[]) {
		if (!userIds.length) return [];
		return db
			.select({
				id: cybUserExperience.id,
				user: cybUserExperience.user,
				company: cybUserExperience.company,
				joiningDate: cybUserExperience.joiningDate,
				hired: cybUserExperience.hired,
				designationName: cybDesignation.name,
			})
			.from(cybUserExperience)
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.where(
				and(
					inArray(cybUserExperience.user, userIds),
					eq(cybUserExperience.isDeleted, 0)
				)
			);
	}

	async getUsersByIds(userIds: number[]) {
		if (!userIds.length) return [];
		return db
			.select({
				id: cybUser.id,
				fname: cybUser.fname,
				lname: cybUser.lname,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				individualId: cybUser.individualId,
			})
			.from(cybUser)
			.where(and(inArray(cybUser.id, userIds), eq(cybUser.isDeleted, 0)));
	}

	async setHiredStatus(ids: number[], hired: number) {
		if (!ids.length) return { affected: 0 };
		const result = await db
			.update(cybUserExperience)
			.set({ hired })
			.where(inArray(cybUserExperience.id, ids));
		// mysql2 ResultSetHeader
		const affected = Array.isArray(result)
			? Number((result as any)[0]?.affectedRows ?? 0)
			: Number((result as any)?.affectedRows ?? 0);
		return { affected };
	}

	async getExperiencesByIds(ids: number[]) {
		if (!ids.length) return [];
		const companyUser = alias(cybUser, "cmp");
		return db
			.select({
				id: cybUserExperience.id,
				userId: cybUserExperience.user,
				companyId: cybUserExperience.company,
				userEmail: cybUser.email,
				userName: cybUser.fname,
				companyEmail: companyUser.email,
				companyName: companyUser.fname,
			})
			.from(cybUserExperience)
			.leftJoin(cybUser, eq(cybUserExperience.user, cybUser.id))
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.where(inArray(cybUserExperience.id, ids));
	}

	// ---- field suggestion ----
	async suggestUsers(keyword: string, limit: number, sqlOffset: number) {
		const conditions = [
			eq(cybUser.userType, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (keyword) {
			conditions.push(
				or(
					like(cybUser.fullName, `%${keyword}%`),
					like(cybUser.fname, `%${keyword}%`),
					like(cybUser.individualId, `%${keyword}%`)
				)!
			);
		}
		return db
			.select({
				id: cybUser.id,
				fname: cybUser.fname,
				lname: cybUser.lname,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				individualId: cybUser.individualId,
				designationName: cybDesignation.name,
				companyName: sql<string>`(SELECT fname FROM cyb_user cu WHERE cu.id = ${cybUser.currentCompany} LIMIT 1)`,
			})
			.from(cybUser)
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.where(and(...conditions))
			.limit(limit)
			.offset(sqlOffset);
	}

	async suggestCompanies(
		keyword: string,
		limit: number,
		sqlOffset: number,
		nonclaim: boolean
	) {
		const conditions = [
			eq(cybUser.userType, 2),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (nonclaim) conditions.push(eq(cybUser.claimStatus, 0));
		if (keyword) {
			conditions.push(
				or(
					like(cybUser.fname, `%${keyword}%`),
					like(cybUser.individualId, `%${keyword}%`)
				)!
			);
		}
		return db
			.select({
				id: cybUser.id,
				fname: cybUser.fname,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				individualId: cybUser.individualId,
				claimStatus: cybUser.claimStatus,
				cityName: cybCities.name,
				stateName: cybState.name,
				industryName: cybIndustries.name,
				totalEmployment: sql<number>`(SELECT COUNT(*) FROM cyb_user_experience ue WHERE ue.company = ${cybUser.id} AND ue.is_deleted = 0)`.mapWith(
					Number
				),
			})
			.from(cybUser)
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.where(and(...conditions))
			.limit(limit)
			.offset(sqlOffset);
	}

	async suggestBenefits(keyword: string, limit: number, sqlOffset: number) {
		const conditions = [eq(cybBenefits.status, 1)];
		if (keyword) conditions.push(like(cybBenefits.name, `%${keyword}%`));
		return db
			.select({ id: cybBenefits.id, name: cybBenefits.name })
			.from(cybBenefits)
			.where(and(...conditions))
			.limit(limit)
			.offset(sqlOffset);
	}

	/** Whitelisted simple id/name tables only (no dynamic SQL table names). */
	async suggestFromWhitelist(
		table: string,
		keyword: string,
		limit: number,
		sqlOffset: number
	): Promise<Array<{ id: number; name: string | null }>> {
		const map: Record<string, any> = {
			department: cybDepartment,
			designation: cybDesignation,
			industry: cybIndustries,
			industries: cybIndustries,
			benefits: cybBenefits,
			benefit: cybBenefits,
			city: cybCities,
			cities: cybCities,
			state: cybState,
		};
		const t = map[table.toLowerCase()];
		if (!t) return [];
		const conditions = [eq(t.status, 1)];
		if (keyword && t.name) conditions.push(like(t.name, `%${keyword}%`));
		return db
			.select({ id: t.id, name: t.name })
			.from(t)
			.where(and(...conditions))
			.limit(limit)
			.offset(sqlOffset);
	}

	async updateUserResume(userId: number, resume: string, resumeName: string) {
		return db
			.update(cybUser)
			.set({
				resume,
				resumeName,
				modifyDate: nowSql(),
			})
			.where(eq(cybUser.id, userId));
	}

	async getUserResume(userId: number) {
		const [row] = await db
			.select({
				id: cybUser.id,
				resume: cybUser.resume,
				resumeName: cybUser.resumeName,
				userType: cybUser.userType,
				fname: cybUser.fname,
				email: cybUser.email,
			})
			.from(cybUser)
			.where(and(eq(cybUser.id, userId), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async hasActiveJobs(companyId: number): Promise<number> {
		const [row] = await db
			.select({ id: cybCompanyJob.id })
			.from(cybCompanyJob)
			.where(
				and(
					eq(cybCompanyJob.company, companyId),
					eq(cybCompanyJob.status, 1),
					eq(cybCompanyJob.isDeleted, 0)
				)
			)
			.limit(1);
		return row ? 1 : 0;
	}
}

export default new NewRoutesRepositery();
