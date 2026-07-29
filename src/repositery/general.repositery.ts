import { and, eq, sql, desc, asc, count, inArray, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybUser, cybUserDocument, cybDoctype, cybMessage, cybMessageHistory,
	cybNotifications, cybClearNotification, cybFollow,
	cybState, cybCountry, cybDesignation, cybIndustries, cybCompanyJob,
	cybCities, cybSalary, cybEmployementType, cybUserExperience,
	cybLanguages, cybTurnover, cybCompanySize, cybNoticePeriod,
	cybBenefits, cybRoleTypes, cybJobExperiences, cybAccomodation, cybTag,
	cybJobMode, cybWorkType, cybDepartment, cybJobMeta, cybCompanyBenefits,
	cybUserExperienceRating, cybCompanyInvite, cybSuggestion, cybUserLoginHistory,
} from '../db/schema';

class generalRepositery {

	async getUserById(userId: number) {
		const [row] = await db.select({
			id: cybUser.id,
			email: cybUser.email,
			phone: cybUser.phone,
			fullName: cybUser.fullName,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			userType: cybUser.userType,
			emailVerified: cybUser.emailVerified,
			phoneVerified: cybUser.phoneVerified,
			createDate: cybUser.createDate,
		})
			.from(cybUser)
			.where(and(eq(cybUser.id, userId), eq(cybUser.isDeleted, 0)));
		return row;
	}

	// ====== Document List (Endpoint #2) ======

	async getDocumentList(userId: number, page: number, limit: number) {
		const offset = (page - 1) * limit;

		const [countResult] = await db.select({ count: count() })
			.from(cybUserDocument)
			.where(and(
				eq(cybUserDocument.user, userId),
				eq(cybUserDocument.isDeleted, 0),
			));

		const documents = await db.select({
			id: cybUserDocument.id,
			user: cybUserDocument.user,
			doctype: cybUserDocument.doctype,
			doc: cybUserDocument.doc,
			docnumber: cybUserDocument.docnumber,
			status: cybUserDocument.status,
			createDate: cybUserDocument.createDate,
			modifyDate: cybUserDocument.modifyDate,
			doctypeName: cybDoctype.name,
		})
			.from(cybUserDocument)
			.leftJoin(cybDoctype, eq(cybUserDocument.doctype, cybDoctype.id))
			.where(and(
				eq(cybUserDocument.user, userId),
				eq(cybUserDocument.isDeleted, 0),
			))
			.orderBy(desc(cybUserDocument.createDate))
			.limit(limit)
			.offset(offset);

		const totalCount = countResult?.count ?? 0;

		return {
			current_page: page,
			per_page: limit,
			total_count: totalCount,
			total_pages: Math.ceil(totalCount / limit),
			documents,
		};
	}

	// ====== All Message List (Endpoint #3) ======

	async getMessageThreads(userId: number) {
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
			.orderBy(desc(cybMessage.createDate));

		return threads;
	}

	async getLastMessage(messageId: number) {
		const [row] = await db.select()
			.from(cybMessageHistory)
			.where(and(
				eq(cybMessageHistory.messageId, messageId),
				eq(cybMessageHistory.isDeleted, 0),
			))
			.orderBy(desc(cybMessageHistory.createDate))
			.limit(1);

		return row;
	}

	async getUnreadCount(messageId: number, userId: number) {
		const [result] = await db.select({ count: count() })
			.from(cybMessageHistory)
			.where(and(
				eq(cybMessageHistory.messageId, messageId),
				eq(cybMessageHistory.receiver, userId),
				eq(cybMessageHistory.isViewed, 0),
				eq(cybMessageHistory.isDeleted, 0),
			));
		return result?.count ?? 0;
	}

	async getUserBasicInfo(userId: number) {
		const [row] = await db.select({
			id: cybUser.id,
			fullName: cybUser.fullName,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
		})
			.from(cybUser)
			.where(eq(cybUser.id, userId));
		return row;
	}

	// ====== Notifications (Endpoints #4, #11, #13, #14, #15) ======

