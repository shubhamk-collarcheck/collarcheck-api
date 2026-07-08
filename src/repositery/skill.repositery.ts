
import { and, desc, eq, inArray } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybSkill, cybSkillRating } from '../db/schema';
import { isEmptyArray } from '../utils/helpers';

type Skill = InferSelectModel<typeof cybSkill>
type NewSkill = InferInsertModel<typeof cybSkill>

class skillRepositery {
	async findById(id: number): Promise<Skill | undefined> {
		const [skill] = await db.select().from(cybSkill).where(eq(cybSkill.id, id));
		return skill;
	}

	async findByName(name: string): Promise<Skill[]> {
		const conditions = [eq(cybSkill.name, name), eq(cybSkill.status, 1)];
		return await db.select().from(cybSkill).where(and(...conditions));
	}
	async findByListOfName(names: string[]): Promise<Skill[]> {
		if (isEmptyArray(names)) return [];
		const conditions = [inArray(cybSkill.name, names), eq(cybSkill.status, 1)];
		return await db.select().from(cybSkill).where(and(...conditions));
	}

	async create(data: Partial<NewSkill>): Promise<Skill> {
		const [{ id }] = await db.insert(cybSkill).values(data).$returningId();

		const skill = await this.findById(id);

		if (!skill) {
			throw new Error("Skill was inserted but could not be retrieved.");
		}
		return skill;
	}
	async bulkCreate(data: Partial<NewSkill>[]): Promise<Skill[]> {
		if (isEmptyArray(data)) return [];
		const inserted = await db.insert(cybSkill).values(data);
		return inserted as unknown as Skill[];
	}

	async getReviewsWithSkills(reviewIds: number | number[], showHome: number = 0) {
		const ids = Array.isArray(reviewIds) ? reviewIds : [reviewIds];
		if (isEmptyArray(ids)) return {};

		const conditions = [
			eq(cybSkillRating.isDeleted, 0),
			inArray(cybSkillRating.reviewId, ids),
		];

		if (showHome === 1) {
			conditions.push(eq(cybSkillRating.showHome, 1));
		}

		const result = await db
			.select({
				reviewId: cybSkillRating.reviewId,
				skillId: cybSkillRating.skillId,
				name: cybSkill.name,
				rating: cybSkillRating.rating,
				showHome: cybSkillRating.showHome,
			})
			.from(cybSkillRating)
			.leftJoin(cybSkill, eq(cybSkillRating.skillId, cybSkill.id))
			.where(and(...conditions))
			.orderBy(desc(cybSkillRating.id));

		const skillMap: Record<number, Array<{ skill_id: number; name: string | null; rating: number; show_home: number | null }>> = {};

		for (const row of result) {
			const reviewId = row.reviewId!;
			if (!skillMap[reviewId]) {
				skillMap[reviewId] = [];
			}
			skillMap[reviewId].push({
				skill_id: row.skillId,
				name: row.name,
				rating: row.rating,
				show_home: row.showHome,
			});
		}

		return skillMap;
	}

}

export default new skillRepositery();
