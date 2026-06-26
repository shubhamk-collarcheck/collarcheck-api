import { and, asc, desc, eq, getTableColumns, inArray, like, or, sql, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybCities, cybState, cybCountry, cybTurnover, cybCompanySize, cybNoticePeriod,
	cybLanguages, cybIndustries, cybSalary, cybBenefits, cybRoleTypes, cybJobExperiences,
	cybAccomodation, cybCourses, cybCourseType, cybTag, cybInstitutions, cybDesignation,
	cybSkill, cybJobMode, cybDepartment, cybEmployementType, cybWorkType, cybUser,
	cybUserSkill, cybUserExperience, cybCompanyJob, cybApplication, cybGalleries,
	cybJobCollaborators, cybGender, cybVerifyDocument, cybUserDetails, cybUserDomains,
	cybCompanyBenefits
} from '../db/schema';

import { get_job_skill, get_gallery_list } from "../helpers/decoder"
import { job_collaborator_list } from './Collaborator.service';
import { isEmptyObject } from '../helpers/validaters';

const s3Prefix = process.env.S3_PREFIX || '';


export const get_user_detail = async (id: number) => {
	const companyUser = alias(cybUser, 'cmp');
	const [row] = await db.select({
		id: cybUser.id,
		individualId: cybUser.individualId,
		userType: cybUser.userType,
		fname: cybUser.fname,
		lname: cybUser.lname,
		fullName: cybUser.fullName,
		email: cybUser.email,
		phone: cybUser.phone,
		slug: cybUser.slug,
		token: cybUser.token,
		phoneVerified: cybUser.phoneVerified,
		emailVerified: cybUser.emailVerified,
		gender: cybUser.gender,
		secondPhoneVerify: cybUser.secondPhoneVerify,
		emailAlternateVerify: cybUser.emailAlternateVerify,
		emailAlternate: cybUser.emailAlternate,
		secondPhone: cybUser.secondPhone,
		socialImage: cybUser.socialImage,
		profile: cybUser.profile,
		city: cybUser.city,
		state: cybUser.state,
		country: cybUser.country,
		workStatus: cybUser.workStatus,
		currentPossition: cybUser.currentPossition,
		currentCompany: cybUser.currentCompany,
		claimStatus: cybUser.claimStatus,
		industry: cybUser.industry,
		turnover: cybUser.turnover,
		companySize: cybUser.companySize,
		noticePeriod: cybUser.noticePeriod,
		accomodation: cybUser.accomodation,
		status: cybUser.status,
		isDeleted: cybUser.isDeleted,
		createDate: cybUser.createDate,
		noticeEmployments: cybUserDetails.noticeEmployments,
		latitude: cybUserDetails.latitude,
		longitude: cybUserDetails.longitude,
		exploringOption: cybUserDetails.exploringOption,
		exploringDetails: cybUserDetails.exploringDetails,
		landline: cybUserDetails.landline,
		cityName: cybCities.name,
		stateName: cybState.name,
		countryName: cybCountry.name,
		workType: cybWorkType.name,
		industryName: cybIndustries.name,
		designationName: cybDesignation.name,
		accomodationName: cybAccomodation.name,
		companyName: companyUser.fname,
		companyEmail: companyUser.email,
		companyId: companyUser.id,
		companyProfile: companyUser.profile,
		companySocialImage: companyUser.socialImage,
		companyClaimStatus: companyUser.claimStatus,
		turnoverName: cybTurnover.name,
		companySizeName: cybCompanySize.name,
		noticePeriodName: cybNoticePeriod.name,
		noticeType: cybNoticePeriod.type,
		genderName: cybGender.name,
		genderId: cybGender.id,
	})
		.from(cybUser)
		.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
		.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
		.leftJoin(cybState, eq(cybUser.state, cybState.id))
		.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
		.leftJoin(cybWorkType, eq(cybUser.workStatus, cybWorkType.id))
		.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
		.leftJoin(companyUser, eq(cybUser.currentCompany, companyUser.id))
		.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
		.leftJoin(cybGender, eq(cybUser.gender, cybGender.id))
		.leftJoin(cybTurnover, eq(cybUser.turnover, cybTurnover.id))
		.leftJoin(cybCompanySize, eq(cybUser.companySize, cybCompanySize.id))
		.leftJoin(cybNoticePeriod, eq(cybUser.noticePeriod, cybNoticePeriod.id))
		.leftJoin(cybAccomodation, eq(cybUser.accomodation, cybAccomodation.id))
		.where(and(eq(cybUser.id, id), eq(cybUser.status, 1), eq(cybUser.isDeleted, 0)))
		.limit(1);

	return row;
};

