import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import { cybCities, cybState, cybCountry, cybTurnover, cybCompanySize, cybNoticePeriod, cybLanguages, cybIndustries, cybSalary, cybBenefits, cybRoleTypes, cybJobExperiences, cybAccomodation, cybCourses, cybCourseType, cybTag, cybInstitutions, cybDesignation, cybSkill, cybJobMode, cybDepartment, cybEmployementType, cybWorkType, cybUser, cybUserSkill, cybUserExperience, cybCompanyJob } from '../db/schema';
import { get_empoyee_designation_service, get_industry_list_service, get_state_by_employees_service, get_state_by_id_service, get_employee_department_service, get_skill_list_service, get_course_list_service, get_user_skill_service, get_user_experience_skill_service } from "./job.service"
import { allEmploymentType } from '../controllers/general.controller';

const s3Prefix = process.env.S3_PREFIX || '';

export const getCitiesService = async (state?: number) => {
	const conditions = [eq(cybCities.status, 1)];
	if (state) {
		conditions.push(eq(cybCities.state, state));
	}
	return db.select().from(cybCities).where(and(...conditions)).orderBy(asc(cybCities.name));
};

export const getCitiesByIdService = async (stateId?: number) => {
	const conditions = [eq(cybCities.status, 1)];
	if (stateId) {
		conditions.push(eq(cybCities.state, stateId));
	}
	return db.select({ id: cybCities.id, name: cybCities.name }).from(cybCities).where(and(...conditions)).orderBy(asc(cybCities.name));
};

export const getStatesService = async (country?: number) => {
	const conditions = [eq(cybState.status, 1)];
	if (country) {
		conditions.push(eq(cybState.country, country));
	}
	return db.select().from(cybState).where(and(...conditions)).orderBy(asc(cybState.name));
};

export const getCountriesService = async () => {
	const countryData = await db.select({ id: cybCountry.id, name: cybCountry.name }).from(cybCountry).where(eq(cybCountry.status, 1));
	return [...countryData.filter(c => c.id === 101), ...countryData.filter(c => c.id !== 101)];
};

export const getTurnoverService = async () => {
	return db.select({ id: cybTurnover.id, name: cybTurnover.name }).from(cybTurnover).where(eq(cybTurnover.status, 1));
};

export const getNoticePeriodService = async (type?: string) => {
	const conditions = [eq(cybNoticePeriod.status, 1)];
	if (type) {
		conditions.push(eq(cybNoticePeriod.type, type));
	}
	return db.select().from(cybNoticePeriod).where(and(...conditions));
};

export const getCompanySizeService = async () => {
	return db.select({ id: cybCompanySize.id, name: cybCompanySize.name }).from(cybCompanySize).where(eq(cybCompanySize.status, 1));
};

export const getIndustriesService = async () => {
	return db.select({ id: cybIndustries.id, name: cybIndustries.name }).from(cybIndustries).where(eq(cybIndustries.status, 1)).orderBy(asc(cybIndustries.name)).limit(30);
};

export const getSalaryService = async () => {
	return db.select({ id: cybSalary.id, name: cybSalary.name }).from(cybSalary).where(eq(cybSalary.status, 1));
};

export const getBenefitsService = async () => {
	const rows = await db.select({ id: cybBenefits.id, name: cybBenefits.name, image: cybBenefits.image }).from(cybBenefits).where(eq(cybBenefits.status, 1));
	return rows.map(r => ({
		id: r.id,
		name: r.name,
		image: r.image ? `${s3Prefix}${r.image}` : '',
	}));
};

export const getRoleTypesService = async () => {
	return db.select({ id: cybRoleTypes.id, name: cybRoleTypes.name }).from(cybRoleTypes).where(eq(cybRoleTypes.status, 1));
};

export const getJobExperienceService = async () => {
	return db.select({ id: cybJobExperiences.id, name: cybJobExperiences.name }).from(cybJobExperiences).where(eq(cybJobExperiences.status, 1));
};

export const getAccomodationService = async () => {
	return db.select({ id: cybAccomodation.id, name: cybAccomodation.name }).from(cybAccomodation).where(eq(cybAccomodation.status, 1));
};

export const getTagsService = async () => {
	return db.select({ id: cybTag.id, name: cybTag.name }).from(cybTag).where(eq(cybTag.status, 1));
};

export const getLanguagesService = async () => {
	return db.select({ id: cybLanguages.id, name: cybLanguages.name }).from(cybLanguages).where(eq(cybLanguages.status, 1));
};

export const getCoursesService = async () => {
	const rows = await db.select({ id: cybCourses.id, name: cybCourses.name, image: cybCourses.image }).from(cybCourses).where(eq(cybCourses.status, 1)).orderBy(asc(cybCourses.name)).limit(30);
	return rows.map(row => ({
		id: row.id,
		name: row.name,
		image: row.image ? `${s3Prefix}${row.image}` : '',
	}));
};

