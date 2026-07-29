
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybUserExperience, cybUserUpdateExperience, cybUser, cybEmployementType, cybDesignation, cybDepartment, cybCompanyInvite, cybUserExperienceRating, cybUserExperienceRatingHistory, cybSkillRating } from '../db/schema';
import { isEmptyArray } from '../utils/helpers';

type Employment = InferSelectModel<typeof cybUserExperience>
type NewEmployment = InferInsertModel<typeof cybUserExperience>

class employmentRepositery {
	async findById(id: number): Promise<Employment | undefined> {
		const [employment] = await db.select().from(cybUserExperience).where(eq(cybUserExperience.id, id));
		return employment;
	}

	async findByUserId(userId: number): Promise<Employment[]> {
		const conditions = [eq(cybUserExperience.user, userId), eq(cybUserExperience.isDeleted, 0)];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findByCompanyId(companyId: number): Promise<Employment[]> {
		const conditions = [eq(cybUserExperience.company, companyId), eq(cybUserExperience.isDeleted, 0)];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findByUserIdAndCompanyId(userId: number, companyId: number): Promise<Employment | undefined> {
		const conditions = [
			eq(cybUserExperience.user, userId),
			eq(cybUserExperience.company, companyId),
			eq(cybUserExperience.isDeleted, 0)
		];
		const [employment] = await db.select().from(cybUserExperience).where(and(...conditions));
		return employment;
	}

	async findActiveByUserId(userId: number): Promise<Employment[]> {
		const conditions = [
			eq(cybUserExperience.user, userId),
			eq(cybUserExperience.status, 1),
			eq(cybUserExperience.isDeleted, 0)
		];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findStillWorking(userId: number): Promise<Employment[]> {
		const conditions = [
			eq(cybUserExperience.user, userId),
			eq(cybUserExperience.stillWorking, 1),
			eq(cybUserExperience.isDeleted, 0)
		];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findApprovedByCompanyId(companyId: number): Promise<Employment[]> {
		const conditions = [
			eq(cybUserExperience.company, companyId),
			eq(cybUserExperience.approved, 1),
			eq(cybUserExperience.isDeleted, 0)
		];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findByDesignation(designationId: number): Promise<Employment[]> {
		const conditions = [
			eq(cybUserExperience.designation, designationId),
			eq(cybUserExperience.isDeleted, 0)
		];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findByDepartment(departmentId: number): Promise<Employment[]> {
		const conditions = [
			eq(cybUserExperience.department, departmentId),
			eq(cybUserExperience.isDeleted, 0)
		];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async create(data: Partial<NewEmployment>): Promise<Employment> {
		const [{ id }] = await db.insert(cybUserExperience).values(data).$returningId();

		const employment = await this.findById(id);

		if (!employment) {
			throw new Error("Employment was inserted but could not be retrieved.");
		}
		return employment;
	}

	async update(id: number, data: Partial<NewEmployment>): Promise<Employment | undefined> {
		await db.update(cybUserExperience).set(data).where(eq(cybUserExperience.id, id));
		return this.findById(id);
	}

	async deleteExperience(id: number, userId: number, type?: string) {
		const [experience] = await db.select()
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.id, id),
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.isDeleted, 0),
			));

		if (!experience) {
			return { status: false, message: 'User Experience not valid!' };
		}

		if (type === 'reject') {
			await db.update(cybUserExperience)
				.set({ isDeleted: 0, approved: 2, status: 1 })
				.where(eq(cybUserExperience.id, id));
			return { status: true, message: 'Reject Successfully' };
		}

		if (experience.approved === 1 && experience.status === 1) {
			return { status: false, message: "Approved Experience can't be deleted!" };
		}

		const ratings = await db.select({ id: cybUserExperienceRating.id })
			.from(cybUserExperienceRating)
			.where(and(
				eq(cybUserExperienceRating.experience, id),
				eq(cybUserExperienceRating.isDeleted, 0),
			));

		const ratingIds = ratings.map(r => r.id);
		if (ratingIds.length > 0) {
			await db.update(cybUserExperienceRatingHistory)
				.set({ isDeleted: 1 })
				.where(inArray(cybUserExperienceRatingHistory.ratingId, ratingIds));
		}

		await db.update(cybUserExperienceRating)
			.set({ isDeleted: 1 })
			.where(eq(cybUserExperienceRating.experience, id));

		await db.update(cybUserExperience)
			.set({ isDeleted: 1 })
			.where(eq(cybUserExperience.id, id));

		const [currUser] = await db.select({
			currentCompany: cybUser.currentCompany,
			currentPossition: cybUser.currentPossition,
		}).from(cybUser).where(and(
			eq(cybUser.id, userId),
			eq(cybUser.isDeleted, 0),
			eq(cybUser.status, 1),
		));

		if (currUser && experience.company === currUser.currentCompany) {
			await db.update(cybUser)
				.set({ currentCompany: null, currentPossition: null })
				.where(eq(cybUser.id, userId));
		}

		const otherEmployment = await db.select()
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.isDeleted, 0),
				eq(cybUserExperience.stillWorking, 1),
				ne(cybUserExperience.id, id),
			));

		if (otherEmployment.length === 1) {
			await db.update(cybUser)
				.set({
					currentCompany: otherEmployment[0].company,
					currentPossition: otherEmployment[0].designation,
				})
				.where(eq(cybUser.id, userId));
		}

		return { status: true, message: 'Deleted Successfully' };
	}

