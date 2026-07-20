import { and, eq, sql, desc, ne } from "drizzle-orm";
import db from "../db";
import {
	cybUser,
	cybUserExperience,
	cybUserExperienceRating,
	cybCompanyJob,
	cybCities,
	cybState,
	cybCountry,
	cybIndustries,
	cybTurnover,
	cybCompanySize,
	cybFollow,
	cybJobMeta,
	cybEnquiries,
	cybCareerEnquiries,
	cybSetting,
} from "../db/schema";

class FrontendRepositery {
	/**
	 * Top companies: claimed companies with enough experiences, reviews, and active jobs.
	 * `offsetQuery` is a **page number** (legacy), converted to SQL offset by the service.
	 */
	private experienceJoinCondition(viewerId?: number) {
		const parts = [
			eq(cybUserExperience.company, cybUser.id),
			eq(cybUserExperience.isDeleted, 0),
		];
		if (viewerId != null) {
			parts.push(ne(cybUserExperience.user, viewerId));
		}
		return and(...parts);
	}

	/**
	 * Top companies: claimed companies with enough experiences, reviews, and active jobs.
	 * `sqlOffset` is already converted from the legacy page-number query param.
	 */
	async getTopCompanies(opts: {
		limit: number;
		sqlOffset: number;
		viewerId?: number;
	}) {
		const { limit, sqlOffset, viewerId } = opts;

		const rows = await db
			.select({
				id: cybUser.id,
				fname: cybUser.fname,
				lname: cybUser.lname,
				individualId: cybUser.individualId,
				slug: cybUser.slug,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				cityName: cybCities.name,
				stateName: cybState.name,
				countryName: cybCountry.name,
				industryName: cybIndustries.name,
				turnoverName: cybTurnover.name,
				companySizeName: cybCompanySize.name,
				experienceCount: sql<number>`COUNT(DISTINCT ${cybUserExperience.id})`.mapWith(Number),
				reviewCount: sql<number>`COUNT(DISTINCT ${cybUserExperienceRating.id})`.mapWith(Number),
				jobCount: sql<number>`COUNT(DISTINCT CASE WHEN ${cybCompanyJob.status} = 1 AND ${cybCompanyJob.isDeleted} = 0 THEN ${cybCompanyJob.id} END)`.mapWith(
					Number
				),
			})
			.from(cybUser)
			.leftJoin(cybUserExperience, this.experienceJoinCondition(viewerId))
			.leftJoin(
				cybUserExperienceRating,
				and(
					eq(cybUserExperienceRating.company, cybUser.id),
					eq(cybUserExperienceRating.isDeleted, 0)
				)
			)
			.leftJoin(cybCompanyJob, eq(cybCompanyJob.company, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.leftJoin(cybTurnover, eq(cybUser.turnover, cybTurnover.id))
			.leftJoin(cybCompanySize, eq(cybUser.companySize, cybCompanySize.id))
			.where(
				and(
					eq(cybUser.userType, 2),
					eq(cybUser.status, 1),
					eq(cybUser.claimStatus, 1),
					eq(cybUser.isDeleted, 0)
				)
			)
			.groupBy(cybUser.id)
			.having(
				sql`COUNT(DISTINCT ${cybUserExperience.id}) >= 5
					AND COUNT(DISTINCT ${cybUserExperienceRating.id}) >= 2
					AND COUNT(DISTINCT CASE WHEN ${cybCompanyJob.status} = 1 AND ${cybCompanyJob.isDeleted} = 0 THEN ${cybCompanyJob.id} END) >= 1`
			)
			.orderBy(desc(sql`COUNT(DISTINCT ${cybUserExperience.id})`))
			.limit(limit)
			.offset(sqlOffset);

		return rows;
	}

	async countTopCompanies(viewerId?: number) {
		const rows = await db
			.select({
				id: cybUser.id,
			})
			.from(cybUser)
			.leftJoin(cybUserExperience, this.experienceJoinCondition(viewerId))
			.leftJoin(
				cybUserExperienceRating,
				and(
					eq(cybUserExperienceRating.company, cybUser.id),
					eq(cybUserExperienceRating.isDeleted, 0)
				)
			)
			.leftJoin(cybCompanyJob, eq(cybCompanyJob.company, cybUser.id))
			.where(
				and(
					eq(cybUser.userType, 2),
					eq(cybUser.status, 1),
					eq(cybUser.claimStatus, 1),
					eq(cybUser.isDeleted, 0)
				)
			)
			.groupBy(cybUser.id)
			.having(
				sql`COUNT(DISTINCT ${cybUserExperience.id}) >= 5
					AND COUNT(DISTINCT ${cybUserExperienceRating.id}) >= 2
					AND COUNT(DISTINCT CASE WHEN ${cybCompanyJob.status} = 1 AND ${cybCompanyJob.isDeleted} = 0 THEN ${cybCompanyJob.id} END) >= 1`
			);

		return rows.length;
	}

	async getFollowCounts(userId: number) {
		const [following] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybFollow)
			.where(
				and(
					eq(cybFollow.followerId, userId),
					eq(cybFollow.status, 1),
					eq(cybFollow.isDeleted, 0)
				)
			);
		const [follower] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybFollow)
			.where(
				and(
					eq(cybFollow.followedId, userId),
					eq(cybFollow.status, 1),
					eq(cybFollow.isDeleted, 0)
				)
			);
		return {
			following: following?.count ?? 0,
			follower: follower?.count ?? 0,
		};
	}