export const getCourseTypesService = async () => {
	return db.select({ id: cybCourseType.id, name: cybCourseType.name }).from(cybCourseType).where(eq(cybCourseType.status, 1)).orderBy(asc(cybCourseType.name)).limit(30);
};

export const getInstitutionsService = async () => {
	const rows = await db.select({ id: cybInstitutions.id, name: cybInstitutions.name, image: cybInstitutions.image }).from(cybInstitutions).where(eq(cybInstitutions.status, 1)).orderBy(asc(cybInstitutions.name)).limit(30);
	return rows.map(row => ({
		id: row.id,
		name: row.name,
		image: row.image ? `${s3Prefix}${row.image}` : '',
	}));
};

export const getEducationDataService = async () => {
	const [courseList, courseTypeList, institutionList] = await Promise.all([
		getCoursesService(),
		getCourseTypesService(),
		getInstitutionsService(),
	]);
	return { courseList, courseTypeList, institutionList };
};


export const getAllDesignationService = async () => {
	return await db.select({ id: cybDesignation.id, name: cybDesignation.name }).from(cybDesignation).where(eq(cybDesignation.status, 1)).orderBy(cybDesignation.id).limit(30);
};


export const allSkillService = async () => {
	const conditions = [eq(cybSkill.status, 1)];
	return await db.select({ id: cybSkill.id, name: cybSkill.name }).from(cybSkill).where(and(...conditions));
}

export const jobTypeService = async () => {
	const conditions = [eq(cybJobMode.status, 1)]
	return await db.select({ id: cybJobMode.id, name: cybJobMode.name }).from(cybJobMode).where(and(...conditions))
}


export const allDepartmentService = async () => {
	const conditions = [eq(cybDepartment.status, 1)]
	return await db.select({ id: cybDepartment.id, name: cybDepartment.name }).from(cybDepartment).where(and(...conditions))
}

export const allCourseTypeService = async () => {
	const conditions = [eq(cybCourseType.status, 1)]
	return await db.select({ id: cybCourseType.id, name: cybCourseType.name }).from(cybCourseType).where(and(...conditions))
}

export const allEmploymentTypeService = async () => {
	const conditions = [eq(cybEmployementType.status, 1)]
	return await db.select({ id: cybEmployementType.id, name: cybEmployementType.name }).from(cybEmployementType).where(and(...conditions))
}


export const allWorkTypeService = async () => {
	const conditions = [eq(cybWorkType.status, 1)]
	return await db.select({ id: cybWorkType.id, name: cybWorkType.name }).from(cybWorkType).where(and(...conditions))
}

export const employeeFilterDataListService = async () => {
	const [
		work_typeList,
		industryList,
		designationList,
		departmentList,
		employment_typeList,
		salaryList,
		courseList,
		courseTypeList,
	] = await Promise.all([
		allWorkTypeService(),
		get_industry_list_service(),
		get_empoyee_designation_service(),
		get_employee_department_service(),
		allEmploymentTypeService(),
		getSalaryService(),
		get_course_list_service(),
		allCourseTypeService(),
	])

	const stateData = await get_state_by_employees_service()
	let stateIds = stateData.map((s) => s.state).filter((id) => id !== null)
	const stateList = await get_state_by_id_service(stateIds)

	const [userSkill, userExpSkill] = await Promise.all([
		get_user_skill_service(),
		get_user_experience_skill_service(),
	])

	const skillSet = new Set<number>()

	for (const row of userSkill) {
		if (row.skill) skillSet.add(row.skill)
	}


	for (const row of userExpSkill) {
		if (!row.skill) continue
		try {
			const decoded = JSON.parse(row.skill as string)
			if (Array.isArray(decoded)) {
				for (const id of decoded) {
					if (id) skillSet.add(Number(id))
				}
			}
		} catch (error) {
			throw new Error(`getting error in parsing ${error}`)
		}
	}

	const skillList = await get_skill_list_service([...skillSet])

	return {
		accomodationList: [],
		universityList: [],
		work_typeList,
		stateList,
		industryList,
		designationList,
		departmentList,
		employment_typeList,
		salaryList,
		skillList,
		courseList,
		courseTypeList,
	}
}


export const jobDataListService = async () => {
	const [
		industryList,
		roleTypeList,
		salaryList,
		tagList,
		departmentList,
		jobExperienceList,
		skillList,
		jobModeList,
		designationList,
		countryList
	] = await Promise.all(
		[
			get_industry_list_service(),
			getRoleTypesService(),
			getSalaryService(),
			getTagsService(),
			allDepartmentService(),
			getJobExperienceService(),
			get_skill_list_service(),
			jobTypeService(),
			getAllDesignationService(),
			getCountriesService()
		])


	return {
		industryList,
		roleTypeList,
		salaryList,
		tagList,
		departmentList,
		jobExperienceList,
		skillList,
		jobModeList,
		designationList,
		countryList
	}

}



