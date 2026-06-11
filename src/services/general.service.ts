import { and, asc, eq, sql } from 'drizzle-orm';
import db from '../db';
import { cybCities, cybState, cybCountry, cybTurnover, cybCompanySize, cybNoticePeriod, cybLanguages, cybIndustries, cybSalary, cybBenefits, cybRoleTypes, cybJobExperiences, cybAccomodation, cybCourses, cybCourseType, cybTag, cybInstitutions, cybDesignation, cybSkill } from '../db/schema';

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
