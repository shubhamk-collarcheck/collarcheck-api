import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import db from "../db";
import {
	cybUserMainGroup, cybUserGroup, cybUserPermission, cybUserRelation, cybEventMenu, cybWebMenu, cybUser,
	cybDoctype, cybAccountDeleteRequests, cybCities, cybState, cybCountry,
	cybDesignation, cybIndustries, cybCompanyJob, cybUserExperience, cybNotifications,
} from "../db/schema";

function nowSql() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

class AccountMigrationRepositery {
	// ---- main group / user group ----
	async findMainGroupById(id: number) {
		const [row] = await db
			.select()
			.from(cybUserMainGroup)
			.where(
				and(
					eq(cybUserMainGroup.id, id),
					eq(cybUserMainGroup.status, 1),
					eq(cybUserMainGroup.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findMainGroupByName(name: string, companyId?: number) {
		const conditions = [
			eq(cybUserMainGroup.name, name),
			eq(cybUserMainGroup.status, 1),
			eq(cybUserMainGroup.isDeleted, 0),
		];
		if (companyId) conditions.push(eq(cybUserMainGroup.companyId, companyId));
		const [row] = await db
			.select()
			.from(cybUserMainGroup)
			.where(and(...conditions))
			.limit(1);
		return row;
	}

	async createMainGroup(data: { name: string; companyId: number; description?: string }) {
		const now = nowSql();
		const [{ id }] = await db
			.insert(cybUserMainGroup)
			.values({
				name: data.name,
				description: data.description || "",
				companyId: data.companyId,
				status: 1,
				isDeleted: 0,
				createDate: now,
				modifyDate: now,
			})
			.$returningId();
		return id;
	}

	async findUserGroup(groupId: number, addedBy: number) {
		const [row] = await db
			.select()
			.from(cybUserGroup)
			.where(
				and(
					eq(cybUserGroup.groupId, groupId),
					eq(cybUserGroup.addedBy, addedBy),
					eq(cybUserGroup.status, 1),
					eq(cybUserGroup.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findUserGroupById(id: number) {
		const [row] = await db.select().from(cybUserGroup).where(eq(cybUserGroup.id, id)).limit(1);
		return row;
	}

	async createUserGroup(data: {
		groupId: number;
		menuPermission: string;
		eventPermission: string;
		addedBy: number;
		ownerId: number;
	}) {
		const now = nowSql();
		const [{ id }] = await db
			.insert(cybUserGroup)
			.values({
				groupId: data.groupId,
				menuPermission: data.menuPermission,
				eventPermission: data.eventPermission,
				addedBy: data.addedBy,
				ownerId: data.ownerId,
				status: 1,
				isDeleted: 0,
				createDate: now,
				modifyDate: now,
			})
			.$returningId();
		return id;
	}

	async updateUserGroup(
		id: number,
		data: { menuPermission: string; eventPermission: string; groupId?: number }
	) {
		return db
			.update(cybUserGroup)
			.set({
				menuPermission: data.menuPermission,
				eventPermission: data.eventPermission,
				...(data.groupId != null ? { groupId: data.groupId } : {}),
				modifyDate: nowSql(),
			})
			.where(eq(cybUserGroup.id, id));
	}

	async listUserGroups(ownerId: number) {
		return db
			.select({
				user_group_id: cybUserGroup.id,
				main_group_id: cybUserGroup.groupId,
				group_name: cybUserMainGroup.name,
				description: cybUserMainGroup.description,
				menu_permission: cybUserGroup.menuPermission,
				event_permission: cybUserGroup.eventPermission,
				create_date: cybUserGroup.createDate,
			})
			.from(cybUserGroup)
			.leftJoin(cybUserMainGroup, eq(cybUserGroup.groupId, cybUserMainGroup.id))
			.where(
				and(
					or(eq(cybUserGroup.ownerId, ownerId), eq(cybUserGroup.addedBy, ownerId)),
					eq(cybUserGroup.status, 1),
					eq(cybUserGroup.isDeleted, 0)
				)
			)
			.orderBy(asc(cybUserGroup.id));
	}

	async softDeleteUserGroups(ids: number[]) {
		if (!ids.length) return;
		await db
			.update(cybUserGroup)
			.set({ isDeleted: 1, modifyDate: nowSql() })
			.where(inArray(cybUserGroup.id, ids));
	}

	// ---- events / menus ----
	async listEvents() {
		return db
			.select({
				id: cybEventMenu.id,
				name: cybEventMenu.name,
				description: cybEventMenu.description,
				menu_id: cybEventMenu.menuId,
			})
			.from(cybEventMenu)
			.where(and(eq(cybEventMenu.status, 1), eq(cybEventMenu.isDeleted, 0)))
			.orderBy(asc(cybEventMenu.id));
	}

	async getMenuIdsByEventIds(eventIds: number[]): Promise<number[]> {
		if (!eventIds.length) return [1];
		const rows = await db
			.select({ menuId: cybEventMenu.menuId })
			.from(cybEventMenu)
			.where(
				and(
					inArray(cybEventMenu.id, eventIds),
					eq(cybEventMenu.status, 1),
					eq(cybEventMenu.isDeleted, 0)
				)
			);
		const menus = rows
			.map((r) => r.menuId)
			.filter((id): id is number => id != null && id > 0);
		const unique = [...new Set([1, ...menus])];
		// dashboard menu 1 first
		return [1, ...unique.filter((id) => id !== 1)];
	}

	async getMenusByIds(ids: number[]) {
		if (!ids.length) return [];
		return db
			.select({ id: cybWebMenu.id, name: cybWebMenu.name, icon: cybWebMenu.icon })
			.from(cybWebMenu)
			.where(and(inArray(cybWebMenu.id, ids), eq(cybWebMenu.status, 1)));
	}

	async getAllMenus() {
		return db
			.select({ id: cybWebMenu.id, name: cybWebMenu.name, icon: cybWebMenu.icon })
			.from(cybWebMenu)
			.where(eq(cybWebMenu.status, 1))
			.orderBy(asc(cybWebMenu.sortOrder));
	}

	async getEventsByIds(ids: number[]) {
		if (!ids.length) return [];
		return db
			.select({
				id: cybEventMenu.id,
				name: cybEventMenu.name,
				description: cybEventMenu.description,
			})
			.from(cybEventMenu)
			.where(and(inArray(cybEventMenu.id, ids), eq(cybEventMenu.status, 1)));
	}

	// ---- permissions / relations ----
	async findActivePermissionForUserCompany(userId: number, companyId: number) {
		const [row] = await db
			.select()
			.from(cybUserPermission)
			.where(
				and(
					eq(cybUserPermission.userId, userId),
					eq(cybUserPermission.addedBy, companyId),
					eq(cybUserPermission.status, 1),
					eq(cybUserPermission.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findPermissionById(id: number) {
		const [row] = await db
			.select()
			.from(cybUserPermission)
			.where(eq(cybUserPermission.id, id))
			.limit(1);
		return row;
	}

	async createPermission(data: {
		userId: number;
		groupId: number;
		addedBy: number;
		parentId: number;
	}) {
		const now = nowSql();
		const [{ id }] = await db
			.insert(cybUserPermission)
			.values({
				userId: data.userId,
				groupId: data.groupId,
				addedBy: data.addedBy,
				parentId: data.parentId,
				status: 1,
				isDeleted: 0,
				createDate: now,
				modifyDate: now,
			})
			.$returningId();
		return id;
	}

	async updatePermission(id: number, groupId: number) {
		return db
			.update(cybUserPermission)
			.set({ groupId, modifyDate: nowSql() })
			.where(eq(cybUserPermission.id, id));
	}

	async softDeletePermissions(ids: number[]) {
		if (!ids.length) return;
		await db
			.update(cybUserPermission)
			.set({ isDeleted: 1, modifyDate: nowSql() })
			.where(inArray(cybUserPermission.id, ids));
	}

	async softDeletePermissionsByGroup(groupIds: number[], companyId: number) {
		if (!groupIds.length) return [];
		const rows = await db
			.select()
			.from(cybUserPermission)
			.where(
				and(
					inArray(cybUserPermission.groupId, groupIds),
					eq(cybUserPermission.addedBy, companyId),
					eq(cybUserPermission.isDeleted, 0)
				)
			);
		const ids = rows.map((r) => r.id);
		if (ids.length) {
			await this.softDeletePermissions(ids);
		}
		return rows;
	}

	async findRelation(userId: number, companyId: number) {
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

	async createRelation(userId: number, companyId: number) {
		const now = nowSql();
		const [{ id }] = await db
			.insert(cybUserRelation)
			.values({
				userId,
				companyId,
				type: 1,
				status: 1,
				isDeleted: 0,
				createDate: now,
				modifyDate: now,
			})
			.$returningId();
		return id;
	}

	async softDeleteRelation(userId: number, companyId: number) {
		await db
			.update(cybUserRelation)
			.set({ isDeleted: 1, modifyDate: nowSql() })
			.where(
				and(
					eq(cybUserRelation.userId, userId),
					eq(cybUserRelation.companyId, companyId),
					eq(cybUserRelation.isDeleted, 0)
				)
			);
	}

	async findSuperAdminUserGroup(ownerOrAddedBy: number) {
		// group_id = 1 is super-admin main group
		const [row] = await db
			.select()
			.from(cybUserGroup)
			.where(
				and(
					eq(cybUserGroup.groupId, 1),
					or(
						eq(cybUserGroup.addedBy, ownerOrAddedBy),
						eq(cybUserGroup.ownerId, ownerOrAddedBy)
					),
					eq(cybUserGroup.status, 1),
					eq(cybUserGroup.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async countActiveSuperAdmins(companyId: number, superGroupRowId: number) {
		const [row] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybUserPermission)
			.where(
				and(
					eq(cybUserPermission.groupId, superGroupRowId),
					eq(cybUserPermission.addedBy, companyId),
					eq(cybUserPermission.status, 1),
					eq(cybUserPermission.isDeleted, 0)
				)
			);
		return row?.count ?? 0;
	}

	async listGroupUsers(companyId: number, limit: number, sqlOffset: number) {
		const companyUser = alias(cybUser, "cmp");
		const rows = await db
			.select({
				user_permission_id: cybUserPermission.id,
				user_id: cybUser.id,
				individual_id: cybUser.individualId,
				fname: cybUser.fname,
				lname: cybUser.lname,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				slug: cybUser.slug,
				on_explore: cybUser.onExplore,
				on_immediate: cybUser.onImmediate,
				on_notice: cybUser.onNotice,
				create_date: cybUserPermission.createDate,
				user_group_id: cybUserPermission.groupId,
				group_name: cybUserMainGroup.name,
				country_name: cybCountry.name,
				state_name: cybState.name,
				city_name: cybCities.name,
			})
			.from(cybUserPermission)
			.innerJoin(cybUser, eq(cybUserPermission.userId, cybUser.id))
			.leftJoin(cybUserGroup, eq(cybUserPermission.groupId, cybUserGroup.id))
			.leftJoin(cybUserMainGroup, eq(cybUserGroup.groupId, cybUserMainGroup.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.where(
				and(
					eq(cybUserPermission.addedBy, companyId),
					eq(cybUserPermission.isDeleted, 0),
					eq(cybUserPermission.status, 1),
					eq(cybUser.isDeleted, 0)
				)
			)
			.orderBy(desc(cybUserPermission.id))
			.limit(limit)
			.offset(sqlOffset);

		const [countRow] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybUserPermission)
			.where(
				and(
					eq(cybUserPermission.addedBy, companyId),
					eq(cybUserPermission.isDeleted, 0),
					eq(cybUserPermission.status, 1)
				)
			);

		void companyUser;
		return { rows, total: countRow?.count ?? 0 };
	}

	async listPermissionsForUser(userId: number, companyId: number) {
		return db
			.select({
				group_name: cybUserMainGroup.name,
				menu_permission: cybUserGroup.menuPermission,
				event_permission: cybUserGroup.eventPermission,
				user_group_id: cybUserGroup.id,
			})
			.from(cybUserPermission)
			.leftJoin(cybUserGroup, eq(cybUserPermission.groupId, cybUserGroup.id))
			.leftJoin(cybUserMainGroup, eq(cybUserGroup.groupId, cybUserMainGroup.id))
			.where(
				and(
					eq(cybUserPermission.userId, userId),
					eq(cybUserPermission.addedBy, companyId),
					eq(cybUserPermission.isDeleted, 0),
					eq(cybUserPermission.status, 1)
				)
			);
	}

	async getEditPermission(id: number) {
		const [row] = await db
			.select({
				user_id: cybUser.id,
				fname: cybUser.fname,
				lname: cybUser.lname,
				user_group_id: cybUserPermission.groupId,
				group_name: cybUserMainGroup.name,
			})
			.from(cybUserPermission)
			.leftJoin(cybUser, eq(cybUserPermission.userId, cybUser.id))
			.leftJoin(cybUserGroup, eq(cybUserPermission.groupId, cybUserGroup.id))
			.leftJoin(cybUserMainGroup, eq(cybUserGroup.groupId, cybUserMainGroup.id))
			.where(eq(cybUserPermission.id, id))
			.limit(1);
		return row;
	}

	async listRoleGroupsWithUsers(companyId: number, limit: number, sqlOffset: number) {
		const groups = await db
			.select({
				group_id: cybUserGroup.id,
				main_group_id: cybUserGroup.groupId,
				group_name: cybUserMainGroup.name,
				create_date: cybUserGroup.createDate,
			})
			.from(cybUserGroup)
			.leftJoin(cybUserMainGroup, eq(cybUserGroup.groupId, cybUserMainGroup.id))
			.where(
				and(
					or(eq(cybUserGroup.ownerId, companyId), eq(cybUserGroup.addedBy, companyId)),
					eq(cybUserGroup.isDeleted, 0),
					eq(cybUserGroup.status, 1)
				)
			)
			.orderBy(asc(cybUserGroup.id))
			.limit(limit)
			.offset(sqlOffset);

		const result = [];
		for (const g of groups) {
			const users = await db
				.select({
					user_id: cybUser.id,
					full_name: cybUser.fullName,
					profile: cybUser.profile,
					individual_id: cybUser.individualId,
				})
				.from(cybUserPermission)
				.innerJoin(cybUser, eq(cybUserPermission.userId, cybUser.id))
				.where(
					and(
						eq(cybUserPermission.groupId, g.group_id),
						eq(cybUserPermission.addedBy, companyId),
						eq(cybUserPermission.isDeleted, 0)
					)
				);
			result.push({
				...g,
				user_details: users,
				user_count: users.length,
			});
		}
		return result;
	}

	async getEditGroupRole(id: number) {
		const [g] = await db
			.select({
				user_group_id: cybUserGroup.id,
				main_group_id: cybUserGroup.groupId,
				group_name: cybUserMainGroup.name,
				event_permission: cybUserGroup.eventPermission,
			})
			.from(cybUserGroup)
			.leftJoin(cybUserMainGroup, eq(cybUserGroup.groupId, cybUserMainGroup.id))
			.where(eq(cybUserGroup.id, id))
			.limit(1);
		return g;
	}

	// ---- doctype ----
	async listDoctypes(userType: number) {
		return db
			.select({ id: cybDoctype.id, name: cybDoctype.name })
			.from(cybDoctype)
			.where(
				and(
					eq(cybDoctype.status, 1),
					or(eq(cybDoctype.docfor, userType), eq(cybDoctype.docfor, 0))
				)
			)
			.orderBy(asc(cybDoctype.id));
	}

	// ---- account delete revoke ----
	async hardDeleteAccountRequests(userId: number) {
		const result = await db
			.delete(cybAccountDeleteRequests)
			.where(eq(cybAccountDeleteRequests.userId, userId));
		const affected = Array.isArray(result)
			? Number((result as any)[0]?.affectedRows ?? 0)
			: Number((result as any)?.affectedRows ?? 0);
		return affected;
	}

	// ---- default lists ----
	async defaultCompanies(limit = 10) {
		return db
			.select({
				id: cybUser.id,
				individual_id: cybUser.individualId,
				company: cybUser.fname,
				contact_person: cybUser.contactPerson,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				claim_status: cybUser.claimStatus,
				city_name: cybCities.name,
				state_name: cybState.name,
				industry_name: cybIndustries.name,
			})
			.from(cybUser)
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.where(
				and(
					eq(cybUser.userType, 2),
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0)
				)
			)
			.orderBy(sql`RAND()`)
			.limit(limit);
	}

	async defaultUsers(limit = 10) {
		const companyUser = alias(cybUser, "cmp");
		return db
			.select({
				id: cybUser.id,
				individual_id: cybUser.individualId,
				fname: cybUser.fname,
				lname: cybUser.lname,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				slug: cybUser.slug,
				designation_name: cybDesignation.name,
				company_name: companyUser.fname,
			})
			.from(cybUser)
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
			.where(
				and(
					eq(cybUser.userType, 1),
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0)
				)
			)
			.orderBy(sql`RAND()`)
			.limit(limit);
	}

	async employmentCount(companyId: number) {
		const [row] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybUserExperience)
			.where(
				and(
					eq(cybUserExperience.company, companyId),
					eq(cybUserExperience.isDeleted, 0)
				)
			);
		return row?.count ?? 0;
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
		return row ? 1 : 0;
	}

	async insertNotification(data: {
		sender: number;
		receiver: number;
		message: string;
		type?: string;
	}) {
		const now = nowSql();
		await db.insert(cybNotifications).values({
			sender: data.sender,
			receiver: data.receiver,
			message: data.message,
			type: data.type || "permission",
			isViewed: 0,
			isDeleted: 0,
			createDate: now,
			modifyDate: now,
		} as any);
	}
}

export default new AccountMigrationRepositery();
