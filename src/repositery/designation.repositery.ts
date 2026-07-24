
import { and, asc, desc, eq, getTableColumns, inArray, sql, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybDesignation } from '../db/schema';
import { isEmptyArray } from '../utils/helpers';
import { createSlug, urlTitle } from '../utils/generator';


type Designation = InferSelectModel<typeof cybDesignation>
type NewDesignation = InferInsertModel<typeof cybDesignation>


class designationRepositery {
	async findById(id: number): Promise<Designation | undefined> {
		const [designation] = await db.select().from(cybDesignation).where(eq(cybDesignation.id, id));
		return designation;
	}

	async findByName(name: string): Promise<Designation[]> {
		const conditions = [eq(cybDesignation.name, name), eq(cybDesignation.status, 1),];
		return await db.select().from(cybDesignation).where(and(...conditions));
	}
	async findBySlug(value: string): Promise<Designation[]> {
		const conditions = [eq(cybDesignation.slug, value), eq(cybDesignation.status, 1),];
		return await db.select().from(cybDesignation).where(and(...conditions));
	}

	async create(data: Partial<NewDesignation>): Promise<Designation> {
		const [{ id }] = await db.insert(cybDesignation).values(data).$returningId();

		const designation = await this.findById(id);

		if (!designation) {
			throw new Error("Designation was inserted but could not be retrieved.");
		}
		return designation;
	}

	async generateSlug(name: string) {
		const baseSlug = urlTitle(name);

		let slug = baseSlug;
		let counter = 1;

		while (!(isEmptyArray(await this.findBySlug(slug)))) {
			slug = `${baseSlug}-${counter}`;
			counter++;
		}

		return slug;
	}

	/** PHP alldesignation: status=1 ORDER BY RAND() LIMIT 30 */
	async getRandomActive(limit = 30) {
		return db.select({
			id: cybDesignation.id,
			name: cybDesignation.name,
		})
			.from(cybDesignation)
			.where(eq(cybDesignation.status, 1))
			.orderBy(sql`RAND()`)
			.limit(limit);
	}
}

export default new designationRepositery();
