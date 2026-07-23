import { and, eq, sql, desc, asc, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybUser, cybUserDocument, cybDoctype, cybMessage, cybMessageHistory,
	cybNotifications, cybClearNotification, cybFollow,
	cybState, cybCountry, cybDesignation, cybIndustries, cybCompanyJob,
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
}

export default new generalRepositery();
