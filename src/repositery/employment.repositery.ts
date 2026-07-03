
import { and, eq, sql } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybUserExperience } from '../db/schema';

type Employment = InferSelectModel<typeof cybUserExperience>
type NewEmployment = InferInsertModel<typeof cybUserExperience>

class employmentRepositery {
	async findById(id: number): Promise<Employment | undefined> {
		const [employment] = await db.select().from(cybUserExperience).where(eq(cybUserExperience.id, id));
		return employment;
	}

	async findByUserId(userId: number): Promise<Employment[]> {
		const conditions = [eq(cybUserExperience.user, userId), eq(cybUserExperience.isDeleted, 0)];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findByCompanyId(companyId: number): Promise<Employment[]> {
		const conditions = [eq(cybUserExperience.company, companyId), eq(cybUserExperience.isDeleted, 0)];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findByUserIdAndCompanyId(userId: number, companyId: number): Promise<Employment | undefined> {
		const conditions = [
			eq(cybUserExperience.user, userId),
			eq(cybUserExperience.company, companyId),
			eq(cybUserExperience.isDeleted, 0)
		];
		const [employment] = await db.select().from(cybUserExperience).where(and(...conditions));
		return employment;
	}

	async findActiveByUserId(userId: number): Promise<Employment[]> {
		const conditions = [
			eq(cybUserExperience.user, userId),
			eq(cybUserExperience.status, 1),
			eq(cybUserExperience.isDeleted, 0)
		];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findStillWorking(userId: number): Promise<Employment[]> {
		const conditions = [
			eq(cybUserExperience.user, userId),
			eq(cybUserExperience.stillWorking, 1),
			eq(cybUserExperience.isDeleted, 0)
		];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findApprovedByCompanyId(companyId: number): Promise<Employment[]> {
		const conditions = [
			eq(cybUserExperience.company, companyId),
			eq(cybUserExperience.approved, 1),
			eq(cybUserExperience.isDeleted, 0)
		];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findByDesignation(designationId: number): Promise<Employment[]> {
		const conditions = [
			eq(cybUserExperience.designation, designationId),
			eq(cybUserExperience.isDeleted, 0)
		];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async findByDepartment(departmentId: number): Promise<Employment[]> {
		const conditions = [
			eq(cybUserExperience.department, departmentId),
			eq(cybUserExperience.isDeleted, 0)
		];
		return await db.select().from(cybUserExperience).where(and(...conditions));
	}

	async create(data: Partial<NewEmployment>): Promise<Employment> {
		const [employment] = await db.insert(cybUserExperience).values(data);
		return employment as unknown as Employment;
	}

	async update(id: number, data: Partial<NewEmployment>): Promise<Employment | undefined> {
		await db.update(cybUserExperience).set(data).where(eq(cybUserExperience.id, id));
		return this.findById(id);
	}

	async delete(id: number): Promise<void> {
		await db.update(cybUserExperience).set({ isDeleted: 1 }).where(eq(cybUserExperience.id, id));
	}

	async approve(id: number): Promise<Employment | undefined> {
		await db.update(cybUserExperience).set({ approved: 1 }).where(eq(cybUserExperience.id, id));
		return this.findById(id);
	}

	async reject(id: number): Promise<Employment | undefined> {
		await db.update(cybUserExperience).set({ approved: 0 }).where(eq(cybUserExperience.id, id));
		return this.findById(id);
	}

	async countByUserId(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserExperience)
			.where(and(eq(cybUserExperience.user, userId), eq(cybUserExperience.isDeleted, 0)));
		return result.count;
	}

	async countByCompanyId(companyId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserExperience)
			.where(and(eq(cybUserExperience.company, companyId), eq(cybUserExperience.isDeleted, 0)));
		return result.count;
	}
}

export default new employmentRepositery();
