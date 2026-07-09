import { and, desc, eq } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybSkill, cybUserSkill } from '../db/schema';

type UserSkill = InferSelectModel<typeof cybUserSkill>
type NewUserSkill = InferInsertModel<typeof cybUserSkill>

class userSkillRepositery {
	async findByUserAndSkill(userId: number, skillId: number): Promise<UserSkill | undefined> {
		const [record] = await db.select()
			.from(cybUserSkill)
			.where(and(
				eq(cybUserSkill.user, userId),
				eq(cybUserSkill.skill, skillId),
				eq(cybUserSkill.isDeleted, 0),
			));
		return record;
	}

	async create(data: NewUserSkill) {
		const [result] = await db.insert(cybUserSkill).values(data).$returningId();
		return result;
	}

	async update(id: number, data: Partial<NewUserSkill>) {
		await db.update(cybUserSkill).set(data).where(eq(cybUserSkill.id, id));
	}

	async deleteByUserAndId(userId: number, id: number) {
		const [record] = await db.select()
			.from(cybUserSkill)
			.where(and(
				eq(cybUserSkill.user, userId),
				eq(cybUserSkill.id, id),
				eq(cybUserSkill.isDeleted, 0),
			));

		if (!record) return false;

		await db.update(cybUserSkill)
			.set({ isDeleted: 1 })
			.where(eq(cybUserSkill.id, id));
		return true;
	}

	async getAllByUserId(userId: number) {
		return await db.select({
			id: cybUserSkill.id,
			skillId: cybUserSkill.skill,
			skillName: cybSkill.name,
			rating: cybUserSkill.rating,
		})
			.from(cybUserSkill)
			.leftJoin(cybSkill, eq(cybUserSkill.skill, cybSkill.id))
			.where(and(
				eq(cybUserSkill.user, userId),
				eq(cybUserSkill.status, 1),
				eq(cybUserSkill.isDeleted, 0),
			))
			.orderBy(desc(cybUserSkill.rating));
	}
}

export default new userSkillRepositery()
