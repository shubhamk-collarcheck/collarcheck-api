import { and, eq, sql, desc, asc, count, inArray, like, or, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybUser, cybUserExperience, cybUserExperienceRating, cybUserExperienceRatingHistory,
	cybUserUpdateExperience, cybHelp, cybApplication, cybCompanyJob, cybDesignation,
	cybSkillRating, cybJobCollaborators, cybNotifications,
	cybCities, cybState, cybCountry,
} from '../db/schema';

class companyReviewRepositery {

	async getAllExperience(companyId: number, excludeLastReview = false, onlyLastReview = false) {
		const conditions = [
			eq(cybUserExperience.company, companyId),
			eq(cybUserExperience.status, 1),
			eq(cybUserExperience.approved, 1),
			eq(cybUserExperience.isDeleted, 0),
		];

		if (excludeLastReview) {
			conditions.push(sql`${cybUserExperience.lastReview} != 1`);
		}
		if (onlyLastReview) {
			conditions.push(eq(cybUserExperience.lastReview, 1));
		}

		return db.select({
			id: cybUserExperience.id,
			user: cybUserExperience.user,
			company: cybUserExperience.company,
			designation: cybUserExperience.designation,
			stillWorking: cybUserExperience.stillWorking,
			workedTillDate: cybUserExperience.workedTillDate,
			joiningDate: cybUserExperience.joiningDate,
			lastReview: cybUserExperience.lastReview,
		})
			.from(cybUserExperience)
			.where(and(...conditions));
	}

	async getExperienceById(experienceId: number) {
		const [row] = await db.select()
			.from(cybUserExperience)
			.where(eq(cybUserExperience.id, experienceId));
		return row;
	}

	async getUserById(userId: number) {
		const [row] = await db.select({
			id: cybUser.id,
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			slug: cybUser.slug,
			profile: cybUser.profile,
			currentCompany: cybUser.currentCompany,
			currentPossition: cybUser.currentPossition,
		})
			.from(cybUser)
			.where(and(eq(cybUser.id, userId), eq(cybUser.isDeleted, 0)));
		return row;
	}

	async getAllExperienceRating(experienceId: number, companyId?: number) {
		const conditions = [
			eq(cybUserExperienceRating.experience, experienceId),
			eq(cybUserExperienceRating.isDeleted, 0),
		];
		if (companyId) {
			conditions.push(eq(cybUserExperienceRating.company, companyId));
		}

		return db.select()
			.from(cybUserExperienceRating)
			.where(and(...conditions));
	}

	async getReviewById(reviewId: number) {
		const [row] = await db.select()
			.from(cybUserExperienceRating)
			.where(eq(cybUserExperienceRating.id, reviewId));
		return row;
	}

	async getReviewHistoryCount(reviewId: number) {
		const [result] = await db.select({ count: count() })
			.from(cybUserExperienceRatingHistory)
			.where(eq(cybUserExperienceRatingHistory.ratingId, reviewId));
		return result?.count ?? 0;
	}

	async getReviewHistory(reviewId: number) {
		return db.select()
			.from(cybUserExperienceRatingHistory)
			.where(eq(cybUserExperienceRatingHistory.ratingId, reviewId))
			.orderBy(desc(cybUserExperienceRatingHistory.id));
	}

	async getSkillRatingAverage(reviewId: number) {
		const [result] = await db.select({
			avgRating: sql<number>`COALESCE(AVG(${cybSkillRating.rating}), 0)`,
		})
			.from(cybSkillRating)
			.where(and(
				eq(cybSkillRating.reviewId, reviewId),
				eq(cybSkillRating.isDeleted, 0),
			));
		return result?.avgRating ?? 0;
	}

	async getSkillRatings(reviewId: number) {
		return db.select({
			skillId: cybSkillRating.skillId,
			rating: cybSkillRating.rating,
		})
			.from(cybSkillRating)
			.where(and(
				eq(cybSkillRating.reviewId, reviewId),
				eq(cybSkillRating.isDeleted, 0),
			));
	}

