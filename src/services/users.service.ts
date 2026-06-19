import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybCities, cybState, cybCountry, cybTurnover, cybCompanySize, cybNoticePeriod,
	cybLanguages, cybIndustries, cybSalary, cybBenefits, cybRoleTypes, cybJobExperiences,
	cybAccomodation, cybCourses, cybCourseType, cybTag, cybInstitutions, cybDesignation,
	cybSkill, cybJobMode, cybDepartment, cybEmployementType, cybWorkType, cybUser,
	cybUserSkill, cybUserExperience, cybCompanyJob, cybApplication, cybGalleries,
	cybJobCollaborators, cybGender, cybVerifyDocument, cybUserDetails, cybUserDomains
} from '../db/schema';

import { get_job_skill, get_gallery_list } from "../helpers/decoder"
import { job_collaborator_list } from './Collaborator.service';

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




export const get_job_detail = async (jobId: number, userId: number | false = false, status: number | string | false = false, companyview: boolean = false) => {
	const condition = [eq(cybCompanyJob.id, jobId), eq(cybCompanyJob.isDeleted, 0), eq(cybUser.isDeleted, 0)];
	const rows = await db.select({
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

	if (!job_detail) return [];

	const skillList = await get_job_skill(job_detail.skill);
	const galleryList = await get_gallery_list(job_detail.companyId);
	const applied = await check_job_applied(job_detail.id, userId);
	const isVerified = await user_verified(job_detail.companyId)


	const arr: Record<string, any> = {
		id: job_detail.id,
		individual_id: job_detail.individual_id,
		job_title: job_detail.job_title,
		job_description: job_detail.job_description,
		roles_responsibility: job_detail.roles_responsibility,
		department_name: job_detail.department_name,
		experience_name: job_detail.experience_name,
		department: job_detail.department,
		experience: job_detail.experience,
		skill_text: job_detail.skill,
		skill: skillList,
		role_type_name: job_detail.role_type_name,
		job_mode_name: job_detail.job_mode_name,
		industry_name: job_detail.industry_name,
		role_type: job_detail.role_type,
		industry: job_detail.industry,
		vacancy: job_detail.vacancy,
		urgent: job_detail.urgent === 1 ? true : false,
		designation_name: job_detail.designation_name,
		country_name: job_detail.country_name,
		state_name: job_detail.state_name,
		designation: job_detail.designation,
		country: job_detail.country,
		state: job_detail.state,
		city: job_detail.city,
		job_mode: job_detail.job_mode,
		document: job_detail.document ? `${s3Prefix}${job_detail.document}` : '',
		city_name: job_detail.city_name,
		salary: job_detail.salary,
		salary_name: job_detail.salary_name,
		company_name: job_detail.company_name,
		profile: job_detail.profile ? `${s3Prefix}${job_detail.profile}` : (job_detail.social_image || ''),
		create_date: job_detail.create_date,
		applicationCount: job_detail.applicationCount,
		status: job_detail.status,
		slug: job_detail.slug,
		gallery: galleryList,
		company_slug: job_detail.company_slug,
		apply: applied,
		is_verified: isVerified,
	};

	if (companyview) {
		const fil = { user_id: job_detail.company!, job_id: job_detail.id };
		const { data, count } = await job_collaborator_list(fil);
		arr['colloborator'] = data.length > 0 ? true : false;

		const final = data.map((val: any) => ({
			id: val.id,
			full_name: val.full_name,
			slug: val.slug,
			individual_id: val.individual_id,
			profile: val.profile ? `${s3Prefix}${val.profile}` : (val.social_image || ''),
			designation_name: val.designation_name,
		}));

		arr['collaboratorList'] = final;

		arr['totalCount'] = count;
	}

	return arr;
};

