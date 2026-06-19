import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybCities, cybState, cybCountry, cybIndustries, cybJobExperiences,
	cybRoleTypes, cybDepartment, cybDesignation, cybJobMode, cybSalary,
	cybUser, cybCompanyJob, cybApplication, cybJobCollaborators
} from '../db/schema';

const s3Prefix = process.env.S3_PREFIX || '';

export const get_collaborator_list = async (filter: {
	user_id: number | string;
	status?: number;
	limit?: number;
	offset?: number;
}) => {
	const conditions = [
		eq(cybJobCollaborators.userId, String(filter.user_id)),
		eq(cybJobCollaborators.isDeleted, 0),
		eq(cybCompanyJob.isDeleted, 0),
	];

	if (filter.status) {
		conditions.push(eq(cybCompanyJob.status, filter.status));
	}

	const companyUser = alias(cybUser, 'company');

	const selectFields = {
		id: cybCompanyJob.id,
		job_title: cybCompanyJob.jobTitle,
		slug: cybCompanyJob.slug,
		company: cybCompanyJob.company,
		urgent: cybCompanyJob.urgent,
		vacancy: cybCompanyJob.vacancy,
		create_date: cybCompanyJob.createDate,
		status: cybCompanyJob.status,
		city_name: cybCities.name,
		state_name: cybState.name,
		country_name: cybCountry.name,
		industry_name: cybIndustries.name,
		department_name: cybDepartment.name,
		experience_name: cybJobExperiences.name,
		role_type_name: cybRoleTypes.name,
		designation_name: cybDesignation.name,
		company_name: companyUser.fullName,
		profile: companyUser.profile,
		social_image: companyUser.socialImage,
		companyId: companyUser.id,
		company_slug: companyUser.slug,
		individual_id: companyUser.individualId,
		job_mode_name: cybJobMode.name,
		salary_name: cybSalary.name,
		applicationCount: sql<number>`COUNT(${cybApplication.id})`,
	};

	const baseQuery = db.select(selectFields)
		.from(cybJobCollaborators)
		.leftJoin(cybCompanyJob, eq(cybJobCollaborators.jobId, cybCompanyJob.id))
		.leftJoin(cybCities, eq(cybCompanyJob.city, cybCities.id))
		.leftJoin(cybState, eq(cybCompanyJob.state, cybState.id))
		.leftJoin(cybCountry, eq(cybCompanyJob.country, cybCountry.id))
		.leftJoin(cybIndustries, eq(cybCompanyJob.industry, cybIndustries.id))
		.leftJoin(cybJobExperiences, eq(cybCompanyJob.experience, cybJobExperiences.id))
		.leftJoin(cybRoleTypes, eq(cybCompanyJob.roleType, cybRoleTypes.id))
		.leftJoin(cybDepartment, eq(cybCompanyJob.department, cybDepartment.id))
		.leftJoin(cybDesignation, eq(cybCompanyJob.designation, cybDesignation.id))
		.leftJoin(cybApplication, eq(cybCompanyJob.id, cybApplication.job))
		.leftJoin(cybJobMode, eq(cybCompanyJob.jobMode, cybJobMode.id))
		.leftJoin(companyUser, eq(cybCompanyJob.company, companyUser.id))
		.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
		.where(and(...conditions))
		.groupBy(cybCompanyJob.id)
		.orderBy(desc(cybJobCollaborators.createdAt));

	if (filter.limit !== undefined) {
		baseQuery.limit(filter.limit);
		if (filter.offset) {
			baseQuery.offset(filter.offset);
		}
		return baseQuery;
	}

	const [countResult] = await db.select({ count: sql<number>`COUNT(DISTINCT ${cybCompanyJob.id})` })
		.from(cybJobCollaborators)
		.leftJoin(cybCompanyJob, eq(cybJobCollaborators.jobId, cybCompanyJob.id))
		.where(and(...conditions));

	return countResult?.count ?? 0;
};
export const job_collaborator_list = async ({
	user_id,
	job_id,
	limit,
	offset,
}: {
	user_id: number;
	job_id: number;
	limit?: number;
	offset?: number;
}) => {
	const collaboratorUser = alias(cybUser, 'collaborator_user');

	const whereCondition = and(
		eq(cybJobCollaborators.companyId, user_id),
		eq(cybJobCollaborators.isDeleted, 0),
		eq(cybJobCollaborators.jobId, job_id),
	);

	let dataQuery = db
		.select({
			id: collaboratorUser.id,
			full_name: collaboratorUser.fullName,
			profile: collaboratorUser.profile,
			social_image: collaboratorUser.socialImage,
			slug: collaboratorUser.slug,
			individual_id: collaboratorUser.individualId,
			designation_name: cybDesignation.name,
		})
		.from(cybJobCollaborators)
		.leftJoin(collaboratorUser, eq(cybJobCollaborators.userId, sql`CAST(${collaboratorUser.id} AS CHAR)`))
		.leftJoin(cybDesignation, eq(collaboratorUser.currentPossition, cybDesignation.id))
		.where(whereCondition)
		.orderBy(desc(cybJobCollaborators.createdAt));

	if (limit !== undefined) {
		dataQuery.limit(limit);
	}

	if (offset !== undefined) {
		dataQuery.offset(offset);
	}

	const [data, [countResult]] = await Promise.all([
		dataQuery,
		db.select({ count: sql<number>`count(*)`, }).from(cybJobCollaborators).where(whereCondition),
	]);

	return {
		data,
		count: Number(countResult.count),
	};
}
