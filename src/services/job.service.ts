import { and, asc, desc, eq, getTableColumns, inArray, like, ne, or, sql, SQL } from 'drizzle-orm';
import db from '../db';
import { cybApplication, cybBenefits, cybCities, cybCompanyBenefits, cybCompanyJob, cybCountry, cybCourses, cybDepartment, cybDesignation, cybIndustries, cybJobExperiences, cybJobMode, cybRoleTypes, cybSalary, cybSkill, cybState, cybUser, cybUserDomains, cybUserEducation, cybUserExperience, cybUserSkill, cybVerifyDocument } from '../db/schema';
import { get_user_detail } from './users.service';

import { SearchJobFilter } from "../types/job.types"
import { job_collaborator_list } from './collaborator.service';
import { decodeSkill, decodeGallery } from '../utils/decoders';



const s3Prefix = process.env.S3_PREFIX || '';

export const get_company_list_service = async (countryId?: number | number[], stateId?: number | number[], cityId?: number | number[],) => {

	const countryIds = Array.isArray(countryId) ? countryId : (countryId ? [countryId] : []);
	const stateIds = Array.isArray(stateId) ? stateId : (stateId ? [stateId] : []);
	const cityIds = Array.isArray(cityId) ? cityId : (cityId ? [cityId] : []);

	const conditions = [eq(cybCompanyJob.status, 1), eq(cybCompanyJob.isDeleted, 0), eq(cybUser.status, 1), eq(cybUser.isDeleted, 0),];

	if (stateIds.length > 0) {
		conditions.push(inArray(cybCompanyJob.state, stateIds));
	}

	if (countryIds.length > 0) {
		conditions.push(inArray(cybCompanyJob.country, countryIds));
	}

	if (cityIds.length > 0) {
		conditions.push(inArray(cybCompanyJob.city, cityIds));
	}

	return db.selectDistinct({ id: cybUser.id, name: cybUser.fname, slug: cybUser.slug, })
		.from(cybCompanyJob)
		.innerJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
		.where(and(...conditions))
		.orderBy(asc(cybUser.fname));
};


export const get_unique_company_benefit_list_service = async () => {
	const condition = [eq(cybCompanyBenefits.isDeleted, 0)]
	return db.select({ id: cybCompanyBenefits.benefitId, name: cybBenefits.name }).from(cybCompanyBenefits).leftJoin(cybBenefits, eq(cybCompanyBenefits.benefitId, cybBenefits.id))
		.where(and(...condition)).groupBy(cybCompanyBenefits.benefitId).orderBy(asc(cybCompanyBenefits.sortOrder))
}


export const get_state_by_employees_service = async () => {
	const condition = [eq(cybUser.isDeleted, 0), eq(cybUser.userType, 1)]
	return db.selectDistinct({ state: cybUser.state }).from(cybUser).where(and(...condition))
}


export const get_state_by_id_service = async (stateId: number | number[] = []) => {
	const ids = Array.isArray(stateId) ? stateId : [stateId];
	if (ids.length === 0) return [];
	const condition = [eq(cybState.status, 1), inArray(cybState.id, ids)]
	return db.select({ id: cybState.id, name: cybState.name }).from(cybState).where(and(...condition)).orderBy(asc(cybState.name))
}


export const get_industry_list_service = async () => {
	const condition = [eq(cybUser.status, 1), eq(cybUser.isDeleted, 0), eq(cybIndustries.status, 1), eq(cybIndustries.isDeleted, 0), eq(cybUserExperience.isDeleted, 0)]
	return await db.selectDistinct({ id: cybIndustries.id, name: cybIndustries.name }).from(cybUserExperience).innerJoin(cybUser, eq(cybUserExperience.company, cybUser.id)).innerJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id)).orderBy(asc(cybIndustries.name))
}

export const get_empoyee_designation_service = async () => {
	const condition = [eq(cybDesignation.status, 1), eq(cybUserExperience.isDeleted, 0)]
	return await db.selectDistinct({ id: cybDesignation.id, name: cybDesignation.name }).from(cybUserExperience).innerJoin(cybDesignation, eq(cybDesignation.id, cybUserExperience.designation)).where(and(...condition)).groupBy(cybUserExperience.designation).orderBy(asc(cybDesignation.name))
}

