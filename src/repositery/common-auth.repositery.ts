import { and, asc, desc, eq, sql, inArray, ne, like } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybUser, cybUserDetails, cybAccountSetting, cybUserProfileViewRequest,
	cybNotifications, cybUserExperience, cybUserEducation, cybUserSkill,
	cybSkill, cybUserLanguage, cybLanguages, cybUserCertificate,
	cybUserProtfolio, cybFollow, cybUserExperienceRating,
	cybDesignation, cybDepartment, cybEmployementType,
	cybCities, cybState, cybCountry, cybAccomodation, cybWorkType,
	cybIndustries, cybTurnover, cybCompanySize, cybNoticePeriod, cybGender,
} from '../db/schema';

class commonAuthRepositery {

	// ====== Settings ======

	async getSettings(userId: number) {
		const rows = await db.select()
			.from(cybAccountSetting)
			.where(and(
				eq(cybAccountSetting.userId, userId),
				eq(cybAccountSetting.status, 1),
			));
		return rows;
	}

	async findSettingByKey(userId: number, key: string) {
		const [row] = await db.select()
			.from(cybAccountSetting)
			.where(and(
				eq(cybAccountSetting.userId, userId),
				eq(cybAccountSetting.key, key),
			));
		return row;
	}

	async countSettingByKey(userId: number, key: string): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybAccountSetting)
			.where(and(
				eq(cybAccountSetting.userId, userId),
				eq(cybAccountSetting.key, key),
			));
		return result.count;
	}

	async deleteDuplicateSettings(userId: number, key: string) {
		await db.delete(cybAccountSetting)
			.where(and(
				eq(cybAccountSetting.userId, userId),
				eq(cybAccountSetting.key, key),
			));
	}

	async insertSetting(userId: number, key: string, value: string) {
		await db.insert(cybAccountSetting).values({
			userId,
			code: 'config',
			key,
			value,
		});
	}

	async updateSetting(id: number, userId: number, key: string, value: string) {
		await db.update(cybAccountSetting)
			.set({ userId, key, value })
			.where(eq(cybAccountSetting.id, id));
	}

	// ====== User Profile ======

	async findUserBySlug(slug: string) {
		const [user] = await db.select()
			.from(cybUser)
			.where(and(
				eq(cybUser.slug, slug),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0),
			));
		return user;
	}

	async findUserById(id: number) {
		const [user] = await db.select()
			.from(cybUser)
			.where(and(eq(cybUser.id, id), eq(cybUser.isDeleted, 0)));
		return user;
	}

	async getUserDetail(userId: number) {
		const companyUser = alias(cybUser, 'cmpProfile');
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
			dob: cybUser.dob,
			workStatus: cybUser.workStatus,
			currentPossition: cybUser.currentPossition,
			currentCompany: cybUser.currentCompany,
			claimStatus: cybUser.claimStatus,
			industry: cybUser.industry,
			turnover: cybUser.turnover,
			companySize: cybUser.companySize,
			noticePeriod: cybUser.noticePeriod,
			onNotice: cybUser.onNotice,
			onImmediate: cybUser.onImmediate,
			onExplore: cybUser.onExplore,
			noticeDate: cybUser.noticeDate,
			expectedSalary: cybUser.expectedSalary,
			expectedInhand: cybUser.expectedInhand,
			expectedMode: cybUser.expectedMode,
			accomodation: cybUser.accomodation,
			presentAddress: cybUser.presentAddress,
			permanentAddress: cybUser.permanentAddress,
			sameAddress: cybUser.sameAddress,
			profileDescription: cybUser.profileDescription,
			linkdin: cybUser.linkdin,
			youtube: cybUser.youtube,
			instagram: cybUser.instagram,
			facebook: cybUser.facebook,
			twitter: cybUser.twitter,
			resume: cybUser.resume,
			resumeName: cybUser.resumeName,
			status: cybUser.status,
			isDeleted: cybUser.isDeleted,
			cityName: cybCities.name,
			stateName: cybState.name,
			countryName: cybCountry.name,
			workTypeName: cybWorkType.name,
			designationName: cybDesignation.name,
			companyName: companyUser.fname,
			companyId: companyUser.id,
			industryName: cybIndustries.name,
			turnoverName: cybTurnover.name,
			companySizeName: cybCompanySize.name,
			noticePeriodName: cybNoticePeriod.name,
			genderName: cybGender.name,
			accomodationName: cybAccomodation.name,
			latitude: cybUserDetails.latitude,
			longitude: cybUserDetails.longitude,
			exploringOption: cybUserDetails.exploringOption,
			exploringDetails: cybUserDetails.exploringDetails,
			noticeEmployments: cybUserDetails.noticeEmployments,
			landline: cybUserDetails.landline,
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
			.where(and(eq(cybUser.id, userId), eq(cybUser.status, 1), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	// ====== View Request ======

	async getViewRequest(targetId: number, companyId: number) {
		const now = new Date().toISOString().slice(0, 10);
		const [row] = await db.select()
			.from(cybUserProfileViewRequest)
			.where(and(
				eq(cybUserProfileViewRequest.userid, targetId),
				eq(cybUserProfileViewRequest.companyid, companyId),
				eq(cybUserProfileViewRequest.status, 1),
				eq(cybUserProfileViewRequest.isDeleted, 0),
				sql`DATE(${cybUserProfileViewRequest.expiry}) >= ${now}`,
			));
		return row;
	}

	async checkExistingViewRequest(targetId: number, companyId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserProfileViewRequest)
			.where(and(
				eq(cybUserProfileViewRequest.userid, targetId),
				eq(cybUserProfileViewRequest.companyid, companyId),
				eq(cybUserProfileViewRequest.isDeleted, 0),
			));
		return result.count;
	}

	async createViewRequest(targetId: number, companyId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.insert(cybUserProfileViewRequest).values({
			userid: targetId,
			companyid: companyId,
			status: 0,
			createDate: now,
			modifyDate: now,
		});
	}

	async createNotification(sender: number, receiver: number, message: string, link: string, redirect: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.insert(cybNotifications).values({
			sender,
			receiver,
			message,
			link,
			redirect,
			createDate: now,
			modifyDate: now,
		});
	}

	// ====== Experience ======

	async getExperienceIds(userId: number, isSelf: boolean) {
		const conditions = [
			eq(cybUserExperience.user, userId),
			eq(cybUserExperience.isDeleted, 0),
		];
		if (!isSelf) {
			conditions.push(eq(cybUserExperience.approved, 1));
			conditions.push(eq(cybUserExperience.status, 1));
		}

		const rows = await db.select({ id: cybUserExperience.id })
			.from(cybUserExperience)
			.where(and(...conditions))
			.orderBy(desc(cybUserExperience.id));
		return rows.map(r => r.id);
	}

	async getExperienceDetail(expId: number) {
		const companyUser = alias(cybUser, 'expAuthCompany');
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
			status: cybUserExperience.status,
			designationName: cybDesignation.name,
			departmentName: cybDepartment.name,
			employmentTypeName: cybEmployementType.name,
			companyName: companyUser.fname,
			companyProfile: companyUser.profile,
			companySocialImage: companyUser.socialImage,
			companySlug: companyUser.slug,
		})
			.from(cybUserExperience)
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(cybDepartment, eq(cybUserExperience.department, cybDepartment.id))
			.leftJoin(cybEmployementType, eq(cybUserExperience.employmentType, cybEmployementType.id))
			.where(eq(cybUserExperience.id, expId))
			.limit(1);
		return row;
	}

	// ====== Education ======

	async getEducationList(userId: number) {
		const rows = await db.select()
			.from(cybUserEducation)
			.where(and(
				eq(cybUserEducation.user, userId),
				eq(cybUserEducation.isDeleted, 0),
			))
			.orderBy(desc(cybUserEducation.id));
		return rows;
	}

	// ====== Skills ======

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

	// ====== Languages ======

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

	// ====== Certificates ======

	async getCertificates(userId: number) {
		const rows = await db.select()
			.from(cybUserCertificate)
			.where(and(
				eq(cybUserCertificate.user, userId),
				eq(cybUserCertificate.isDeleted, 0),
			))
			.orderBy(desc(cybUserCertificate.id));
		return rows;
	}

	// ====== Portfolios ======

	async getUserPortfolios(userId: number) {
		const rows = await db.select()
			.from(cybUserProtfolio)
			.where(and(
				eq(cybUserProtfolio.user, userId),
				eq(cybUserProtfolio.isDeleted, 0),
			))
			.orderBy(asc(cybUserProtfolio.sortOrder));
		return rows;
	}

	// ====== Follow ======

	async getFollowerCount(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followedId, userId),
				eq(cybFollow.isDeleted, 0),
			));
		return result.count;
	}

	async getFollowingCount(userId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followerId, userId),
				eq(cybFollow.isDeleted, 0),
			));
		return result.count;
	}

	async getFollowStatus(followerId: number, followedId: number) {
		const [row] = await db.select()
			.from(cybFollow)
			.where(and(
				eq(cybFollow.followerId, followerId),
				eq(cybFollow.followedId, followedId),
				eq(cybFollow.isDeleted, 0),
			));
		return !!row;
	}

	// ====== Rating ======

	async getOverallProfileScore(userId: number) {
		const [result] = await db.select({
			noofrecord: sql<number>`count(*)`,
			avgRating: sql<number>`COALESCE(AVG(${cybUserExperienceRating.rating}), 0)`,
		})
			.from(cybUserExperienceRating)
			.leftJoin(cybUserExperience, eq(cybUserExperienceRating.experience, cybUserExperience.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperienceRating.status, 1),
				eq(cybUserExperienceRating.isDeleted, 0),
			));
		return result;
	}

	// ====== People List ======

	async getUserExploringDetails(userId: number) {
		const [row] = await db.select({
			exploringDetails: cybUserDetails.exploringDetails,
		})
			.from(cybUserDetails)
			.where(eq(cybUserDetails.userId, userId));
		return row;
	}

	async getExploringUserList(ids: number[]) {
		if (ids.length === 0) return [];
		const rows = await db.select({
			id: cybUser.id,
			userType: cybUser.userType,
			individualId: cybUser.individualId,
			fname: cybUser.fname,
			lname: cybUser.lname,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			slug: cybUser.slug,
		})
			.from(cybUser)
			.where(and(
				inArray(cybUser.id, ids),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0),
			));
		return rows;
	}

	async getRandomUsers(excludeIds: number[], limit: number) {
		const conditions = [
			eq(cybUser.userType, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (excludeIds.length > 0) {
			conditions.push(sql`${cybUser.id} NOT IN ${excludeIds}`);
		}

		const rows = await db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			fname: cybUser.fname,
			lname: cybUser.lname,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			slug: cybUser.slug,
		})
			.from(cybUser)
			.where(and(...conditions))
			.orderBy(sql`RAND()`)
			.limit(limit);
		return rows;
	}

	async getRandomCompanies(excludeIds: number[], limit: number) {
		const conditions = [
			eq(cybUser.userType, 2),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (excludeIds.length > 0) {
			conditions.push(sql`${cybUser.id} NOT IN ${excludeIds}`);
		}

		const rows = await db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			fname: cybUser.fname,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			slug: cybUser.slug,
		})
			.from(cybUser)
			.where(and(...conditions))
			.orderBy(sql`RAND()`)
			.limit(limit);
		return rows;
	}

	async listAllUsers(keyword: string | undefined, limit: number, sqlOffset: number) {
		const conditions = [
			eq(cybUser.userType, 1),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
		];
		if (keyword && keyword.trim()) {
			const kw = `%${keyword.trim()}%`;
			conditions.push(sql`(
				${cybUser.fname} LIKE ${kw} OR
				${cybUser.lname} LIKE ${kw} OR
				${cybUser.fullName} LIKE ${kw} OR
				${cybUser.individualId} LIKE ${kw}
			)`);
		}

		const [countRow] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUser)
			.where(and(...conditions));

		const rows = await db.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			fname: cybUser.fname,
			lname: cybUser.lname,
			fullName: cybUser.fullName,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			slug: cybUser.slug,
			currentPossition: cybUser.currentPossition,
			city: cybUser.city,
			emailVerified: cybUser.emailVerified,
			phoneVerified: cybUser.phoneVerified,
		})
			.from(cybUser)
			.where(and(...conditions))
			.orderBy(desc(cybUser.id))
			.limit(limit)
			.offset(sqlOffset);

		return { rows, count: Number(countRow?.count ?? 0) };
	}
}

export default new commonAuthRepositery();
