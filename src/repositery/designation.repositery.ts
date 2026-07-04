
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
		const [designation] = await db.insert(cybDesignation).values(data).$returningId()
		return designation as unknown as Designation;
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
}

export default new designationRepositery();
