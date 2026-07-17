import { ConflictError, NotFoundError, BadRequestError } from '../middlewares/errorHandler';
import generalRepositery from '../repositery/general.repositery';
import { and, asc, desc, eq, inArray, sql, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybCities, cybState, cybCountry, cybTurnover, cybCompanySize, cybNoticePeriod,
	cybLanguages, cybIndustries, cybSalary, cybBenefits, cybRoleTypes, cybJobExperiences,
	cybAccomodation, cybCourses, cybCourseType, cybTag, cybInstitutions, cybDesignation,
	cybSkill, cybJobMode, cybDepartment, cybEmployementType, cybWorkType, cybUser,
	cybUserSkill, cybUserExperience, cybCompanyJob, cybJobMeta, cybCompanyBenefits,
	cybUserExperienceRating, cybCompanyInvite, cybSuggestion,
} from '../db/schema';
import { get_empoyee_designation_service, get_industry_list_service, get_state_by_employees_service, get_state_by_id_service, get_employee_department_service, get_skill_list_service, get_course_list_service, get_user_skill_service, get_user_experience_skill_service } from './job.service';
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
	return await db.select({ id: cybSkill.id, name: cybSkill.name }).from(cybSkill).where(eq(cybSkill.status, 1)).orderBy(sql`RAND()`).limit(30);
}

export const jobTypeService = async () => {
	const conditions = [eq(cybJobMode.status, 1)]
	return await db.select({ id: cybJobMode.id, name: cybJobMode.name }).from(cybJobMode).where(and(...conditions))
}


