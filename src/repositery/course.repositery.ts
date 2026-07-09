import { and, eq } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybCourses } from '../db/schema';

type Course = InferSelectModel<typeof cybCourses>
type NewCourse = InferInsertModel<typeof cybCourses>

class courseRepositery {
	async findByName(name: string): Promise<Course | undefined> {
		const [course] = await db.select()
			.from(cybCourses)
			.where(and(
				eq(cybCourses.name, name),
				eq(cybCourses.status, 1),
			));
		return course;
	}

	async create(data: NewCourse) {
		const [result] = await db.insert(cybCourses).values(data).$returningId();
		return result;
	}
}

export default new courseRepositery()
