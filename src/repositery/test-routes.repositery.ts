import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import db from "../db";
import {
	cybMessageHistory,
	cybResumeDownload,
	cybResumeTemplates,
	cybUser,
	cybUserDetails,
} from "../db/schema";

function nowSql() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

class TestRoutesRepositery {
	async insertMessageHistory(row: {
		id?: number;
		messageId?: number;
		sender: number;
		receiver: number;
		message?: string | null;
		doc?: string | null;
		isViewed?: number;
		forApproval?: number;
		viewDatetime?: string | null;
		isDeleted?: number;
		createDate?: string | null;
		modifyDate?: string | null;
	}) {
		const now = nowSql();
		return db.insert(cybMessageHistory).values({
			messageId: row.messageId ?? 0,
			sender: row.sender,
			receiver: row.receiver,
			message: row.message ?? null,
			doc: row.doc ?? null,
			isViewed: row.isViewed ?? 0,
			forApproval: row.forApproval ?? 1,
			viewDatetime: row.viewDatetime ?? null,
			isDeleted: row.isDeleted ?? 0,
			createDate: row.createDate || now,
			modifyDate: row.modifyDate || now,
		});
	}

	async usersMissingIndividualId() {
		return db
			.select({
				id: cybUser.id,
				fname: cybUser.fname,
				lname: cybUser.lname,
				userType: cybUser.userType,
			})
			.from(cybUser)
			.where(
				and(
					eq(cybUser.isDeleted, 0),
					or(isNull(cybUser.individualId), eq(cybUser.individualId, ""))
				)
			)
			.limit(500);
	}

	async updateUserCcid(id: number, individualId: string, slug: string) {
		return db
			.update(cybUser)
			.set({
				individualId,
				slug,
				modifyDate: nowSql(),
			})
			.where(eq(cybUser.id, id));
	}

	async insertResumeDownload(userId: number, templeteId: number) {
		const now = nowSql();
		return db.insert(cybResumeDownload).values({
			userId,
			templeteId,
			status: 1,
			createDate: now,
			modifyDate: now,
		});
	}

	async updateNotice(
		userId: number,
		data: { onNotice: number; noticeDate: string | null; noticeEmployments: string | null }
	) {
		const now = nowSql();
		await db
			.update(cybUser)
			.set({
				onNotice: data.onNotice,
				noticeDate: data.noticeDate,
				modifyDate: now,
			})
			.where(eq(cybUser.id, userId));

		const [details] = await db
			.select({ id: cybUserDetails.id })
			.from(cybUserDetails)
			.where(eq(cybUserDetails.userId, userId))
			.limit(1);

		if (details) {
			await db
				.update(cybUserDetails)
				.set({ noticeEmployments: data.noticeEmployments })
				.where(eq(cybUserDetails.userId, userId));
		} else {
			await db.insert(cybUserDetails).values({
				userId,
				noticeEmployments: data.noticeEmployments,
			});
		}
	}

	async setCvPop(userId: number, cvPop: number) {
		await db
			.update(cybUser)
			.set({ cvPop, modifyDate: nowSql() })
			.where(eq(cybUser.id, userId));
	}

	async listResumeTemplates() {
		return db
			.select({
				id: cybResumeTemplates.id,
				name: cybResumeTemplates.name,
				thumbnail: cybResumeTemplates.thumbnail,
				templatePath: cybResumeTemplates.templatePath,
				type: cybResumeTemplates.type,
				short: cybResumeTemplates.short,
			})
			.from(cybResumeTemplates)
			.where(eq(cybResumeTemplates.status, 1))
			.orderBy(asc(cybResumeTemplates.short), asc(cybResumeTemplates.id));
	}

	async getResumeTemplate(id: number) {
		const [row] = await db
			.select()
			.from(cybResumeTemplates)
			.where(and(eq(cybResumeTemplates.id, id), eq(cybResumeTemplates.status, 1)))
			.limit(1);
		return row;
	}

	async getUserBasic(id: number) {
		const [row] = await db
			.select({
				id: cybUser.id,
				fname: cybUser.fname,
				lname: cybUser.lname,
				token: cybUser.token,
				slug: cybUser.slug,
				profile: cybUser.profile,
			})
			.from(cybUser)
			.where(and(eq(cybUser.id, id), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}
}

export default new TestRoutesRepositery();
