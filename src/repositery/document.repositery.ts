import { and, desc, eq } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybUserDocument, cybDoctype } from '../db/schema';

type UserDocument = InferSelectModel<typeof cybUserDocument>
type NewUserDocument = InferInsertModel<typeof cybUserDocument>

class documentRepositery {
	async getAllByUserId(userId: number) {
		return await db.select({
			id: cybUserDocument.id,
			user: cybUserDocument.user,
			doctype: cybUserDocument.doctype,
			doc: cybUserDocument.doc,
			docnumber: cybUserDocument.docnumber,
			status: cybUserDocument.status,
			isDeleted: cybUserDocument.isDeleted,
			createDate: cybUserDocument.createDate,
			modifyDate: cybUserDocument.modifyDate,
			doctypeName: cybDoctype.name,
		})
			.from(cybUserDocument)
			.leftJoin(cybDoctype, eq(cybUserDocument.doctype, cybDoctype.id))
			.where(and(
				eq(cybUserDocument.user, userId),
				eq(cybUserDocument.status, 1),
				eq(cybUserDocument.isDeleted, 0),
			))
			.orderBy(desc(cybUserDocument.createDate));
	}

	async findByIdAndUser(id: number, userId: number) {
		const [record] = await db.select({
			id: cybUserDocument.id,
			user: cybUserDocument.user,
			doctype: cybUserDocument.doctype,
			doc: cybUserDocument.doc,
			docnumber: cybUserDocument.docnumber,
			status: cybUserDocument.status,
			isDeleted: cybUserDocument.isDeleted,
			createDate: cybUserDocument.createDate,
			modifyDate: cybUserDocument.modifyDate,
			doctypeName: cybDoctype.name,
		})
			.from(cybUserDocument)
			.leftJoin(cybDoctype, eq(cybUserDocument.doctype, cybDoctype.id))
			.where(and(
				eq(cybUserDocument.id, id),
				eq(cybUserDocument.user, userId),
				eq(cybUserDocument.status, 1),
				eq(cybUserDocument.isDeleted, 0),
			));
		return record;
	}

	async findById(id: number) {
		const [record] = await db.select().from(cybUserDocument).where(eq(cybUserDocument.id, id));
		return record;
	}

	async create(data: NewUserDocument) {
		const [result] = await db.insert(cybUserDocument).values(data).$returningId();
		return result;
	}

	async update(id: number, data: Partial<NewUserDocument>) {
		await db.update(cybUserDocument).set(data).where(eq(cybUserDocument.id, id));
	}

	async deleteByUserAndId(userId: number, id: number) {
		const [record] = await db.select()
			.from(cybUserDocument)
			.where(and(
				eq(cybUserDocument.user, userId),
				eq(cybUserDocument.id, id),
			));

		if (!record) return false;

		await db.update(cybUserDocument)
			.set({ isDeleted: 1 })
			.where(eq(cybUserDocument.id, id));
		return true;
	}
}

export default new documentRepositery()