export const get_all_connection = async (companyId: number) => {
	const [result] = await db
		.select({ count: sql<number>`COUNT(DISTINCT ${cybUserExperience.user})` })
		.from(cybUserExperience)
		.innerJoin(cybUser, eq(cybUserExperience.user, cybUser.id))
		.where(
			and(
				eq(cybUserExperience.approved, 1),
				eq(cybUserExperience.stillWorking, 1),
				eq(cybUserExperience.isDeleted, 0),
				eq(cybUserExperience.company, companyId)
			)
		);

	return result?.count || 0;
};

export const get_complete_connection = async (companyId: number) => {
	const [result] = await db
		.select({ count: sql<number>`COUNT(DISTINCT ${cybUserExperience.user})` })
		.from(cybUserExperience)
		.innerJoin(cybUser, eq(cybUserExperience.user, cybUser.id))
		.where(
			and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.isDeleted, 0),
				eq(cybUser.isDeleted, 0)
			)
		);

	return result?.count || 0;
};

export const get_benefits_list = async (companyId: number) => {
	const rows = await db
		.select({
			benefitId: cybCompanyBenefits.benefitId,
			benefitName: cybBenefits.name,
			image: cybBenefits.image,
			benefitDescription: cybBenefits.description,
		})
		.from(cybCompanyBenefits)
		.leftJoin(cybBenefits, eq(cybCompanyBenefits.benefitId, cybBenefits.id))
		.where(
			and(
				eq(cybCompanyBenefits.companyId, companyId),
				eq(cybCompanyBenefits.status, 1),
				eq(cybBenefits.status, 1),
				eq(cybCompanyBenefits.isDeleted, 0)
			)
		)
		.orderBy(asc(cybCompanyBenefits.sortOrder));

	return rows;
};

