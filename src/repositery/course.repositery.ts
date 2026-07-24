import { and, asc, eq } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybCourses, cybCourseType } from '../db/schema';

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

	/** PHP courseList: status=1 ORDER BY name ASC LIMIT 30 */
	async getActiveList(limit = 30) {
		return db.select({
			id: cybCourses.id,
			name: cybCourses.name,
			image: cybCourses.image,
		})
			.from(cybCourses)
			.where(eq(cybCourses.status, 1))
			.orderBy(asc(cybCourses.name))
			.limit(limit);
	}

	/** PHP courseTypeList: status=1, no order/limit */
	async getActiveCourseTypes() {
		return db.select({
			id: cybCourseType.id,
			name: cybCourseType.name,
		})
			.from(cybCourseType)
			.where(eq(cybCourseType.status, 1));
	}
}

export default new courseRepositery()
