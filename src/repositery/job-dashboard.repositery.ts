import { and, asc, desc, eq, ne, sql, inArray, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybApplication, cybCompanyJob, cybUser, cybUserProfileViewRequest, cybFollow,
	cybCities, cybState, cybCountry, cybDesignation, cybDepartment,
	cybJobExperiences, cybRoleTypes, cybJobMode, cybIndustries, cybSalary,
	cybEmployementType, cybUserExperience, cybUserSkill, cybSkill,
	cybUserEducation, cybUserCertificate, cybUserLanguage,
	cybUserExperienceRating, cybMessageHistory, cybUserDomains,
} from '../db/schema';

class jobDashboardRepositery {

	async findJobById(jobId: number) {
		const [job] = await db.select().from(cybCompanyJob)
			.where(and(eq(cybCompanyJob.id, jobId), eq(cybCompanyJob.status, 1)));
		return job;
	}

	async findApplicationByJobAndUser(jobId: number, userId: number) {
		const [app] = await db.select().from(cybApplication)
			.where(and(eq(cybApplication.job, jobId), eq(cybApplication.user, userId)));
		return app;
	}

	async createApplication(data: { job: number; user: number }) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybApplication).values({
			job: data.job,
			user: data.user,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async findAppliedJobIds(userId: number) {
		const result = await db.select({ job: cybApplication.job })
			.from(cybApplication)
			.leftJoin(cybCompanyJob, eq(cybApplication.job, cybCompanyJob.id))
			.where(and(
				eq(cybCompanyJob.status, 1),
				eq(cybApplication.user, userId),
			));
		return result.map(r => r.job);
	}

	async findAppliedJobsPaginated(userId: number, limit: number, offset: number) {
		const rows = await db.select({
			id: cybApplication.id,
			job: cybApplication.job,
			user: cybApplication.user,
			createDate: cybApplication.createDate,
			jobTitle: cybCompanyJob.jobTitle,
			slug: cybCompanyJob.slug,
			fname: cybUser.fname,
			profile: cybUser.profile,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			industryName: cybIndustries.name,
			departmentName: cybDepartment.name,
			experienceName: cybJobExperiences.name,
			roleTypeName: cybRoleTypes.name,
			designationName: cybDesignation.name,
			salaryName: cybSalary.name,
			jobModeName: cybJobMode.name,
			jobStatus: cybCompanyJob.status,
			deleteStatus: cybCompanyJob.isDeleted,
		})
			.from(cybApplication)
			.leftJoin(cybCompanyJob, eq(cybApplication.job, cybCompanyJob.id))
			.leftJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
			.leftJoin(cybCities, eq(cybCompanyJob.city, cybCities.id))
			.leftJoin(cybState, eq(cybCompanyJob.state, cybState.id))
			.leftJoin(cybCountry, eq(cybCompanyJob.country, cybCountry.id))
			.leftJoin(cybIndustries, eq(cybCompanyJob.industry, cybIndustries.id))
			.leftJoin(cybDepartment, eq(cybCompanyJob.department, cybDepartment.id))
			.leftJoin(cybJobExperiences, eq(cybCompanyJob.experience, cybJobExperiences.id))
			.leftJoin(cybRoleTypes, eq(cybCompanyJob.roleType, cybRoleTypes.id))
			.leftJoin(cybDesignation, eq(cybCompanyJob.designation, cybDesignation.id))
			.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
			.leftJoin(cybJobMode, eq(cybCompanyJob.jobMode, cybJobMode.id))
			.where(and(eq(cybApplication.user, userId)))
			.orderBy(desc(cybApplication.id))
			.limit(limit)
			.offset(offset);
		return rows;
	}

	/**
	 * PHP UserModel::get_total_applied_job —
	 * applications still linked to non-deleted job + company.
	 * Does NOT require job status=1.
	 */
	async countAppliedJobs(userId: number): Promise<number> {
		const companyUser = alias(cybUser, 'appliedJobCompany');
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybApplication)
			.leftJoin(cybCompanyJob, eq(cybApplication.job, cybCompanyJob.id))
			.leftJoin(companyUser, eq(cybCompanyJob.company, companyUser.id))
			.where(and(
				eq(cybApplication.user, userId),
				eq(cybApplication.isDeleted, 0),
				eq(cybCompanyJob.isDeleted, 0),
				eq(companyUser.isDeleted, 0),
			));
		return Number(result?.count ?? 0);
	}

	// Profile Percentage helpers

	async getUserForPercentage(userId: number) {
		const [user] = await db.select({
			id: cybUser.id,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			email: cybUser.email,
			emailVerified: cybUser.emailVerified,
			phone: cybUser.phone,
			phoneVerified: cybUser.phoneVerified,
			dob: cybUser.dob,
			city: cybUser.city,
			accomodation: cybUser.accomodation,
			workStatus: cybUser.workStatus,
			country: cybUser.country,
			currentCompany: cybUser.currentCompany,
			currentPossition: cybUser.currentPossition,
			profileDescription: cybUser.profileDescription,
			expectedSalary: cybUser.expectedSalary,
			presentAddress: cybUser.presentAddress,
			permanentAddress: cybUser.permanentAddress,
			resume: cybUser.resume,
			linkdin: cybUser.linkdin,
			youtube: cybUser.youtube,
			instagram: cybUser.instagram,
			facebook: cybUser.facebook,
			twitter: cybUser.twitter,
			userType: cybUser.userType,
		}).from(cybUser).where(eq(cybUser.id, userId));
		return user;
	}

	async getUserExperienceApproved(userId: number) {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.approved, 1),
				eq(cybUserExperience.status, 1),
				eq(cybUserExperience.isDeleted, 0),
			));
		return result.count;
	}

	async getUserExperiencePending(userId: number) {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.isDeleted, 0),
				ne(cybUserExperience.approved, 2),
			));
		return result.count;
	}

	async getUserEducationCount(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserEducation)
			.where(and(eq(cybUserEducation.user, userId), eq(cybUserEducation.isDeleted, 0)));
		return result.count;
	}

	async getUserSkillCount(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserSkill)
			.where(and(eq(cybUserSkill.user, userId), eq(cybUserSkill.isDeleted, 0)));
		return result.count;
	}

	async getUserCertificateCount(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserCertificate)
			.where(and(eq(cybUserCertificate.user, userId), eq(cybUserCertificate.isDeleted, 0)));
		return result.count;
	}

	async getUserLanguageCount(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserLanguage)
			.where(and(eq(cybUserLanguage.user, userId), eq(cybUserLanguage.isDeleted, 0)));
		return result.count;
	}

	async getUserReviewStats(userId: number) {
		const experienceUser = alias(cybUserExperience, 'expUser');
		const [result] = await db.select({
			count: sql<number>`count(*)`,
			avgRating: sql<number>`COALESCE(AVG(${cybUserExperienceRating.rating}), 0)`,
		})
			.from(cybUserExperienceRating)
			.leftJoin(cybUserExperience, eq(cybUserExperienceRating.experience, cybUserExperience.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperienceRating.status, 1),
				eq(cybUserExperienceRating.isDeleted, 0),
			));
		return result;
	}

	// Employment Approval

	async findExperienceByIdAndUser(id: number, userId: number) {
		const [exp] = await db.select()
			.from(cybUserExperience)
			.where(and(eq(cybUserExperience.user, userId), eq(cybUserExperience.id, id)));
		return exp;
	}

	async approveExperience(id: number) {
		await db.update(cybUserExperience)
			.set({ status: 1 })
			.where(eq(cybUserExperience.id, id));
	}

	async updateUserCurrentPosition(userId: number, designation: number, company: number) {
		await db.update(cybUser)
			.set({ currentPossition: designation, currentCompany: company })
			.where(eq(cybUser.id, userId));
	}

	// View Requests

	async getViewRequestsPaginated(userId: number, limit: number, offset: number) {
		const rows = await db.select({
			id: cybUserProfileViewRequest.id,
			createDate: cybUserProfileViewRequest.createDate,
			expiry: cybUserProfileViewRequest.expiry,
			status: cybUserProfileViewRequest.status,
			companyName: cybUser.fname,
			claimStatus: cybUser.claimStatus,
			profile: cybUser.profile,
			slug: cybUser.slug,
			individualId: cybUser.individualId,
			userType: cybUser.userType,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			designationName: cybDesignation.name,
		})
			.from(cybUserProfileViewRequest)
			.leftJoin(cybUser, eq(cybUserProfileViewRequest.companyid, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.where(and(
				eq(cybUserProfileViewRequest.userid, userId),
				eq(cybUserProfileViewRequest.isDeleted, 0),
			))
			.orderBy(desc(cybUserProfileViewRequest.createDate))
			.limit(limit)
			.offset(offset);
		return rows;
	}

	async countViewRequests(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserProfileViewRequest)
			.where(and(
				eq(cybUserProfileViewRequest.userid, userId),
				eq(cybUserProfileViewRequest.isDeleted, 0),
			));
		return result.count;
	}

	async getFollowRequestsPaginated(userId: number, limit: number, offset: number) {
		const rows = await db.select({
			id: cybFollow.id,
			createDate: cybFollow.createDate,
			fname: cybUser.fname,
			lname: cybUser.lname,
			profile: cybUser.profile,
			slug: cybUser.slug,
			individualId: cybUser.individualId,
			onExplore: cybUser.onExplore,
			onImmediate: cybUser.onImmediate,
			onNotice: cybUser.onNotice,
			userType: cybUser.userType,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			designationName: cybDesignation.name,
		})
			.from(cybFollow)
			.leftJoin(cybUser, eq(cybFollow.followedId, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.where(and(
				eq(cybFollow.followerId, userId),
				eq(cybFollow.status, 0),
				eq(cybFollow.isDeleted, 0),
			))
			.limit(limit)
			.offset(offset);
		return rows;
	}

	/** Pending follow cards only (status = 0) — AllViewRequest.followListCount */
	async countFollowRequests(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followerId, userId),
				eq(cybFollow.status, 0),
				eq(cybFollow.isDeleted, 0),
			));
		return Number(result?.count ?? 0);
	}

	/**
	 * Dashboard followRequests badge: status != 1 (pending + rejected).
	 * followList uses status = 0 only — badge can be > list length.
	 */
	async countFollowRequestsNotAccepted(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followerId, userId),
				ne(cybFollow.status, 1),
				eq(cybFollow.isDeleted, 0),
			));
		return Number(result?.count ?? 0);
	}

	async findViewRequestByIdAndUser(id: number, userId: number) {
		const [req] = await db.select()
			.from(cybUserProfileViewRequest)
			.where(and(
				eq(cybUserProfileViewRequest.userid, userId),
				eq(cybUserProfileViewRequest.id, id),
			));
		return req;
	}

	async approveViewRequest(id: number, status: number, expiry: string, access: string) {
		await db.update(cybUserProfileViewRequest)
			.set({ status, expiry, access })
			.where(eq(cybUserProfileViewRequest.id, id));
	}

	async rejectViewRequest(id: number) {
		await db.update(cybUserProfileViewRequest)
			.set({ status: 0 })
			.where(eq(cybUserProfileViewRequest.id, id));
	}

	async softDeleteViewRequest(id: number, userId: number) {
		const result = await db.update(cybUserProfileViewRequest)
			.set({ isDeleted: 1 })
			.where(and(
				eq(cybUserProfileViewRequest.userid, userId),
				eq(cybUserProfileViewRequest.id, id),
				eq(cybUserProfileViewRequest.isDeleted, 0),
			));
		return result;
	}

	// Check Current Company

	async findCurrentEmployments(userId: number, excludeId?: number) {
		const conditions = [
			eq(cybUserExperience.user, userId),
			eq(cybUserExperience.stillWorking, 1),
			eq(cybUserExperience.isDeleted, 0),
		];
		if (excludeId) {
			conditions.push(ne(cybUserExperience.id, excludeId));
		}
		const companyUser = alias(cybUser, 'companyAlias');
		const rows = await db.select({
			id: cybUserExperience.id,
			companyName: companyUser.fname,
			departmentName: cybDepartment.name,
			designationName: cybDesignation.name,
		})
			.from(cybUserExperience)
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.leftJoin(cybDepartment, eq(cybUserExperience.department, cybDepartment.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.where(and(...conditions));
		return rows;
	}

	// Dashboard

	/**
	 * PHP get_all_connections_count — accepted inbound followers
	 * (follower_id = me, status = 1). Inverted column naming.
	 */
	async countConnections(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybFollow)
			.innerJoin(cybUser, eq(cybUser.id, cybFollow.followedId))
			.where(and(
				eq(cybFollow.followerId, userId),
				eq(cybFollow.status, 1),
				eq(cybFollow.isDeleted, 0),
			));
		return Number(result?.count ?? 0);
	}

	/** PHP: is_viewed != 1 (no is_deleted filter). */
	async countUnreadMessages(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybMessageHistory)
			.where(and(eq(cybMessageHistory.receiver, userId), ne(cybMessageHistory.isViewed, 1),));
		return Number(result?.count ?? 0);
	}

	/**
	 * PHP get_pending_follower_list — no LIMIT (call-site 10 is ignored).
	 * Initiator is followed_id; company_name from initiator.current_company.
	 */
	async getPendingFollowRequests(userId: number) {
		const initiator = alias(cybUser, 'followInitiator');
		const companyUser = alias(cybUser, 'followInitiatorCompany');
		const rows = await db.select({
			id: cybFollow.id,
			status: cybFollow.status,
			createDate: cybFollow.createDate,
			fname: initiator.fname,
			lname: initiator.lname,
			profile: initiator.profile,
			socialImage: initiator.socialImage,
			slug: initiator.slug,
			userType: initiator.userType,
			individualId: initiator.individualId,
			designationName: cybDesignation.name,
			companyName: companyUser.fname,
			stateName: cybState.name,
			countryName: cybCountry.name,
		})
			.from(cybFollow)
			.leftJoin(initiator, eq(cybFollow.followedId, initiator.id))
			.leftJoin(companyUser, eq(initiator.currentCompany, companyUser.id))
			.leftJoin(cybDesignation, eq(initiator.currentPossition, cybDesignation.id))
			.leftJoin(cybState, eq(initiator.state, cybState.id))
			.leftJoin(cybCountry, eq(initiator.country, cybCountry.id))
			.where(and(
				eq(cybFollow.followerId, userId),
				eq(cybFollow.status, 0),
				eq(cybFollow.isDeleted, 0),
			))
			.orderBy(desc(cybFollow.id));
		return rows;
	}

	/** @deprecated use getPendingFollowRequests — kept for any residual callers */
	async getTopPendingFollowRequests(userId: number, _limit?: number) {
		return this.getPendingFollowRequests(userId);
	}

	/**
	 * PHP dashboard skillList — status=1, no is_deleted filter, order rating DESC.
	 * id is user_skill.id; skill is master name or "".
	 */
	async getUserSkillsWithRating(userId: number) {
		const rows = await db.select({
			id: cybUserSkill.id,
			skill: cybSkill.name,
			rating: cybUserSkill.rating,
		})
			.from(cybUserSkill)
			.leftJoin(cybSkill, eq(cybUserSkill.skill, cybSkill.id))
			.where(and(
				eq(cybUserSkill.user, userId),
				eq(cybUserSkill.status, 1),
			))
			.orderBy(desc(cybUserSkill.rating));
		return rows;
	}

	/**
	 * Still-working employments for dashboard currentEmployees, with company join
	 * non-null. Ordered still_working DESC, joining_date DESC for seed pick per company.
	 */
	async getStillWorkingExperiences(userId: number) {
		const companyUser = alias(cybUser, 'empCompany');
		const employeeUser = alias(cybUser, 'empEmployee');
		const rows = await db.select({
			id: cybUserExperience.id,
			user: cybUserExperience.user,
			company: cybUserExperience.company,
			workEmail: cybUserExperience.workEmail,
			salary: cybUserExperience.salary,
			salaryInhand: cybUserExperience.salaryInhand,
			salaryMode: cybUserExperience.salaryMode,
			joiningDate: cybUserExperience.joiningDate,
			workedTillDate: cybUserExperience.workedTillDate,
			stillWorking: cybUserExperience.stillWorking,
			skill: cybUserExperience.skill,
			certificate: cybUserExperience.certificate,
			description: cybUserExperience.description,
			approved: cybUserExperience.approved,
			status: cybUserExperience.status,
			hired: cybUserExperience.hired,
			companyName: companyUser.fname,
			companyId: companyUser.id,
			companyProfile: companyUser.profile,
			companySocialImage: companyUser.socialImage,
			claimStatus: companyUser.claimStatus,
			companySlug: companyUser.slug,
			individualId: companyUser.individualId,
			userSlug: employeeUser.slug,
			employementName: cybEmployementType.name,
			designationName: cybDesignation.name,
			departmentName: cybDepartment.name,
		})
			.from(cybUserExperience)
			.innerJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.leftJoin(employeeUser, eq(cybUserExperience.user, employeeUser.id))
			.leftJoin(cybEmployementType, eq(cybUserExperience.employmentType, cybEmployementType.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(cybDepartment, eq(cybUserExperience.department, cybDepartment.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.stillWorking, 1),
				eq(cybUserExperience.isDeleted, 0),
			))
			.orderBy(desc(cybUserExperience.stillWorking), desc(cybUserExperience.joiningDate));
		return rows;
	}

	/** True if any experience for (user, company) has hired truthy. */
	async hasHiredAtCompany(userId: number, companyId: number): Promise<boolean> {
		const [row] = await db.select({ id: cybUserExperience.id })
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.isDeleted, 0),
				eq(cybUserExperience.hired, 1),
			))
			.limit(1);
		return !!row;
	}

	/**
	 * sendReminder companies: pending approval (approved=0) at claimed companies.
	 */
	async getPendingApproveCompanyIds(userId: number): Promise<Set<number>> {
		const companyUser = alias(cybUser, 'pendingApproveCompany');
		const rows = await db.select({ company: cybUserExperience.company })
			.from(cybUserExperience)
			.innerJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.approved, 0),
				eq(cybUserExperience.isDeleted, 0),
				eq(companyUser.claimStatus, 1),
			));
		return new Set(rows.map((r) => r.company!).filter(Boolean));
	}

	async getCompanyVerifiedDomains(companyId: number) {
		return db
			.select({
				domain: cybUserDomains.domain,
				email: cybUserDomains.email,
				isVerified: cybUserDomains.isVerified,
			})
			.from(cybUserDomains)
			.where(and(
				eq(cybUserDomains.userId, companyId),
				eq(cybUserDomains.isVerified, 1),
				eq(cybUserDomains.isDeleted, 0),
			));
	}

	async countCompanyVerifiedDomainOrEmail(companyId: number): Promise<number> {
		const [row] = await db
			.select({ count: sql<number>`count(*)` })
			.from(cybUserDomains)
			.where(and(
				eq(cybUserDomains.userId, companyId),
				eq(cybUserDomains.isVerified, 1),
				eq(cybUserDomains.isDeleted, 0),
				sql`((${cybUserDomains.domain} IS NOT NULL AND ${cybUserDomains.domain} != '') OR (${cybUserDomains.email} IS NOT NULL AND ${cybUserDomains.email} != ''))`,
			));
		return Number(row?.count ?? 0);
	}

	// Resume

	async clearUserResume(userId: number) {
		await db.update(cybUser)
			.set({ resume: '', resumeName: '' })
			.where(eq(cybUser.id, userId));
	}
}

export default new jobDashboardRepositery();