export const get_company_detail = async (id: number) => {
	const [detail] = await db
		.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			userType: cybUser.userType,
			fname: cybUser.fname,
			email: cybUser.email,
			phone: cybUser.phone,
			phoneVerified: cybUser.phoneVerified,
			emailVerified: cybUser.emailVerified,
			emailAlternate: cybUser.emailAlternate,
			secondPhoneVerify: cybUser.secondPhoneVerify,
			emailAlternateVerify: cybUser.emailAlternateVerify,
			secondPhone: cybUser.secondPhone,
			slug: cybUser.slug,
			country: cybUser.country,
			city: cybUser.city,
			state: cybUser.state,
			presentAddress: cybUser.presentAddress,
			profileDescription: cybUser.profileDescription,
			linkdin: cybUser.linkdin,
			youtube: cybUser.youtube,
			instagram: cybUser.instagram,
			facebook: cybUser.facebook,
			twitter: cybUser.twitter,
			contactPerson: cybUser.contactPerson,
			website: cybUser.website,
			turnover: cybUser.turnover,
			companySize: cybUser.companySize,
			incorporateDate: cybUser.incorporateDate,
			industry: cybUser.industry,
			loginTime: cybUser.loginTime,
			claimStatus: cybUser.claimStatus,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			industryName: cybIndustries.name,
			turnoverName: cybTurnover.name,
			companySizeName: cybCompanySize.name,
			latitude: cybUserDetails.latitude,
			longitude: cybUserDetails.longitude,
			isVerified: cybUserDetails.isVerified,
		})
		.from(cybUser)
		.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
		.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
		.leftJoin(cybState, eq(cybUser.state, cybState.id))
		.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
		.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
		.leftJoin(cybTurnover, eq(cybUser.turnover, cybTurnover.id))
		.leftJoin(cybCompanySize, eq(cybUser.companySize, cybCompanySize.id))
		.where(
			and(
				eq(cybUser.id, id),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0),
				eq(cybUser.userType, 2)
			)
		)
		.limit(1);

	if (!detail) {
		return null;
	}

	const totalConnection = await get_all_connection(detail.id);
	const allEmploymentCount = await get_complete_connection(detail.id);
	const benefitList = await get_benefits_list(detail.id);

	const allBenefits = benefitList.map((val) => ({
		benefit_name: val.benefitName,
		image: val.image ? `${s3Prefix}${val.image}` : '',
	}));

	return {
		id: detail.id,
		fname: detail.fname,
		individual_id: detail.individualId,
		user_type: detail.userType,
		email: detail.email,
		phone: detail.phone,
		phone_verified: detail.phoneVerified,
		email_verified: detail.emailVerified,
		email_alternate: detail.emailAlternate,
		second_phone_verify: detail.secondPhoneVerify,
		email_alternate_verify: detail.emailAlternateVerify,
		second_phone: detail.secondPhone,
		verified_domain: detail.isVerified,
		profile: detail.profile ? `${s3Prefix}${detail.profile}` : (detail.socialImage || ''),
		slug: detail.slug,
		country: detail.country,
		city: detail.city,
		state: detail.state,
		city_name: detail.cityName,
		state_name: detail.stateName,
		country_name: detail.countryName,
		present_address: detail.presentAddress,
		profile_description: detail.profileDescription,
		linkdin: detail.linkdin,
		youtube: detail.youtube,
		instagram: detail.instagram,
		facebook: detail.facebook,
		tumblr: '',
		discord: '',
		twitter: detail.twitter,
		snapchat: '',
		contact_person: detail.contactPerson,
		website: detail.website,
		turnover: detail.turnover,
		turnover_name: detail.turnoverName,
		company_size: detail.companySize,
		company_size_name: detail.companySizeName,
		incorporate_date: detail.incorporateDate,
		industry: detail.industry,
		industry_name: detail.industryName,
		login_time: detail.loginTime,
		claim_status: detail.claimStatus,
		latitude: detail.latitude,
		longitude: detail.longitude,
		totalConnection,
		allEmploymentCount,
		benefitList: allBenefits,
	};
};

const check_job_applied = async (jobId: number | null, userId: number | false) => {
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

export const get_job_detail = async (slug: string, userId: number | false = false, status: number | string | false = false, companyview: boolean = false) => {
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

	const skillList = await get_job_skill(job_detail.skill);
	const galleryList = await get_gallery_list(job_detail.companyId);
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


interface SearchJobFilter {
	keyword?: string;
	city?: number;
	state?: number;
	salary?: number;
	designation?: number;
	urgent?: number;
	vacancy?: number;
	industry?: number;
	country?: number;
	job_mode?: number;
	department?: number;
	experience?: number;
	role_type?: number;
	company?: number;
	id_not_in?: number;
	posted_date?: number;
	stateArr?: { id: number }[],
	citiesArr?: { id: number }[],
	designationArr?: { id: number }[],
	departmentArr?: { id: number }[];
	skillArray?: { id: number }[];
	job_id?: number[];
	random?: boolean;
	limit?: number;
	offset?: number;
}

export const get_search_skill = async (keyword: string) => {
	if (!keyword) return [];
	const rows = await db.select({ id: cybSkill.id })
		.from(cybSkill)
		.where(and(eq(cybSkill.status, 1), like(cybSkill.name, '%' + keyword + '%')));
	return rows;
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
	return rows.length;
};

