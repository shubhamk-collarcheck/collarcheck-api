
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
		const [department] = await db.insert(cybDepartment).values(data);
		return department as unknown as Department;
	}
}

export default new departmentRepositery();
