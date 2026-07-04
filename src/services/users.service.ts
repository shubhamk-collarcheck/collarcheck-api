import { and, asc, desc, eq, getTableColumns, inArray, like, or, sql, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import UsersRepository from "../repositery/users.repositery"
import {
	cybCities, cybState, cybCountry, cybTurnover, cybCompanySize, cybNoticePeriod,
	cybLanguages, cybIndustries, cybSalary, cybBenefits, cybRoleTypes, cybJobExperiences,
	cybAccomodation, cybCourses, cybCourseType, cybTag, cybInstitutions, cybDesignation,
	cybSkill, cybJobMode, cybDepartment, cybEmployementType, cybWorkType, cybUser,
	cybUserSkill, cybUserExperience, cybCompanyJob, cybApplication, cybGalleries,
	cybJobCollaborators, cybGender, cybVerifyDocument, cybUserDetails, cybUserDomains,
	cybCompanyBenefits
} from '../db/schema';

import { decodeSkill, decodeGallery } from "../utils/decoders"
import { job_collaborator_list } from './Collaborator.service';
import { isEmptyArray, isEmptyObject } from '../utils/helpers';

const s3Prefix = process.env.S3_PREFIX || '';


export const get_hire_status = async (id: number) => {
	const existing = await UsersRepository.getHireDetail(id)
	if (isEmptyArray(existing)) {
		return 0
	}
	return existing[0].hired
}


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