export const get_employee_department_service = async () => {
	const condition = [eq(cybDepartment.status, 1), eq(cybUserExperience.isDeleted, 0)]
	return await db.selectDistinct({ id: cybDepartment.id, name: cybDepartment.name }).from(cybUserExperience).innerJoin(cybDepartment, eq(cybDepartment.id, cybUserExperience.department)).where(and(...condition)).groupBy(cybUserExperience.department).orderBy(asc(cybDepartment.name))
}

export const get_user_skill_service = async () => {
	const condition = [eq(cybUserSkill.status, 1), eq(cybUserSkill.isDeleted, 0)]
	return await db.selectDistinct({ skill: cybUserSkill.skill }).from(cybUserSkill).where(and(...condition))
}

export const get_user_experience_skill_service = async () => {
	const condition = [eq(cybUserExperience.isDeleted, 0), ne(cybUserExperience.approved, 2)]
	return await db.selectDistinct({ skill: cybUserExperience.skill }).from(cybUserExperience).where(and(...condition))
}

export const get_skill_list_service = async (skillId: number | number[] = []) => {
	const ids = Array.isArray(skillId) ? skillId : [skillId];
	if (ids.length === 0) return [];
	const condition = [eq(cybSkill.status, 1), inArray(cybSkill.id, ids), ne(cybSkill.name, '')]
	return await db.select({ id: cybSkill.id, name: cybSkill.name }).from(cybSkill).where(and(...condition)).orderBy(asc(cybSkill.name)).limit(55)
}

