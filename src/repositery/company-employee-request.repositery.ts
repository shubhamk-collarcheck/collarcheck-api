import { and, eq, sql, desc, asc, count, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybUser, cybUserExperience, cybUserExperienceRating, cybUserExperienceRatingHistory,
	cybUserUpdateExperience, cybUserUpdateExperienceHistory, cybFollow, cybMessage, cybMessageHistory,
	cybCompanyJob, cybDesignation, cybDepartment, cybEmployementType, cybIndustries,
	cybUserRelation, cybAccountDeleteRequests, cybCompanyInvite, cybAccountSetting,
	cybUserPermission, cybUserGroup, cybSkillRating,
} from '../db/schema';

class companyEmployeeRequestRepositery {

	async getCompanyDetail(companyId: number) {
		const [row] = await db.select({
			id: cybUser.id,
			fname: cybUser.fname,
			lname: cybUser.lname,
			email: cybUser.email,
			phone: cybUser.phone,
			profile: cybUser.profile,
			website: cybUser.website,
			profileDescription: cybUser.profileDescription,
			presentAddress: cybUser.presentAddress,
			city: cybUser.city,
			state: cybUser.state,
			country: cybUser.country,
			slug: cybUser.slug,
			incorporateDate: cybUser.incorporateDate,
			turnover: cybUser.turnover,
			companySize: cybUser.companySize,
			industry: cybUser.industry,
			onExplore: cybUser.onExplore,
			linkdin: cybUser.linkdin,
			youtube: cybUser.youtube,
			instagram: cybUser.instagram,
			facebook: cybUser.facebook,
			twitter: cybUser.twitter,
			claimStatus: cybUser.claimStatus,
			status: cybUser.status,
		})
			.from(cybUser)
			.where(and(eq(cybUser.id, companyId), eq(cybUser.isDeleted, 0)));
		return row;
	}

