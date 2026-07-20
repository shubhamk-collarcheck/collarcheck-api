import { and, asc, desc, eq, inArray, ne, or, sql, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import db from "../db";
import {
	cybRamdomWidgets,
	cybViewImpressions,
	cybUser,
	cybUserDetails,
	cybUserExperience,
	cybUserEducation,
	cybDesignation,
	cybCities,
	cybState,
	cybCountry,
	cybIndustries,
	cybTurnover,
	cybCompanySize,
	cybCompanyJob,
	cybApplication,
	cybFollow,
	cybDepartment,
	cybJobExperiences,
	cybRoleTypes,
	cybJobMode,
	cybSalary,
	cybInstitutions,
} from "../db/schema";

function nowSql() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

class WidgetRepositery {
	// ---- registry ----
	async getRandomWidgets(audience: "USER" | "COMPANY", limit = 10) {
		return db
			.select()
			.from(cybRamdomWidgets)
			.where(
				and(
					eq(cybRamdomWidgets.status, 1),
					or(eq(cybRamdomWidgets.type, audience), eq(cybRamdomWidgets.type, "BOTH"))
				)
			)
			.orderBy(sql`RAND()`)
			.limit(limit);
	}

	async getFixedWidgets(audience: "USER" | "COMPANY") {
		return db
			.select()
			.from(cybRamdomWidgets)
			.where(
				and(
					eq(cybRamdomWidgets.status, 1),
					or(eq(cybRamdomWidgets.type, audience), eq(cybRamdomWidgets.type, "BOTH"))
				)
			)
			.orderBy(asc(cybRamdomWidgets.id));
	}

	async getWidgetBySlug(slug: string) {
		const [row] = await db
			.select()
			.from(cybRamdomWidgets)
			.where(and(eq(cybRamdomWidgets.slug, slug), eq(cybRamdomWidgets.status, 1)))
			.limit(1);
		return row;
	}

	// ---- geo / user context ----
	async getUserGeo(userId: number) {
		const [row] = await db
			.select({
				id: cybUser.id,
				userType: cybUser.userType,
				city: cybUser.city,
				state: cybUser.state,
				country: cybUser.country,
				industry: cybUser.industry,
				currentCompany: cybUser.currentCompany,
				workStatus: cybUser.workStatus,
				onExplore: cybUser.onExplore,
				onImmediate: cybUser.onImmediate,
				onNotice: cybUser.onNotice,
				latitude: cybUserDetails.latitude,
				longitude: cybUserDetails.longitude,
			})
			.from(cybUser)
			.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
			.where(and(eq(cybUser.id, userId), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	// ---- shared company list select ----
	private companySelect() {
		return {
			id: cybUser.id,
			fname: cybUser.fname,
			lname: cybUser.lname,
			individualId: cybUser.individualId,
			slug: cybUser.slug,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			claimStatus: cybUser.claimStatus,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			industryName: cybIndustries.name,
			turnoverName: cybTurnover.name,
			companySizeName: cybCompanySize.name,
			latitude: cybUserDetails.latitude,
			longitude: cybUserDetails.longitude,
		};
	}

	private personSelect() {
		const companyUser = alias(cybUser, "cmp");
		return {
			id: cybUser.id,
			fname: cybUser.fname,
			lname: cybUser.lname,
			individualId: cybUser.individualId,
			slug: cybUser.slug,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			userType: cybUser.userType,
			onExplore: cybUser.onExplore,
			onImmediate: cybUser.onImmediate,
			onNotice: cybUser.onNotice,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			designationName: cybDesignation.name,
			companyName: companyUser.fname,
			latitude: cybUserDetails.latitude,
			longitude: cybUserDetails.longitude,
		};
	}

	async listCompanies(opts: {
		excludeId?: number;
		industry?: number | null;
		city?: number | null;
		claimOnly?: boolean;
		limit: number;
		sqlOffset: number;
		orderRandom?: boolean;
	}) {
		const conditions = [
			eq(cybUser.userType, 2),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (opts.claimOnly !== false) conditions.push(eq(cybUser.claimStatus, 1));
		if (opts.excludeId) conditions.push(ne(cybUser.id, opts.excludeId));
		if (opts.industry) conditions.push(eq(cybUser.industry, opts.industry));
		if (opts.city) conditions.push(eq(cybUser.city, opts.city));

		const order = opts.orderRandom ? sql`RAND()` : desc(cybUser.id);
		const rows = await db
			.select(this.companySelect())
			.from(cybUser)
			.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.leftJoin(cybTurnover, eq(cybUser.turnover, cybTurnover.id))
			.leftJoin(cybCompanySize, eq(cybUser.companySize, cybCompanySize.id))
			.where(and(...conditions))
			.orderBy(order)
			.limit(opts.limit)
			.offset(opts.sqlOffset);

		const [countRow] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybUser)
			.where(and(...conditions));

		return { rows, total: countRow?.count ?? 0 };
	}

	async listEmployees(opts: {
		excludeId?: number;
		city?: number | null;
		industry?: number | null;
		currentCompany?: number | null;
		onImmediate?: boolean;
		onNotice?: boolean;
		onExplore?: boolean;
		workStatus?: number | null;
		excludeCurrentCompany?: boolean;
		recentJoinDays?: number;
		fresher?: boolean;
		limit: number;
		sqlOffset: number;
		orderRandom?: boolean;
	}) {
		const companyUser = alias(cybUser, "cmp");
		const conditions = [
			eq(cybUser.userType, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (opts.excludeId) conditions.push(ne(cybUser.id, opts.excludeId));
		if (opts.city) conditions.push(eq(cybUser.city, opts.city));
		if (opts.industry) conditions.push(eq(cybUser.industry, opts.industry));
		if (opts.currentCompany) conditions.push(eq(cybUser.currentCompany, opts.currentCompany));
		if (opts.onImmediate) conditions.push(eq(cybUser.onImmediate, 1));
		if (opts.onNotice) conditions.push(eq(cybUser.onNotice, 1));
		if (opts.onExplore) conditions.push(eq(cybUser.onExplore, 1));
		if (opts.workStatus != null) conditions.push(eq(cybUser.workStatus, opts.workStatus));
		if (opts.excludeCurrentCompany && opts.currentCompany) {
			conditions.push(
				or(
					sql`${cybUser.currentCompany} IS NULL`,
					ne(cybUser.currentCompany, opts.currentCompany)
				)!
			);
		}
		if (opts.recentJoinDays) {
			conditions.push(
				sql`${cybUser.createDate} >= DATE_SUB(NOW(), INTERVAL ${opts.recentJoinDays} DAY)`
			);
		}
		if (opts.fresher) {
			// few/no approved experiences
			conditions.push(
				sql`(SELECT COUNT(*) FROM cyb_user_experience ue WHERE ue.user = ${cybUser.id} AND ue.is_deleted = 0) <= 1`
			);
		}

		const order = opts.orderRandom ? sql`RAND()` : desc(cybUser.id);
		const rows = await db
			.select(this.personSelect())
			.from(cybUser)
			.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
			.where(and(...conditions))
			.orderBy(order)
			.limit(opts.limit)
			.offset(opts.sqlOffset);

		const [countRow] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybUser)
			.where(and(...conditions));

		return { rows, total: countRow?.count ?? 0 };
	}

	async getViewerUniversityIds(userId: number): Promise<number[]> {
		const rows = await db
			.select({ university: cybUserEducation.university })
			.from(cybUserEducation)
			.where(
				and(
					eq(cybUserEducation.user, userId),
					eq(cybUserEducation.isDeleted, 0),
					isNotNull(cybUserEducation.university)
				)
			);
		return [
			...new Set(
				rows
					.map((r) => Number(r.university))
					.filter((id) => Number.isFinite(id) && id > 0)
			),
		];
	}

	async listPeopleByUniversities(
		universityIds: number[],
		excludeId: number,
		limit: number,
		sqlOffset: number
	) {
		if (!universityIds.length) return { rows: [] as any[], total: 0 };
		const companyUser = alias(cybUser, "cmp");
		const conditions = [
			eq(cybUser.userType, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
			ne(cybUser.id, excludeId),
			inArray(cybUserEducation.university, universityIds),
			eq(cybUserEducation.isDeleted, 0),
		];

		const rows = await db
			.selectDistinct({
				...this.personSelect(),
				universityName: cybInstitutions.name,
			})
			.from(cybUser)
			.innerJoin(cybUserEducation, eq(cybUserEducation.user, cybUser.id))
			.leftJoin(cybInstitutions, eq(cybUserEducation.university, cybInstitutions.id))
			.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
			.where(and(...conditions))
			.limit(limit)
			.offset(sqlOffset);

		const [countRow] = await db
			.select({
				count: sql<number>`COUNT(DISTINCT ${cybUser.id})`.mapWith(Number),
			})
			.from(cybUser)
			.innerJoin(cybUserEducation, eq(cybUserEducation.user, cybUser.id))
			.where(and(...conditions));

		return { rows, total: countRow?.count ?? 0 };
	}

	async getPastCompanyIds(userId: number): Promise<number[]> {
		const rows = await db
			.select({ company: cybUserExperience.company })
			.from(cybUserExperience)
			.where(
				and(
					eq(cybUserExperience.user, userId),
					eq(cybUserExperience.isDeleted, 0),
					eq(cybUserExperience.stillWorking, 0),
					isNotNull(cybUserExperience.company)
				)
			);
		return [
			...new Set(
				rows
					.map((r) => Number(r.company))
					.filter((id) => Number.isFinite(id) && id > 0)
			),
		];
	}

	async listPeopleByCompanies(
		companyIds: number[],
		excludeId: number,
		limit: number,
		sqlOffset: number,
		stillWorking?: number
	) {
		if (!companyIds.length) return { rows: [] as any[], total: 0 };
		const companyUser = alias(cybUser, "cmp");
		const conditions = [
			eq(cybUser.userType, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
			ne(cybUser.id, excludeId),
			inArray(cybUserExperience.company, companyIds),
			eq(cybUserExperience.isDeleted, 0),
		];
		if (stillWorking != null) {
			conditions.push(eq(cybUserExperience.stillWorking, stillWorking));
		}

		const rows = await db
			.selectDistinct(this.personSelect())
			.from(cybUser)
			.innerJoin(cybUserExperience, eq(cybUserExperience.user, cybUser.id))
			.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
			.where(and(...conditions))
			.limit(limit)
			.offset(sqlOffset);

		const [countRow] = await db
			.select({
				count: sql<number>`COUNT(DISTINCT ${cybUser.id})`.mapWith(Number),
			})
			.from(cybUser)
			.innerJoin(cybUserExperience, eq(cybUserExperience.user, cybUser.id))
			.where(and(...conditions));

		return { rows, total: countRow?.count ?? 0 };
	}

	async listOpenJobs(opts: {
		limit: number;
		sqlOffset: number;
		urgent?: boolean;
		viewerId?: number;
	}) {
		const companyUser = alias(cybUser, "cmp");
		const conditions = [
			eq(cybCompanyJob.status, 1),
			eq(cybCompanyJob.isDeleted, 0),
		];
		if (opts.urgent) conditions.push(eq(cybCompanyJob.urgent, 1));

		const rows = await db
			.select({
				id: cybCompanyJob.id,
				jobTitle: cybCompanyJob.jobTitle,
				slug: cybCompanyJob.slug,
				vacancy: cybCompanyJob.vacancy,
				urgent: cybCompanyJob.urgent,
				createDate: cybCompanyJob.createDate,
				jobDescription: cybCompanyJob.jobDescription,
				companyId: cybCompanyJob.company,
				companyName: companyUser.fname,
				companySlug: companyUser.slug,
				companyProfile: companyUser.profile,
				companySocial: companyUser.socialImage,
				individualId: companyUser.individualId,
				cityName: cybCities.name,
				stateName: cybState.name,
				countryName: cybCountry.name,
				industryName: cybIndustries.name,
				designationName: cybDesignation.name,
				departmentName: cybDepartment.name,
				experienceName: cybJobExperiences.name,
				roleTypeName: cybRoleTypes.name,
				jobModeName: cybJobMode.name,
				salaryName: cybSalary.name,
			})
			.from(cybCompanyJob)
			.leftJoin(companyUser, eq(cybCompanyJob.company, companyUser.id))
			.leftJoin(cybCities, eq(cybCompanyJob.city, cybCities.id))
			.leftJoin(cybState, eq(cybCompanyJob.state, cybState.id))
			.leftJoin(cybCountry, eq(cybCompanyJob.country, cybCountry.id))
			.leftJoin(cybIndustries, eq(cybCompanyJob.industry, cybIndustries.id))
			.leftJoin(cybDesignation, eq(cybCompanyJob.designation, cybDesignation.id))
			.leftJoin(cybDepartment, eq(cybCompanyJob.department, cybDepartment.id))
			.leftJoin(
				cybJobExperiences,
				sql`${cybCompanyJob.experience} = ${cybJobExperiences.id}`
			)
			.leftJoin(cybRoleTypes, eq(cybCompanyJob.roleType, cybRoleTypes.id))
			.leftJoin(cybJobMode, eq(cybCompanyJob.jobMode, cybJobMode.id))
			.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
			.where(and(...conditions))
			.orderBy(desc(cybCompanyJob.id))
			.limit(opts.limit)
			.offset(opts.sqlOffset);

		const [countRow] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybCompanyJob)
			.where(and(...conditions));

		let appliedJobIds = new Set<number>();
		if (opts.viewerId && rows.length) {
			const jobIds = rows.map((r) => r.id);
			const apps = await db
				.select({ job: cybApplication.job })
				.from(cybApplication)
				.where(
					and(
						eq(cybApplication.user, opts.viewerId),
						eq(cybApplication.isDeleted, 0),
						inArray(cybApplication.job, jobIds)
					)
				);
			appliedJobIds = new Set(
				apps.map((a) => a.job).filter((id): id is number => id != null)
			);
		}

		return { rows, total: countRow?.count ?? 0, appliedJobIds };
	}

	// ---- follow / explore ----
	async getFollowStatus(viewerId: number, targetId: number) {
		const [row] = await db
			.select({ id: cybFollow.id, status: cybFollow.status })
			.from(cybFollow)
			.where(
				and(
					eq(cybFollow.followerId, viewerId),
					eq(cybFollow.followedId, targetId),
					eq(cybFollow.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
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

	// ---- impressions ----
	async findUserById(id: number) {
		const [row] = await db
			.select({ id: cybUser.id, userType: cybUser.userType })
			.from(cybUser)
			.where(and(eq(cybUser.id, id), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async findImpression(currentUser: number, remoteId: number, type: string) {
		// DB enum is Profile|Job; also try raw type for dedupe quirk
		const [row] = await db
			.select({ id: cybViewImpressions.id })
			.from(cybViewImpressions)
			.where(
				and(
					eq(cybViewImpressions.currentUser, currentUser),
					eq(cybViewImpressions.remoteId, remoteId),
					eq(cybViewImpressions.isDeleted, 0),
					sql`LOWER(${cybViewImpressions.type}) = LOWER(${type})`
				)
			)
			.limit(1);
		return row;
	}

	async insertImpression(data: {
		currentUser: number;
		remoteId: number;
		type: "Profile" | "Job";
	}) {
		const now = nowSql();
		return db.insert(cybViewImpressions).values({
			currentUser: data.currentUser,
			remoteId: data.remoteId,
			type: data.type,
			isDeleted: 0,
			createDate: now,
			modifyDate: now,
		});
	}

	async listImpressionsOnMe(opts: {
		remoteId: number;
		type: "Profile" | "Job";
		viewerUserType: number;
		limit: number;
		sqlOffset: number;
	}) {
		const companyUser = alias(cybUser, "cmp");
		const conditions = [
			eq(cybViewImpressions.remoteId, opts.remoteId),
			eq(cybViewImpressions.type, opts.type),
			eq(cybViewImpressions.isDeleted, 0),
			eq(cybUser.userType, opts.viewerUserType),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];

		const rows = await db
			.select({
				id: cybUser.id,
				fname: cybUser.fname,
				lname: cybUser.lname,
				individualId: cybUser.individualId,
				slug: cybUser.slug,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				userType: cybUser.userType,
				onExplore: cybUser.onExplore,
				onImmediate: cybUser.onImmediate,
				onNotice: cybUser.onNotice,
				cityName: cybCities.name,
				stateName: cybState.name,
				countryName: cybCountry.name,
				designationName: cybDesignation.name,
				companyName: companyUser.fname,
				industryName: cybIndustries.name,
				viewedAt: cybViewImpressions.createDate,
			})
			.from(cybViewImpressions)
			.innerJoin(cybUser, eq(cybViewImpressions.currentUser, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.where(and(...conditions))
			.orderBy(desc(cybViewImpressions.id))
			.limit(opts.limit)
			.offset(opts.sqlOffset);

		const [countRow] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybViewImpressions)
			.innerJoin(cybUser, eq(cybViewImpressions.currentUser, cybUser.id))
			.where(and(...conditions));

		return { rows, total: countRow?.count ?? 0 };
	}

	async listJobImpressions(companyId: number, limit: number, sqlOffset: number) {
		// Jobs owned by company with impression counts (type Job, remote_id = job id — or company)
		// PHP model is opaque; use impressions where remote is job under company OR company itself
		const jobs = await db
			.select({
				id: cybCompanyJob.id,
				jobTitle: cybCompanyJob.jobTitle,
				slug: cybCompanyJob.slug,
				views: sql<number>`(
					SELECT COUNT(*) FROM cyb_view_impressions vi
					WHERE vi.remote_id = ${cybCompanyJob.id}
					AND vi.type = 'Job'
					AND vi.is_deleted = 0
				)`.mapWith(Number),
			})
			.from(cybCompanyJob)
			.where(
				and(
					eq(cybCompanyJob.company, companyId),
					eq(cybCompanyJob.isDeleted, 0)
				)
			)
			.orderBy(desc(cybCompanyJob.id))
			.limit(limit)
			.offset(sqlOffset);

		const [countRow] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybCompanyJob)
			.where(
				and(eq(cybCompanyJob.company, companyId), eq(cybCompanyJob.isDeleted, 0))
			);

		return { rows: jobs, total: countRow?.count ?? 0 };
	}

	async listJobImpressionViewers(
		jobId: number,
		limit: number,
		sqlOffset: number
	) {
		const companyUser = alias(cybUser, "cmp");
		const conditions = [
			eq(cybViewImpressions.remoteId, jobId),
			eq(cybViewImpressions.type, "Job"),
			eq(cybViewImpressions.isDeleted, 0),
			eq(cybUser.userType, 1),
			eq(cybUser.isDeleted, 0),
		];
		const rows = await db
			.select({
				id: cybUser.id,
				fname: cybUser.fname,
				lname: cybUser.lname,
				individualId: cybUser.individualId,
				slug: cybUser.slug,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				userType: cybUser.userType,
				onExplore: cybUser.onExplore,
				onImmediate: cybUser.onImmediate,
				onNotice: cybUser.onNotice,
				cityName: cybCities.name,
				stateName: cybState.name,
				countryName: cybCountry.name,
				designationName: cybDesignation.name,
				companyName: companyUser.fname,
			})
			.from(cybViewImpressions)
			.innerJoin(cybUser, eq(cybViewImpressions.currentUser, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
			.where(and(...conditions))
			.orderBy(desc(cybViewImpressions.id))
			.limit(limit)
			.offset(sqlOffset);

		const [countRow] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybViewImpressions)
			.innerJoin(cybUser, eq(cybViewImpressions.currentUser, cybUser.id))
			.where(and(...conditions));

		return { rows, total: countRow?.count ?? 0 };
	}
}

export default new WidgetRepositery();
