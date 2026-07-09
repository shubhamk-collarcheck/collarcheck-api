import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybCities, cybCountry, cybCourseType, cybCourses, cybInstitutions, cybState, cybUserEducation } from '../db/schema';

type Education = InferSelectModel<typeof cybUserEducation>
export type NewEducation = InferInsertModel<typeof cybUserEducation>

class educationRepositery {
	async getEducationList(userId: number) {
		return await db.select({
			id: cybUserEducation.id,
			user: cybUserEducation.user,
			university: cybUserEducation.university,
			course: cybUserEducation.course,
			courseType: cybUserEducation.courseType,
			state: cybUserEducation.state,
			city: cybUserEducation.city,
			notApplicable: cybUserEducation.notApplicable,
			startingDate: cybUserEducation.startingDate,
			endingDate: cybUserEducation.endingDate,
			ongoing: cybUserEducation.ongoing,
			country: cybUserEducation.country,
			ishighest: cybUserEducation.ishighest,
			certificate: cybUserEducation.certificate,
			status: cybUserEducation.status,
			createdBy: cybUserEducation.createdBy,
			isDeleted: cybUserEducation.isDeleted,
			createDate: cybUserEducation.createDate,
			modifyDate: cybUserEducation.modifyDate,
			courseTypeName: cybCourseType.name,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			courseName: cybCourses.name,
			universityName: cybInstitutions.name,
		})
			.from(cybUserEducation)
			.leftJoin(cybCourseType, eq(cybUserEducation.courseType, cybCourseType.id))
			.leftJoin(cybCities, eq(cybUserEducation.city, cybCities.id))
			.leftJoin(cybState, eq(cybUserEducation.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUserEducation.country, cybCountry.id))
			.leftJoin(cybCourses, eq(cybUserEducation.course, cybCourses.id))
			.leftJoin(cybInstitutions, eq(cybUserEducation.university, cybInstitutions.id))
			.where(and(
				eq(cybUserEducation.user, userId),
				eq(cybUserEducation.status, 1),
				eq(cybUserEducation.isDeleted, 0),
			))
			.orderBy(desc(cybUserEducation.endingDate));
	}

	async findById(id: number) {
		const [record] = await db.select().from(cybUserEducation).where(eq(cybUserEducation.id, id));
		return record;
	}

	async getEducationDetail(id: number, user_id: number) {
		const [record] = await db.select({
			id: cybUserEducation.id,
			user: cybUserEducation.user,
			university: cybUserEducation.university,
			course: cybUserEducation.course,
			courseType: cybUserEducation.courseType,
			state: cybUserEducation.state,
			city: cybUserEducation.city,
			notApplicable: cybUserEducation.notApplicable,
			startingDate: cybUserEducation.startingDate,
			endingDate: cybUserEducation.endingDate,
			ongoing: cybUserEducation.ongoing,
			country: cybUserEducation.country,
			ishighest: cybUserEducation.ishighest,
			certificate: cybUserEducation.certificate,
			status: cybUserEducation.status,
			createdBy: cybUserEducation.createdBy,
			isDeleted: cybUserEducation.isDeleted,
			createDate: cybUserEducation.createDate,
			modifyDate: cybUserEducation.modifyDate,
			courseTypeName: cybCourseType.name,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			courseName: cybCourses.name,
			universityName: cybInstitutions.name,
		})
			.from(cybUserEducation)
			.leftJoin(cybCourseType, eq(cybUserEducation.courseType, cybCourseType.id))
			.leftJoin(cybCities, eq(cybUserEducation.city, cybCities.id))
			.leftJoin(cybState, eq(cybUserEducation.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUserEducation.country, cybCountry.id))
			.leftJoin(cybCourses, eq(cybUserEducation.course, cybCourses.id))
			.leftJoin(cybInstitutions, eq(cybUserEducation.university, cybInstitutions.id))
			.where(and(
				eq(cybUserEducation.id, id),
				eq(cybUserEducation.user, user_id),
				eq(cybUserEducation.isDeleted, 0),
			))
			.orderBy(desc(cybUserEducation.startingDate));

		return record;
	}

	async create(data: NewEducation) {
		const [result] = await db.insert(cybUserEducation).values(data).$returningId();
		return result;
	}

	async update(id: number, data: Partial<NewEducation>) {
		await db.update(cybUserEducation).set(data).where(eq(cybUserEducation.id, id));
	}

	async deleteEducation(educationId: number, userId: number) {
		const [record] = await db.select()
			.from(cybUserEducation)
			.where(and(
				eq(cybUserEducation.id, educationId),
				eq(cybUserEducation.user, userId),
				eq(cybUserEducation.isDeleted, 0),
			));

		if (!record) return false;

		await db.update(cybUserEducation)
			.set({ isDeleted: 1 })
			.where(eq(cybUserEducation.id, educationId));
		return true;
	}

	async clearIshighest(userId: number, excludeId?: number) {
		const conditions = [
			eq(cybUserEducation.user, userId),
			eq(cybUserEducation.ishighest, 1),
		];
		if (excludeId) {
			conditions.push(ne(cybUserEducation.id, excludeId));
		}
		await db.update(cybUserEducation)
			.set({ ishighest: 0 })
			.where(and(...conditions));
	}
}

export default new educationRepositery()