export const allDepartmentService = async () => {
	return await db.select({ id: cybDepartment.id, name: cybDepartment.name }).from(cybDepartment).where(eq(cybDepartment.status, 1)).orderBy(sql`RAND()`).limit(30);
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


export const jobFilterDataListService = async (slug?: string, type?: string) => {
	if (!slug) {
		return {
			countryList: [], stateList: [], cityList: [], designationList: [],
			departmentList: [], skillList: [], industryList: [], salaryList: [],
			jobExperienceList: [], companyList: [], roleTypeList: [],
			company_benefit: [], jobModeList: [],
		};
	}

	const [meta] = await db.select().from(cybJobMeta).where(eq(cybJobMeta.jobSlug, slug)).limit(1);

	if (!meta) {
		return {
			countryList: [], stateList: [], cityList: [], designationList: [],
			departmentList: [], skillList: [], industryList: [], salaryList: [],
			jobExperienceList: [], companyList: [], roleTypeList: [],
			company_benefit: [], jobModeList: [],
		};
	}

	const countryIds = meta.countryId ? String(meta.countryId).split(',').map(Number).filter(Boolean) : [];
	const stateIds = meta.stateId ? String(meta.stateId).split(',').map(Number).filter(Boolean) : [];
	const cityIds = meta.cityId ? String(meta.cityId).split(',').map(Number).filter(Boolean) : [];
	const designationIds = meta.designationId ? String(meta.designationId).split(',').map(Number).filter(Boolean) : [];
	const departmentIds = meta.departmentId ? String(meta.departmentId).split(',').map(Number).filter(Boolean) : [];

	const jobConditions = [eq(cybCompanyJob.status, 1), eq(cybCompanyJob.isDeleted, 0), eq(cybUser.isDeleted, 0)];

	if (countryIds.length > 0) jobConditions.push(inArray(cybCompanyJob.country, countryIds));
	if (stateIds.length > 0) jobConditions.push(inArray(cybCompanyJob.state, stateIds));
	if (cityIds.length > 0) jobConditions.push(inArray(cybCompanyJob.city, cityIds));

	const jobColumns = {
		designation: cybCompanyJob.designation,
		department: cybCompanyJob.department,
		skill: cybCompanyJob.skill,
		industry: cybCompanyJob.industry,
		salary: cybCompanyJob.salary,
		experience: cybCompanyJob.experience,
		company: cybCompanyJob.company,
		roleType: cybCompanyJob.roleType,
		jobMode: cybCompanyJob.jobMode,
	};

	const jobRows = await db.select(jobColumns)
		.from(cybCompanyJob)
		.leftJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
		.where(and(...jobConditions));

	const uniqueDesignations = [...new Set(jobRows.map(r => r.designation).filter((v): v is number => v !== null && v !== undefined))];
	const uniqueDepartments = [...new Set(jobRows.map(r => r.department).filter((v): v is number => v !== null && v !== undefined))];
	const uniqueIndustries = [...new Set(jobRows.map(r => r.industry).filter((v): v is number => v !== null && v !== undefined))];
	const uniqueSalaries = [...new Set(jobRows.map(r => r.salary).filter((v): v is number => v !== null && v !== undefined))];
	const uniqueExperiences = [...new Set(jobRows.map(r => r.experience).filter((v): v is string => v !== null && v !== undefined).map(Number))];
	const uniqueCompanies = [...new Set(jobRows.map(r => r.company).filter((v): v is number => v !== null && v !== undefined))];
	const uniqueRoleTypes = [...new Set(jobRows.map(r => r.roleType).filter((v): v is number => v !== null && v !== undefined))];
	const uniqueJobModes = [...new Set(jobRows.map(r => r.jobMode).filter((v): v is number => v !== null && v !== undefined))];

	const allSkillIds = new Set<number>();
	for (const row of jobRows) {
		if (row.skill) {
			try {
				const decoded = JSON.parse(row.skill as string);
				if (Array.isArray(decoded)) {
					for (const id of decoded) { if (id) allSkillIds.add(Number(id)); }
				}
			} catch { }
		}
	}

	const [
		countryList, stateList, cityList, designationList, departmentList,
		skillList, industryList, salaryList, jobExperienceList, companyList,
		roleTypeList, jobModeList, company_benefit,
	] = await Promise.all([
		countryIds.length > 0
			? db.select({ id: cybCountry.id, name: cybCountry.name }).from(cybCountry).where(and(eq(cybCountry.status, 1), inArray(cybCountry.id, countryIds)))
			: getCountriesService(),
		stateIds.length > 0
			? get_state_by_id_service(stateIds)
			: db.select({ id: cybState.id, name: cybState.name }).from(cybState).where(and(eq(cybState.status, 1), inArray(cybState.id, stateIds.length > 0 ? stateIds : [0]))),
		cityIds.length > 0
			? db.select({ id: cybCities.id, name: cybCities.name }).from(cybCities).where(and(eq(cybCities.status, 1), inArray(cybCities.id, cityIds)))
			: db.select({ id: cybCities.id, name: cybCities.name }).from(cybCities).where(eq(cybCities.status, 1)).limit(100),
		uniqueDesignations.length > 0
			? db.select({ id: cybDesignation.id, name: cybDesignation.name }).from(cybDesignation).where(and(eq(cybDesignation.status, 1), inArray(cybDesignation.id, uniqueDesignations)))
			: getAllDesignationService(),
		uniqueDepartments.length > 0
			? db.select({ id: cybDepartment.id, name: cybDepartment.name }).from(cybDepartment).where(and(eq(cybDepartment.status, 1), inArray(cybDepartment.id, uniqueDepartments)))
			: allDepartmentService(),
		allSkillIds.size > 0
			? get_skill_list_service([...allSkillIds])
			: allSkillService(),
		uniqueIndustries.length > 0
			? db.select({ id: cybIndustries.id, name: cybIndustries.name }).from(cybIndustries).where(and(eq(cybIndustries.status, 1), inArray(cybIndustries.id, uniqueIndustries)))
			: getIndustriesService(),
		uniqueSalaries.length > 0
			? db.select({ id: cybSalary.id, name: cybSalary.name }).from(cybSalary).where(and(eq(cybSalary.status, 1), inArray(cybSalary.id, uniqueSalaries)))
			: getSalaryService(),
		uniqueExperiences.length > 0
			? db.select({ id: cybJobExperiences.id, name: cybJobExperiences.name }).from(cybJobExperiences).where(and(eq(cybJobExperiences.status, 1), inArray(cybJobExperiences.id, uniqueExperiences)))
			: getJobExperienceService(),
		uniqueCompanies.length > 0
			? db.select({ id: cybUser.id, name: cybUser.fname }).from(cybUser).where(and(eq(cybUser.status, 1), eq(cybUser.isDeleted, 0), inArray(cybUser.id, uniqueCompanies)))
			: db.select({ id: cybUser.id, name: cybUser.fname }).from(cybUser).where(and(eq(cybUser.status, 1), eq(cybUser.isDeleted, 0), eq(cybUser.userType, 2))).limit(30),
		uniqueRoleTypes.length > 0
			? db.select({ id: cybRoleTypes.id, name: cybRoleTypes.name }).from(cybRoleTypes).where(and(eq(cybRoleTypes.status, 1), inArray(cybRoleTypes.id, uniqueRoleTypes)))
			: getRoleTypesService(),
		uniqueJobModes.length > 0
			? db.select({ id: cybJobMode.id, name: cybJobMode.name }).from(cybJobMode).where(and(eq(cybJobMode.status, 1), inArray(cybJobMode.id, uniqueJobModes)))
			: jobTypeService(),
		db.select({ id: cybBenefits.id, name: cybBenefits.name, image: cybBenefits.image })
			.from(cybBenefits)
			.leftJoin(cybCompanyBenefits, eq(cybBenefits.id, cybCompanyBenefits.benefitId))
			.where(and(eq(cybBenefits.status, 1), eq(cybCompanyBenefits.isDeleted, 0)))
			.groupBy(cybBenefits.id),
	]);

	return {
		countryList,
		stateList,
		cityList,
		designationList,
		departmentList,
		skillList,
		industryList,
		salaryList,
		jobExperienceList,
		companyList,
		roleTypeList,
		company_benefit: company_benefit.map(b => ({
			id: b.id,
			name: b.name,
			image: b.image ? `${s3Prefix}${b.image}` : '',
		})),
		jobModeList,
	};
}


export const ratingFilterService = async (employmentId: number, order?: number) => {
	const conditions = [
		eq(cybUserExperienceRating.experience, employmentId),
		eq(cybUserExperienceRating.status, 1),
		eq(cybUserExperienceRating.isDeleted, 0),
	];

	let orderClause;
	if (order === 2) {
		orderClause = desc(cybUserExperienceRating.rating);
	} else if (order === 3) {
		orderClause = asc(cybUserExperienceRating.rating);
	} else {
		orderClause = desc(cybUserExperienceRating.id);
	}

	const reviews = await db.select({
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
		createDate: cybUserExperienceRating.createDate,
		modifyDate: cybUserExperienceRating.modifyDate,
	})
		.from(cybUserExperienceRating)
		.where(and(...conditions))
		.orderBy(orderClause);

	return reviews;
}


export const starRatingEmployeesService = async (star: number) => {
	const usersWithRating = await db.select({
		id: cybUser.id,
		individualId: cybUser.individualId,
		fname: cybUser.fname,
		lname: cybUser.lname,
		fullName: cybUser.fullName,
		slug: cybUser.slug,
		profile: cybUser.profile,
		socialImage: cybUser.socialImage,
		percentage: cybUser.percentage,
		emailVerified: cybUser.emailVerified,
		phoneVerified: cybUser.phoneVerified,
		currentPossition: cybUser.currentPossition,
		currentCompany: cybUser.currentCompany,
	})
		.from(cybUser)
		.where(and(
			eq(cybUser.userType, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		))
		.orderBy(desc(cybUser.percentage))
		.limit(50);

	const filteredUsers = usersWithRating.filter(u => {
		const rating = u.percentage || 0;
		const minRating = (star - 1) * 20 + 1;
		const maxRating = star * 20;
		return rating >= minRating && rating <= maxRating;
	});

	return filteredUsers.map(u => ({
		id: u.id,
		individual_id: u.individualId,
		name: u.fullName || `${u.fname} ${u.lname}`.trim(),
		slug: u.slug,
		profile: u.profile ? `${s3Prefix}${u.profile}` : (u.socialImage || ''),
		userRating: u.percentage || 0,
		is_verified: (u.emailVerified || u.phoneVerified) ? 1 : 0,
	}));
}


export const inviteDetailService = async (token: string) => {
	const [invite] = await db.select().from(cybCompanyInvite).where(eq(cybCompanyInvite.id, Number(token))).limit(1);

	if (!invite) {
		return null;
	}

	return {
		id: invite.id,
		company: invite.company,
		fname: invite.fname,
		lname: invite.lname,
		email: invite.email,
		phone: invite.phone,
		contact_person: invite.contactPerson,
		website: invite.website,
	};
}


export const addSuggestionService = async (name: string, phone: string, description: string) => {
	const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
	await db.insert(cybSuggestion).values({
		name,
		phone: Number(phone),
		description,
		createDate: now,
		modifyDate: now,
	});

	return { status: true, messages: 'Successfully added' };
}


export const globalSearchService = async (
	keyword: string,
	type?: string,
	limit: number = 6,
	offset: number = 0,
	filters: Record<string, any> = {},
) => {
	const results: Record<string, any> = {
		companyList: [],
		companyListCount: 0,
		userList: [],
		userListCount: 0,
		jobList: [],
		jobListCount: 0,
	};

	if (!type || type === 'companies') {
		const companyConditions = [
			eq(cybUser.userType, 2),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (keyword) {
			companyConditions.push(sql`${cybUser.fname} LIKE ${'%' + keyword + '%'}`);
		}

		const [companyRows, companyCount] = await Promise.all([
			db.select({
				id: cybUser.id,
				fname: cybUser.fname,
				slug: cybUser.slug,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				industry: cybUser.industry,
				city: cybUser.city,
				state: cybUser.state,
				emailVerified: cybUser.emailVerified,
				phoneVerified: cybUser.phoneVerified,
				industryName: cybIndustries.name,
				cityName: cybCities.name,
				stateName: cybState.name,
				companySizeName: cybCompanySize.name,
			})
				.from(cybUser)
				.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
				.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
				.leftJoin(cybState, eq(cybUser.state, cybState.id))
				.leftJoin(cybCompanySize, eq(cybUser.companySize, cybCompanySize.id))
				.where(and(...companyConditions))
				.limit(limit)
				.offset(offset),
			db.select({ count: sql<number>`count(*)` })
				.from(cybUser)
				.where(and(...companyConditions)),
		]);

		results.companyList = companyRows.map(c => ({
			id: c.id,
			fname: c.fname,
			slug: c.slug,
			profile: c.profile ? `${s3Prefix}${c.profile}` : (c.socialImage || ''),
			is_verified: (c.emailVerified || c.phoneVerified) ? 1 : 0,
			exploreTalent: 0,
			industry_name: c.industryName,
			city_name: c.cityName,
			state_name: c.stateName,
			company_size_name: c.companySizeName,
		}));
		results.companyListCount = companyCount[0]?.count || 0;
	}

	if (!type || type === 'employees') {
		const userConditions = [
			eq(cybUser.userType, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (keyword) {
			const kwConds = [
				sql`${cybUser.fname} LIKE ${'%' + keyword + '%'}`,
				sql`${cybUser.fullName} LIKE ${'%' + keyword + '%'}`,
			];
			userConditions.push(sql`(${kwConds.map(c => `(${c})`).join(' OR ')})`);
		}

		const companyUser = alias(cybUser, 'empCompany');
		const [userRows, userCount] = await Promise.all([
			db.select({
				id: cybUser.id,
				fullName: cybUser.fullName,
				slug: cybUser.slug,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				percentage: cybUser.percentage,
				emailVerified: cybUser.emailVerified,
				phoneVerified: cybUser.phoneVerified,
				designationName: cybDesignation.name,
				companyName: companyUser.fname,
			})
				.from(cybUser)
				.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
				.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
				.where(and(...userConditions))
				.limit(limit)
				.offset(offset),
			db.select({ count: sql<number>`count(*)` })
				.from(cybUser)
				.where(and(...userConditions)),
		]);

		results.userList = userRows.map(u => ({
			id: u.id,
			name: u.fullName,
			slug: u.slug,
			profile: u.profile ? `${s3Prefix}${u.profile}` : (u.socialImage || ''),
			userRating: u.percentage || 0,
			is_verified: (u.emailVerified || u.phoneVerified) ? 1 : 0,
			designation_name: u.designationName,
			company_name: u.companyName,
		}));
		results.userListCount = userCount[0]?.count || 0;
	}

	if (!type || type === 'jobs') {
		const jobConditions = [
			eq(cybCompanyJob.status, 1),
			eq(cybCompanyJob.isDeleted, 0),
			eq(cybUser.isDeleted, 0),
		];
		if (keyword) {
			const kwConds: any[] = [
				sql`${cybCompanyJob.jobTitle} LIKE ${'%' + keyword + '%'}`,
				sql`${cybCompanyJob.skill} LIKE ${'%' + keyword + '%'}`,
			];
			jobConditions.push(sql`(${kwConds.map(c => `(${c})`).join(' OR ')})`);
		}

		const [jobRows, jobCount] = await Promise.all([
			db.select({
				id: cybCompanyJob.id,
				jobTitle: cybCompanyJob.jobTitle,
				slug: cybCompanyJob.slug,
				company_name: cybUser.fname,
				company_slug: cybUser.slug,
				designation_name: cybDesignation.name,
				department_name: cybDepartment.name,
				experience_name: cybJobExperiences.name,
				country_name: cybCountry.name,
				state_name: cybState.name,
				city_name: cybCities.name,
				salary_name: cybSalary.name,
				vacancy: cybCompanyJob.vacancy,
				urgent: cybCompanyJob.urgent,
				create_date: cybCompanyJob.createDate,
			})
				.from(cybCompanyJob)
				.leftJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
				.leftJoin(cybDesignation, eq(cybCompanyJob.designation, cybDesignation.id))
				.leftJoin(cybDepartment, eq(cybCompanyJob.department, cybDepartment.id))
				.leftJoin(cybJobExperiences, eq(cybCompanyJob.experience, cybJobExperiences.id))
				.leftJoin(cybCountry, eq(cybCompanyJob.country, cybCountry.id))
				.leftJoin(cybState, eq(cybCompanyJob.state, cybState.id))
				.leftJoin(cybCities, eq(cybCompanyJob.city, cybCities.id))
				.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
				.where(and(...jobConditions))
				.limit(limit)
				.offset(offset),
			db.select({ count: sql<number>`count(*)` })
				.from(cybCompanyJob)
				.leftJoin(cybUser, eq(cybCompanyJob.company, cybUser.id))
				.where(and(...jobConditions)),
		]);

		results.jobList = jobRows.map(j => ({
			id: j.id,
			job_title: j.jobTitle,
			slug: j.slug,
			company_name: j.company_name,
			company_slug: j.company_slug,
			designation_name: j.designation_name,
			department_name: j.department_name,
			experience_name: j.experience_name,
			country_name: j.country_name,
			state_name: j.state_name,
			city_name: j.city_name,
			salary_name: j.salary_name,
			vacancy: j.vacancy,
			urgent: j.urgent,
			create_date: j.create_date,
		}));
		results.jobListCount = jobCount[0]?.count || 0;
	}

	return results;
}


// ====== Verify Auth Token (Endpoint #1) ======

export const verifyAuthTokenService = async (userId: number) => {
	const user = await generalRepositery.getUserById(userId);
	if (!user) {
		throw new NotFoundError("User not found");
	}

	return {
		id: user.id,
		email: user.email,
		phone: user.phone,
		full_name: user.fullName,
		avatar_url: user.profile ? `${s3Prefix}${user.profile}` : (user.socialImage || ''),
		role: user.userType === 2 ? 'company' : 'user',
		is_verified: (user.emailVerified || user.phoneVerified) ? true : false,
		created_at: user.createDate,
	};
};

// ====== Doc List (Endpoint #2) ======

export const docListService = async (userId: number, page: number) => {
	return generalRepositery.getDocumentList(userId, page, 20);
};

// ====== All Message List (Endpoint #3) ======

export const allMessageListGeneralService = async (userId: number) => {
	const threads = await generalRepositery.getMessageThreads(userId);

	const conversations = await Promise.all(
		threads.map(async (thread) => {
			const otherUserId = thread.sender === userId ? thread.receiver : thread.sender;
			const otherUser = await generalRepositery.getUserBasicInfo(otherUserId);
			const lastMessage = await generalRepositery.getLastMessage(thread.id);
			const unreadCount = await generalRepositery.getUnreadCount(thread.id, userId);

			return {
				connection_id: thread.id,
				other_user: {
					id: otherUser?.id || otherUserId,
					full_name: otherUser?.fullName || '',
					avatar_url: otherUser?.profile ? `${s3Prefix}${otherUser.profile}` : (otherUser?.socialImage || ''),
				},
				last_message: lastMessage ? {
					id: lastMessage.id,
					content: lastMessage.message || '',
					sender_id: lastMessage.sender,
					is_read: lastMessage.isViewed === 1,
					created_at: lastMessage.createDate,
				} : null,
				unread_count: unreadCount,
			};
		})
	);

	return { conversations };
};

// ====== All Notification (Endpoint #4) ======

export const allNotificationService = async (userId: number) => {
	const notifications = await generalRepositery.getNotifications(userId);
	const unreadCount = await generalRepositery.getUnreadNotificationCount(userId);

	return {
		notifications: notifications.map(n => ({
			id: n.id,
			type: n.type,
			message: n.message,
			is_read: n.isViewed === 1,
			related_entity_id: n.sender,
			related_entity_type: n.redirect || 'general',
			created_at: n.createDate,
		})),
		unread_count: unreadCount,
	};
};

// ====== Verification Status (Endpoint #5) ======

export const verificationStatusGeneralService = async (userId: number) => {
	const user = await generalRepositery.getVerificationStatus(userId);
	if (!user) {
		throw new NotFoundError("User not found");
	}

	const phoneVerified = user.phoneVerified === 1;
	const emailVerified = user.emailVerified === 1;

	const pendingItems: string[] = [];
	if (!phoneVerified) pendingItems.push("phone_verification");
	if (!emailVerified) pendingItems.push("email_verification");

	let overallStatus: string;
	if (phoneVerified && emailVerified) {
		overallStatus = "complete";
	} else if (phoneVerified || emailVerified) {
		overallStatus = "partial";
	} else {
		overallStatus = "incomplete";
	}

	return {
		phone_verified: phoneVerified,
		email_verified: emailVerified,
		identity_verified: false,
		documents_verified: false,
		business_verified: false,
		overall_status: overallStatus,
		pending_items: pendingItems,
	};
};

// ====== Follow Data List (Endpoint #6) ======

export const followDataListGeneralService = async (userId: number) => {
	const { followers, following } = await generalRepositery.getFollowData(userId);

	return {
		followers: followers.map(f => ({
			id: f.followerId,
			full_name: f.fullName || `${f.fname || ''} ${f.lname || ''}`.trim(),
			avatar_url: f.profile ? `${s3Prefix}${f.profile}` : (f.socialImage || ''),
			followed_at: f.createDate,
		})),
		following: following.map(f => ({
			id: f.followedId,
			full_name: f.fullName || `${f.fname || ''} ${f.lname || ''}`.trim(),
			avatar_url: f.profile ? `${s3Prefix}${f.profile}` : (f.socialImage || ''),
			followed_at: f.createDate,
		})),
		followers_count: followers.length,
		following_count: following.length,
	};
};

// ====== Save Document (Endpoint #8) ======

export const saveDocumentService = async (userId: number, data: {
	id?: number | null;
	title?: string;
	description?: string;
	type?: string;
	docnumber?: string;
	file_url?: string;
}) => {
	if (data.id) {
		const existing = await generalRepositery.findDocumentById(data.id);
		if (!existing) {
			throw new NotFoundError("Document not found");
		}

		await generalRepositery.updateDocument(data.id, {
			docnumber: data.docnumber || existing.docnumber || undefined,
			doc: data.file_url || existing.doc || undefined,
		});

		const updated = await generalRepositery.findDocumentById(data.id);
		return updated;
	}

	const docId = await generalRepositery.createDocument({
		user: userId,
		docnumber: data.docnumber,
		doc: data.file_url,
	});

	return generalRepositery.findDocumentById(docId);
};

// ====== All Read Notification (Endpoint #11) ======

export const allReadNotificationService = async (userId: number) => {
	const updatedCount = await generalRepositery.markAllNotificationsRead(userId);
	return {
		message: "All notifications marked as read",
		updated_count: updatedCount,
	};
};

// ====== Chat Message Read (Endpoint #12) ======

export const chatMessageReadGeneralService = async (userId: number, messageId: number) => {
	const message = await generalRepositery.findMessageHistoryById(messageId);
	if (!message) {
		throw new NotFoundError("Message not found");
	}

	await generalRepositery.markMessageRead(messageId, userId);

	return {
		message: "Message marked as read",
		message_id: messageId,
		is_read: true,
	};
};

// ====== Remove Notification (Endpoints #13, #15) ======

export const removeNotificationService = async (userId: number, notificationId: number) => {
	const notification = await generalRepositery.findNotificationById(notificationId);
	if (!notification) {
		throw new NotFoundError("Notification not found");
	}

	await generalRepositery.clearNotification(userId, notificationId);

	return {
		message: "Notification removed",
		notification_id: notificationId,
	};
};

// ====== Clear All Notification (Endpoint #14) ======

export const clearAllNotificationService = async (userId: number) => {
	const clearedCount = await generalRepositery.clearAllNotifications(userId);

	return {
		message: "All notifications cleared",
		cleared_count: clearedCount,
	};
};

// ====== Unfollow (Endpoint #16) ======

export const unfollowService = async (userId: number, targetUserId: number) => {
	const follow = await generalRepositery.findFollowRelationship(userId, targetUserId);
	if (!follow) {
		throw new NotFoundError("Follow relationship not found");
	}

	await generalRepositery.softDeleteFollow(userId, targetUserId);

	return {
		message: "Unfollowed successfully",
		unfollowed_user_id: targetUserId,
	};
};

// ====== Remove Follower (Endpoint #17) ======

export const removeFollowerService = async (userId: number, followerId: number) => {
	const follow = await generalRepositery.findFollowerRelationship(followerId, userId);
	if (!follow) {
		throw new NotFoundError("Follow relationship not found");
	}

	await generalRepositery.softDeleteFollow(followerId, userId);

	return {
		message: "Follower removed",
		removed_follower_id: followerId,
	};
};

// ====== Multi Unfollow (Endpoint #18) ======

export const multiUnfollowService = async (userId: number, userIds: number[]) => {
	const unfollowedCount = await generalRepositery.multiUnfollow(userId, userIds);

	return {
		message: "Multiple users unfollowed",
		unfollowed_count: unfollowedCount,
		unfollowed_user_ids: userIds,
	};
};

// ====== Multi Remove Follower (Endpoint #19) ======

export const multiRemoveFollowerService = async (userId: number, userIds: number[]) => {
	const removedCount = await generalRepositery.multiRemoveFollower(userId, userIds);

	return {
		message: "Multiple followers removed",
		removed_count: removedCount,
		removed_follower_ids: userIds,
	};
};