	async getFollowStatus(viewerId: number, companyId: number) {
		const [row] = await db
			.select({
				id: cybFollow.id,
				status: cybFollow.status,
			})
			.from(cybFollow)
			.where(
				and(
					eq(cybFollow.followerId, viewerId),
					eq(cybFollow.followedId, companyId),
					eq(cybFollow.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async hasActiveJobs(companyId: number): Promise<number> {
		const [row] = await db
			.select({ id: cybCompanyJob.id })
			.from(cybCompanyJob)
			.where(
				and(
					eq(cybCompanyJob.company, companyId),
					eq(cybCompanyJob.status, 1),
					eq(cybCompanyJob.isDeleted, 0)
				)
			)
			.limit(1);
		return row ? 1 : 0;
	}

	// ====== Sitemap slugs ======

	async getCompanySlugs() {
		return db
			.select({ slug: cybUser.slug })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.status, 1),
					eq(cybUser.userType, 2),
					eq(cybUser.isDeleted, 0)
				)
			);
	}

	async getUserSlugs() {
		return db
			.select({ slug: cybUser.slug })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.status, 1),
					eq(cybUser.userType, 1),
					eq(cybUser.isDeleted, 0)
				)
			);
	}

	async getJobSlugs() {
		return db
			.select({ slug: cybCompanyJob.slug })
			.from(cybCompanyJob)
			.where(and(eq(cybCompanyJob.status, 1), eq(cybCompanyJob.isDeleted, 0)));
	}

	async getJobMetaSlugs() {
		return db
			.select({ job_slug: cybJobMeta.jobSlug })
			.from(cybJobMeta)
			.where(eq(cybJobMeta.status, 1));
	}

	// ====== Enquiries ======

	async insertEnquiry(data: {
		firstName: string;
		lastName?: string | null;
		email: string;
		phone?: string | null;
		company?: string | null;
		message?: string | null;
		createDate: string;
	}) {
		const result = await db.insert(cybEnquiries).values({
			firstName: data.firstName,
			lastName: data.lastName ?? null,
			email: data.email,
			phone: data.phone ?? "",
			company: data.company ?? null,
			message: data.message ?? null,
			createDate: data.createDate,
		});
		return result;
	}

	async insertCareerEnquiry(data: {
		firstName: string;
		lastName?: string | null;
		email: string;
		phone?: string | null;
		company?: string | null;
		message?: string | null;
		createDate: string;
	}) {
		const result = await db.insert(cybCareerEnquiries).values({
			firstName: data.firstName,
			lastName: data.lastName ?? null,
			email: data.email,
			phone: data.phone ?? "",
			company: data.company ?? null,
			message: data.message ?? null,
			createDate: data.createDate,
		});
		return result;
	}

	/** Site settings map from cyb_setting (websetting equivalent). */
	async getWebSettings(): Promise<Record<string, string>> {
		const rows = await db
			.select({
				key: cybSetting.key,
				value: cybSetting.value,
				code: cybSetting.code,
			})
			.from(cybSetting)
			.where(eq(cybSetting.status, 1));

		const map: Record<string, string> = {};
		for (const row of rows) {
			const k = row.key || row.code;
			if (k && row.value != null) map[k] = row.value;
		}
		return map;
	}
}

export default new FrontendRepositery();
