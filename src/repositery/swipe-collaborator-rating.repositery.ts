import { and, asc, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import db from "../db";
import {
	cybUser,
	cybJobCollaborators,
	cybCompanyJob,
	cybClarity,
	cybChatSupport,
	cybUserDomains,
	cybUserExperience,
	cybUserLevels,
	cybUserExperienceRating,
	cybUserExperienceRatingHistory,
	cybSkillRating,
	cybSkillRatingHistory,
	cybSkill,
	cybNotifications,
	cybRatingWeight,
	cybCities,
	cybState,
	cybCountry,
	cybIndustries,
	cybJobExperiences,
	cybRoleTypes,
	cybDepartment,
	cybDesignation,
	cybApplication,
	cybJobMode,
	cybSalary,
} from "../db/schema";

function nowSql() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

const s3Prefix = process.env.S3_PREFIX || "";

class SwipeCollaboratorRatingRepositery {
	// ---------- user / swipe ----------
	async findActiveUser(id: number) {
		const [row] = await db
			.select()
			.from(cybUser)
			.where(and(eq(cybUser.id, id), eq(cybUser.isDeleted, 0), eq(cybUser.status, 1)))
			.limit(1);
		return row;
	}

	async updateUserPhones(id: number, phone: string | null, secondPhone: string | null) {
		const result = await db
			.update(cybUser)
			.set({ phone, secondPhone, modifyDate: nowSql() })
			.where(eq(cybUser.id, id));
		return result;
	}

	async clearSecondPhone(id: number) {
		return db
			.update(cybUser)
			.set({ secondPhone: "", secondPhoneVerify: 0, modifyDate: nowSql() })
			.where(eq(cybUser.id, id));
	}

	async clearEmailAlternate(id: number) {
		return db
			.update(cybUser)
			.set({ emailAlternate: "", emailAlternateVerify: 0, modifyDate: nowSql() })
			.where(eq(cybUser.id, id));
	}

	// ---------- clarity ----------
	async insertClarity(result: string) {
		const [{ id }] = await db
			.insert(cybClarity)
			.values({
				name: "project-live-insights",
				result,
				createDate: nowSql(),
			})
			.$returningId();
		return id;
	}

	// ---------- chat support ----------
	async getChatQuestions() {
		return db
			.select({
				type: cybChatSupport.type,
				question: cybChatSupport.question,
				answer: cybChatSupport.answer,
			})
			.from(cybChatSupport)
			.where(eq(cybChatSupport.status, 1));
	}

	// ---------- collaborators ----------
	async getJobCollaborators(companyId: number, jobId: number) {
		return db
			.select()
			.from(cybJobCollaborators)
			.where(and(eq(cybJobCollaborators.companyId, companyId), eq(cybJobCollaborators.jobId, jobId)));
	}

	async findJobCollaborator(companyId: number, jobId: number, userId: string | number) {
		const [row] = await db
			.select()
			.from(cybJobCollaborators)
			.where(
				and(
					eq(cybJobCollaborators.companyId, companyId),
					eq(cybJobCollaborators.jobId, jobId),
					eq(cybJobCollaborators.userId, String(userId))
				)
			)
			.limit(1);
		return row;
	}

	async insertJobCollaborator(data: {
		invitedBy: number;
		jobId: number;
		companyId: number;
		userId: string | number;
	}) {
		const now = nowSql();
		const [{ id }] = await db
			.insert(cybJobCollaborators)
			.values({
				invitedBy: data.invitedBy,
				jobId: data.jobId,
				companyId: data.companyId,
				userId: String(data.userId),
				createdAt: now,
				updatedAt: now,
				isDeleted: 0,
			})
			.$returningId();
		return id;
	}

	async deleteJobCollaborator(companyId: number, jobId: number, userId: string | number) {
		await db
			.delete(cybJobCollaborators)
			.where(
				and(
					eq(cybJobCollaborators.companyId, companyId),
					eq(cybJobCollaborators.jobId, jobId),
					eq(cybJobCollaborators.userId, String(userId))
				)
			);
	}

	async findCollaboratorRequest(id: number, userId: number) {
		const [row] = await db
			.select()
			.from(cybJobCollaborators)
			.where(
				and(
					eq(cybJobCollaborators.id, id),
					eq(cybJobCollaborators.userId, String(userId)),
					eq(cybJobCollaborators.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async acceptCollaborator(id: number) {
		return db.update(cybJobCollaborators).set({ status: 1, updatedAt: nowSql() }).where(eq(cybJobCollaborators.id, id));
	}

	async countDistinctCollaborators(companyId: number, jobId: number) {
		const [row] = await db
			.select({ total: sql<number>`COUNT(DISTINCT ${cybJobCollaborators.userId})` })
			.from(cybJobCollaborators)
			.where(and(eq(cybJobCollaborators.companyId, companyId), eq(cybJobCollaborators.jobId, jobId)));
		return Number(row?.total ?? 0);
	}

	async findJobById(jobId: number) {
		const [row] = await db.select().from(cybCompanyJob).where(eq(cybCompanyJob.id, jobId)).limit(1);
		return row;
	}

	async findUserById(id: number) {
		const [row] = await db
			.select()
			.from(cybUser)
			.where(and(eq(cybUser.id, id), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async createNotification(data: {
		sender: number;
		receiver: number;
		message: string;
		link?: string;
		redirect?: string;
		type?: string;
	}) {
		const now = nowSql();
		await db.insert(cybNotifications).values({
			sender: data.sender,
			receiver: data.receiver,
			message: data.message,
			link: data.link,
			redirect: data.redirect,
			type: data.type,
			createDate: now,
			modifyDate: now,
		});
	}

	/** Jobs I collaborate on, grouped by company_job.status */
	async getCollaboratorJobs(filter: {
		userId: number | string;
		status: number;
		limit?: number;
		offset?: number;
	}) {
		const companyUser = alias(cybUser, "company");
		const conditions = [
			eq(cybJobCollaborators.userId, String(filter.userId)),
			eq(cybJobCollaborators.isDeleted, 0),
			eq(cybCompanyJob.isDeleted, 0),
			eq(cybCompanyJob.status, filter.status),
		];

		if (filter.limit !== undefined) {
			const rows = await db
				.select({
					id: cybCompanyJob.id,
					job_title: cybCompanyJob.jobTitle,
					slug: cybCompanyJob.slug,
					company: cybCompanyJob.company,
					urgent: cybCompanyJob.urgent,
					vacancy: cybCompanyJob.vacancy,
					create_date: cybCompanyJob.createDate,
					status: cybCompanyJob.status,
					city_name: cybCities.name,
					state_name: cybState.name,
					country_name: cybCountry.name,
					industry_name: cybIndustries.name,
					department_name: cybDepartment.name,
					experience_name: cybJobExperiences.name,
					role_type_name: cybRoleTypes.name,
					designation_name: cybDesignation.name,
					company_name: companyUser.fullName,
					profile: companyUser.profile,
					social_image: companyUser.socialImage,
					companyId: companyUser.id,
					company_slug: companyUser.slug,
					individual_id: companyUser.individualId,
					job_mode_name: cybJobMode.name,
					salary_name: cybSalary.name,
					applicationCount: sql<number>`COUNT(${cybApplication.id})`,
				})
				.from(cybJobCollaborators)
				.leftJoin(cybCompanyJob, eq(cybJobCollaborators.jobId, cybCompanyJob.id))
				.leftJoin(cybCities, eq(cybCompanyJob.city, cybCities.id))
				.leftJoin(cybState, eq(cybCompanyJob.state, cybState.id))
				.leftJoin(cybCountry, eq(cybCompanyJob.country, cybCountry.id))
				.leftJoin(cybIndustries, eq(cybCompanyJob.industry, cybIndustries.id))
				.leftJoin(cybJobExperiences, eq(cybCompanyJob.experience, cybJobExperiences.id))
				.leftJoin(cybRoleTypes, eq(cybCompanyJob.roleType, cybRoleTypes.id))
				.leftJoin(cybDepartment, eq(cybCompanyJob.department, cybDepartment.id))
				.leftJoin(cybDesignation, eq(cybCompanyJob.designation, cybDesignation.id))
				.leftJoin(cybApplication, eq(cybCompanyJob.id, cybApplication.job))
				.leftJoin(cybJobMode, eq(cybCompanyJob.jobMode, cybJobMode.id))
				.leftJoin(companyUser, eq(cybCompanyJob.company, companyUser.id))
				.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
				.where(and(...conditions))
				.groupBy(cybCompanyJob.id)
				.orderBy(desc(cybJobCollaborators.createdAt))
				.limit(filter.limit)
				.offset(filter.offset ?? 0);

			return rows.map((r) => ({
				...r,
				profile: r.profile ? `${s3Prefix}${r.profile}` : null,
			}));
		}

		const [countResult] = await db
			.select({ count: sql<number>`COUNT(DISTINCT ${cybCompanyJob.id})` })
			.from(cybJobCollaborators)
			.leftJoin(cybCompanyJob, eq(cybJobCollaborators.jobId, cybCompanyJob.id))
			.where(and(...conditions));
		return Number(countResult?.count ?? 0);
	}

	async getJobCollaboratorPeople(filter: {
		companyId: number;
		jobId: number;
		limit?: number;
		offset?: number;
	}) {
		const collaboratorUser = alias(cybUser, "collaborator_user");
		const whereCondition = and(
			eq(cybJobCollaborators.companyId, filter.companyId),
			eq(cybJobCollaborators.isDeleted, 0),
			eq(cybJobCollaborators.jobId, filter.jobId),
			eq(collaboratorUser.isDeleted, 0)
		);

		if (filter.limit !== undefined) {
			return db
				.select({
					id: collaboratorUser.id,
					full_name: collaboratorUser.fullName,
					profile: collaboratorUser.profile,
					social_image: collaboratorUser.socialImage,
					slug: collaboratorUser.slug,
					individual_id: collaboratorUser.individualId,
					designation_name: cybDesignation.name,
				})
				.from(cybJobCollaborators)
				.leftJoin(collaboratorUser, eq(cybJobCollaborators.userId, sql`CAST(${collaboratorUser.id} AS CHAR)`))
				.leftJoin(cybDesignation, eq(collaboratorUser.currentPossition, cybDesignation.id))
				.where(whereCondition)
				.orderBy(desc(cybJobCollaborators.createdAt))
				.limit(filter.limit)
				.offset(filter.offset ?? 0);
		}

		const [countResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(cybJobCollaborators)
			.leftJoin(collaboratorUser, eq(cybJobCollaborators.userId, sql`CAST(${collaboratorUser.id} AS CHAR)`))
			.where(whereCondition);
		return Number(countResult?.count ?? 0);
	}

	// ---------- domains ----------
	async findDomainById(id: number, companyId: number) {
		const [row] = await db
			.select()
			.from(cybUserDomains)
			.where(
				and(eq(cybUserDomains.id, id), eq(cybUserDomains.userId, companyId), eq(cybUserDomains.isDeleted, 0))
			)
			.limit(1);
		return row;
	}

	async countVerifiedEmails(companyId: number) {
		const [row] = await db
			.select({ count: sql<number>`count(*)` })
			.from(cybUserDomains)
			.where(
				and(
					eq(cybUserDomains.userId, companyId),
					eq(cybUserDomains.isDeleted, 0),
					eq(cybUserDomains.isVerified, 1),
					isNotNull(cybUserDomains.email),
					ne(cybUserDomains.email, "")
				)
			);
		return Number(row?.count ?? 0);
	}

	async softDeleteDomain(id: number) {
		await db
			.update(cybUserDomains)
			.set({ isDeleted: 1, isVerified: 0 })
			.where(eq(cybUserDomains.id, id));
	}

	async unverifyEmailBasedDomain(companyId: number, domain: string) {
		await db
			.update(cybUserDomains)
			.set({ isVerified: 0 })
			.where(
				and(
					eq(cybUserDomains.userId, companyId),
					eq(cybUserDomains.domain, domain),
					eq(cybUserDomains.isEmailBased, 1),
					eq(cybUserDomains.isDeleted, 0)
				)
			);
	}

	async getActiveEmailsForCompany(companyId: number) {
		return db
			.select()
			.from(cybUserDomains)
			.where(
				and(
					eq(cybUserDomains.userId, companyId),
					eq(cybUserDomains.isDeleted, 0),
					isNotNull(cybUserDomains.email),
					ne(cybUserDomains.email, "")
				)
			);
	}

	async softDeleteDomainByIdFull(id: number) {
		await db
			.update(cybUserDomains)
			.set({ isDeleted: 1, isVerified: 0, verifiedAt: null })
			.where(eq(cybUserDomains.id, id));
	}

	async getDomainLinkedUsers(companyId: number) {
		return db
			.select({
				user: cybUserExperience.user,
				experience_id: cybUserExperience.id,
				work_email: cybUserExperience.workEmail,
				full_name: cybUser.fullName,
				email: cybUser.email,
				phone: cybUser.phone,
			})
			.from(cybUserExperience)
			.leftJoin(cybUser, eq(cybUserExperience.user, cybUser.id))
			.where(
				and(
					eq(cybUserExperience.company, companyId),
					eq(cybUserExperience.isDeleted, 0),
					isNotNull(cybUserExperience.workEmail),
					ne(cybUserExperience.workEmail, "")
				)
			);
	}

	async clearWorkEmail(experienceId: number) {
		await db
			.update(cybUserExperience)
			.set({ workEmail: "", workEmailDate: null, modifyDate: nowSql() })
			.where(eq(cybUserExperience.id, experienceId));
	}

	// ---------- user highest level ----------
	async getDistinctExperienceUsers() {
		return db
			.select({ user: cybUserExperience.user })
			.from(cybUserExperience)
			.where(eq(cybUserExperience.isDeleted, 0))
			.groupBy(cybUserExperience.user);
	}

	async getUserExperiences(userId: number) {
		return db
			.select({ id: cybUserExperience.id, user: cybUserExperience.user })
			.from(cybUserExperience)
			.where(and(eq(cybUserExperience.user, userId), eq(cybUserExperience.isDeleted, 0)));
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

	async getExistingUserLevels() {
		return db.select({ user: cybUserLevels.user }).from(cybUserLevels);
	}

	async insertUserLevels(rows: { user: number; level: number }[]) {
		if (!rows.length) return;
		const now = nowSql();
		await db.insert(cybUserLevels).values(
			rows.map((r) => ({
				user: r.user,
				level: r.level,
				createdAt: now,
				updatedAt: now,
			}))
		);
	}

	async updateUserLevel(user: number, level: number) {
		await db
			.update(cybUserLevels)
			.set({ level, updatedAt: nowSql() })
			.where(eq(cybUserLevels.user, user));
	}

	// ---------- ratings ----------
	async getExperienceById(id: number) {
		const [row] = await db
			.select()
			.from(cybUserExperience)
			.where(and(eq(cybUserExperience.id, id), eq(cybUserExperience.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async getExperienceByIdAny(id: number) {
		const [row] = await db.select().from(cybUserExperience).where(eq(cybUserExperience.id, id)).limit(1);
		return row;
	}

	async getRatingById(id: number) {
		const [row] = await db
			.select()
			.from(cybUserExperienceRating)
			.where(and(eq(cybUserExperienceRating.id, id), eq(cybUserExperienceRating.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async getRatingByIdAny(id: number) {
		const [row] = await db.select().from(cybUserExperienceRating).where(eq(cybUserExperienceRating.id, id)).limit(1);
		return row;
	}

	async insertExperienceRating(data: {
		company?: number | null;
		experience?: number | string | null;
		review?: string | null;
		rating?: number;
		link?: string | null;
		addedBy?: number;
		status?: number;
		approved?: number;
		expiry?: string | null;
		showReview?: number;
		createDate?: string;
		modifyDate?: string;
	}) {
		const now = nowSql();
		const [{ id }] = await db
			.insert(cybUserExperienceRating)
			.values({
				company: data.company ?? null,
				experience: data.experience != null ? Number(data.experience) : null,
				review: data.review ?? null,
				rating: data.rating ?? 0,
				link: data.link ?? null,
				addedBy: data.addedBy ?? 0,
				status: data.status ?? 1,
				approved: data.approved ?? 0,
				expiry: data.expiry ?? null,
				showReview: data.showReview ?? 0,
				createDate: data.createDate ?? now,
				modifyDate: data.modifyDate ?? now,
			})
			.$returningId();
		return id;
	}

	async updateExperienceRating(id: number, data: Record<string, unknown>) {
		await db
			.update(cybUserExperienceRating)
			.set({ ...data, modifyDate: nowSql() } as any)
			.where(eq(cybUserExperienceRating.id, id));
	}

	async getSkillRatingsForReview(reviewId: number, userId: number, experienceId: number | string) {
		return db
			.select()
			.from(cybSkillRating)
			.where(
				and(
					eq(cybSkillRating.reviewId, reviewId),
					eq(cybSkillRating.userId, userId),
					eq(cybSkillRating.experienceId, Number(experienceId))
				)
			)
			.orderBy(asc(cybSkillRating.id));
	}

	async findSkillByName(name: string) {
		const [row] = await db
			.select()
			.from(cybSkill)
			.where(and(eq(cybSkill.name, name), eq(cybSkill.status, 1)))
			.limit(1);
		return row;
	}

	async insertSkill(name: string, userId: number) {
		const now = nowSql();
		const [{ id }] = await db
			.insert(cybSkill)
			.values({
				name,
				userDefined: 1,
				userId,
				status: 1,
				createDate: now,
				modifyDate: now,
			})
			.$returningId();
		return id;
	}

	async updateSkillRating(id: number, skillId: number, rating: number) {
		await db
			.update(cybSkillRating)
			.set({ skillId, rating, modifyDate: nowSql() })
			.where(eq(cybSkillRating.id, id));
	}

	async insertSkillRating(data: {
		reviewId: number;
		experienceId: number;
		userId: number;
		skillId: number;
		rating: number;
	}) {
		const now = nowSql();
		const [{ id }] = await db
			.insert(cybSkillRating)
			.values({
				reviewId: data.reviewId,
				experienceId: data.experienceId,
				userId: data.userId,
				skillId: data.skillId,
				rating: data.rating,
				status: 1,
				isDeleted: 0,
				showHome: 0,
				createDate: now,
				modifyDate: now,
			})
			.$returningId();
		return id;
	}

	async insertRatingHistory(data: {
		ratingId: number;
		rating?: number;
		review?: string | null;
		doc?: string | null;
		link?: string | null;
	}) {
		const now = nowSql();
		const [{ id }] = await db
			.insert(cybUserExperienceRatingHistory)
			.values({
				ratingId: data.ratingId,
				rating: data.rating ?? 0,
				review: data.review,
				doc: data.doc,
				link: data.link,
				status: 1,
				createDate: now,
				modifyDate: now,
			})
			.$returningId();
		return id;
	}

	async getRatingHistory(ratingId: number) {
		return db
			.select()
			.from(cybUserExperienceRatingHistory)
			.where(eq(cybUserExperienceRatingHistory.ratingId, ratingId))
			.orderBy(desc(cybUserExperienceRatingHistory.id));
	}

	async insertSkillRatingHistory(data: {
		reviewHistoryId: number;
		skillId: number;
		rating: number;
	}) {
		const now = nowSql();
		await db.insert(cybSkillRatingHistory).values({
			reviewHistoryId: data.reviewHistoryId,
			skillId: data.skillId,
			rating: data.rating,
			status: 1,
			isDeleted: 0,
			createDate: now,
			modifyDate: now,
		});
	}

	async clearLastReview(experienceId: number) {
		await db
			.update(cybUserExperience)
			.set({ lastReview: null as any, modifyDate: nowSql() })
			.where(eq(cybUserExperience.id, experienceId));
	}

	async findRatingByExperience(experienceId: number) {
		const [row] = await db
			.select()
			.from(cybUserExperienceRating)
			.where(
				and(
					eq(cybUserExperienceRating.experience, experienceId),
					eq(cybUserExperienceRating.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async getReviewsWithSkills(reviewIds: number | number[]) {
		const ids = Array.isArray(reviewIds) ? reviewIds : [reviewIds];
		if (!ids.length) return [];
		return db
			.select({
				id: cybSkillRating.id,
				review_id: cybSkillRating.reviewId,
				skill_id: cybSkillRating.skillId,
				name: cybSkill.name,
				rating: cybSkillRating.rating,
				show_home: cybSkillRating.showHome,
			})
			.from(cybSkillRating)
			.leftJoin(cybSkill, eq(cybSkillRating.skillId, cybSkill.id))
			.where(and(eq(cybSkillRating.isDeleted, 0), inArray(cybSkillRating.reviewId, ids)));
	}

	async getSkillRowsByExperience(experienceId: number) {
		return db
			.select({
				review_id: cybSkillRating.reviewId,
				skill_id: cybSkillRating.skillId,
				name: cybSkill.name,
				rating: cybSkillRating.rating,
				show_home: cybSkillRating.showHome,
			})
			.from(cybSkillRating)
			.leftJoin(cybSkill, eq(cybSkillRating.skillId, cybSkill.id))
			.where(and(eq(cybSkillRating.isDeleted, 0), eq(cybSkillRating.experienceId, experienceId)));
	}

	async getApprovedRatingsByIds(reviewIds: number[]) {
		if (!reviewIds.length) return [];
		return db
			.select({
				id: cybUserExperienceRating.id,
				review: cybUserExperienceRating.review,
				show_home: cybUserExperienceRating.showHome,
				approved: cybUserExperienceRating.approved,
				create_date: cybUserExperienceRating.createDate,
			})
			.from(cybUserExperienceRating)
			.where(
				and(
					eq(cybUserExperienceRating.isDeleted, 0),
					eq(cybUserExperienceRating.approved, 1),
					inArray(cybUserExperienceRating.id, reviewIds)
				)
			);
	}

	async getApprovedReviewsForExperience(experienceId: number) {
		return db
			.select()
			.from(cybUserExperienceRating)
			.where(
				and(
					eq(cybUserExperienceRating.experience, experienceId),
					eq(cybUserExperienceRating.approved, 1),
					eq(cybUserExperienceRating.isDeleted, 0)
				)
			);
	}

	async getReviewsForExperience(experienceId: number, opts?: { showHome?: number; approved?: number }) {
		const conditions = [
			eq(cybUserExperienceRating.experience, experienceId),
			eq(cybUserExperienceRating.isDeleted, 0),
		];
		if (opts?.showHome !== undefined) conditions.push(eq(cybUserExperienceRating.showHome, opts.showHome));
		if (opts?.approved !== undefined) conditions.push(eq(cybUserExperienceRating.approved, opts.approved));
		return db.select().from(cybUserExperienceRating).where(and(...conditions));
	}

	/** Reviews joined via skill_rating (matches PHP showProfileRating base query) */
	async getReviewsViaSkillRating(
		experienceId: number,
		opts: { approved?: number; skillShowHome?: number } = {}
	) {
		const conditions = [
			eq(cybUserExperienceRating.experience, experienceId),
			eq(cybUserExperienceRating.isDeleted, 0),
		];
		if (opts.approved !== undefined) conditions.push(eq(cybUserExperienceRating.approved, opts.approved));
		if (opts.skillShowHome !== undefined) conditions.push(eq(cybSkillRating.showHome, opts.skillShowHome));

		return db
			.select({
				id: cybUserExperienceRating.id,
				review_id: cybSkillRating.reviewId,
				review: cybUserExperienceRating.review,
				approved: cybUserExperienceRating.approved,
				create_date: cybUserExperienceRating.createDate,
				show_home: cybSkillRating.showHome,
			})
			.from(cybSkillRating)
			.innerJoin(cybUserExperienceRating, eq(cybUserExperienceRating.id, cybSkillRating.reviewId))
			.innerJoin(cybUserExperience, eq(cybSkillRating.experienceId, cybUserExperience.id))
			.where(and(...conditions))
			.groupBy(cybSkillRating.reviewId);
	}

	async resetShowHomeForExperience(experienceId: number) {
		await db
			.update(cybSkillRating)
			.set({ showHome: 0 })
			.where(eq(cybSkillRating.experienceId, experienceId));
		await db
			.update(cybUserExperienceRating)
			.set({ showHome: 0 })
			.where(eq(cybUserExperienceRating.experience, experienceId));
	}

	async setReviewShowHome(ids: number[]) {
		if (!ids.length) return;
		for (const id of ids) {
			await db
				.update(cybUserExperienceRating)
				.set({ showHome: 1 })
				.where(eq(cybUserExperienceRating.id, id));
		}
	}

	async setSkillRatingShowHome(ids: number[]) {
		if (!ids.length) return;
		for (const id of ids) {
			await db.update(cybSkillRating).set({ showHome: 1 }).where(eq(cybSkillRating.id, id));
		}
	}

	// ---------- designation score ----------
	async getSessionReviewIds(userId: number, experienceId: number) {
		return db
			.selectDistinct({ review_id: cybSkillRating.reviewId })
			.from(cybSkillRating)
			.where(
				and(
					eq(cybSkillRating.userId, userId),
					eq(cybSkillRating.experienceId, experienceId),
					eq(cybSkillRating.status, 1)
				)
			)
			.orderBy(desc(cybSkillRating.reviewId));
	}

	async getAvgByReview(reviewId: number | null | undefined) {
		if (!reviewId) return 0;
		const [row] = await db
			.select({ avg_rating: sql<number>`AVG(${cybSkillRating.rating})` })
			.from(cybSkillRating)
			.innerJoin(cybUserExperienceRating, eq(cybSkillRating.reviewId, cybUserExperienceRating.id))
			.where(
				and(
					eq(cybSkillRating.reviewId, reviewId),
					eq(cybSkillRating.status, 1),
					eq(cybSkillRating.isDeleted, 0),
					eq(cybUserExperienceRating.approved, 1),
					eq(cybUserExperienceRating.isDeleted, 0)
				)
			);
		return Number(row?.avg_rating ?? 0);
	}

	async getAvgByMultipleReviews(reviewIds: number[]) {
		if (!reviewIds.length) return 0;
		const rows = await db
			.select({
				review_id: cybSkillRating.reviewId,
				avg_rating: sql<number>`AVG(${cybSkillRating.rating})`,
			})
			.from(cybSkillRating)
			.innerJoin(cybUserExperienceRating, eq(cybSkillRating.reviewId, cybUserExperienceRating.id))
			.where(
				and(
					inArray(cybSkillRating.reviewId, reviewIds),
					eq(cybSkillRating.status, 1),
					eq(cybSkillRating.isDeleted, 0),
					eq(cybUserExperienceRating.approved, 1),
					eq(cybUserExperienceRating.isDeleted, 0)
				)
			)
			.groupBy(cybSkillRating.reviewId);

		if (!rows.length) return 0;
		const total = rows.reduce((s, r) => s + Number(r.avg_rating ?? 0), 0);
		return total / rows.length;
	}

	async getCriteriaAvgBySkill(userId: number, experienceId: number) {
		const rows = await db
			.select({
				id: cybSkill.id,
				name: cybSkill.name,
				avg_rating: sql<number>`AVG(${cybSkillRating.rating})`,
			})
			.from(cybSkillRating)
			.innerJoin(cybSkill, eq(cybSkillRating.skillId, cybSkill.id))
			.innerJoin(cybUserExperienceRating, eq(cybSkillRating.reviewId, cybUserExperienceRating.id))
			.where(
				and(
					eq(cybSkillRating.userId, userId),
					eq(cybSkillRating.experienceId, experienceId),
					eq(cybSkillRating.status, 1),
					eq(cybSkillRating.isDeleted, 0),
					eq(cybUserExperienceRating.approved, 1),
					eq(cybUserExperienceRating.isDeleted, 0)
				)
			)
			.groupBy(cybSkillRating.skillId);

		return rows.map((r) => ({
			id: r.id,
			name: r.name,
			avg_rating: Math.round(Number(r.avg_rating ?? 0) * 100) / 100,
		}));
	}

	async getRatingWeights(weightType: number) {
		return db
			.select()
			.from(cybRatingWeight)
			.where(
				and(
					eq(cybRatingWeight.weightType, weightType),
					eq(cybRatingWeight.status, 1),
					eq(cybRatingWeight.isDeleted, 0)
				)
			);
	}

	async getExperienceDetailForNotify(experienceId: number) {
		const companyUser = alias(cybUser, "company_user");
		const employeeUser = alias(cybUser, "employee_user");
		const [row] = await db
			.select({
				id: cybUserExperience.id,
				user: cybUserExperience.user,
				company: cybUserExperience.company,
				fname: employeeUser.fname,
				lname: employeeUser.lname,
				email: employeeUser.email,
				user_phone: employeeUser.phone,
				user_id: employeeUser.id,
				profile: employeeUser.profile,
				social_image: employeeUser.socialImage,
				company_name: companyUser.fullName,
				company_email: companyUser.email,
				company_phone: companyUser.phone,
				company_id: companyUser.id,
				company_slug: companyUser.slug,
			})
			.from(cybUserExperience)
			.leftJoin(employeeUser, eq(cybUserExperience.user, employeeUser.id))
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.where(eq(cybUserExperience.id, experienceId))
			.limit(1);
		return row;
	}
}

export default new SwipeCollaboratorRatingRepositery();
