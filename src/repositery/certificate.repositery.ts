import { and, desc, eq } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybCourses, cybInstitutions, cybUserCertificate } from '../db/schema';

type Certificate = InferSelectModel<typeof cybUserCertificate>
type NewCertificate = InferInsertModel<typeof cybUserCertificate>

class certificateRepositery {
	async getAllByUserId(userId: number) {
		return await db.select({
			id: cybUserCertificate.id,
			user: cybUserCertificate.user,
			university: cybUserCertificate.university,
			course: cybUserCertificate.course,
			startDate: cybUserCertificate.startDate,
			endDate: cybUserCertificate.endDate,
			ongoing: cybUserCertificate.ongoing,
			certificate: cybUserCertificate.certificate,
			certificateId: cybUserCertificate.certificateId,
			url: cybUserCertificate.url,
			status: cybUserCertificate.status,
			isDeleted: cybUserCertificate.isDeleted,
			createDate: cybUserCertificate.createDate,
			modifyDate: cybUserCertificate.modifyDate,
			courseName: cybCourses.name,
			universityName: cybInstitutions.name,
		})
			.from(cybUserCertificate)
			.leftJoin(cybCourses, eq(cybUserCertificate.course, cybCourses.id))
			.leftJoin(cybInstitutions, eq(cybUserCertificate.university, cybInstitutions.id))
			.where(and(
				eq(cybUserCertificate.user, userId),
				eq(cybUserCertificate.status, 1),
				eq(cybUserCertificate.isDeleted, 0),
			))
			.orderBy(desc(cybUserCertificate.createDate));
	}

	async findByIdAndUser(id: number, userId: number) {
		const [record] = await db.select({
			id: cybUserCertificate.id,
			user: cybUserCertificate.user,
			university: cybUserCertificate.university,
			course: cybUserCertificate.course,
			startDate: cybUserCertificate.startDate,
			endDate: cybUserCertificate.endDate,
			ongoing: cybUserCertificate.ongoing,
			certificate: cybUserCertificate.certificate,
			certificateId: cybUserCertificate.certificateId,
			url: cybUserCertificate.url,
			status: cybUserCertificate.status,
			isDeleted: cybUserCertificate.isDeleted,
			createDate: cybUserCertificate.createDate,
			modifyDate: cybUserCertificate.modifyDate,
			courseName: cybCourses.name,
			universityName: cybInstitutions.name,
		})
			.from(cybUserCertificate)
			.leftJoin(cybCourses, eq(cybUserCertificate.course, cybCourses.id))
			.leftJoin(cybInstitutions, eq(cybUserCertificate.university, cybInstitutions.id))
			.where(and(
				eq(cybUserCertificate.id, id),
				eq(cybUserCertificate.user, userId),
				eq(cybUserCertificate.status, 1),
				eq(cybUserCertificate.isDeleted, 0),
			));
		return record;
	}

	async findById(id: number) {
		const [record] = await db.select().from(cybUserCertificate).where(eq(cybUserCertificate.id, id));
		return record;
	}

	async create(data: NewCertificate) {
		const [result] = await db.insert(cybUserCertificate).values(data).$returningId();
		return result;
	}

	async update(id: number, data: Partial<NewCertificate>) {
		await db.update(cybUserCertificate).set(data).where(eq(cybUserCertificate.id, id));
	}

	async deleteByUserAndId(userId: number, id: number) {
		const [record] = await db.select()
			.from(cybUserCertificate)
			.where(and(
				eq(cybUserCertificate.user, userId),
				eq(cybUserCertificate.id, id),
			));

		if (!record) return false;

		await db.update(cybUserCertificate)
			.set({ isDeleted: 1 })
			.where(eq(cybUserCertificate.id, id));
		return true;
	}
}

export default new certificateRepositery()
