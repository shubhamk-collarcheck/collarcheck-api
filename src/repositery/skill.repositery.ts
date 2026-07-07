
import { and, eq, inArray } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybSkill } from '../db/schema';
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

}

export default new skillRepositery();