export const get_course_list_service = async () => {
	const condition = [eq(cybUserEducation.status, 1), eq(cybUserEducation.isDeleted, 0), eq(cybCourses.status, 1)]
	return await db.selectDistinct({ id: cybCourses.id, name: cybCourses.name }).from(cybUserEducation).innerJoin(cybCourses, eq(cybCourses.id, cybUserEducation.course)).where(and(...condition)).orderBy(asc(cybCourses.name))
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//changing the layout
export const get_search_skill = async (keyword: string) => {
	if (!keyword) return [];
	const rows = await db.select({ id: cybSkill.id })
		.from(cybSkill)
		.where(and(eq(cybSkill.status, 1), like(cybSkill.name, '%' + keyword + '%')));
	return rows;
};

export const check_job_applied = async (jobId: number | null, userId: number | false) => {
	if (!jobId || !userId) return false;
	const [row] = await db.select({ id: cybApplication.id })
		.from(cybApplication)
		.where(and(eq(cybApplication.job, jobId), eq(cybApplication.user, userId), eq(cybApplication.isDeleted, 0)))
		.limit(1);
	return !!row;
};



export const user_verified = async (userId: number | null) => {
	if (!userId) {
		return false
	}
	const userDetail = await get_user_detail(userId);
	if (!userDetail) return false;

	let accountVerify = false;
	let phoneVerify = false;
	let emailVerify = false;
	let isVerify = false;

	const [docResult] = await db.select({ docName: cybVerifyDocument.docName })
		.from(cybVerifyDocument)
		.where(and(eq(cybVerifyDocument.userId, userId), eq(cybVerifyDocument.verify, 1)))
		.limit(1);

	if (docResult && docResult.docName?.toLowerCase() === userDetail.fullName?.toLowerCase()) {
		accountVerify = true;
	}

	if (
		(userDetail.phoneVerified && userDetail.phone) ||
		(userDetail.secondPhoneVerify && userDetail.secondPhone)
	) {
		phoneVerify = true;
	}

	if (
		(userDetail.emailVerified && userDetail.email) ||
		(userDetail.emailAlternateVerify && userDetail.emailAlternate)
	) {
		emailVerify = true;
	}

	if (emailVerify && phoneVerify && accountVerify) {
		isVerify = true;
	}

	const [domainResult] = await db.select({ id: cybUserDomains.id })
		.from(cybUserDomains)
		.leftJoin(cybUser, eq(cybUserDomains.userId, cybUser.id))
		.where(and(
			eq(cybUserDomains.userId, userId),
			eq(cybUserDomains.isVerified, 1),
			eq(cybUser.claimStatus, 1),
			eq(cybUserDomains.isDeleted, 0)
		))
		.limit(1);

	if (domainResult) {
		isVerify = true;
	}

	return isVerify;
};


export const get_job_detail_service = async (slug: string, userId: number | false = false, status: number | string | false = false, companyview: boolean = false) => {
	const condition = [eq(cybCompanyJob.slug, slug), eq(cybCompanyJob.isDeleted, 0), eq(cybUser.isDeleted, 0),];
	const rows = await db
		.select({
			id: cybCompanyJob.id,
			individual_id: cybUser.individualId,
			job_title: cybCompanyJob.jobTitle,
			job_description: cybCompanyJob.jobDescription,
			roles_responsibility: cybCompanyJob.rolesResponsibility,
			department_name: cybDepartment.name,
			experience_name: cybJobExperiences.name,
			department: cybCompanyJob.department,
			experience: cybCompanyJob.experience,
			skill: cybCompanyJob.skill,
			role_type_name: cybRoleTypes.name,
			job_mode_name: cybJobMode.name,
			industry_name: cybIndustries.name,
			role_type: cybCompanyJob.roleType,
			industry: cybCompanyJob.industry,
			vacancy: cybCompanyJob.vacancy,
			urgent: cybCompanyJob.urgent,
			designation_name: cybDesignation.name,
			country_name: cybCountry.name,
			state_name: cybState.name,
			designation: cybCompanyJob.designation,
			country: cybCompanyJob.country,
			state: cybCompanyJob.state,
			city: cybCompanyJob.city,
			job_mode: cybCompanyJob.jobMode,
			document: cybCompanyJob.document,
			city_name: cybCities.name,
			salary: cybCompanyJob.salary,
			salary_name: cybSalary.name,
			company_name: cybUser.fname,
			profile: cybUser.profile,
			social_image: cybUser.socialImage,
			companyId: cybUser.id,
			company_slug: cybUser.slug,
			create_date: cybCompanyJob.createDate,
			applicationCount: sql<number>`COUNT(${cybApplication.id})`,
			status: cybCompanyJob.status,
			slug: cybCompanyJob.slug,
			company: cybCompanyJob.company,
		})
		.from(cybCompanyJob)
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
		.leftJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
		.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
		.where(and(...condition))
		.groupBy(cybApplication.job)
		.limit(1);

	const job_detail = rows[0];

	if (!job_detail) {
		return null;
	}

	const skillList = await decodeSkill(job_detail.skill);
	const galleryList = await decodeGallery(job_detail.companyId);
	const applied = await check_job_applied(job_detail.id, userId);
	const isVerified = await user_verified(job_detail.companyId);

	const response = {
		...job_detail,
		skill_text: job_detail.skill,
		skill: skillList,
		urgent: job_detail.urgent === 1,
		document: job_detail.document ? `${s3Prefix}${job_detail.document}` : '',
		profile: job_detail.profile ? `${s3Prefix}${job_detail.profile}` : (job_detail.social_image || ''),
		gallery: galleryList,
		apply: applied,
		is_verified: isVerified,
	};

	if (!companyview) {
		return response;
	}

	const fil = {
		user_id: job_detail.company!,
		job_id: job_detail.id,
	};

	const { data, count } = await job_collaborator_list(fil);

	const collaboratorList = data.map((val: any) => ({
		id: val.id,
		full_name: val.full_name,
		slug: val.slug,
		individual_id: val.individual_id,
		profile: val.profile
			? `${s3Prefix}${val.profile}`
			: (val.social_image || ''),
		designation_name: val.designation_name,
	}));

	return {
		...response,
		colloborator: data.length > 0,
		collaboratorList,
		totalCount: count,
	};
}


export const get_jobs_detail_by_ids = async (ids: number[]) => {
	if (!ids.length) return [];

	const rows = await db
		.select({
			id: cybCompanyJob.id,
			job_title: cybCompanyJob.jobTitle,
			job_description: cybCompanyJob.jobDescription,
			roles_responsibility: cybCompanyJob.rolesResponsibility,
			department_name: cybDepartment.name,
			experience_name: cybJobExperiences.name,
			department: cybCompanyJob.department,
			experience: cybCompanyJob.experience,
			skill: cybCompanyJob.skill,
			role_type_name: cybRoleTypes.name,
			job_mode_name: cybJobMode.name,
			industry_name: cybIndustries.name,
			role_type: cybCompanyJob.roleType,
			industry: cybCompanyJob.industry,
			vacancy: cybCompanyJob.vacancy,
			urgent: cybCompanyJob.urgent,
			designation_name: cybDesignation.name,
			country_name: cybCountry.name,
			state_name: cybState.name,
			designation: cybCompanyJob.designation,
			country: cybCompanyJob.country,
			state: cybCompanyJob.state,
			city: cybCompanyJob.city,
			job_mode: cybCompanyJob.jobMode,
			document: cybCompanyJob.document,
			city_name: cybCities.name,
			salary: cybCompanyJob.salary,
			salary_name: cybSalary.name,
			company_name: cybUser.fname,
			profile: cybUser.profile,
			social_image: cybUser.socialImage,
			companyId: cybUser.id,
			company_slug: cybUser.slug,
			create_date: cybCompanyJob.createDate,
			applicationCount: sql<number>`COUNT(${cybApplication.id})`,
			status: cybCompanyJob.status,
			slug: cybCompanyJob.slug,
			company: cybCompanyJob.company,
		})
		.from(cybCompanyJob)
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
		.leftJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
		.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
		.where(and(inArray(cybCompanyJob.id, ids), eq(cybCompanyJob.isDeleted, 0), eq(cybUser.isDeleted, 0)))
		.groupBy(cybCompanyJob.id);

	return rows.map((job) => ({
		...job,
		skill_text: job.skill,
		urgent: job.urgent === 1,
		document: job.document ? `${s3Prefix}${job.document}` : '',
		profile: job.profile ? `${s3Prefix}${job.profile}` : (job.social_image || ''),
	}));
};




export const get_search_job_list = async (filter: SearchJobFilter = {}) => {
	const keyword = filter.keyword || '';
	const conditions: (SQL | undefined)[] = [eq(cybCompanyJob.status, 1), eq(cybCompanyJob.isDeleted, 0), eq(cybUser.isDeleted, 0)];
	if (filter.city) conditions.push(eq(cybCompanyJob.city, filter.city));
	if (filter.state) conditions.push(eq(cybCompanyJob.state, filter.state));
	if (filter.salary) conditions.push(eq(cybCompanyJob.salary, filter.salary));
	if (filter.designation) conditions.push(eq(cybCompanyJob.designation, filter.designation));
	if (filter.urgent) conditions.push(eq(cybCompanyJob.urgent, filter.urgent));
	if (filter.vacancy) conditions.push(eq(cybCompanyJob.vacancy, filter.vacancy));
	if (filter.industry) conditions.push(eq(cybCompanyJob.industry, filter.industry));
	if (filter.country) conditions.push(eq(cybCompanyJob.country, filter.country));
	if (filter.job_mode) conditions.push(eq(cybCompanyJob.jobMode, filter.job_mode));
	if (filter.department) conditions.push(eq(cybCompanyJob.department, filter.department));
	if (filter.experience) conditions.push(eq(cybCompanyJob.experience, String(filter.experience)));
	if (filter.role_type) conditions.push(eq(cybCompanyJob.roleType, filter.role_type));
	if (filter.company) conditions.push(eq(cybCompanyJob.company, filter.company));

	if (filter.id_not_in) {
		conditions.push(sql`${cybCompanyJob.id} <> ${filter.id_not_in}`);
	}

	if (filter.posted_date) {
		const d = new Date();
		d.setDate(d.getDate() - filter.posted_date);
		conditions.push(sql`DATE_FORMAT(${cybCompanyJob.createDate}, '%Y-%m-%d') >= ${d.toISOString().split('T')[0]}`);
	}

	if (keyword) {
		const kwConds: (SQL | undefined)[] = [
			like(cybCompanyJob.skill, '%' + keyword + '%'),
			like(cybIndustries.name, '%' + keyword + '%'),
			like(cybDepartment.name, '%' + keyword + '%'),
			like(cybJobExperiences.name, '%' + keyword + '%'),
			like(cybRoleTypes.name, '%' + keyword + '%'),
			like(cybDesignation.name, '%' + keyword + '%'),
			like(cybJobMode.name, '%' + keyword + '%'),
		];

		const parts = keyword.split(' ').filter(Boolean);
		if (parts.length > 0) {
			const titleConds = parts.map(p => like(cybCompanyJob.jobTitle, '%' + p + '%'));
			kwConds.push(or(...titleConds));
		}

		const skills = await get_search_skill(keyword);
		if (skills.length > 0) {
			const skConds = skills.map(s => sql`JSON_CONTAINS(${cybCompanyJob.skill}, ${JSON.stringify(String(s.id))}, '$')`);
			kwConds.push(or(...skConds));
		}

		conditions.push(or(...kwConds));
	}

	const arrGroups: [any[] | undefined, keyof SearchJobFilter][] = [
		[filter.stateArr, 'stateArr'], [filter.citiesArr, 'citiesArr'],
		[filter.designationArr, 'designationArr'], [filter.departmentArr, 'departmentArr'],
	];
	const hasArrs = arrGroups.some(([a]) => a && a.length > 0);
	if (hasArrs) {
		const findConds: SQL[] = [];
		const colMap: Record<string, any> = {
			stateArr: cybCompanyJob.state,
			citiesArr: cybCompanyJob.city,
			designationArr: cybCompanyJob.designation,
			departmentArr: cybCompanyJob.department,
		};
		for (const [arr, key] of arrGroups) {
			if (arr && arr.length > 0) {
				for (const item of arr) {
					findConds.push(sql`FIND_IN_SET(${item.id}, ${colMap[key]})`);
				}
			}
		}
		conditions.push(or(...findConds));
	}

	if (filter.skillArray && filter.skillArray.length > 0) {
		const skConds = filter.skillArray.map(sk =>
			sql`JSON_CONTAINS(${cybCompanyJob.skill}, ${JSON.stringify(String(sk.id))}, '$')`
		);

		if (keyword) {
			const mainAnd = and(...conditions);
			const skillOr = or(...skConds);
			if (mainAnd && skillOr) {
				conditions.length = 0;
				conditions.push(or(mainAnd, skillOr));
			}
		} else {
			conditions.push(or(...skConds));
		}
	}

	if (filter.job_id && filter.job_id.length > 0) {
		conditions.push(inArray(cybCompanyJob.id, filter.job_id));
	}

	const query = db.select({ id: cybCompanyJob.id, slug: cybCompanyJob.slug })
		.from(cybCompanyJob)
		.leftJoin(cybCities, eq(cybCompanyJob.city, cybCities.id))
		.leftJoin(cybState, eq(cybCompanyJob.state, cybState.id))
		.leftJoin(cybCountry, eq(cybCompanyJob.country, cybCountry.id))
		.leftJoin(cybIndustries, eq(cybCompanyJob.industry, cybIndustries.id))
		.leftJoin(cybJobExperiences, eq(cybCompanyJob.experience, cybJobExperiences.id))
		.leftJoin(cybRoleTypes, eq(cybCompanyJob.roleType, cybRoleTypes.id))
		.leftJoin(cybDepartment, eq(cybCompanyJob.department, cybDepartment.id))
		.leftJoin(cybDesignation, eq(cybCompanyJob.designation, cybDesignation.id))
		.leftJoin(cybJobMode, eq(cybCompanyJob.jobMode, cybJobMode.id))
		.leftJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
		.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
		.where(and(...conditions))
		.orderBy(desc(cybCompanyJob.id));

	if (filter.limit !== undefined && filter.limit !== null) {
		const rows = await query.limit(filter.limit).offset(filter.offset || 0);
		return rows;
	}

	const rows = await query;
	return rows;
};




