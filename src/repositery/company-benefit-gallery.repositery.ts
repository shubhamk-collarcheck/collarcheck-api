import { and, eq, sql } from 'drizzle-orm';
import db from '../db';
import {
	cybBenefits, cybCompanyBenefits, cybGalleries,
} from '../db/schema';

class companyBenefitGalleryRepositery {

	async getCompanyBenefits(companyId: number) {
		return db.select({
			id: cybCompanyBenefits.id,
			benefitId: cybCompanyBenefits.benefitId,
			name: cybBenefits.name,
			benefitDescription: cybCompanyBenefits.description,
			image: cybBenefits.image,
			sortOrder: cybCompanyBenefits.sortOrder,
		})
			.from(cybCompanyBenefits)
			.innerJoin(cybBenefits, eq(cybCompanyBenefits.benefitId, cybBenefits.id))
			.where(and(
				eq(cybCompanyBenefits.companyId, companyId),
				eq(cybCompanyBenefits.isDeleted, 0),
			));
	}

	async getBenefitByName(name: string) {
		const [row] = await db.select()
			.from(cybBenefits)
			.where(and(
				eq(cybBenefits.name, name),
				eq(cybBenefits.status, 1),
			));
		return row;
	}

	async createBenefit(name: string, userId?: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybBenefits).values({
			name,
			status: 1,
			userDefined: 1,
			userId: userId,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async checkDuplicateBenefit(companyId: number, benefitId: number) {
		const [row] = await db.select()
			.from(cybCompanyBenefits)
			.where(and(
				eq(cybCompanyBenefits.companyId, companyId),
				eq(cybCompanyBenefits.benefitId, benefitId),
				eq(cybCompanyBenefits.isDeleted, 0),
			));
		return !!row;
	}

	async getCompanyBenefitById(id: number, companyId: number) {
		const [row] = await db.select()
			.from(cybCompanyBenefits)
			.where(and(
				eq(cybCompanyBenefits.id, id),
				eq(cybCompanyBenefits.companyId, companyId),
			));
		return row;
	}

	async createCompanyBenefit(data: {
		companyId: number;
		benefitId: number;
		sortOrder?: number;
		description?: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybCompanyBenefits).values({
			companyId: data.companyId,
			benefitId: data.benefitId,
			sortOrder: data.sortOrder,
			description: data.description,
			status: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async updateCompanyBenefit(id: number, data: {
		benefitId?: number;
		sortOrder?: number;
		description?: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const updateData: Record<string, any> = { modifyDate: now };
		if (data.benefitId !== undefined) updateData.benefitId = data.benefitId;
		if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
		if (data.description !== undefined) updateData.description = data.description;

		await db.update(cybCompanyBenefits)
			.set(updateData)
			.where(eq(cybCompanyBenefits.id, id));
	}

	async deleteCompanyBenefit(id: number, companyId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybCompanyBenefits)
			.set({ isDeleted: 1, modifyDate: now })
			.where(and(
				eq(cybCompanyBenefits.id, id),
				eq(cybCompanyBenefits.companyId, companyId),
			));
	}

	async getGalleries(companyId: number) {
		return db.select()
			.from(cybGalleries)
			.where(and(
				eq(cybGalleries.companyId, companyId),
				eq(cybGalleries.isDeleted, 0),
			));
	}

	async getGalleryById(id: number, companyId: number) {
		const [row] = await db.select()
			.from(cybGalleries)
			.where(and(
				eq(cybGalleries.id, id),
				eq(cybGalleries.companyId, companyId),
			));
		return row;
	}

	async createGallery(data: {
		companyId: number;
		name?: string;
		image: string;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybGalleries).values({
			companyId: data.companyId,
			name: data.name,
			image: data.image,
			status: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async deleteGallery(id: number, companyId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybGalleries)
			.set({ isDeleted: 1, modifyDate: now })
			.where(and(
				eq(cybGalleries.id, id),
				eq(cybGalleries.companyId, companyId),
			));
	}
}

export default new companyBenefitGalleryRepositery();