	async approve(id: number): Promise<Employment | undefined> {
		await db.update(cybUserExperience).set({ approved: 1 }).where(eq(cybUserExperience.id, id));
		return this.findById(id);
	}

	async reject(id: number): Promise<Employment | undefined> {
		await db.update(cybUserExperience).set({ approved: 0 }).where(eq(cybUserExperience.id, id));
		return this.findById(id);
	}

	async countByUserId(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserExperience)
			.where(and(eq(cybUserExperience.user, userId), eq(cybUserExperience.isDeleted, 0)));
		return result.count;
	}

	async countByCompanyId(companyId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserExperience)
			.where(and(eq(cybUserExperience.company, companyId), eq(cybUserExperience.isDeleted, 0)));
		return result.count;
	}

	async getExperienceUpdateList(exprienceId: number) {
		const condition = [eq(cybUserUpdateExperience.experienceId, exprienceId)]
		const [result] = await db.select().from(cybUserUpdateExperience).where(and(...condition)).orderBy(asc(cybUserUpdateExperience.type))
		return result
	}

	async getExperienceUpdateListByExperienceIds(experienceIds: number[]) {
		if (isEmptyArray(experienceIds)) return new Map();
		const rows = await db.select()
			.from(cybUserUpdateExperience)
			.where(and(
				inArray(cybUserUpdateExperience.experienceId, experienceIds),
				eq(cybUserUpdateExperience.isDeleted, 0),
			))
			.orderBy(asc(cybUserUpdateExperience.type));
		const map = new Map<number, any>();
		for (const row of rows) {
			if (!map.has(row.experienceId!)) {
				map.set(row.experienceId!, row);
			}
		}
		return map;
	}

	async getExperienceDetail(id: number) {
		const companyUser = alias(cybUser, 'company');
		const employeeUser = alias(cybUser, 'employee');

		const [result] = await db
			.select({
				id: cybUserExperience.id,
				user: cybUserExperience.user,
				company: cybUserExperience.company,
				employmentType: cybUserExperience.employmentType,
				designation: cybUserExperience.designation,
				workEmail: cybUserExperience.workEmail,
				workEmailDate: cybUserExperience.workEmailDate,
				salary: cybUserExperience.salary,
				salaryInhand: cybUserExperience.salaryInhand,
				salaryMode: cybUserExperience.salaryMode,
				joiningDate: cybUserExperience.joiningDate,
				workedTillDate: cybUserExperience.workedTillDate,
				department: cybUserExperience.department,
				stillWorking: cybUserExperience.stillWorking,
				skill: cybUserExperience.skill,
				description: cybUserExperience.description,
				approved: cybUserExperience.approved,
				lastReview: cybUserExperience.lastReview,
				status: cybUserExperience.status,
				hired: cybUserExperience.hired,
				state: cybUserExperience.state,
				city: cybUserExperience.city,
				addedBy: cybUserExperience.addedBy,
				createdBy: cybUserExperience.createdBy,
				createDate: cybUserExperience.createDate,
				modifyDate: cybUserExperience.modifyDate,
				expiry: cybUserExperience.expiry,
				certificate: cybUserExperience.certificate,
				isDeleted: cybUserExperience.isDeleted,
				companyId: companyUser.id,
				companyName: companyUser.fname,
				companyEmail: companyUser.email,
				companySlug: companyUser.slug,
				claimStatus: companyUser.claimStatus,
				companyProfile: companyUser.profile,
				companySocialImage: companyUser.socialImage,
				companyPhone: companyUser.phone,
				userPhone: employeeUser.phone,
				email: employeeUser.email,
				fname: employeeUser.fname,
				lname: employeeUser.lname,
				userId: employeeUser.id,
				fullName: employeeUser.fullName,
				userSlug: employeeUser.slug,
				userProfile: employeeUser.profile,
				userSocialImage: employeeUser.socialImage,
				employementName: cybEmployementType.name,
				designationName: cybDesignation.name,
				departmentName: cybDepartment.name,
				invitedBy: cybCompanyInvite.addedBy,
			})
			.from(cybUserExperience)
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.leftJoin(employeeUser, eq(cybUserExperience.user, employeeUser.id))
			.leftJoin(cybEmployementType, eq(cybUserExperience.employmentType, cybEmployementType.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(cybDepartment, eq(cybUserExperience.department, cybDepartment.id))
			.leftJoin(cybCompanyInvite, eq(cybUserExperience.company, cybCompanyInvite.company))
			.where(and(eq(cybUserExperience.id, id), eq(cybUserExperience.isDeleted, 0)));

		return result;
	}

	async getAllEmploymentScore(userId: number, companyId: number): Promise<number> {
		const companyUser = alias(cybUser, 'companyUser');
		const [result] = await db
			.select({
				avgRating: sql<number>`COALESCE(AVG(${cybUserExperienceRating.rating}), 0)`,
			})
			.from(cybUserExperienceRating)
			.leftJoin(cybUserExperience, eq(cybUserExperienceRating.experience, cybUserExperience.id))
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperienceRating.status, 1),
				eq(cybUserExperienceRating.approved, 1),
				eq(cybUserExperienceRating.isDeleted, 0),
				eq(cybUserExperience.isDeleted, 0),
			));
		return Math.round(result?.avgRating || 0);
	}

	/**
	 * PHP UserModel::getoverallprofileScore —
	 * average of positive per-company employment scores for approved experiences.
	 */
	async getOverallProfileRating(userId: number): Promise<number> {
		const companies = await db.selectDistinct({ company: cybUserExperience.company })
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.isDeleted, 0),
				eq(cybUserExperience.approved, 1),
				eq(cybUserExperience.status, 1),
			));

		const scores: number[] = [];
		for (const row of companies) {
			if (row.company == null) continue;
			const score = await this.getAllEmploymentScore(userId, row.company);
			if (score > 0) scores.push(score);
		}
		if (scores.length === 0) return 0;
		const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
		return Number.isInteger(avg) ? avg : Math.round(avg * 10) / 10;
	}

	async getAverageRatingBySkill(experienceId: number): Promise<number> {
		const [result] = await db
			.select({
				avgRating: sql<string>`COALESCE(CAST(AVG(${cybSkillRating.rating}) AS DECIMAL(10,1)), 0)`,
			})
			.from(cybSkillRating)
			.leftJoin(cybUserExperienceRating, eq(cybSkillRating.reviewId, cybUserExperienceRating.id))
			.where(and(
				eq(cybSkillRating.experienceId, experienceId),
				eq(cybSkillRating.status, 1),
				eq(cybSkillRating.isDeleted, 0),
				eq(cybUserExperienceRating.status, 1),
				eq(cybUserExperienceRating.approved, 1),
			));
		return Number(result?.avgRating || 0);
	}

	async getVerificationProcessDetails(experienceId: number): Promise<Record<string, boolean>> {
		const ratings = await db
			.select({
				addedBy: cybUserExperienceRating.addedBy,
				approved: cybUserExperienceRating.approved,
			})
			.from(cybUserExperienceRating)
			.where(and(
				eq(cybUserExperienceRating.experience, experienceId),
				eq(cybUserExperienceRating.status, 1),
				eq(cybUserExperienceRating.isDeleted, 0),
			));

		const hasCompanyApproved = ratings.some(r => r.addedBy === 1 && r.approved === 1);
		const hasSelfAdded = ratings.some(r => r.addedBy === 0 || r.addedBy === null);

		return {
			level1: hasSelfAdded,
			level2: hasCompanyApproved,
		};
	}


}

export default new employmentRepositery();
