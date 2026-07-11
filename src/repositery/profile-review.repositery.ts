import { and, desc, eq, sql } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybUserExperienceRating, cybUserExperienceRatingHistory, cybUserExperience, cybUser, cybDesignation, cybUserDetails, cybVerifyDocument, cybUserUpdateExperience, cybUserUpdateExperienceHistory } from '../db/schema';

type UserExperienceRating = InferSelectModel<typeof cybUserExperienceRating>
type NewUserExperienceRating = InferInsertModel<typeof cybUserExperienceRating>

class profileReviewRepositery {
	// Current Company methods
	async getCurrentCompanies(userId: number) {
		return await db.select({
			company: cybUserExperience.company,
			companyName: cybUser.fname,
		})
			.from(cybUserExperience)
			.leftJoin(cybUser, eq(cybUserExperience.company, cybUser.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.stillWorking, 1),
				eq(cybUserExperience.status, 1),
				eq(cybUserExperience.isDeleted, 0),
			))
			.groupBy(cybUserExperience.company, cybUser.fname);
	}

	async getDesignationsByCompany(userId: number, companyId: number) {
		return await db.select({
			id: cybUserExperience.designation,
			name: cybDesignation.name,
		})
			.from(cybUserExperience)
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.stillWorking, 1),
				eq(cybUserExperience.status, 1),
				eq(cybUserExperience.isDeleted, 0),
			))
			.groupBy(cybUserExperience.designation, cybDesignation.name);
	}

	// Review methods
	async getExperienceById(experienceId: number) {
		const [record] = await db.select()
			.from(cybUserExperience)
			.where(eq(cybUserExperience.id, experienceId));
		return record;
	}

	async getRatingById(ratingId: number) {
		const [record] = await db.select()
			.from(cybUserExperienceRating)
			.where(eq(cybUserExperienceRating.id, ratingId));
		return record;
	}

	async createRating(data: NewUserExperienceRating) {
		const [result] = await db.insert(cybUserExperienceRating).values(data).$returningId();
		return result;
	}

	async updateRating(id: number, data: Partial<NewUserExperienceRating>) {
		await db.update(cybUserExperienceRating).set(data).where(eq(cybUserExperienceRating.id, id));
	}

	async hardDeleteRating(id: number) {
		await db.delete(cybUserExperienceRatingHistory)
			.where(eq(cybUserExperienceRatingHistory.ratingId, id));
		await db.delete(cybUserExperienceRating)
			.where(eq(cybUserExperienceRating.id, id));
	}

	async removeDocumentFromRating(id: number, docJson: string | null) {
		await db.update(cybUserExperienceRating)
			.set({ doc: docJson })
			.where(eq(cybUserExperienceRating.id, id));
	}

	// User profile methods
	async getUserById(userId: number) {
		const [record] = await db.select()
			.from(cybUser)
			.where(eq(cybUser.id, userId));
		return record;
	}

	async updateUser(userId: number, data: Partial<InferInsertModel<typeof cybUser>>) {
		await db.update(cybUser).set(data).where(eq(cybUser.id, userId));
	}

	async getUserDetails(userId: number) {
		const [record] = await db.select()
			.from(cybUserDetails)
			.where(eq(cybUserDetails.userId, userId));
		return record;
	}

	async upsertUserDetails(userId: number, data: Partial<InferInsertModel<typeof cybUserDetails>>) {
		const existing = await this.getUserDetails(userId);
		if (existing) {
			await db.update(cybUserDetails).set(data).where(eq(cybUserDetails.userId, userId));
		} else {
			await db.insert(cybUserDetails).values({ userId, ...data });
		}
	}

	async getVerifyDocument(userId: number) {
		const [record] = await db.select()
			.from(cybVerifyDocument)
			.where(eq(cybVerifyDocument.userId, userId));
		return record;
	}

	async updateVerifyDocument(userId: number, verify: number) {
		await db.update(cybVerifyDocument)
			.set({ verify })
			.where(eq(cybVerifyDocument.userId, userId));
	}

	// Change employment basic methods
	async getUpdateExperience(experienceId: number, type: number) {
		const [record] = await db.select()
			.from(cybUserUpdateExperience)
			.where(and(
				eq(cybUserUpdateExperience.experienceId, experienceId),
				eq(cybUserUpdateExperience.type, type),
				eq(cybUserUpdateExperience.isDeleted, 0),
			));
		return record;
	}

	async createUpdateExperience(data: InferInsertModel<typeof cybUserUpdateExperience>) {
		const [result] = await db.insert(cybUserUpdateExperience).values(data).$returningId();
		return result;
	}

	async updateUpdateExperience(id: number, data: Partial<InferInsertModel<typeof cybUserUpdateExperience>>) {
		await db.update(cybUserUpdateExperience).set(data).where(eq(cybUserUpdateExperience.id, id));
	}

	async createUpdateExperienceHistory(data: InferInsertModel<typeof cybUserUpdateExperienceHistory>) {
		const [result] = await db.insert(cybUserUpdateExperienceHistory).values(data).$returningId();
		return result;
	}

	async updateUpdateExperienceHistory(updateId: number, data: Partial<InferInsertModel<typeof cybUserUpdateExperienceHistory>>) {
		await db.update(cybUserUpdateExperienceHistory)
			.set(data)
			.where(eq(cybUserUpdateExperienceHistory.updateId, updateId));
	}

	async updateExperienceStillWorking(experienceId: number, stillWorking: number) {
		await db.update(cybUserExperience)
			.set({ stillWorking })
			.where(eq(cybUserExperience.id, experienceId));
	}

	async clearUserCurrentPosition(userId: number) {
		await db.update(cybUser)
			.set({ currentCompany: null, currentPossition: null })
			.where(eq(cybUser.id, userId));
	}
}

export default new profileReviewRepositery()