	async getNotifications(userId: number) {
		const rows = await db.select({
			id: cybNotifications.id,
			sender: cybNotifications.sender,
			receiver: cybNotifications.receiver,
			message: cybNotifications.message,
			doc: cybNotifications.doc,
			type: cybNotifications.type,
			link: cybNotifications.link,
			redirect: cybNotifications.redirect,
			isViewed: cybNotifications.isViewed,
			slug: cybNotifications.slug,
			createDate: cybNotifications.createDate,
		})
			.from(cybNotifications)
			.leftJoin(cybClearNotification, and(
				eq(cybNotifications.id, cybClearNotification.notificationId),
				eq(cybClearNotification.userId, userId),
			))
			.where(and(
				eq(cybNotifications.receiver, userId),
				eq(cybNotifications.isDeleted, 0),
				sql`${cybClearNotification.id} IS NULL`,
			))
			.orderBy(desc(cybNotifications.createDate));

		return rows;
	}

	async getUnreadNotificationCount(userId: number) {
		const [result] = await db.select({ count: count() })
			.from(cybNotifications)
			.leftJoin(cybClearNotification, and(
				eq(cybNotifications.id, cybClearNotification.notificationId),
				eq(cybClearNotification.userId, userId),
			))
			.where(and(
				eq(cybNotifications.receiver, userId),
				eq(cybNotifications.isViewed, 0),
				eq(cybNotifications.isDeleted, 0),
				sql`${cybClearNotification.id} IS NULL`,
			));
		return result?.count ?? 0;
	}

	async markAllNotificationsRead(userId: number) {
		const [result] = await db.update(cybNotifications)
			.set({ isViewed: 1 })
			.where(and(
				eq(cybNotifications.receiver, userId),
				eq(cybNotifications.isViewed, 0),
				eq(cybNotifications.isDeleted, 0),
			));
		return result.affectedRows ?? 0;
	}

	async findNotificationById(notificationId: number) {
		const [row] = await db.select()
			.from(cybNotifications)
			.where(eq(cybNotifications.id, notificationId));
		return row;
	}

	async clearNotification(userId: number, notificationId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.insert(cybClearNotification).values({
			userId,
			notificationId,
			clearedAt: now,
		});
	}

	async getAllActiveNotificationIds(userId: number) {
		const rows = await db.select({ id: cybNotifications.id })
			.from(cybNotifications)
			.leftJoin(cybClearNotification, and(
				eq(cybNotifications.id, cybClearNotification.notificationId),
				eq(cybClearNotification.userId, userId),
			))
			.where(and(
				eq(cybNotifications.receiver, userId),
				eq(cybNotifications.isDeleted, 0),
				sql`${cybClearNotification.id} IS NULL`,
			));
		return rows.map(r => r.id);
	}

	async clearAllNotifications(userId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const notificationIds = await this.getAllActiveNotificationIds(userId);
		if (notificationIds.length === 0) return 0;

		const values = notificationIds.map(id => ({
			userId,
			notificationId: id,
			clearedAt: now,
		}));

		await db.insert(cybClearNotification).values(values);
		return notificationIds.length;
	}

	// ====== Verification Status (Endpoint #5) ======

	async getVerificationStatus(userId: number) {
		const [user] = await db.select({
			phoneVerified: cybUser.phoneVerified,
			emailVerified: cybUser.emailVerified,
		})
			.from(cybUser)
			.where(eq(cybUser.id, userId));

		return user;
	}

	// ====== Follow (PHP inverted naming) ======
	// followed_id = initiator (who clicked Follow)
	// follower_id = target (profile being followed)

