import { and, eq, or, sql, desc } from "drizzle-orm";
import db from "../db";
import {
	cybOtp,
	cybUser,
	cybUserDetails,
	cybUserDocument,
	cybUserLoginHistory,
	cybUserRelation,
	cybUserPermission,
	cybUserGroup,
	cybAccountSetting,
	cybAccountDeleteRequests,
	cybCompanyInvite,
	cybUserExperience,
	cybUserEducation,
	cybCompanyJob,
	cybFollow,
	cybCities,
} from "../db/schema";
import { USER_TYPE } from "./users.repositery";

class LoginRepository {
	// ====== OTP ======

	async upsertOtp(params: { phone?: string; email?: string; otp: string; expiry: string }) {
		const now = new Date().toISOString().slice(0, 19).replace("T", " ");
		const phone = params.phone || "";
		const email = params.email || null;

		// Soft-delete previous OTPs for same phone/email
		if (phone) {
			await db
				.update(cybOtp)
				.set({ isDeleted: 1 })
				.where(and(eq(cybOtp.phone, phone), eq(cybOtp.isDeleted, 0)));
		}
		if (email) {
			await db
				.update(cybOtp)
				.set({ isDeleted: 1 })
				.where(and(eq(cybOtp.email, email), eq(cybOtp.isDeleted, 0)));
		}

		const [{ id }] = await db
			.insert(cybOtp)
			.values({
				phone,
				email,
				otp: params.otp,
				expiry: params.expiry,
				status: 1,
				isDeleted: 0,
				type: "LOGIN",
				createDate: now,
			})
			.$returningId();
		return id;
	}

	async findValidOtp(params: { phone?: string; email?: string; otp?: string }) {
		const conditions = [eq(cybOtp.isDeleted, 0), eq(cybOtp.status, 1)];
		if (params.phone) conditions.push(eq(cybOtp.phone, params.phone));
		if (params.email) conditions.push(eq(cybOtp.email, params.email));
		if (params.otp) conditions.push(eq(cybOtp.otp, params.otp));

		const [row] = await db
			.select()
			.from(cybOtp)
			.where(and(...conditions))
			.orderBy(desc(cybOtp.id))
			.limit(1);
		return row;
	}

	async deleteOtps(params: { phone?: string; email?: string }) {
		if (params.phone) {
			await db
				.update(cybOtp)
				.set({ isDeleted: 1 })
				.where(and(eq(cybOtp.phone, params.phone), eq(cybOtp.isDeleted, 0)));
		}
		if (params.email) {
			await db
				.update(cybOtp)
				.set({ isDeleted: 1 })
				.where(and(eq(cybOtp.email, params.email), eq(cybOtp.isDeleted, 0)));
		}
	}

	// ====== Users ======

	async findEmployeeByPhone(phone: string) {
		const [row] = await db
			.select()
			.from(cybUser)
			.where(and(or(eq(cybUser.phone, phone), eq(cybUser.secondPhone, phone)),
				eq(cybUser.userType, USER_TYPE.EMPLOYEE),
				eq(cybUser.isDeleted, 0)
			)
			)
			.limit(1);
		return row;
	}

