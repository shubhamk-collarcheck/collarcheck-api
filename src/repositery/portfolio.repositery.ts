import { and, desc, eq } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybUserProtfolio } from '../db/schema';

type Portfolio = InferSelectModel<typeof cybUserProtfolio>
type NewPortfolio = InferInsertModel<typeof cybUserProtfolio>

class portfolioRepositery {
	async getAllByUserId(userId: number) {
		return await db.select()
			.from(cybUserProtfolio)
			.where(and(
				eq(cybUserProtfolio.user, userId),
				eq(cybUserProtfolio.status, 1),
				eq(cybUserProtfolio.isDeleted, 0),
			))
			.orderBy(desc(cybUserProtfolio.sortOrder));
	}

	async findById(id: number) {
		const [record] = await db.select().from(cybUserProtfolio).where(eq(cybUserProtfolio.id, id));
		return record;
	}

	async create(data: NewPortfolio) {
		const [result] = await db.insert(cybUserProtfolio).values(data).$returningId();
		return result;
	}

	async update(id: number, data: Partial<NewPortfolio>) {
		await db.update(cybUserProtfolio).set(data).where(eq(cybUserProtfolio.id, id));
	}

	async deleteByUserAndId(userId: number, id: number) {
		const [record] = await db.select()
			.from(cybUserProtfolio)
			.where(and(
				eq(cybUserProtfolio.user, userId),
				eq(cybUserProtfolio.id, id),
				eq(cybUserProtfolio.isDeleted, 0),
			));

		if (!record) return false;

		await db.update(cybUserProtfolio)
			.set({ isDeleted: 1 })
			.where(eq(cybUserProtfolio.id, id));
	return true;
	}
}

export default new portfolioRepositery()