export const employmentListService = async (id?: string) => {
	const [
		designationList,
		departmentList,
		salaryList,
		skillList,
		employementTypeList
	] = await Promise.all(
		[
			getAllDesignationService(),
			allDepartmentService(),
			getSalaryService(),
			allSkillService(),
			allEmploymentTypeService(),
		]
	)

	const companyUser = alias(cybUser, 'company')

	const [companyRows, userRows] = await Promise.all([
		db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			fname: cybUser.fname,
			contactPerson: cybUser.contactPerson,
			cityName: cybCities.name,
			stateName: cybState.name,
			industryName: cybIndustries.name,
			totalEmployment: cybUser.noOfEmployee,
			emailVerified: cybUser.emailVerified,
			phoneVerified: cybUser.phoneVerified,
		})
			.from(cybUser)
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.where(and(eq(cybUser.userType, 2), eq(cybUser.status, 1), eq(cybUser.isDeleted, 0)))
			.orderBy(asc(cybUser.id))
			.limit(10),
		db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			fullName: cybUser.fullName,
			slug: cybUser.slug,
			designationName: cybDesignation.name,
			companyName: companyUser.fname,
			percentage: cybUser.percentage,
			emailVerified: cybUser.emailVerified,
			phoneVerified: cybUser.phoneVerified,
		})
			.from(cybUser)
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
			.where(and(eq(cybUser.userType, 1), eq(cybUser.status, 1), eq(cybUser.isDeleted, 0)))
			.orderBy(asc(cybUser.id))
			.limit(10),
	])

	const companyIds = companyRows.map(c => c.id)
	let activeJobCompanySet = new Set<number>()
	if (companyIds.length > 0) {
		const activeJobRows = await db.selectDistinct({ companyId: cybCompanyJob.company })
			.from(cybCompanyJob)
			.where(and(
				inArray(cybCompanyJob.company, companyIds),
				eq(cybCompanyJob.status, 1),
				eq(cybCompanyJob.isDeleted, 0)
			))
		activeJobCompanySet = new Set(activeJobRows.map(j => j.companyId).filter((id): id is number => id !== null))
	}

	const companyList: {
		id: number; individual_id: string | null; company_logo: string; company: string | null;
		contact_person: string | null; city_name: string | null; state_name: string | null;
		industry_name: string | null; is_verified: number; exploreTalent: number; total_employment: number | null
	}[] = companyRows.map(c => ({
		id: c.id,
		individual_id: c.individualId,
		company_logo: c.profile ? `${s3Prefix}${c.profile}` : (c.socialImage || ''),
		company: c.fname,
		contact_person: c.contactPerson,
		city_name: c.cityName,
		state_name: c.stateName,
		industry_name: c.industryName,
		is_verified: (c.emailVerified || c.phoneVerified) ? 1 : 0,
		exploreTalent: activeJobCompanySet.has(c.id) ? 1 : 0,
		total_employment: c.totalEmployment,
	}))

	const userList: {
		id: number; individual_id: string | null; profile: string; name: string | null;
		slug: string | null; designation_name: string | null; company_name: string | null;
		userRating: number; is_verified: number
	}[] = userRows.map(u => ({
		id: u.id,
		individual_id: u.individualId,
		profile: u.profile ? `${s3Prefix}${u.profile}` : (u.socialImage || ''),
		name: u.fullName,
		slug: u.slug,
		designation_name: u.designationName,
		company_name: u.companyName,
		userRating: u.percentage || 0,
		is_verified: (u.emailVerified || u.phoneVerified) ? 1 : 0,
	}))

	if (id) {
		const [currUser] = await db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			slug: cybUser.slug,
			contactPerson: cybUser.contactPerson,
			userType: cybUser.userType,
			emailVerified: cybUser.emailVerified,
			phoneVerified: cybUser.phoneVerified,
		})
			.from(cybUser)
			.where(and(eq(cybUser.id, Number(id)), eq(cybUser.isDeleted, 0)))
			.limit(1)

		if (currUser) {
			if (currUser.userType === 1) {
				userList.push({
					id: currUser.id,
					individual_id: currUser.individualId,
					profile: currUser.profile ? `${s3Prefix}${currUser.profile}` : (currUser.socialImage || ''),
					name: currUser.fullName || `${currUser.fname} ${currUser.lname}`.trim(),
					slug: currUser.slug,
					designation_name: null,
					company_name: null,
					userRating: 0,
					is_verified: (currUser.emailVerified || currUser.phoneVerified) ? 1 : 0,
				})
			} else {
				companyList.push({
					id: currUser.id,
					individual_id: currUser.individualId,
					company_logo: currUser.profile ? `${s3Prefix}${currUser.profile}` : (currUser.socialImage || ''),
					company: currUser.fname,
					contact_person: currUser.contactPerson,
					city_name: null,
					state_name: null,
					industry_name: null,
					is_verified: (currUser.emailVerified || currUser.phoneVerified) ? 1 : 0,
					exploreTalent: 0,
					total_employment: null,
				})
			}
		}
	}

	return {
		designationList,
		departmentList,
		salaryList,
		skillList,
		employementTypeList,
		companyList,
		userList,
	}
}