	async findEmployeeByEmail(email: string) {
		const lowered = email.toLowerCase();
		const [row] = await db
			.select()
			.from(cybUser)
			.where(
				and(
					or(eq(cybUser.email, lowered), eq(cybUser.emailAlternate, lowered)),
					eq(cybUser.userType, 1),
					eq(cybUser.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findAnyByPhone(phone: string) {
		const [row] = await db
			.select()
			.from(cybUser)
			.where(
				and(
					or(eq(cybUser.phone, phone), eq(cybUser.secondPhone, phone)),
					eq(cybUser.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findAnyByEmail(email: string) {
		const lowered = email.toLowerCase();
		const [row] = await db
			.select()
			.from(cybUser)
			.where(
				and(
					or(eq(cybUser.email, lowered), eq(cybUser.emailAlternate, lowered)),
					eq(cybUser.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	/** Email lookup for social login including apple_id */
	async findByEmailOrApple(email: string, appleId?: string) {
		const lowered = email.toLowerCase();
		const conditions = [
			eq(cybUser.isDeleted, 0),
			or(eq(cybUser.email, lowered), eq(cybUser.emailAlternate, lowered)),
		];
		if (appleId) {
			const [byApple] = await db
				.select()
				.from(cybUser)
				.where(and(eq(cybUser.appleId, appleId), eq(cybUser.isDeleted, 0)))
				.limit(1);
			if (byApple) return byApple;
		}
		const [row] = await db
			.select()
			.from(cybUser)
			.where(and(...conditions))
			.limit(1);
		return row;
	}

	async findById(id: number) {
		const [row] = await db
			.select()
			.from(cybUser)
			.where(and(eq(cybUser.id, id), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async findByIndividualId(individualId: string) {
		const [row] = await db
			.select()
			.from(cybUser)
			.where(and(eq(cybUser.individualId, individualId), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async findCompanyByPhoneWithoutRelation(phone: string) {
		const [company] = await db
			.select()
			.from(cybUser)
			.where(
				and(
					or(eq(cybUser.phone, phone), eq(cybUser.secondPhone, phone)),
					eq(cybUser.userType, 2),
					eq(cybUser.isDeleted, 0)
				)
			)
			.limit(1);
		if (!company) return null;
		const relation = await this.getUserRelationByCompany(company.id);
		if (relation) return null;
		return company;
	}

	async createUser(data: Record<string, unknown>) {
		const [{ id }] = await db.insert(cybUser).values(data as any).$returningId();
		return this.findById(id);
	}

	async updateUser(id: number, data: Record<string, unknown>) {
		await db.update(cybUser).set(data as any).where(eq(cybUser.id, id));
		return this.findById(id);
	}

	async setToken(userId: number, token: string) {
		const now = new Date().toISOString().slice(0, 19).replace("T", " ");
		await db
			.update(cybUser)
			.set({ token, loginTime: now, modifyDate: now })
			.where(eq(cybUser.id, userId));
	}

	// ====== User details ======

	async createEmptyUserDetails(userId: number) {
		const [existing] = await db
			.select({ id: cybUserDetails.id })
			.from(cybUserDetails)
			.where(eq(cybUserDetails.userId, userId))
			.limit(1);
		if (existing) return existing.id;
		const [{ id }] = await db.insert(cybUserDetails).values({ userId }).$returningId();
		return id;
	}

	async updateUserDetails(userId: number, data: Record<string, unknown>) {
		const [existing] = await db
			.select({ id: cybUserDetails.id })
			.from(cybUserDetails)
			.where(eq(cybUserDetails.userId, userId))
			.limit(1);
		if (existing) {
			await db.update(cybUserDetails).set(data as any).where(eq(cybUserDetails.userId, userId));
		} else {
			await db.insert(cybUserDetails).values({ userId, ...data } as any);
		}
	}

	// ====== Settings / groups / relation ======

	async createDefaultSettings(userId: number) {
		const defaults: Record<string, string> = {
			email_notification: "1",
			push_notification: "1",
			profile_visibility: "public",
			show_salary: "0",
			show_email: "1",
			show_mobile: "0",
			show_address: "1",
			show_dob: "0",
		};
		const nowRows = Object.entries(defaults).map(([key, value]) => ({
			userId,
			code: "config",
			key,
			value,
			status: 1,
		}));
		for (const row of nowRows) {
			const [existing] = await db
				.select({ id: cybAccountSetting.id })
				.from(cybAccountSetting)
				.where(and(eq(cybAccountSetting.userId, userId), eq(cybAccountSetting.key, row.key)))
				.limit(1);
			if (!existing) {
				await db.insert(cybAccountSetting).values(row);
			}
		}
	}

	async createDefaultUserGroups(userId: number) {
		const now = new Date().toISOString().slice(0, 19).replace("T", " ");
		const [existing] = await db
			.select({ id: cybUserGroup.id })
			.from(cybUserGroup)
			.where(and(eq(cybUserGroup.ownerId, userId), eq(cybUserGroup.isDeleted, 0)))
			.limit(1);
		if (existing) return;

		await db.insert(cybUserGroup).values({
			groupId: 1,
			ownerId: userId,
			addedBy: userId,
			status: 1,
			isDeleted: 0,
			menuPermission: null,
			eventPermission: null,
			createDate: now,
			modifyDate: now,
		});
	}

	async createUserRelation(userId: number, companyId: number, type = 1) {
		const now = new Date().toISOString().slice(0, 19).replace("T", " ");
		const [existing] = await db
			.select()
			.from(cybUserRelation)
			.where(
				and(
					eq(cybUserRelation.userId, userId),
					eq(cybUserRelation.companyId, companyId),
					eq(cybUserRelation.isDeleted, 0)
				)
			)
			.limit(1);
		if (existing) return existing.id;

		const [{ id }] = await db
			.insert(cybUserRelation)
			.values({
				userId,
				companyId,
				type,
				status: 1,
				isDeleted: 0,
				createDate: now,
				modifyDate: now,
			})
			.$returningId();

		// Super-admin permission groupId=1
		await db.insert(cybUserPermission).values({
			userId,
			groupId: 1,
			addedBy: userId,
			parentId: companyId,
			status: 1,
			isDeleted: 0,
			createDate: now,
			modifyDate: now,
		});

		return id;
	}

	async getUserRelationByCompany(companyId: number) {
		const [row] = await db
			.select()
			.from(cybUserRelation)
			.where(and(eq(cybUserRelation.companyId, companyId), eq(cybUserRelation.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async getUserRelation(userId: number, companyId: number) {
		const [row] = await db
			.select()
			.from(cybUserRelation)
			.where(
				and(
					eq(cybUserRelation.userId, userId),
					eq(cybUserRelation.companyId, companyId),
					eq(cybUserRelation.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	/** First active company relation for an employee (final-signup company branch). */
	async getFirstUserRelation(userId: number) {
		const [row] = await db
			.select()
			.from(cybUserRelation)
			.where(and(eq(cybUserRelation.userId, userId), eq(cybUserRelation.isDeleted, 0)))
			.orderBy(desc(cybUserRelation.id))
			.limit(1);
		return row;
	}

	async findExperienceByUserAndCompany(userId: number, companyId: number) {
		const [row] = await db
			.select()
			.from(cybUserExperience)
			.where(
				and(
					eq(cybUserExperience.user, userId),
					eq(cybUserExperience.company, companyId),
					eq(cybUserExperience.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findFirstEducation(userId: number) {
		const [row] = await db
			.select({ id: cybUserEducation.id })
			.from(cybUserEducation)
			.where(
				and(
					eq(cybUserEducation.user, userId),
					eq(cybUserEducation.isDeleted, 0)
				)
			)
			.orderBy(desc(cybUserEducation.id))
			.limit(1);
		return row;
	}

	async findFirstCompanyJob(companyId: number) {
		const [row] = await db
			.select({ id: cybCompanyJob.id })
			.from(cybCompanyJob)
			.where(and(eq(cybCompanyJob.company, companyId), eq(cybCompanyJob.isDeleted, 0)))
			.orderBy(desc(cybCompanyJob.id))
			.limit(1);
		return row;
	}

	// ====== Login history ======

	async saveLoginHistory(params: {
		userId: number;
		deviceId?: string;
		ipAddress?: string;
		userAgent?: string;
		platform?: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace("T", " ");
		await db.insert(cybUserLoginHistory).values({
			userId: params.userId,
			deviceId: params.deviceId || null,
			ipAddress: params.ipAddress || null,
			userAgent: params.userAgent || null,
			platform: params.platform || null,
			status: 1,
			loginAt: now,
		});
	}

	// ====== Documents ======

	async insertPanDocument(userId: number, pan: string) {
		const now = new Date().toISOString().slice(0, 19).replace("T", " ");
		await db.insert(cybUserDocument).values({
			user: userId,
			doctype: 2,
			docnumber: pan,
			status: 0,
			isDeleted: 0,
			createDate: now,
			modifyDate: now,
		});
	}

	// ====== Invite ======

	async findInviteById(id: number) {
		const [row] = await db
			.select()
			.from(cybCompanyInvite)
			.where(and(eq(cybCompanyInvite.id, id), eq(cybCompanyInvite.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async findInviteByEmail(email: string) {
		const [row] = await db
			.select()
			.from(cybCompanyInvite)
			.where(
				and(
					eq(cybCompanyInvite.email, email.toLowerCase()),
					eq(cybCompanyInvite.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async markInviteDeleted(id: number) {
		const now = new Date().toISOString().slice(0, 19).replace("T", " ");
		await db
			.update(cybCompanyInvite)
			.set({ isDeleted: 1, modifyDate: now })
			.where(eq(cybCompanyInvite.id, id));
	}

	// ====== Stats helpers ======

	async getFollowCounts(userId: number) {
		// PHP inverted: following = followed_id=me; follower = follower_id=me
		const [following] = await db
			.select({ count: sql<number>`count(*)` })
			.from(cybFollow)
			.where(
				and(eq(cybFollow.followedId, userId), eq(cybFollow.status, 1), eq(cybFollow.isDeleted, 0))
			);
		const [follower] = await db
			.select({ count: sql<number>`count(*)` })
			.from(cybFollow)
			.where(
				and(eq(cybFollow.followerId, userId), eq(cybFollow.status, 1), eq(cybFollow.isDeleted, 0))
			);
		return {
			following: Number(following?.count || 0),
			follower: Number(follower?.count || 0),
		};
	}

	async getStillWorkingExperience(userId: number) {
		const [row] = await db
			.select()
			.from(cybUserExperience)
			.where(
				and(
					eq(cybUserExperience.user, userId),
					eq(cybUserExperience.stillWorking, 1),
					eq(cybUserExperience.isDeleted, 0)
				)
			)
			.orderBy(desc(cybUserExperience.id))
			.limit(1);
		return row;
	}

	async getAccountDeletion(userId: number) {
		const [row] = await db
			.select({ id: cybAccountDeleteRequests.id })
			.from(cybAccountDeleteRequests)
			.where(
				and(
					eq(cybAccountDeleteRequests.userId, userId),
					eq(cybAccountDeleteRequests.isDeleted, 0)
				)
			)
			.limit(1);
		return !!row;
	}

	async hasActiveJobs(companyId: number) {
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
		return !!row;
	}

	async countConnections(companyId: number) {
		const [result] = await db
			.select({ count: sql<number>`count(distinct ${cybUserExperience.user})` })
			.from(cybUserExperience)
			.where(
				and(
					eq(cybUserExperience.company, companyId),
					eq(cybUserExperience.isDeleted, 0)
				)
			);
		return Number(result?.count || 0);
	}

	async createCity(name: string, stateId?: number, userId?: number) {
		const [{ id }] = await db
			.insert(cybCities)
			.values({
				name,
				state: stateId || null,
				userDifined: 1,
				userId: userId || null,
				status: 1,
			} as any)
			.$returningId();
		return id;
	}

	async findCityByName(name: string) {
		const [row] = await db
			.select()
			.from(cybCities)
			.where(eq(cybCities.name, name))
			.limit(1);
		return row;
	}

	async createExperience(data: Record<string, unknown>) {
		const [{ id }] = await db.insert(cybUserExperience).values(data as any).$returningId();
		return id;
	}

	async updateExperience(id: number, data: Record<string, unknown>) {
		await db.update(cybUserExperience).set(data as any).where(eq(cybUserExperience.id, id));
	}
}

export default new LoginRepository();
