

import { and, asc, eq, sql, desc, inArray, ne } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybUserExperience, cybUserUpdateExperience, cybUserExperienceRating, cybDesignation, cybUser, cybUserExperienceRatingHistory, cybSkillRatingHistory, cybSkill } from '../db/schema';
import { getS3Url, isEmptyArray, isEmptyObject } from '../utils/helpers';
import skillRepositery from './skill.repositery';

const s3Prefix = process.env.S3_PREFIX || '';

type Employment = InferSelectModel<typeof cybUserExperience>
type NewEmployment = InferInsertModel<typeof cybUserExperience>


class reviewRepositery {
	async getRating(experinceId: number) {
		const experienceList = await db
			.select({
				id: cybUserExperienceRating.id,
				experience: cybUserExperienceRating.experience,
				company: cybUserExperienceRating.company,
				rating: cybUserExperienceRating.rating,
				review: cybUserExperienceRating.review,
				doc: cybUserExperienceRating.doc,
				link: cybUserExperienceRating.link,
				addedBy: cybUserExperienceRating.addedBy,
				status: cybUserExperienceRating.status,
				approved: cybUserExperienceRating.approved,
				expiry: cybUserExperienceRating.expiry,
				showReview: cybUserExperienceRating.showReview,
				isDeleted: cybUserExperienceRating.isDeleted,
				showHome: cybUserExperienceRating.showHome,
				createDate: cybUserExperienceRating.createDate,
				modifyDate: cybUserExperienceRating.modifyDate,
			})
			.from(cybUserExperienceRating)
			.where(and(
				eq(cybUserExperienceRating.status, 1),
				eq(cybUserExperienceRating.experience, experinceId),
			))
			.orderBy(desc(cybUserExperienceRating.id));

		if (isEmptyArray(experienceList)) return [];

		const ratingIds = [...new Set(experienceList.map(r => r.id))];

		const historyMap: Record<number, any[]> = await this.getRatingHistory(ratingIds) as Record<number, any[]>;
		const skillMap = await skillRepositery.getReviewsWithSkills(ratingIds, 0);

		const allExperienceList: Record<string, any>[] = [];

		for (const rval of experienceList) {
			const history = historyMap[rval.id] ?? [];
			const skill_rating = skillMap[rval.id] ?? [];

			let doc: string | string[] | null = null;
			if (rval.doc) {
				try {
					const paths = JSON.parse(rval.doc);
					if (Array.isArray(paths)) {
						doc = paths.map((path: string) => getS3Url(path));
					}
				} catch {
					doc = rval.doc;
				}
			}

			const arr: Record<string, any> = {
				id: rval.id,
				approved: rval.approved,
				status: rval.approved === 1 ? 'complete' : 'pending',
				doc: doc,
				date: rval.modifyDate,
				link: rval.link,
				show_home: rval.showHome,
				show_review: rval.showReview,
				history: history,
				skill_rating: skill_rating,
				rating: rval.rating,
				review: rval.review,
			};

			allExperienceList.push(arr);
		}

		return allExperienceList;
	}
	async getAllExperienceRating(experinceId?: number, approved?: number, notApproved?: number) {
		const conditions = [
			eq(cybUserExperienceRating.status, 1),
			eq(cybUserExperience.isDeleted, 0),
			eq(cybUserExperienceRating.isDeleted, 0)

		]

		if (experinceId) {
			conditions.push(eq(cybUserExperienceRating.experience, experinceId));
		}

		if (approved) {
			const approvedVal = approved === 3 ? 0 : approved;
			conditions.push(eq(cybUserExperienceRating.approved, approvedVal));
		}

		if (notApproved) {
			conditions.push(ne(cybUserExperienceRating.approved, 2));
		}

		const result = await db
			.select({
				id: cybUserExperienceRating.id,
				experience: cybUserExperienceRating.experience,
				company: cybUserExperienceRating.company,
				rating: cybUserExperienceRating.rating,
				review: cybUserExperienceRating.review,
				doc: cybUserExperienceRating.doc,
				link: cybUserExperienceRating.link,
				addedBy: cybUserExperienceRating.addedBy,
				status: cybUserExperienceRating.status,
				approved: cybUserExperienceRating.approved,
				expiry: cybUserExperienceRating.expiry,
				showReview: cybUserExperienceRating.showReview,
				isDeleted: cybUserExperienceRating.isDeleted,
				showHome: cybUserExperienceRating.showHome,
				createDate: cybUserExperienceRating.createDate,
				modifyDate: cybUserExperienceRating.modifyDate,
				designation: cybDesignation.name,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				fname: cybUser.fname,
				lname: cybUser.lname,
			})
			.from(cybUserExperienceRating)
			.leftJoin(cybUserExperience, eq(cybUserExperienceRating.experience, cybUserExperience.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(cybUser, eq(cybUserExperience.user, cybUser.id))
			.where(and(...conditions))
			.orderBy(desc(cybUserExperienceRating.id));

		return result;
	}

	async getExperienceRating(experienceId: number) {
		let totalRating = 0;
		let noOfRecords = 0;

		const allReviewList = await this.getAllExperienceRating(experienceId, 1);

		if (allReviewList && allReviewList.length > 0) {
			for (const Review of allReviewList) {
				const history = await this.getRatingHistory(Review.id);
				if (!isEmptyObject(history)) {
					//todo
					// totalRating += history[0].rating!;
				} else {
					totalRating += Review.rating;
				}
				noOfRecords++;
			}
		}

		return { rating: Math.round(totalRating), noofrecord: noOfRecords };
	}

	async getSkillRatingByHistoryId(historyId: number) {
		return await db
			.select({
				skillId: cybSkillRatingHistory.skillId,
				rating: cybSkillRatingHistory.rating,
				skillName: cybSkill.name,
			})
			.from(cybSkillRatingHistory)
			.leftJoin(cybSkill, eq(cybSkillRatingHistory.skillId, cybSkill.id))
			.where(and(
				eq(cybSkillRatingHistory.reviewHistoryId, historyId),
				eq(cybSkillRatingHistory.isDeleted, 0),
				eq(cybSkillRatingHistory.status, 1)
			))
			.orderBy(desc(cybSkillRatingHistory.id));
	}

	async getRatingHistory(ratingId: number | number[]) {
		if (!ratingId || (Array.isArray(ratingId) && ratingId.length === 0)) {
			return Array.isArray(ratingId) ? {} : [];
		}

		const ids = Array.isArray(ratingId) ? ratingId : [ratingId];

		const results = await db.select().from(cybUserExperienceRatingHistory)
			.where(and(inArray(cybUserExperienceRatingHistory.ratingId, ids),
				eq(cybUserExperienceRatingHistory.isDeleted, 0),
				eq(cybUserExperienceRatingHistory.status, 1)))
			.orderBy(desc(cybUserExperienceRatingHistory.id));

		for (const h of results) {
			if (h.doc) {
				try {
					const paths = JSON.parse(h.doc);
					if (Array.isArray(paths)) {
						(h as any).doc = paths.map((path: string) => getS3Url(path));
					}
				} catch {
					// doc is not JSON, leave as-is
				}
			}

			const skills = await this.getSkillRatingByHistoryId(h.id);
			(h as any).skill_rating = skills;
		}

		if (!Array.isArray(ratingId)) {
			return results;
		}

		const historyMap: Record<number, typeof results> = {};
		for (const h of results) {
			const rid = h.ratingId as number;
			if (!historyMap[rid]) {
				historyMap[rid] = [];
			}
			historyMap[rid].push(h);
		}

		return historyMap;
	}

	async getEmploymentStatus(id: number): Promise<string> {
		const reviews = await db
			.select({ addedBy: cybUserExperienceRating.addedBy })
			.from(cybUserExperienceRating)
			.where(and(eq(cybUserExperienceRating.status, 1), eq(cybUserExperienceRating.experience, id)))
			.orderBy(desc(cybUserExperienceRating.id))
			.limit(1);

		if (reviews.length > 0 && reviews[0].addedBy === 1) {
			return 'complete';
		} else {
			return 'pending';
		}
	}
}


export default new reviewRepositery()