	async getCompanyConnectionCount(companyId: number) {
		const [result] = await db.select({ count: count() })
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followedId, companyId),
				eq(cybFollow.status, 1),
				eq(cybFollow.isDeleted, 0),
			));
		return result?.count ?? 0;
	}

	async getCompanyFollowerCount(companyId: number) {
		const [result] = await db.select({ count: count() })
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followerId, companyId),
				eq(cybFollow.status, 1),
				eq(cybFollow.isDeleted, 0),
			));
		return result?.count ?? 0;
	}

	async getUserById(userId: number) {
		const [row] = await db.select({
			id: cybUser.id,
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			email: cybUser.email,
			phone: cybUser.phone,
			slug: cybUser.slug,
			profile: cybUser.profile,
			currentCompany: cybUser.currentCompany,
			currentPossition: cybUser.currentPossition,
			onExplore: cybUser.onExplore,
			onImmediate: cybUser.onImmediate,
			onNotice: cybUser.onNotice,
			noticeDate: cybUser.noticeDate,
			individualId: cybUser.individualId,
			userType: cybUser.userType,
			claimStatus: cybUser.claimStatus,
			status: cybUser.status,
		})
			.from(cybUser)
			.where(and(eq(cybUser.id, userId), eq(cybUser.isDeleted, 0)));
		return row;
	}

	async findUserByEmailOrPhone(email?: string, phone?: string) {
		const conditions = [eq(cybUser.isDeleted, 0)];
		if (email) conditions.push(eq(cybUser.email, email));
		if (phone) conditions.push(eq(cybUser.phone, phone));

		const [row] = await db.select()
			.from(cybUser)
			.where(and(...conditions));
		return row;
	}

	async createUser(data: {
		email?: string;
		phone?: string;
		userType?: number;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybUser).values({
			email: data.email,
			phone: data.phone,
			userType: data.userType || 1,
			status: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async createExperience(data: {
		user: number;
		company: number;
		joiningDate?: string;
		salary?: string;
		designation?: number;
		department?: number;
		employmentType?: number;
		skill?: string;
		description?: string;
		approved?: number;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybUserExperience).values({
			user: data.user,
			company: data.company,
			joiningDate: data.joiningDate,
			salary: data.salary,
			designation: data.designation,
			department: data.department,
			employmentType: data.employmentType,
			skill: data.skill,
			description: data.description,
			approved: data.approved || 3,
			stillWorking: 1,
			status: 1,
			createDate: now,
		}).$returningId();
		return id;
	}

	async getExperienceById(experienceId: number) {
		const [row] = await db.select()
			.from(cybUserExperience)
			.where(eq(cybUserExperience.id, experienceId));
		return row;
	}

	async getExperienceDetail(experienceId: number) {
		const [row] = await db.select({
			id: cybUserExperience.id,
			user: cybUserExperience.user,
			company: cybUserExperience.company,
			designation: cybUserExperience.designation,
			department: cybUserExperience.department,
			employmentType: cybUserExperience.employmentType,
			salary: cybUserExperience.salary,
			salaryInhand: cybUserExperience.salaryInhand,
			salaryMode: cybUserExperience.salaryMode,
			joiningDate: cybUserExperience.joiningDate,
			workedTillDate: cybUserExperience.workedTillDate,
			stillWorking: cybUserExperience.stillWorking,
			approved: cybUserExperience.approved,
			skill: cybUserExperience.skill,
			description: cybUserExperience.description,
			lastReview: cybUserExperience.lastReview,
			createDate: cybUserExperience.createDate,
			// User fields
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			slug: cybUser.slug,
			profile: cybUser.profile,
			individualId: cybUser.individualId,
			// Designation
			designationName: cybDesignation.name,
			departmentName: cybDepartment.name,
			employmentTypeName: cybEmployementType.name,
		})
			.from(cybUserExperience)
			.leftJoin(cybUser, eq(cybUserExperience.user, cybUser.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(cybDepartment, eq(cybUserExperience.department, cybDepartment.id))
			.leftJoin(cybEmployementType, eq(cybUserExperience.employmentType, cybEmployementType.id))
			.where(eq(cybUserExperience.id, experienceId));
		return row;
	}

	async getExperienceRating(experienceId: number) {
		const [result] = await db.select({
			avgRating: sql<number>`COALESCE(AVG(${cybUserExperienceRating.rating}), 0)`,
			count: count(),
		})
			.from(cybUserExperienceRating)
			.where(and(
				eq(cybUserExperienceRating.experience, experienceId),
				eq(cybUserExperienceRating.isDeleted, 0),
			));
		return result;
	}

	async getUpdateExperienceRecord(experienceId: number, type?: number) {
		const conditions = [
			eq(cybUserUpdateExperience.experienceId, experienceId),
			eq(cybUserUpdateExperience.isDeleted, 0),
		];
		if (type) conditions.push(eq(cybUserUpdateExperience.type, type));

		return db.select()
			.from(cybUserUpdateExperience)
			.where(and(...conditions));
	}

	async rejectExperience(experienceId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUserExperience)
			.set({ approved: 2, modifyDate: now })
			.where(eq(cybUserExperience.id, experienceId));
	}

	async deleteUpdateExperience(experienceId: number, type: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUserUpdateExperience)
			.set({ isDeleted: 1, modifyDate: now })
			.where(and(
				eq(cybUserUpdateExperience.experienceId, experienceId),
				eq(cybUserUpdateExperience.type, type),
			));
	}

	async updateExperienceLeave(experienceId: number, workedTillDate: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUserExperience)
			.set({
				stillWorking: 0,
				workedTillDate,
				modifyDate: now,
			})
			.where(eq(cybUserExperience.id, experienceId));
	}

	async updateExperiencePromotion(experienceId: number, data: {
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

	async updateUserCurrentPosition(userId: number, data: {
		currentCompany?: number | null;
		currentPossition?: number | null;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUser)
			.set({ ...data, modifyDate: now })
			.where(eq(cybUser.id, userId));
	}

	async updateExperienceExpiry(experienceId: number, expiry: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUserExperience)
			.set({ expiry, modifyDate: now })
			.where(eq(cybUserExperience.id, experienceId));
	}

	async getUniqueEmployeesWithReviews(companyId: number, keyword?: string) {
		const conditions = [
			eq(cybUserExperience.company, companyId),
			eq(cybUserExperience.status, 1),
			eq(cybUserExperience.isDeleted, 0),
		];

		const rows = await db.select({
			userId: cybUserExperience.user,
			experienceId: cybUserExperience.id,
			designation: cybUserExperience.designation,
			stillWorking: cybUserExperience.stillWorking,
			fname: cybUser.fname,
			lname: cybUser.lname,
			slug: cybUser.slug,
			profile: cybUser.profile,
			onExplore: cybUser.onExplore,
			onImmediate: cybUser.onImmediate,
			onNotice: cybUser.onNotice,
			individualId: cybUser.individualId,
		})
			.from(cybUserExperience)
			.leftJoin(cybUser, eq(cybUserExperience.user, cybUser.id))
			.where(and(...conditions));

		return rows;
	}

	async getUserRatingStats(userId: number, companyId: number) {
		const [result] = await db.select({
			avgRating: sql<number>`COALESCE(AVG(${cybUserExperienceRating.rating}), 0)`,
			count: count(),
		})
			.from(cybUserExperienceRating)
			.innerJoin(cybUserExperience, eq(cybUserExperienceRating.experience, cybUserExperience.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperienceRating.isDeleted, 0),
			));
		return result;
	}

	async checkValidToReview(companyId: number, userId: number) {
		const [row] = await db.select()
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.approved, 1),
				eq(cybUserExperience.isDeleted, 0),
			));
		return row;
	}

	async getFollowRequests(companyId: number, limit = 6, offset = 0) {
		return db.select({
			id: cybFollow.id,
			followerId: cybFollow.followerId,
			createDate: cybFollow.createDate,
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			profile: cybUser.profile,
			slug: cybUser.slug,
			individualId: cybUser.individualId,
			userType: cybUser.userType,
		})
			.from(cybFollow)
			.innerJoin(cybUser, eq(cybFollow.followerId, cybUser.id))
			.where(and(
				eq(cybFollow.followedId, companyId),
				eq(cybFollow.status, 0),
				eq(cybFollow.isDeleted, 0),
			))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(cybFollow.createDate));
	}

	async getDashboardStats(companyId: number) {
		const [jobCount] = await db.select({ count: count() })
			.from(cybCompanyJob)
			.where(and(
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.status, 1),
				eq(cybCompanyJob.isDeleted, 0),
			));

		const [empCount] = await db.select({ count: count() })
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.stillWorking, 1),
				eq(cybUserExperience.approved, 1),
				eq(cybUserExperience.isDeleted, 0),
			));

		const [pendingCount] = await db.select({ count: count() })
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.approved, 3),
				eq(cybUserExperience.isDeleted, 0),
			));

		return {
			postedJobs: jobCount?.count ?? 0,
			currentEmployies: empCount?.count ?? 0,
			employementRequestCount: pendingCount?.count ?? 0,
		};
	}

	async getPendingEmploymentRequests(companyId: number) {
		return db.select({
			id: cybUserExperience.id,
			user: cybUserExperience.user,
			approved: cybUserExperience.approved,
			stillWorking: cybUserExperience.stillWorking,
			joiningDate: cybUserExperience.joiningDate,
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			slug: cybUser.slug,
			profile: cybUser.profile,
			designationName: cybDesignation.name,
		})
			.from(cybUserExperience)
			.leftJoin(cybUser, eq(cybUserExperience.user, cybUser.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.approved, 3),
				eq(cybUserExperience.isDeleted, 0),
			))
			.limit(10);
	}

	async getPendingReviewCount(companyId: number) {
		const [result] = await db.select({ count: count() })
			.from(cybUserExperienceRating)
			.innerJoin(cybUserExperience, eq(cybUserExperienceRating.experience, cybUserExperience.id))
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperienceRating.approved, 0),
				eq(cybUserExperienceRating.isDeleted, 0),
			));
		return result?.count ?? 0;
	}

	async getFollowRequestCount(companyId: number) {
		const [result] = await db.select({ count: count() })
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followedId, companyId),
				eq(cybFollow.status, 0),
				eq(cybFollow.isDeleted, 0),
			));
		return result?.count ?? 0;
	}

	async getUserRelation(userId: number, companyId: number) {
		const [row] = await db.select()
			.from(cybUserRelation)
			.where(and(
				eq(cybUserRelation.userId, userId),
				eq(cybUserRelation.companyId, companyId),
				eq(cybUserRelation.isDeleted, 0),
			));
		return row;
	}

	async getCompanyRelations(userId: number) {
		return db.select({
			relationId: cybUserRelation.id,
			companyId: cybUserRelation.companyId,
			type: cybUserRelation.type,
			// Company fields
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			profile: cybUser.profile,
			slug: cybUser.slug,
			individualId: cybUser.individualId,
			city: cybUser.city,
			state: cybUser.state,
			country: cybUser.country,
			industry: cybUser.industry,
			companySize: cybUser.companySize,
			claimStatus: cybUser.claimStatus,
			onExplore: cybUser.onExplore,
			status: cybUser.status,
		})
			.from(cybUserRelation)
			.innerJoin(cybUser, eq(cybUserRelation.companyId, cybUser.id))
			.where(and(
				eq(cybUserRelation.userId, userId),
				eq(cybUserRelation.isDeleted, 0),
			));
	}

	async createMessage(data: {
		sender: number;
		receiver: number;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybMessage).values({
			sender: data.sender,
			receiver: data.receiver,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async findMessage(sender: number, receiver: number) {
		const [row] = await db.select()
			.from(cybMessage)
			.where(and(
				eq(cybMessage.sender, sender),
				eq(cybMessage.receiver, receiver),
				eq(cybMessage.isDeleted, 0),
			));
		return row;
	}

	async getMessageThreads(userId: number, limit = 50, offset = 0) {
		// Get unique message connections
		const threads = await db.select({
			id: cybMessage.id,
			sender: cybMessage.sender,
			receiver: cybMessage.receiver,
			createDate: cybMessage.createDate,
		})
			.from(cybMessage)
			.where(and(
				sql`(${cybMessage.sender} = ${userId} OR ${cybMessage.receiver} = ${userId})`,
				eq(cybMessage.isDeleted, 0),
			))
			.orderBy(desc(cybMessage.createDate))
			.limit(limit)
			.offset(offset);

		return threads;
	}

	async getMessageHistory(messageId: number) {
		return db.select()
			.from(cybMessageHistory)
			.where(and(
				eq(cybMessageHistory.messageId, messageId),
				eq(cybMessageHistory.isDeleted, 0),
			))
			.orderBy(asc(cybMessageHistory.createDate));
	}

	async createMessageHistory(data: {
		messageId: number;
		sender: number;
		receiver: number;
		message: string;
		doc?: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybMessageHistory).values({
			messageId: data.messageId,
			sender: data.sender,
			receiver: data.receiver,
			message: data.message,
			doc: data.doc,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async markMessagesAsRead(messageId: number, userId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybMessageHistory)
			.set({ isViewed: 1, viewDatetime: now })
			.where(and(
				eq(cybMessageHistory.messageId, messageId),
				eq(cybMessageHistory.receiver, userId),
			));
	}

	async getUnreadMessageCount(userId: number) {
		const [result] = await db.select({ count: count() })
			.from(cybMessageHistory)
			.where(and(
				eq(cybMessageHistory.receiver, userId),
				eq(cybMessageHistory.isViewed, 0),
				eq(cybMessageHistory.isDeleted, 0),
			));
		return result?.count ?? 0;
	}

	async findMessageHistoryById(id: number) {
		const [row] = await db.select()
			.from(cybMessageHistory)
			.where(and(
				eq(cybMessageHistory.id, id),
				eq(cybMessageHistory.isDeleted, 0),
			))
			.limit(1);
		return row;
	}

	async softDeleteMessageHistory(id: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybMessageHistory)
			.set({ isDeleted: 1, modifyDate: now })
			.where(eq(cybMessageHistory.id, id));
	}

	async findCompanyBySlug(slug: string) {
		const [row] = await db.select()
			.from(cybUser)
			.where(and(
				eq(cybUser.slug, slug),
				eq(cybUser.userType, 2),
				eq(cybUser.isDeleted, 0),
			))
			.limit(1);
		return row;
	}

	async getCompanyJobsForProfile(companyId: number, limit = 20) {
		return db.select({
			id: cybCompanyJob.id,
			title: cybCompanyJob.jobTitle,
			vacancy: cybCompanyJob.vacancy,
			slug: cybCompanyJob.slug,
			salary: cybCompanyJob.salary,
			createDate: cybCompanyJob.createDate,
			urgent: cybCompanyJob.urgent,
			experience: cybCompanyJob.experience,
			department: cybCompanyJob.department,
			roleType: cybCompanyJob.roleType,
			designation: cybCompanyJob.designation,
			country: cybCompanyJob.country,
			state: cybCompanyJob.state,
			city: cybCompanyJob.city,
		})
			.from(cybCompanyJob)
			.where(and(
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.status, 1),
				eq(cybCompanyJob.isDeleted, 0),
			))
			.orderBy(desc(cybCompanyJob.createDate))
			.limit(limit);
	}

	async hasActiveJobs(companyId: number) {
		const [row] = await db.select({ count: count() })
			.from(cybCompanyJob)
			.where(and(
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.status, 1),
				eq(cybCompanyJob.isDeleted, 0),
			));
		return (row?.count ?? 0) > 0 ? 1 : 0;
	}

	async getFollowData(userId: number, limit = 50, offset = 0) {
		const followers = await db.select({
			id: cybFollow.id,
			followerId: cybFollow.followerId,
			createDate: cybFollow.createDate,
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			profile: cybUser.profile,
			slug: cybUser.slug,
			individualId: cybUser.individualId,
			userType: cybUser.userType,
			onExplore: cybUser.onExplore,
			onImmediate: cybUser.onImmediate,
			onNotice: cybUser.onNotice,
		})
			.from(cybFollow)
			.innerJoin(cybUser, eq(cybFollow.followerId, cybUser.id))
			.where(and(
				eq(cybFollow.followedId, userId),
				eq(cybFollow.status, 1),
				eq(cybFollow.isDeleted, 0),
			))
			.limit(limit)
			.offset(offset);

		const following = await db.select({
			id: cybFollow.id,
			followedId: cybFollow.followedId,
			createDate: cybFollow.createDate,
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			profile: cybUser.profile,
			slug: cybUser.slug,
			individualId: cybUser.individualId,
			userType: cybUser.userType,
			onExplore: cybUser.onExplore,
			onImmediate: cybUser.onImmediate,
			onNotice: cybUser.onNotice,
		})
			.from(cybFollow)
			.innerJoin(cybUser, eq(cybFollow.followedId, cybUser.id))
			.where(and(
				eq(cybFollow.followerId, userId),
				eq(cybFollow.status, 1),
				eq(cybFollow.isDeleted, 0),
			))
			.limit(limit)
			.offset(offset);

		return { followers, following };
	}

	async checkFollowStatus(userId: number, companyId: number) {
		const [row] = await db.select()
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followerId, userId),
				eq(cybFollow.followedId, companyId),
				eq(cybFollow.isDeleted, 0),
			));
		return row;
	}

	async getAccountDeleteRequest(userId: number) {
		const [row] = await db.select()
			.from(cybAccountDeleteRequests)
			.where(and(
				eq(cybAccountDeleteRequests.userId, userId),
				eq(cybAccountDeleteRequests.isDeleted, 0),
			));
		return row;
	}

	async createClaimCompany(data: {
		email?: string;
		phone?: string;
		contactPerson?: string;
		website?: string;
		company?: string;
		message?: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		// Insert into company_invite or similar table
		const [{ id }] = await db.insert(cybCompanyInvite).values({
			email: data.email,
			phone: data.phone,
			contactPerson: data.contactPerson,
			website: data.website,
			company: 0,
			addedBy: 0,
			claimStatus: 1,
			status: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async revokeDeleteAccount(userId: number, companyId?: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const targetUserId = companyId || userId;
		await db.update(cybAccountDeleteRequests)
			.set({ isDeleted: 1, status: 0 })
			.where(and(
				eq(cybAccountDeleteRequests.userId, targetUserId),
				eq(cybAccountDeleteRequests.isDeleted, 0),
			));
	}

	async getDesignationName(id: number) {
		const [row] = await db.select({ name: cybDesignation.name })
			.from(cybDesignation)
			.where(eq(cybDesignation.id, id));
		return row?.name ?? '';
	}

	async getDepartmentName(id: number) {
		const [row] = await db.select({ name: cybDepartment.name })
			.from(cybDepartment)
			.where(eq(cybDepartment.id, id));
		return row?.name ?? '';
	}

	async getEmploymentTypeName(id: number) {
		const [row] = await db.select({ name: cybEmployementType.name })
			.from(cybEmployementType)
			.where(eq(cybEmployementType.id, id));
		return row?.name ?? '';
	}

	async getIndustryName(id: number) {
		const [row] = await db.select({ name: cybIndustries.name })
			.from(cybIndustries)
			.where(eq(cybIndustries.id, id));
		return row?.name ?? '';
	}
}

export default new companyEmployeeRequestRepositery();
