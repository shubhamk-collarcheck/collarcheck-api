import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import db from '../db';
import { cybBenefits, cybCompanyBenefits, cybCompanyJob, cybCourses, cybDepartment, cybDesignation, cybIndustries, cybSkill, cybState, cybUser, cybUserEducation, cybUserExperience, cybUserSkill } from '../db/schema';

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


