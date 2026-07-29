
import { and, asc, desc, eq, getTableColumns, inArray, sql, SQL } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybDepartment } from '../db/schema';

type Department = InferSelectModel<typeof cybDepartment>
type NewDepartment = InferInsertModel<typeof cybDepartment>


class departmentRepositery {
	async findById(id: number): Promise<Department | undefined> {
		const [department] = await db.select().from(cybDepartment).where(eq(cybDepartment.id, id));
		return department;
	}

	async findByName(name: string): Promise<Department[]> {
		const conditions = [eq(cybDepartment.name, name), eq(cybDepartment.status, 1),];
		return await db.select().from(cybDepartment).where(and(...conditions));
	}

	async create(data: Partial<NewDepartment>): Promise<Department> {
		const [{ id }] = await db.insert(cybDepartment).values(data).$returningId();

		const department = await this.findById(id);

		if (!department) {
			throw new Error("Department was inserted but could not be retrieved.");
		}
		return department;
	}

	/** PHP allDepartment: status=1 ORDER BY RAND() LIMIT 30 */
	async getRandomActive(limit = 30) {
		return db.select({
			id: cybDepartment.id,
			name: cybDepartment.name,
		})
			.from(cybDepartment)
			.where(eq(cybDepartment.status, 1))
			.orderBy(sql`RAND()`)
			.limit(limit);
	}
}

export default new departmentRepositery();
