import { and, eq } from "drizzle-orm";
import db from "../db";
import { cybUserRelation, cybUserGroup, cybUserPermission } from "../db/schema";

class AiRepositery {
	async findUserRelation(userId: number, companyId: number) {
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

	async insertUserRelation(data: {
		userId: number;
		companyId: number;
		type: number;
		createDate: string;
		modifyDate: string;
	}) {
		const result = await db.insert(cybUserRelation).values({
			userId: data.userId,
			companyId: data.companyId,
			type: data.type,
			createDate: data.createDate,
			modifyDate: data.modifyDate,
			status: 1,
			isDeleted: 0,
		});
		return result;
	}

	/** Super-admin template group for this user: group_id = 1. */
	async findSuperAdminUserGroup(addedBy: number) {
		const [row] = await db
			.select()
			.from(cybUserGroup)
			.where(
				and(
					eq(cybUserGroup.addedBy, addedBy),
					eq(cybUserGroup.groupId, 1),
					eq(cybUserGroup.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findUserPermission(opts: {
		userId: number;
		addedBy: number;
		groupId: number;
	}) {
		const [row] = await db
			.select()
			.from(cybUserPermission)
			.where(
				and(
					eq(cybUserPermission.userId, opts.userId),
					eq(cybUserPermission.addedBy, opts.addedBy),
					eq(cybUserPermission.groupId, opts.groupId),
					eq(cybUserPermission.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async insertUserPermission(data: {
		userId: number;
		groupId: number;
		addedBy: number;
		parentId: number;
		createDate: string;
		modifyDate: string;
	}) {
		return db.insert(cybUserPermission).values({
			userId: data.userId,
			groupId: data.groupId,
			addedBy: data.addedBy,
			parentId: data.parentId,
			createDate: data.createDate,
			modifyDate: data.modifyDate,
			status: 1,
			isDeleted: 0,
		});
	}
}

export default new AiRepositery();
