import { and, asc, desc, eq, like, sql, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybUser, cybUserDetails, cybNotifications, cybMessageHistory,
	cybUserExperience, cybUserEducation, cybUserSkill, cybSkill,
	cybUserLanguage, cybLanguages, cybUserCertificate,
	cybCompanyJob, cybJobExperiences, cybDepartment, cybRoleTypes,
	cybDesignation, cybSalary, cybJobMode, cybIndustries,
	cybCities, cybState, cybCountry, cybAccomodation,
	cybTurnover, cybCompanySize, cybEmployementType, cybApplication,
} from '../db/schema';

class miscRepositery {

	async markNotificationViewed(userId: number, notifId: number) {
		const result = await db.update(cybNotifications)
			.set({ isViewed: 1 })
			.where(and(
				eq(cybNotifications.receiver, userId),
				eq(cybNotifications.id, notifId),
			));
		return result;
	}

	async findUserById(userId: number) {
		const [user] = await db.select()
			.from(cybUser)
			.where(and(eq(cybUser.id, userId), eq(cybUser.isDeleted, 0)));
		return user;
	}

	async setcvPop(userId: number) {
		await db.update(cybUser)
			.set({ cvPop: 1 })
			.where(eq(cybUser.id, userId));
	}

	async countUserExperiences(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.isDeleted, 0),
			));
		return result.count;
	}

	async getUnreadNotifications(userId: number) {
		const rows = await db.select({
			id: cybNotifications.id,
			sender: cybNotifications.sender,
			message: cybNotifications.message,
			type: cybNotifications.type,
			isViewed: cybNotifications.isViewed,
			createDate: cybNotifications.createDate,
			slug: cybNotifications.slug,
			senderName: cybUser.fname,
			senderProfile: cybUser.profile,
			senderSocialImage: cybUser.socialImage,
		})
			.from(cybNotifications)
			.leftJoin(cybUser, eq(cybNotifications.sender, cybUser.id))
			.where(and(
				eq(cybNotifications.receiver, userId),
				eq(cybNotifications.isViewed, 0),
				eq(cybNotifications.isDeleted, 0),
			))
			.orderBy(desc(cybNotifications.id));
		return rows;
	}

	async countUnreadMessages(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybMessageHistory)
			.where(and(
				eq(cybMessageHistory.receiver, userId),
				eq(cybMessageHistory.isViewed, 0),
				eq(cybMessageHistory.isDeleted, 0),
			));
		return result.count;
	}

	async saveExploring(userId: number, data: {
		exploringOption?: string;
		onImmediate?: number;
		onNotice?: number;
		noticePeriod?: number;
		noticeDate?: string;
		expectedSalary?: string;
		expectedInhand?: string;
		expectedMode?: string;
		noticeEmployments?: string;
	}) {
		await db.update(cybUser)
			.set({
				onExplore: 1,
				onImmediate: data.onImmediate,
				onNotice: data.onNotice,
				noticePeriod: data.noticePeriod,
				noticeDate: data.noticeDate,
				expectedSalary: data.expectedSalary ? Number(data.expectedSalary) : undefined,
				expectedInhand: data.expectedInhand,
				expectedMode: data.expectedMode,
			})
			.where(eq(cybUser.id, userId));

		if (data.exploringOption || data.noticeEmployments) {
			const existing = await db.select()
				.from(cybUserDetails)
				.where(eq(cybUserDetails.userId, userId))
				.limit(1);

			if (existing.length > 0) {
				await db.update(cybUserDetails)
					.set({
						exploringOption: data.exploringOption,
						noticeEmployments: data.noticeEmployments,
					})
					.where(eq(cybUserDetails.userId, userId));
			} else {
				await db.insert(cybUserDetails).values({
					userId,
					exploringOption: data.exploringOption,
					noticeEmployments: data.noticeEmployments,
				});
			}
		}
	}

	async searchAllCompany(keyword: string, limit: number, offset: number) {
		const keywords = keyword.split(/\s+/).filter(Boolean);
		const conditions = [
			eq(cybUser.userType, 2),
			eq(cybUser.claimStatus, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];

		for (const word of keywords) {
			conditions.push(like(cybUser.fname, `%${word}%`));
		}

		const rows = await db.select({
			id: cybUser.id,
			fname: cybUser.fname,
			slug: cybUser.slug,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
		})
			.from(cybUser)
			.where(and(...conditions))
			.orderBy(asc(cybUser.fname))
			.limit(limit)
			.offset(offset);
		return rows;
	}

	async countAllCompany(keyword: string): Promise<number> {
		const keywords = keyword.split(/\s+/).filter(Boolean);
		const conditions = [
			eq(cybUser.userType, 2),
			eq(cybUser.claimStatus, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];

		for (const word of keywords) {
			conditions.push(like(cybUser.fname, `%${word}%`));
		}

		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUser)
			.where(and(...conditions));
		return result.count;
	}

	async editUserProfile(userId: number, data: Record<string, any>) {
		const setFields: Record<string, any> = {};
		const allowedFields = [
			'fname', 'lname', 'dob', 'gender', 'phone', 'second_phone',
			'profile_description', 'country', 'state', 'city',
			'present_address', 'permanent_address', 'same_address',
			'accomodation', 'work_status', 'current_possition', 'current_company',
			'industry', 'notice_period', 'notice_date',
			'on_explore', 'on_immediate', 'on_notice',
			'linkdin', 'youtube', 'instagram', 'facebook', 'twitter',
		];
		const fieldMap: Record<string, string> = {
			profile_description: 'profileDescription',
			second_phone: 'secondPhone',
			present_address: 'presentAddress',
			permanent_address: 'permanentAddress',
			same_address: 'sameAddress',
			work_status: 'workStatus',
			current_possition: 'currentPossition',
			current_company: 'currentCompany',
			notice_period: 'noticePeriod',
			notice_date: 'noticeDate',
			on_explore: 'onExplore',
			on_immediate: 'onImmediate',
			on_notice: 'onNotice',
		};

		for (const [key, value] of Object.entries(data)) {
			if (value !== undefined && allowedFields.includes(key)) {
				const dbField = fieldMap[key] || key;
				setFields[dbField] = value;
			}
		}

		if (Object.keys(setFields).length === 0) return;

		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		setFields.modifyDate = now;

		await db.update(cybUser)
			.set(setFields)
			.where(eq(cybUser.id, userId));
	}

	async findCompanyBySlug(slug: string) {
		const [company] = await db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			userType: cybUser.userType,
			fname: cybUser.fname,
			email: cybUser.email,
			phone: cybUser.phone,
			slug: cybUser.slug,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			claimStatus: cybUser.claimStatus,
			industry: cybUser.industry,
			companySize: cybUser.companySize,
			turnover: cybUser.turnover,
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
			incorporateDate: cybUser.incorporateDate,
			latitude: cybUserDetails.latitude,
			longitude: cybUserDetails.longitude,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			industryName: cybIndustries.name,
			turnoverName: cybTurnover.name,
			companySizeName: cybCompanySize.name,
		})
			.from(cybUser)
			.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
			.leftJoin(cybTurnover, eq(cybUser.turnover, cybTurnover.id))
			.leftJoin(cybCompanySize, eq(cybUser.companySize, cybCompanySize.id))
			.where(and(
				eq(cybUser.slug, slug),
				eq(cybUser.userType, 2),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0),
			))
			.limit(1);
		return company;
	}

	async getCompanyActiveJobs(companyId: number, limit: number) {
		const rows = await db.select({
			id: cybCompanyJob.id,
			jobTitle: cybCompanyJob.jobTitle,
			slug: cybCompanyJob.slug,
			vacancy: cybCompanyJob.vacancy,
			country: cybCompanyJob.country,
			state: cybCompanyJob.state,
			city: cybCompanyJob.city,
			urgent: cybCompanyJob.urgent,
			createDate: cybCompanyJob.createDate,
			experienceName: cybJobExperiences.name,
			departmentName: cybDepartment.name,
			roleTypeName: cybRoleTypes.name,
			designationName: cybDesignation.name,
			salaryName: cybSalary.name,
			countryName: cybCountry.name,
			stateName: cybState.name,
			cityName: cybCities.name,
		})
			.from(cybCompanyJob)
			.leftJoin(cybJobExperiences, eq(cybCompanyJob.experience, cybJobExperiences.id))
			.leftJoin(cybDepartment, eq(cybCompanyJob.department, cybDepartment.id))
			.leftJoin(cybRoleTypes, eq(cybCompanyJob.roleType, cybRoleTypes.id))
			.leftJoin(cybDesignation, eq(cybCompanyJob.designation, cybDesignation.id))
			.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
			.leftJoin(cybCountry, eq(cybCompanyJob.country, cybCountry.id))
			.leftJoin(cybState, eq(cybCompanyJob.state, cybState.id))
			.leftJoin(cybCities, eq(cybCompanyJob.city, cybCities.id))
			.where(and(
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.status, 1),
				eq(cybCompanyJob.isDeleted, 0),
			))
			.orderBy(desc(cybCompanyJob.id))
			.limit(limit);
		return rows;
	}

	async countCompanyApplications(jobIds: number[]) {
		if (jobIds.length === 0) return [];
		const result = await db.select({
			job: cybCompanyJob.id,
			count: sql<number>`count(*)`,
		})
			.from(cybCompanyJob)
			.leftJoin(cybApplication, eq(cybApplication.job, cybCompanyJob.id))
			.where(and(
				sql`${cybCompanyJob.id} IN ${jobIds}`,
				eq(cybCompanyJob.status, 1),
			))
			.groupBy(cybCompanyJob.id);
		return result;
	}

	async getSimilarCompanies(companyId: number, industryId: number | null, limit: number) {
		const conditions = [
			eq(cybUser.userType, 2),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
			ne(cybUser.id, companyId),
		];
		if (industryId) {
			conditions.push(eq(cybUser.industry, industryId));
		}

		const rows = await db.select({
			id: cybUser.id,
			fname: cybUser.fname,
			slug: cybUser.slug,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
		})
			.from(cybUser)
			.where(and(...conditions))
			.limit(limit);
		return rows;
	}

	async getUserDetailForCv(userId: number) {
		const companyUser = alias(cybUser, 'cvCompany');
		const [row] = await db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			fname: cybUser.fname,
			lname: cybUser.lname,
			email: cybUser.email,
			phone: cybUser.phone,
			gender: cybUser.gender,
			dob: cybUser.dob,
			profileDescription: cybUser.profileDescription,
			linkdin: cybUser.linkdin,
			slug: cybUser.slug,
			resume: cybUser.resume,
			resumeName: cybUser.resumeName,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			accomodationName: cybAccomodation.name,
			presentAddress: cybUser.presentAddress,
			latitude: cybUserDetails.latitude,
			longitude: cybUserDetails.longitude,
			phoneVerified: cybUser.phoneVerified,
			emailVerified: cybUser.emailVerified,
		})
			.from(cybUser)
			.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
			.leftJoin(cybCities, eq(cybUser.city, cybCities.id))
			.leftJoin(cybState, eq(cybUser.state, cybState.id))
			.leftJoin(cybCountry, eq(cybUser.country, cybCountry.id))
			.leftJoin(cybAccomodation, eq(cybUser.accomodation, cybAccomodation.id))
			.where(and(eq(cybUser.id, userId), eq(cybUser.status, 1), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async getUserExperiences(userId: number) {
		const companyUser = alias(cybUser, 'expCompany');
		const rows = await db.select({
			id: cybUserExperience.id,
			user: cybUserExperience.user,
			company: cybUserExperience.company,
			employmentType: cybUserExperience.employmentType,
			designation: cybUserExperience.designation,
			department: cybUserExperience.department,
			salary: cybUserExperience.salary,
			salaryInhand: cybUserExperience.salaryInhand,
			salaryMode: cybUserExperience.salaryMode,
			joiningDate: cybUserExperience.joiningDate,
			workedTillDate: cybUserExperience.workedTillDate,
			stillWorking: cybUserExperience.stillWorking,
			skill: cybUserExperience.skill,
			description: cybUserExperience.description,
			approved: cybUserExperience.approved,
			designationName: cybDesignation.name,
			departmentName: cybDepartment.name,
			companyName: companyUser.fname,
		})
			.from(cybUserExperience)
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(cybDepartment, eq(cybUserExperience.department, cybDepartment.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.isDeleted, 0),
			))
			.orderBy(desc(cybUserExperience.id));
		return rows;
	}

	async getUserEducation(userId: number) {
		const rows = await db.select()
			.from(cybUserEducation)
			.where(and(
				eq(cybUserEducation.user, userId),
				eq(cybUserEducation.isDeleted, 0),
			))
			.orderBy(desc(cybUserEducation.id));
		return rows;
	}

	async getUserSkills(userId: number) {
		const rows = await db.select({
			id: cybUserSkill.id,
			user: cybUserSkill.user,
			skill: cybUserSkill.skill,
			rating: cybUserSkill.rating,
			skillName: cybSkill.name,
		})
			.from(cybUserSkill)
			.leftJoin(cybSkill, eq(cybUserSkill.skill, cybSkill.id))
			.where(and(
				eq(cybUserSkill.user, userId),
				eq(cybUserSkill.isDeleted, 0),
			))
			.orderBy(desc(cybUserSkill.rating));
		return rows;
	}

	async getUserLanguages(userId: number) {
		const rows = await db.select({
			id: cybUserLanguage.id,
			user: cybUserLanguage.user,
			language: cybUserLanguage.language,
			verbal: cybUserLanguage.verbal,
			written: cybUserLanguage.written,
			languageName: cybLanguages.name,
		})
			.from(cybUserLanguage)
			.leftJoin(cybLanguages, eq(cybUserLanguage.language, cybLanguages.id))
			.where(and(
				eq(cybUserLanguage.user, userId),
				eq(cybUserLanguage.isDeleted, 0),
			));
		return rows;
	}

	async getUserCertificates(userId: number) {
		const rows = await db.select()
			.from(cybUserCertificate)
			.where(and(
				eq(cybUserCertificate.user, userId),
				eq(cybUserCertificate.isDeleted, 0),
			))
			.orderBy(desc(cybUserCertificate.id));
		return rows;
	}

	async getUserExperienceById(expId: number) {
		const companyUser = alias(cybUser, 'expDetailCompany');
		const [row] = await db.select({
			id: cybUserExperience.id,
			user: cybUserExperience.user,
			company: cybUserExperience.company,
			employmentType: cybUserExperience.employmentType,
			designation: cybUserExperience.designation,
			department: cybUserExperience.department,
			salary: cybUserExperience.salary,
			salaryInhand: cybUserExperience.salaryInhand,
			salaryMode: cybUserExperience.salaryMode,
			joiningDate: cybUserExperience.joiningDate,
			workedTillDate: cybUserExperience.workedTillDate,
			stillWorking: cybUserExperience.stillWorking,
			skill: cybUserExperience.skill,
			description: cybUserExperience.description,
			approved: cybUserExperience.approved,
			designationName: cybDesignation.name,
			employmentTypeName: cybEmployementType.name,
			departmentName: cybDepartment.name,
			companyName: companyUser.fname,
		})
			.from(cybUserExperience)
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(cybEmployementType, eq(cybUserExperience.employmentType, cybEmployementType.id))
			.leftJoin(cybDepartment, eq(cybUserExperience.department, cybDepartment.id))
			.where(eq(cybUserExperience.id, expId))
			.limit(1);
		return row;
	}
}

export default new miscRepositery();
