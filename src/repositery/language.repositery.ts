import { and, asc, eq } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybUserLanguage, cybLanguages } from '../db/schema';

type UserLanguage = InferSelectModel<typeof cybUserLanguage>
type NewUserLanguage = InferInsertModel<typeof cybUserLanguage>

class languageRepositery {
	async findMasterByName(name: string) {
		const [row] = await db.select()
			.from(cybLanguages)
			.where(and(eq(cybLanguages.name, name), eq(cybLanguages.status, 1)))
			.limit(1);
		return row;
	}

	async createMasterLanguage(data: {
		name: string;
		userDefined: number;
		userId: number;
		status: number;
	}) {
		const [inserted] = await db.insert(cybLanguages).values(data).$returningId();
		return inserted.id;
	}

	async getAllByUserId(userId: number) {
		// PHP: status=1 only, ORDER BY language name ASC (no is_deleted filter in legacy)
		// Keep is_deleted=0 so Node soft-deletes (if any) stay hidden.
		return await db.select({
			id: cybUserLanguage.id,
			user: cybUserLanguage.user,
			language: cybUserLanguage.language,
			verbal: cybUserLanguage.verbal,
			written: cybUserLanguage.written,
			status: cybUserLanguage.status,
			isDeleted: cybUserLanguage.isDeleted,
			createDate: cybUserLanguage.createDate,
			modifyDate: cybUserLanguage.modifyDate,
			languageName: cybLanguages.name,
		})
			.from(cybUserLanguage)
			.leftJoin(cybLanguages, eq(cybUserLanguage.language, cybLanguages.id))
			.where(and(
				eq(cybUserLanguage.user, userId),
				eq(cybUserLanguage.status, 1),
				eq(cybUserLanguage.isDeleted, 0),
			))
			.orderBy(asc(cybLanguages.name));
	}

	async findByIdAndUser(id: number, userId: number) {
		const [record] = await db.select({
			id: cybUserLanguage.id,
			user: cybUserLanguage.user,
			language: cybUserLanguage.language,
			verbal: cybUserLanguage.verbal,
			written: cybUserLanguage.written,
			status: cybUserLanguage.status,
			isDeleted: cybUserLanguage.isDeleted,
			createDate: cybUserLanguage.createDate,
			modifyDate: cybUserLanguage.modifyDate,
			languageName: cybLanguages.name,
		})
			.from(cybUserLanguage)
			.leftJoin(cybLanguages, eq(cybUserLanguage.language, cybLanguages.id))
			.where(and(
				eq(cybUserLanguage.id, id),
				eq(cybUserLanguage.user, userId),
				eq(cybUserLanguage.status, 1),
				eq(cybUserLanguage.isDeleted, 0),
			));
		return record;
	}

	async findByUserAndLanguage(userId: number, languageId: number) {
		const [record] = await db.select()
			.from(cybUserLanguage)
			.where(and(
				eq(cybUserLanguage.user, userId),
				eq(cybUserLanguage.language, languageId),
				eq(cybUserLanguage.status, 1),
				eq(cybUserLanguage.isDeleted, 0),
			));
		return record;
	}

	async create(data: NewUserLanguage) {
		const [result] = await db.insert(cybUserLanguage).values(data).$returningId();
		return result;
	}

	async update(id: number, data: Partial<NewUserLanguage>) {
		await db.update(cybUserLanguage).set(data).where(eq(cybUserLanguage.id, id));
	}

	async hardDelete(userId: number, id: number) {
		const [record] = await db.select()
			.from(cybUserLanguage)
			.where(and(
				eq(cybUserLanguage.user, userId),
				eq(cybUserLanguage.id, id),
			));

		if (!record) return false;

		await db.delete(cybUserLanguage)
			.where(eq(cybUserLanguage.id, id));
		return true;
	}
}

export default new languageRepositery()