	async createReview(data: {
		experience: number;
		company: number;
		rating: number;
		review: string;
		doc?: string;
		link?: string;
		addedBy?: number;
		showReview?: number;
		expiry?: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybUserExperienceRating).values({
			experience: data.experience,
			company: data.company,
			rating: data.rating,
			review: data.review,
			doc: data.doc,
			link: data.link,
			addedBy: data.addedBy ?? 0,
			approved: 1,
			status: 1,
			showReview: data.showReview ?? 0,
			expiry: data.expiry,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async createReviewHistory(data: {
		ratingId: number;
		rating?: number;
		review?: string;
		doc?: string;
		link?: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybUserExperienceRatingHistory).values({
			ratingId: data.ratingId,
			rating: data.rating,
			review: data.review,
			doc: data.doc,
			link: data.link,
			status: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async updateReview(reviewId: number, data: {
		approved?: number;
		showReview?: number;
		createDate?: string;
		rating?: number;
		review?: string;
		doc?: string;
		link?: string;
		expiry?: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const updateData: Record<string, any> = { modifyDate: now };
		if (data.approved !== undefined) updateData.approved = data.approved;
		if (data.showReview !== undefined) updateData.showReview = data.showReview;
		if (data.createDate !== undefined) updateData.createDate = data.createDate;
		if (data.rating !== undefined) updateData.rating = data.rating;
		if (data.review !== undefined) updateData.review = data.review;
		if (data.doc !== undefined) updateData.doc = data.doc;
		if (data.link !== undefined) updateData.link = data.link;
		if (data.expiry !== undefined) updateData.expiry = data.expiry;

		await db.update(cybUserExperienceRating)
			.set(updateData)
			.where(eq(cybUserExperienceRating.id, reviewId));
	}

	async clearLastReviewFlag(experienceId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUserExperience)
			.set({ lastReview: 0, modifyDate: now })
			.where(eq(cybUserExperience.id, experienceId));
	}

	async rejectReview(reviewId: number, companyId: number) {
		const [row] = await db.select()
			.from(cybUserExperienceRating)
			.where(and(
				eq(cybUserExperienceRating.id, reviewId),
				eq(cybUserExperienceRating.company, companyId),
			));

		if (!row) return null;

		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUserExperienceRating)
			.set({ approved: 2, modifyDate: now })
			.where(eq(cybUserExperienceRating.id, reviewId));

		return row;
	}

	async createNotification(sender: number, receiver: number, message: string, link: string, type: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.insert(cybNotifications).values({
			sender,
			receiver,
			message,
			link,
			type,
			createDate: now,
			modifyDate: now,
		});
	}

	async createHelp(data: {
		company: number;
		experience: number;
		subject: string;
		message: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		// Get next ID
		const [maxId] = await db.select({ id: sql<number>`COALESCE(MAX(${cybHelp.id}), 0)` })
			.from(cybHelp);
		const nextId = (maxId?.id ?? 0) + 1;

		await db.insert(cybHelp).values({
			id: nextId,
			experience: data.experience,
			subject: data.subject,
			message: data.message,
			status: 1,
			createDate: now,
			modifyDate: now,
		});
		return nextId;
	}

	async getCollaboratorRows(userId: number) {
		return db.select({
			companyId: cybJobCollaborators.companyId,
			jobId: cybJobCollaborators.jobId,
		})
			.from(cybJobCollaborators)
			.where(and(
				eq(cybJobCollaborators.userId, String(userId)),
				eq(cybJobCollaborators.status, 1),
				eq(cybJobCollaborators.isDeleted, 0),
			));
	}

	/** @deprecated use getCollaboratorRows */
	async getCollaboratorCompanyIds(userId: number) {
		return this.getCollaboratorRows(userId);
	}

	async getJobTitleAndSlug(jobId: number) {
		const [row] = await db.select({
			jobTitle: cybCompanyJob.jobTitle,
			slug: cybCompanyJob.slug,
		})
			.from(cybCompanyJob)
			.where(eq(cybCompanyJob.id, jobId))
			.limit(1);
		return { jobTitle: row?.jobTitle ?? '', jobSlug: row?.slug ?? '' };
	}

	async getJobTitle(jobId: number) {
		const { jobTitle } = await this.getJobTitleAndSlug(jobId);
		return jobTitle;
	}

	/**
	 * PHP CompanyModel::getAllApplication
	 * - No filter on app.is_deleted / app.status
	 * - filter.job optional; company OR companyIds
	 * - order by app.id DESC if isVerify else ASC
	 * - limit/sqlOffset optional (omit for count mode — use countAllApplication)
	 */
	async getAllApplication(filter: {
		jobId?: number;
		companyId?: number;
		companyIds?: number[];
		keyword?: string;
		isVerify?: boolean;
		limit?: number;
		sqlOffset?: number;
	}) {
		const applicant = cybUser;
		const companyUser = alias(cybUser, 'app_current_company');

		const conditions: SQL[] = [eq(applicant.isDeleted, 0)];

		if (filter.companyIds && filter.companyIds.length > 0) {
			conditions.push(inArray(cybCompanyJob.company, filter.companyIds));
		} else if (filter.companyId != null) {
			conditions.push(eq(cybCompanyJob.company, filter.companyId));
		}

		if (filter.jobId != null) {
			conditions.push(eq(cybApplication.job, filter.jobId));
		}

		if (filter.keyword) {
			const kw = `%${filter.keyword}%`;
			conditions.push(or(
				like(applicant.fname, kw),
				like(applicant.lname, kw),
				like(cybCompanyJob.jobTitle, kw),
			)!);
		}

		const orderBy = filter.isVerify ? desc(cybApplication.id) : asc(cybApplication.id);

		let q = db.select({
			id: cybApplication.id,
			jobId: cybApplication.job,
			userId: cybApplication.user,
			createDate: cybApplication.createDate,
			fname: applicant.fname,
			lname: applicant.lname,
			email: applicant.email,
			phone: applicant.phone,
			slug: applicant.slug,
			profile: applicant.profile,
			socialImage: applicant.socialImage,
			individualId: applicant.individualId,
			presentAddress: applicant.presentAddress,
			profileDescription: applicant.profileDescription,
			expectedSalary: applicant.expectedSalary,
			noticePeriod: applicant.noticePeriod,
			onNotice: applicant.onNotice,
			onImmediate: applicant.onImmediate,
			onExplore: applicant.onExplore,
			noticeDate: applicant.noticeDate,
			resume: applicant.resume,
			resumeName: applicant.resumeName,
			jobTitle: cybCompanyJob.jobTitle,
			jobSlug: cybCompanyJob.slug,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			companyName: companyUser.fname,
			designationName: cybDesignation.name,
		})
			.from(cybApplication)
			.leftJoin(cybCompanyJob, eq(cybApplication.job, cybCompanyJob.id))
			.leftJoin(applicant, eq(cybApplication.user, applicant.id))
			.leftJoin(companyUser, eq(companyUser.id, applicant.currentCompany))
			.leftJoin(cybCities, eq(applicant.city, cybCities.id))
			.leftJoin(cybState, eq(applicant.state, cybState.id))
			.leftJoin(cybCountry, eq(applicant.country, cybCountry.id))
			.leftJoin(cybDesignation, eq(applicant.currentPossition, cybDesignation.id))
			.where(and(...conditions))
			.orderBy(orderBy)
			.$dynamic();

		if (filter.limit != null) {
			q = q.limit(filter.limit).offset(filter.sqlOffset ?? 0);
		}

		return q;
	}

	async countAllApplication(filter: {
		jobId?: number;
		companyId?: number;
		companyIds?: number[];
		keyword?: string;
	}) {
		const applicant = cybUser;
		const conditions: SQL[] = [eq(applicant.isDeleted, 0)];

		if (filter.companyIds && filter.companyIds.length > 0) {
			conditions.push(inArray(cybCompanyJob.company, filter.companyIds));
		} else if (filter.companyId != null) {
			conditions.push(eq(cybCompanyJob.company, filter.companyId));
		}
		if (filter.jobId != null) {
			conditions.push(eq(cybApplication.job, filter.jobId));
		}
		if (filter.keyword) {
			const kw = `%${filter.keyword}%`;
			conditions.push(or(
				like(applicant.fname, kw),
				like(applicant.lname, kw),
				like(cybCompanyJob.jobTitle, kw),
			)!);
		}

		const [result] = await db.select({ count: count() })
			.from(cybApplication)
			.leftJoin(cybCompanyJob, eq(cybApplication.job, cybCompanyJob.id))
			.leftJoin(applicant, eq(cybApplication.user, applicant.id))
			.where(and(...conditions));
		return result?.count ?? 0;
	}

	/** PHP get_user_rating: sum of ratings + count of approved reviews */
	async getUserRating(userId: number) {
		const [result] = await db.select({
			noofrecord: sql<number>`count(*)`.mapWith(Number),
			rating: sql<number>`COALESCE(SUM(${cybUserExperienceRating.rating}), 0)`.mapWith(Number),
		})
			.from(cybUserExperienceRating)
			.leftJoin(cybUserExperience, eq(cybUserExperienceRating.experience, cybUserExperience.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperienceRating.status, 1),
				eq(cybUserExperienceRating.isDeleted, 0),
			));
		return {
			rating: result?.rating ?? 0,
			noofrecord: result?.noofrecord ?? 0,
		};
	}

	async getUpdateExperienceRecord(id: number) {
		const [row] = await db.select()
			.from(cybUserUpdateExperience)
			.where(eq(cybUserUpdateExperience.id, id));
		return row;
	}

	async applyLeaveUpdate(experienceId: number, workedTillDate: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUserExperience)
			.set({
				stillWorking: 0,
				workedTillDate,
				modifyDate: now,
			})
			.where(eq(cybUserExperience.id, experienceId));
	}

	async applyPromotionUpdate(experienceId: number, data: {
		salary?: string;
		salaryInhand?: string;
		salaryMode?: string;
		designation?: number;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const updateData: Record<string, any> = { modifyDate: now };
		if (data.salary !== undefined) updateData.salary = data.salary;
		if (data.salaryInhand !== undefined) updateData.salaryInhand = data.salaryInhand;
		if (data.salaryMode !== undefined) updateData.salaryMode = data.salaryMode;
		if (data.designation !== undefined) updateData.designation = data.designation;

		await db.update(cybUserExperience)
			.set(updateData)
			.where(eq(cybUserExperience.id, experienceId));
	}

	async updateUserCompanyPosition(userId: number, data: {
		currentCompany?: number | null;
		currentPossition?: number | null;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUser)
			.set({
				...data,
				modifyDate: now,
			})
			.where(eq(cybUser.id, userId));
	}

	async updateExperienceExpiry(experienceId: number, expiry: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUserExperience)
			.set({ expiry, modifyDate: now })
			.where(eq(cybUserExperience.id, experienceId));
	}

	async deleteUpdateExperienceRecord(id: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUserUpdateExperience)
			.set({ isDeleted: 1, modifyDate: now })
			.where(eq(cybUserUpdateExperience.id, id));
	}

	async getCurrentExperience(userId: number, companyId: number) {
		const [row] = await db.select()
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.stillWorking, 1),
				eq(cybUserExperience.isDeleted, 0),
			));
		return row;
	}

	async getDesignationName(designationId: number) {
		const [row] = await db.select({ name: cybDesignation.name })
			.from(cybDesignation)
			.where(eq(cybDesignation.id, designationId));
		return row?.name ?? '';
	}
}

export default new companyReviewRepositery();