	/** Users who follow me (UI followers): follower_id = me, card user = followed_id */
	async getFollowerList(userId: number, limit?: number, sqlOffset?: number) {
		const q = db.select({
			id: cybFollow.id,
			createDate: cybFollow.createDate,
			userId: cybUser.id,
			individualId: cybUser.individualId,
			fname: cybUser.fname,
			lname: cybUser.lname,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			slug: cybUser.slug,
			userType: cybUser.userType,
			noticeDate: cybUser.noticeDate,
			onExplore: cybUser.onExplore,
			onImmediate: cybUser.onImmediate,
			onNotice: cybUser.onNotice,
			stateName: cybState.name,
			countryName: cybCountry.name,
			designationName: cybDesignation.name,
			industryName: cybIndustries.name,
		})
			.from(cybFollow)
			.innerJoin(cybUser, eq(cybFollow.followedId, cybUser.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.where(and(
				eq(cybFollow.followerId, userId),
				eq(cybFollow.status, 1),
				eq(cybFollow.isDeleted, 0),
				eq(cybUser.isDeleted, 0),
			))
			.orderBy(desc(cybFollow.id));

		if (limit != null) {
			return q.limit(limit).offset(sqlOffset ?? 0);
		}
		return q;
	}

	/** Users I follow (UI following): followed_id = me, card user = follower_id */
	async getFollowingList(userId: number, limit?: number, sqlOffset?: number) {
		const q = db.select({
			id: cybFollow.id,
			createDate: cybFollow.createDate,
			userId: cybUser.id,
			individualId: cybUser.individualId,
			fname: cybUser.fname,
			lname: cybUser.lname,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			slug: cybUser.slug,
			userType: cybUser.userType,
			noticeDate: cybUser.noticeDate,
			onExplore: cybUser.onExplore,
			onImmediate: cybUser.onImmediate,
			onNotice: cybUser.onNotice,
			stateName: cybState.name,
			countryName: cybCountry.name,
			designationName: cybDesignation.name,
			industryName: cybIndustries.name,
		})
			.from(cybFollow)
			.innerJoin(cybUser, eq(cybFollow.followerId, cybUser.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.where(and(
				eq(cybFollow.followedId, userId),
				eq(cybFollow.status, 1),
				eq(cybFollow.isDeleted, 0),
				eq(cybUser.isDeleted, 0),
			))
			.orderBy(desc(cybFollow.id));

		if (limit != null) {
			return q.limit(limit).offset(sqlOffset ?? 0);
		}
		return q;
	}

	async countFollowerList(userId: number): Promise<number> {
		const [row] = await db.select({ count: count() })
			.from(cybFollow)
			.innerJoin(cybUser, eq(cybFollow.followedId, cybUser.id))
			.where(and(
				eq(cybFollow.followerId, userId),
				eq(cybFollow.status, 1),
				eq(cybFollow.isDeleted, 0),
				eq(cybUser.isDeleted, 0),
			));
		return Number(row?.count ?? 0);
	}

	async countFollowingList(userId: number): Promise<number> {
		const [row] = await db.select({ count: count() })
			.from(cybFollow)
			.innerJoin(cybUser, eq(cybFollow.followerId, cybUser.id))
			.where(and(
				eq(cybFollow.followedId, userId),
				eq(cybFollow.status, 1),
				eq(cybFollow.isDeleted, 0),
				eq(cybUser.isDeleted, 0),
			));
		return Number(row?.count ?? 0);
	}

	/**
	 * Find non-deleted follow where initiator clicked Follow on target.
	 * Row: followed_id = initiatorId, follower_id = targetId
	 */
	async findFollowRelationship(initiatorId: number, targetId: number, requireApproved = false) {
		const conditions = [
			eq(cybFollow.followedId, initiatorId),
			eq(cybFollow.followerId, targetId),
			eq(cybFollow.isDeleted, 0),
		];
		if (requireApproved) {
			conditions.push(eq(cybFollow.status, 1));
		}
		const [row] = await db.select()
			.from(cybFollow)
			.where(and(...conditions))
			.limit(1);
		return row;
	}

	/** Soft-delete by initiator + target (PHP column direction). */
	async softDeleteFollow(initiatorId: number, targetId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybFollow)
			.set({ isDeleted: 1, modifyDate: now })
			.where(and(
				eq(cybFollow.followedId, initiatorId),
				eq(cybFollow.followerId, targetId),
				eq(cybFollow.isDeleted, 0),
			));
	}

	async softDeleteFollowByRowId(id: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybFollow)
			.set({ isDeleted: 1, modifyDate: now })
			.where(and(
				eq(cybFollow.id, id),
				eq(cybFollow.isDeleted, 0),
			));
	}

	/**
	 * PHP followBack: both directions exist (any status / is_deleted).
	 * exists(follower_id=me, followed_id=remote) AND exists(followed_id=me, follower_id=remote)
	 */
	async checkFollowBack(me: number, remoteUserId: number): Promise<boolean> {
		const [a] = await db.select({ id: cybFollow.id })
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followerId, me),
				eq(cybFollow.followedId, remoteUserId),
			))
			.limit(1);
		if (!a) return false;
		const [b] = await db.select({ id: cybFollow.id })
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followedId, me),
				eq(cybFollow.followerId, remoteUserId),
			))
			.limit(1);
		return !!b;
	}

	async companyHasActiveJobs(companyId: number): Promise<number> {
		const [row] = await db.select({ id: cybCompanyJob.id })
			.from(cybCompanyJob)
			.where(and(
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.status, 1),
				eq(cybCompanyJob.isDeleted, 0),
			))
			.limit(1);
		return row ? 1 : 0;
	}

	// ====== Save Document (Endpoint #8) ======

	async findDocumentById(documentId: number) {
		const [row] = await db.select()
			.from(cybUserDocument)
			.where(eq(cybUserDocument.id, documentId));
		return row;
	}

	async createDocument(data: {
		user: number;
		doctype?: number;
		doc?: string;
		docnumber?: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybUserDocument).values({
			user: data.user,
			doctype: data.doctype,
			doc: data.doc,
			docnumber: data.docnumber,
			status: 0,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async updateDocument(documentId: number, data: {
		doctype?: number;
		doc?: string;
		docnumber?: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUserDocument)
			.set({ ...data, modifyDate: now })
			.where(eq(cybUserDocument.id, documentId));
	}

	// ====== Mark Message Read (Endpoint #12) ======

	async findMessageHistoryById(messageId: number) {
		const [row] = await db.select()
			.from(cybMessageHistory)
			.where(eq(cybMessageHistory.id, messageId));
		return row;
	}

	async markMessageRead(messageId: number, userId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybMessageHistory)
			.set({ isViewed: 1, viewDatetime: now })
			.where(and(
				eq(cybMessageHistory.id, messageId),
				eq(cybMessageHistory.receiver, userId),
			));
	}

	// ====== Follow CRUD ======

	async createFollow(data: {
		followedId: number;
		followerId: number;
		status: number;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybFollow).values({
			followedId: data.followedId,
			followerId: data.followerId,
			status: data.status,
			isDeleted: 0,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async findFollowById(id: number) {
		const [row] = await db.select()
			.from(cybFollow)
			.where(and(
				eq(cybFollow.id, id),
				eq(cybFollow.isDeleted, 0),
			))
			.limit(1);
		return row;
	}

	async acceptFollow(id: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybFollow)
			.set({ status: 1, modifyDate: now })
			.where(and(
				eq(cybFollow.id, id),
				eq(cybFollow.isDeleted, 0),
			));
	}

	async rejectFollow(id: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybFollow)
			.set({ isDeleted: 1, modifyDate: now })
			.where(and(
				eq(cybFollow.id, id),
				eq(cybFollow.isDeleted, 0),
			));
	}

	// ====== Delete message (history row by id) ======

	async findMessageHistoryByIdAny(id: number) {
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

	// ====== Public catalog lists (educationDataList / employmentList children) ======

	async getActiveCountries() {
		return db.select({ id: cybCountry.id, name: cybCountry.name })
			.from(cybCountry)
			.where(eq(cybCountry.status, 1));
	}

	async getActiveSalaries() {
		return db.select({ id: cybSalary.id, name: cybSalary.name })
			.from(cybSalary)
			.where(eq(cybSalary.status, 1));
	}

	async getActiveEmploymentTypes() {
		return db.select({ id: cybEmployementType.id, name: cybEmployementType.name })
			.from(cybEmployementType)
			.where(eq(cybEmployementType.status, 1));
	}

	async getActiveLanguages() {
		return db.select({ id: cybLanguages.id, name: cybLanguages.name })
			.from(cybLanguages)
			.where(eq(cybLanguages.status, 1));
	}

	async getActiveTurnovers() {
		return db.select({ id: cybTurnover.id, name: cybTurnover.name })
			.from(cybTurnover)
			.where(eq(cybTurnover.status, 1));
	}

	async getActiveCompanySizes() {
		return db.select({ id: cybCompanySize.id, name: cybCompanySize.name })
			.from(cybCompanySize)
			.where(eq(cybCompanySize.status, 1));
	}

	async getActiveNoticePeriods(type?: string) {
		const conditions = [eq(cybNoticePeriod.status, 1)];
		if (type) conditions.push(eq(cybNoticePeriod.type, type));
		return db.select().from(cybNoticePeriod).where(and(...conditions));
	}

	async getActiveIndustries(limit = 30) {
		return db.select({ id: cybIndustries.id, name: cybIndustries.name })
			.from(cybIndustries)
			.where(eq(cybIndustries.status, 1))
			.orderBy(asc(cybIndustries.name))
			.limit(limit);
	}

	async getActiveBenefits() {
		return db.select({ id: cybBenefits.id, name: cybBenefits.name, image: cybBenefits.image })
			.from(cybBenefits)
			.where(eq(cybBenefits.status, 1));
	}

	async getActiveRoleTypes() {
		return db.select({ id: cybRoleTypes.id, name: cybRoleTypes.name })
			.from(cybRoleTypes)
			.where(eq(cybRoleTypes.status, 1));
	}

	async getActiveJobExperiences() {
		return db.select({ id: cybJobExperiences.id, name: cybJobExperiences.name })
			.from(cybJobExperiences)
			.where(eq(cybJobExperiences.status, 1));
	}

	async getActiveAccomodations() {
		return db.select({ id: cybAccomodation.id, name: cybAccomodation.name })
			.from(cybAccomodation)
			.where(eq(cybAccomodation.status, 1));
	}

	async getActiveTags() {
		return db.select({ id: cybTag.id, name: cybTag.name })
			.from(cybTag)
			.where(eq(cybTag.status, 1));
	}

	async getActiveJobModes() {
		return db.select({ id: cybJobMode.id, name: cybJobMode.name })
			.from(cybJobMode)
			.where(eq(cybJobMode.status, 1));
	}

	async getActiveWorkTypes() {
		return db.select({ id: cybWorkType.id, name: cybWorkType.name })
			.from(cybWorkType)
			.where(eq(cybWorkType.status, 1));
	}

	// ====== employmentList company / user pools ======

	/**
	 * Claimed companies ranked by experience employment count (pool for tier-shuffle).
	 * PHP: user_type=2, claim_status=1, status=1, is_deleted=0, ORDER BY total_employment DESC LIMIT poolSize
	 */
	async getDefaultCompanyPool(poolSize = 30) {
		const employmentCountSql = sql<number>`(
			SELECT COUNT(*)
			FROM cyb_user_experience uex
			INNER JOIN cyb_user urr
				ON uex.user = urr.id AND urr.is_deleted = 0
			WHERE uex.company = ${cybUser.id}
				AND uex.is_deleted = 0
				AND uex.status = 1
		)`.mapWith(Number);

		return db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			fname: cybUser.fname,
			contactPerson: cybUser.contactPerson,
			cityName: cybCities.name,
			stateName: cybState.name,
			industryName: cybIndustries.name,
			totalEmployment: employmentCountSql,
		})
			.from(cybUser)
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.where(and(
				eq(cybUser.userType, 2),
				eq(cybUser.claimStatus, 1),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0),
			))
			.orderBy(desc(employmentCountSql))
			.limit(poolSize);
	}

	async countActiveEmployees(): Promise<number> {
		const [row] = await db.select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
			.from(cybUser)
			.where(and(
				eq(cybUser.userType, 1),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0),
			));
		return row?.count ?? 0;
	}

	/** PHP get_default_user_list: employees ORDER BY id LIMIT/OFFSET */
	async getDefaultUserList(limit = 10, offset = 0) {
		const companyUser = alias(cybUser, 'company');
		return db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			fullName: cybUser.fullName,
			slug: cybUser.slug,
			designationName: cybDesignation.name,
			companyName: companyUser.fname,
		})
			.from(cybUser)
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
			.where(and(
				eq(cybUser.userType, 1),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0),
			))
			.orderBy(asc(cybUser.id))
			.limit(limit)
			.offset(offset);
	}

	async getActiveJobCompanyIds(companyIds: number[]): Promise<number[]> {
		if (companyIds.length === 0) return [];
		const rows = await db.selectDistinct({ companyId: cybCompanyJob.company })
			.from(cybCompanyJob)
			.where(and(
				inArray(cybCompanyJob.company, companyIds),
				eq(cybCompanyJob.status, 1),
				eq(cybCompanyJob.isDeleted, 0),
			));
		return rows.map((r) => r.companyId).filter((id): id is number => id != null);
	}

	/** User row for employmentList ?id= prepend (is_deleted=0 only) */
	async getUserForEmploymentPrepend(userId: number) {
		const [row] = await db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			fname: cybUser.fname,
			lname: cybUser.lname,
			contactPerson: cybUser.contactPerson,
			userType: cybUser.userType,
		})
			.from(cybUser)
			.where(and(eq(cybUser.id, userId), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	/** Random sample of active companies (dashboard dataList) */
	async getRandomCompanySample(limit = 20) {
		return db.select({
			id: cybUser.id,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			fname: cybUser.fname,
			contactPerson: cybUser.contactPerson,
		})
			.from(cybUser)
			.where(and(
				eq(cybUser.userType, 2),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0),
			))
			.orderBy(sql`RAND()`)
			.limit(limit);
	}

	// ====== Location lookups ======

	async getCities(state?: number) {
		const conditions = [eq(cybCities.status, 1)];
		if (state) conditions.push(eq(cybCities.state, state));
		return db.select().from(cybCities).where(and(...conditions)).orderBy(asc(cybCities.name));
	}

	async getCitiesIdName(stateId?: number) {
		const conditions = [eq(cybCities.status, 1)];
		if (stateId) conditions.push(eq(cybCities.state, stateId));
		return db.select({ id: cybCities.id, name: cybCities.name })
			.from(cybCities)
			.where(and(...conditions))
			.orderBy(asc(cybCities.name));
	}

	async getStates(country?: number) {
		const conditions = [eq(cybState.status, 1)];
		if (country) conditions.push(eq(cybState.country, country));
		return db.select().from(cybState).where(and(...conditions)).orderBy(asc(cybState.name));
	}

	async getCountriesByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybCountry.id, name: cybCountry.name })
			.from(cybCountry)
			.where(and(eq(cybCountry.status, 1), inArray(cybCountry.id, ids)));
	}

	async getStatesByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybState.id, name: cybState.name })
			.from(cybState)
			.where(and(eq(cybState.status, 1), inArray(cybState.id, ids)));
	}

	async getCitiesByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybCities.id, name: cybCities.name })
			.from(cybCities)
			.where(and(eq(cybCities.status, 1), inArray(cybCities.id, ids)));
	}

	async getCitiesSample(limit = 100) {
		return db.select({ id: cybCities.id, name: cybCities.name })
			.from(cybCities)
			.where(eq(cybCities.status, 1))
			.limit(limit);
	}

	async getDesignationsByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybDesignation.id, name: cybDesignation.name })
			.from(cybDesignation)
			.where(and(eq(cybDesignation.status, 1), inArray(cybDesignation.id, ids)));
	}

	async getDepartmentsByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybDepartment.id, name: cybDepartment.name })
			.from(cybDepartment)
			.where(and(eq(cybDepartment.status, 1), inArray(cybDepartment.id, ids)));
	}

	async getIndustriesByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybIndustries.id, name: cybIndustries.name })
			.from(cybIndustries)
			.where(and(eq(cybIndustries.status, 1), inArray(cybIndustries.id, ids)));
	}

	async getSalariesByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybSalary.id, name: cybSalary.name })
			.from(cybSalary)
			.where(and(eq(cybSalary.status, 1), inArray(cybSalary.id, ids)));
	}

	async getJobExperiencesByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybJobExperiences.id, name: cybJobExperiences.name })
			.from(cybJobExperiences)
			.where(and(eq(cybJobExperiences.status, 1), inArray(cybJobExperiences.id, ids)));
	}

	async getRoleTypesByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybRoleTypes.id, name: cybRoleTypes.name })
			.from(cybRoleTypes)
			.where(and(eq(cybRoleTypes.status, 1), inArray(cybRoleTypes.id, ids)));
	}

	async getJobModesByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybJobMode.id, name: cybJobMode.name })
			.from(cybJobMode)
			.where(and(eq(cybJobMode.status, 1), inArray(cybJobMode.id, ids)));
	}

	async getCompanyNamesByIds(ids: number[]) {
		if (ids.length === 0) return [];
		return db.select({ id: cybUser.id, name: cybUser.fname })
			.from(cybUser)
			.where(and(eq(cybUser.status, 1), eq(cybUser.isDeleted, 0), inArray(cybUser.id, ids)));
	}

	async getCompanyNamesSample(limit = 30) {
		return db.select({ id: cybUser.id, name: cybUser.fname })
			.from(cybUser)
			.where(and(eq(cybUser.status, 1), eq(cybUser.isDeleted, 0), eq(cybUser.userType, 2)))
			.limit(limit);
	}

	// ====== Job filter / meta ======

	async getJobMetaBySlug(slug: string) {
		const [meta] = await db.select().from(cybJobMeta).where(eq(cybJobMeta.jobSlug, slug)).limit(1);
		return meta;
	}

	async getJobsForFilter(countryIds: number[], stateIds: number[], cityIds: number[]) {
		const jobConditions = [
			eq(cybCompanyJob.status, 1),
			eq(cybCompanyJob.isDeleted, 0),
			eq(cybUser.isDeleted, 0),
		];
		if (countryIds.length > 0) jobConditions.push(inArray(cybCompanyJob.country, countryIds));
		if (stateIds.length > 0) jobConditions.push(inArray(cybCompanyJob.state, stateIds));
		if (cityIds.length > 0) jobConditions.push(inArray(cybCompanyJob.city, cityIds));

		return db.select({
			designation: cybCompanyJob.designation,
			department: cybCompanyJob.department,
			skill: cybCompanyJob.skill,
			industry: cybCompanyJob.industry,
			salary: cybCompanyJob.salary,
			experience: cybCompanyJob.experience,
			company: cybCompanyJob.company,
			roleType: cybCompanyJob.roleType,
			jobMode: cybCompanyJob.jobMode,
		})
			.from(cybCompanyJob)
			.leftJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
			.where(and(...jobConditions));
	}

	async getBenefitsUsedByCompanies() {
		return db.select({ id: cybBenefits.id, name: cybBenefits.name, image: cybBenefits.image })
			.from(cybBenefits)
			.leftJoin(cybCompanyBenefits, eq(cybBenefits.id, cybCompanyBenefits.benefitId))
			.where(and(eq(cybBenefits.status, 1), eq(cybCompanyBenefits.isDeleted, 0)))
			.groupBy(cybBenefits.id);
	}

	// ====== Ratings / reviews ======

	async getExperienceReviews(employmentId: number, order?: number) {
		const conditions = [
			eq(cybUserExperienceRating.experience, employmentId),
			eq(cybUserExperienceRating.status, 1),
			eq(cybUserExperienceRating.isDeleted, 0),
		];
		let orderClause;
		if (order === 2) orderClause = desc(cybUserExperienceRating.rating);
		else if (order === 3) orderClause = asc(cybUserExperienceRating.rating);
		else orderClause = desc(cybUserExperienceRating.id);

		return db.select({
			id: cybUserExperienceRating.id,
			experience: cybUserExperienceRating.experience,
			company: cybUserExperienceRating.company,
			rating: cybUserExperienceRating.rating,
			review: cybUserExperienceRating.review,
			doc: cybUserExperienceRating.doc,
			link: cybUserExperienceRating.link,
			addedBy: cybUserExperienceRating.addedBy,
			status: cybUserExperienceRating.status,
			approved: cybUserExperienceRating.approved,
			createDate: cybUserExperienceRating.createDate,
			modifyDate: cybUserExperienceRating.modifyDate,
		})
			.from(cybUserExperienceRating)
			.where(and(...conditions))
			.orderBy(orderClause);
	}

	async getEmployeesForStarRating(limit = 50) {
		return db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			slug: cybUser.slug,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			percentage: cybUser.percentage,
			emailVerified: cybUser.emailVerified,
			phoneVerified: cybUser.phoneVerified,
			currentPossition: cybUser.currentPossition,
			currentCompany: cybUser.currentCompany,
		})
			.from(cybUser)
			.where(and(
				eq(cybUser.userType, 1),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0),
			))
			.orderBy(desc(cybUser.percentage))
			.limit(limit);
	}

	// ====== Invite / suggestion / logout ======

	async getCompanyInviteById(id: number) {
		const [invite] = await db.select().from(cybCompanyInvite).where(eq(cybCompanyInvite.id, id)).limit(1);
		return invite;
	}

	async insertSuggestion(data: { name: string; phone: number; description: string; createDate: string; modifyDate: string }) {
		await db.insert(cybSuggestion).values(data);
	}

	async clearUserToken(userId: number, modifyDate: string) {
		await db.update(cybUser)
			.set({ token: null, modifyDate })
			.where(eq(cybUser.id, userId));
	}

	async insertLoginHistory(data: {
		userId: number;
		ipAddress?: string | null;
		userAgent?: string;
		logoutAt: string;
	}) {
		await db.insert(cybUserLoginHistory).values({
			userId: data.userId,
			ipAddress: data.ipAddress || null,
			userAgent: data.userAgent || "",
			logoutAt: data.logoutAt,
		});
	}

	// ====== Global search ======

	async searchCompanies(keyword: string, limit: number, offset: number) {
		const conditions: SQL[] = [
			eq(cybUser.userType, 2),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (keyword) {
			conditions.push(sql`${cybUser.fname} LIKE ${'%' + keyword + '%'}`);
		}
		const where = and(...conditions);
		const [rows, countRow] = await Promise.all([
			db.select({
				id: cybUser.id,
				fname: cybUser.fname,
				slug: cybUser.slug,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				industry: cybUser.industry,
				city: cybUser.city,
				state: cybUser.state,
				emailVerified: cybUser.emailVerified,
				phoneVerified: cybUser.phoneVerified,
				industryName: cybIndustries.name,
				cityName: cybCities.name,
				stateName: cybState.name,
				companySizeName: cybCompanySize.name,
			})
				.from(cybUser)
				.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
				.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
				.leftJoin(cybState, eq(cybUser.state, cybState.id))
				.leftJoin(cybCompanySize, eq(cybUser.companySize, cybCompanySize.id))
				.where(where)
				.limit(limit)
				.offset(offset),
			db.select({ count: sql<number>`count(*)` }).from(cybUser).where(where),
		]);
		return { rows, count: Number(countRow[0]?.count || 0) };
	}

	async searchEmployees(keyword: string, limit: number, offset: number) {
		const conditions: SQL[] = [
			eq(cybUser.userType, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (keyword) {
			conditions.push(sql`(${cybUser.fname} LIKE ${'%' + keyword + '%'} OR ${cybUser.fullName} LIKE ${'%' + keyword + '%'})`);
		}
		const where = and(...conditions);
		const companyUser = alias(cybUser, 'empCompany');
		const [rows, countRow] = await Promise.all([
			db.select({
				id: cybUser.id,
				fullName: cybUser.fullName,
				slug: cybUser.slug,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				percentage: cybUser.percentage,
				emailVerified: cybUser.emailVerified,
				phoneVerified: cybUser.phoneVerified,
				designationName: cybDesignation.name,
				companyName: companyUser.fname,
			})
				.from(cybUser)
				.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
				.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
				.where(where)
				.limit(limit)
				.offset(offset),
			db.select({ count: sql<number>`count(*)` }).from(cybUser).where(where),
		]);
		return { rows, count: Number(countRow[0]?.count || 0) };
	}

	async searchJobs(keyword: string, limit: number, offset: number) {
		const conditions: SQL[] = [
			eq(cybCompanyJob.status, 1),
			eq(cybCompanyJob.isDeleted, 0),
			eq(cybUser.isDeleted, 0),
		];
		if (keyword) {
			conditions.push(sql`(${cybCompanyJob.jobTitle} LIKE ${'%' + keyword + '%'} OR ${cybCompanyJob.skill} LIKE ${'%' + keyword + '%'})`);
		}
		const where = and(...conditions);
		const [rows, countRow] = await Promise.all([
			db.select({
				id: cybCompanyJob.id,
				jobTitle: cybCompanyJob.jobTitle,
				slug: cybCompanyJob.slug,
				company_name: cybUser.fname,
				company_slug: cybUser.slug,
				designation_name: cybDesignation.name,
				department_name: cybDepartment.name,
				experience_name: cybJobExperiences.name,
				country_name: cybCountry.name,
				state_name: cybState.name,
				city_name: cybCities.name,
				salary_name: cybSalary.name,
				vacancy: cybCompanyJob.vacancy,
				urgent: cybCompanyJob.urgent,
				create_date: cybCompanyJob.createDate,
			})
				.from(cybCompanyJob)
				.leftJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
				.leftJoin(cybDesignation, eq(cybCompanyJob.designation, cybDesignation.id))
				.leftJoin(cybDepartment, eq(cybCompanyJob.department, cybDepartment.id))
				.leftJoin(cybJobExperiences, eq(cybCompanyJob.experience, cybJobExperiences.id))
				.leftJoin(cybCountry, eq(cybCompanyJob.country, cybCountry.id))
				.leftJoin(cybState, eq(cybCompanyJob.state, cybState.id))
				.leftJoin(cybCities, eq(cybCompanyJob.city, cybCities.id))
				.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
				.where(where)
				.limit(limit)
				.offset(offset),
			db.select({ count: sql<number>`count(*)` })
				.from(cybCompanyJob)
				.leftJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
				.where(where),
		]);
		return { rows, count: Number(countRow[0]?.count || 0) };
	}
}

export default new generalRepositery();
