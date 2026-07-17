import { and, asc, desc, eq, sql, like, ne, inArray } from 'drizzle-orm';
import { isEmpty, isEmptyArray } from '../utils/helpers';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybUser, cybUserDetails, cybUserExperience, cybUserUpdateExperience,
	cybCompanyWishlist, cybDesignation, cybDepartment, cybEmployementType,
	cybIndustries, cybCities, cybState, cybCountry, cybVerifyDocument,
	cybUserDomains, cybNotifications, cybUserExperienceRating,
	cybCompanySize, cybTurnover, cybAccomodation, cybWorkType,
	cybGender, cybNoticePeriod, cybAccountSetting,
	cybCompanyInvite, cybCompanyConnection, cybCompanyDocument,
} from '../db/schema';

class companyRepositery {
	async checkInvitationSend(companyId: number, userId: number): Promise<boolean> {
		const condition = [eq(cybCompanyInvite.addedBy, userId), eq(cybCompanyInvite.company, companyId)]
		const data = await db.select().from(cybCompanyInvite).where(and(...condition))
		if (!isEmpty(data)) {
			return true
		}
		return false
	}

	async checkInvitationSendByCompanyIds(companyIds: number[], userId: number): Promise<Set<number>> {
		if (isEmptyArray(companyIds)) return new Set();
		const invites = await db.select({ company: cybCompanyInvite.company })
			.from(cybCompanyInvite)
			.where(and(
				inArray(cybCompanyInvite.company, companyIds),
				eq(cybCompanyInvite.addedBy, userId),
			));
		return new Set(invites.map(i => i.company!));
	}

	async userApproveCompanyList(userId: number): Promise<Set<number>> {
		const rows = await db.select({ company: cybUserExperience.company })
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperience.approved, 1),
				eq(cybUserExperience.status, 1),
				eq(cybUserExperience.isDeleted, 0),
			));
		return new Set(rows.map(r => r.company!).filter(Boolean));
	}
	async findUserById(id: number) {
		const [user] = await db.select()
			.from(cybUser)
			.where(and(eq(cybUser.id, id), eq(cybUser.isDeleted, 0)));
		return user;
	}

	async checkWebsiteUnique(website: string, excludeId: number) {
		const [row] = await db.select({ id: cybUser.id })
			.from(cybUser)
			.where(and(
				eq(cybUser.website, website),
				ne(cybUser.id, excludeId),
				eq(cybUser.isDeleted, 0),
			));
		return !row;
	}

	async findIndustryByName(name: string) {
		const [row] = await db.select()
			.from(cybIndustries)
			.where(and(eq(cybIndustries.name, name), eq(cybIndustries.isDeleted, 0)));
		return row;
	}

	async createIndustry(name: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybIndustries).values({
			name,
			status: 1,
			userDefined: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async findCityByName(name: string) {
		const [row] = await db.select()
			.from(cybCities)
			.where(eq(cybCities.name, name));
		return row;
	}

	async createCity(name: string, stateId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybCities).values({
			name,
			state: stateId,
			status: 1,
			userDifined: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async updateCompanyProfile(userId: number, data: Record<string, any>) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const setFields: Record<string, any> = { modifyDate: now, claimStatus: 1, userType: 2 };

		if (data.company_name !== undefined) setFields.fname = data.company_name;
		if (data.contact_person !== undefined) setFields.contactPerson = data.contact_person;
		if (data.company_size !== undefined) setFields.companySize = data.company_size;
		if (data.email !== undefined) setFields.email = data.email;
		if (data.landline !== undefined) { /* landline goes to user_details */ }
		if (data.incorporate_date !== undefined) setFields.incorporateDate = data.incorporate_date;
		if (data.turnover !== undefined) setFields.turnover = data.turnover;
		if (data.profile_description !== undefined) setFields.profileDescription = data.profile_description;
		if (data.website !== undefined) setFields.website = data.website;
		if (data.industry !== undefined) setFields.industry = data.industry;
		if (data.profile !== undefined) setFields.profile = data.profile;

		await db.update(cybUser)
			.set(setFields)
			.where(eq(cybUser.id, userId));

		if (data.landline !== undefined) {
			const existing = await db.select()
				.from(cybUserDetails)
				.where(eq(cybUserDetails.userId, userId))
				.limit(1);

			if (existing.length > 0) {
				await db.update(cybUserDetails)
					.set({ landline: data.landline })
					.where(eq(cybUserDetails.userId, userId));
			} else {
				await db.insert(cybUserDetails).values({
					userId,
					landline: data.landline,
				});
			}
		}
	}

	async updateCompanyAddress(userId: number, data: Record<string, any>) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const setFields: Record<string, any> = { modifyDate: now };

		if (data.present_address !== undefined) setFields.presentAddress = data.present_address;
		if (data.permanent_address !== undefined) setFields.permanentAddress = data.permanent_address;
		if (data.country !== undefined) setFields.country = data.country;
		if (data.state !== undefined) setFields.state = data.state;
		if (data.city !== undefined) setFields.city = data.city;

		await db.update(cybUser)
			.set(setFields)
			.where(eq(cybUser.id, userId));

		if (data.latitude !== undefined || data.longitude !== undefined) {
			const existing = await db.select()
				.from(cybUserDetails)
				.where(eq(cybUserDetails.userId, userId))
				.limit(1);

			const detailFields: Record<string, any> = {};
			if (data.latitude !== undefined) detailFields.latitude = data.latitude;
			if (data.longitude !== undefined) detailFields.longitude = data.longitude;

			if (existing.length > 0) {
				await db.update(cybUserDetails)
					.set(detailFields)
					.where(eq(cybUserDetails.userId, userId));
			} else {
				await db.insert(cybUserDetails).values({
					userId,
					...detailFields,
				});
			}
		}
	}

	async updateCompanySocial(userId: number, data: Record<string, any>) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const setFields: Record<string, any> = { modifyDate: now };

		if (data.linkdin !== undefined) setFields.linkdin = data.linkdin;
		if (data.youtube !== undefined) setFields.youtube = data.youtube;
		if (data.instagram !== undefined) setFields.instagram = data.instagram;
		if (data.facebook !== undefined) setFields.facebook = data.facebook;
		if (data.twitter !== undefined) setFields.twitter = data.twitter;

		await db.update(cybUser)
			.set(setFields)
			.where(eq(cybUser.id, userId));
	}

	async updateVerifyDocument(userId: number) {
		await db.update(cybVerifyDocument)
			.set({ verify: 0 })
			.where(eq(cybVerifyDocument.userId, userId));
	}

	async insertUserDomain(userId: number, domain: string) {
		const existing = await db.select()
			.from(cybUserDomains)
			.where(and(
				eq(cybUserDomains.userId, userId),
				eq(cybUserDomains.domain, domain),
				eq(cybUserDomains.isDeleted, 0),
			));

		if (existing.length === 0) {
			const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
			await db.insert(cybUserDomains).values({
				userId,
				domain,
				isEmailBased: 0,
				domainModifyAt: now,
			});
		}
	}

	// ====== All Connection ======

	async getCurrentEmployees(companyId: number, keyword: string, sortBy: number, limit: number, offset: number) {
		const companyUser = alias(cybUser, 'empUser');
		const conditions = [
			eq(cybUserExperience.company, companyId),
			eq(cybUserExperience.approved, 1),
			eq(cybUserExperience.stillWorking, 1),
			eq(cybUserExperience.isDeleted, 0),
			eq(cybUser.isDeleted, 0),
			eq(cybUser.status, 1),
		];

		if (keyword) {
			conditions.push(sql`(${companyUser.fname} LIKE ${`%${keyword}%`} OR ${companyUser.individualId} LIKE ${`%${keyword}%`})`);
		}

		let orderClause;
		switch (sortBy) {
			case 1: orderClause = asc(companyUser.fname); break;
			case 2: orderClause = desc(companyUser.fname); break;
			case 3: orderClause = asc(cybUserExperience.createDate); break;
			default: orderClause = desc(cybUserExperience.createDate); break;
		}

		const rows = await db.select({
			user: companyUser.id,
			profile: companyUser.profile,
			socialImage: companyUser.socialImage,
			fname: companyUser.fname,
			lname: companyUser.lname,
			phone: companyUser.phone,
			email: companyUser.email,
			linkdin: companyUser.linkdin,
			individualId: companyUser.individualId,
			slug: companyUser.slug,
			profileDescription: companyUser.profileDescription,
			dob: companyUser.dob,
			presentAddress: companyUser.presentAddress,
			emailVerified: companyUser.emailVerified,
			phoneVerified: companyUser.phoneVerified,
			onExplore: companyUser.onExplore,
			onImmediate: companyUser.onImmediate,
			onNotice: companyUser.onNotice,
			experienceId: cybUserExperience.id,
			stillWorking: cybUserExperience.stillWorking,
			approved: cybUserExperience.approved,
			createDate: cybUserExperience.createDate,
			joiningDate: cybUserExperience.joiningDate,
			workedTillDate: cybUserExperience.workedTillDate,
			designationName: cybDesignation.name,
		})
			.from(cybUserExperience)
			.innerJoin(companyUser, eq(cybUserExperience.user, companyUser.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.where(and(...conditions))
			.orderBy(orderClause)
			.limit(limit)
			.offset(offset);
		return rows;
	}

	async getPastEmployees(companyId: number, keyword: string, sortBy: number, limit: number, offset: number) {
		const companyUser = alias(cybUser, 'pastEmpUser');
		const conditions = [
			eq(cybUserExperience.company, companyId),
			eq(cybUserExperience.approved, 1),
			eq(cybUserExperience.stillWorking, 0),
			eq(cybUserExperience.isDeleted, 0),
			eq(companyUser.isDeleted, 0),
			eq(companyUser.status, 1),
		];

		if (keyword) {
			conditions.push(sql`(${companyUser.fname} LIKE ${`%${keyword}%`} OR ${companyUser.individualId} LIKE ${`%${keyword}%`})`);
		}

		let orderClause;
		switch (sortBy) {
			case 1: orderClause = asc(companyUser.fname); break;
			case 2: orderClause = desc(companyUser.fname); break;
			case 3: orderClause = asc(cybUserExperience.createDate); break;
			default: orderClause = desc(cybUserExperience.createDate); break;
		}

		const rows = await db.select({
			user: companyUser.id,
			profile: companyUser.profile,
			socialImage: companyUser.socialImage,
			fname: companyUser.fname,
			lname: companyUser.lname,
			phone: companyUser.phone,
			email: companyUser.email,
			linkdin: companyUser.linkdin,
			individualId: companyUser.individualId,
			slug: companyUser.slug,
			profileDescription: companyUser.profileDescription,
			dob: companyUser.dob,
			presentAddress: companyUser.presentAddress,
			emailVerified: companyUser.emailVerified,
			phoneVerified: companyUser.phoneVerified,
			onExplore: companyUser.onExplore,
			onImmediate: companyUser.onImmediate,
			onNotice: companyUser.onNotice,
			experienceId: cybUserExperience.id,
			stillWorking: cybUserExperience.stillWorking,
			approved: cybUserExperience.approved,
			createDate: cybUserExperience.createDate,
			joiningDate: cybUserExperience.joiningDate,
			workedTillDate: cybUserExperience.workedTillDate,
			designationName: cybDesignation.name,
		})
			.from(cybUserExperience)
			.innerJoin(companyUser, eq(cybUserExperience.user, companyUser.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.where(and(...conditions))
			.orderBy(orderClause)
			.limit(limit)
			.offset(offset);
		return rows;
	}

	async countCurrentEmployees(companyId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.approved, 1),
				eq(cybUserExperience.stillWorking, 1),
				eq(cybUserExperience.isDeleted, 0),
			));
		return result.count;
	}

	async countPastEmployees(companyId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybUserExperience)
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.approved, 1),
				eq(cybUserExperience.stillWorking, 0),
				eq(cybUserExperience.isDeleted, 0),
			));
		return result.count;
	}

	async checkInWishlist(companyId: number, userId: number) {
		const [row] = await db.select()
			.from(cybCompanyWishlist)
			.where(and(
				eq(cybCompanyWishlist.company, companyId),
				eq(cybCompanyWishlist.user, userId),
				eq(cybCompanyWishlist.status, 1),
			));
		return !!row;
	}

	async getUserRating(userId: number) {
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

	// ====== All Employment ======

	async getCompanyExperienceList(companyId: number) {
		const companyUser = alias(cybUser, 'expUser');
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
			status: cybUserExperience.status,
			createDate: cybUserExperience.createDate,
			designationName: cybDesignation.name,
			departmentName: cybDepartment.name,
			employmentTypeName: cybEmployementType.name,
			userFname: companyUser.fname,
			userLname: companyUser.lname,
			userProfile: companyUser.profile,
			userSocialImage: companyUser.socialImage,
			userSlug: companyUser.slug,
			userIndividualId: companyUser.individualId,
			userEmailVerified: companyUser.emailVerified,
			userPhoneVerified: companyUser.phoneVerified,
			userOnExplore: companyUser.onExplore,
			userOnImmediate: companyUser.onImmediate,
			userOnNotice: companyUser.onNotice,
		})
			.from(cybUserExperience)
			.leftJoin(companyUser, eq(cybUserExperience.user, companyUser.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(cybDepartment, eq(cybUserExperience.department, cybDepartment.id))
			.leftJoin(cybEmployementType, eq(cybUserExperience.employmentType, cybEmployementType.id))
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.isDeleted, 0),
			))
			.orderBy(desc(cybUserExperience.id));
		return rows;
	}

	async getBasicExperienceUpdateList(companyId: number) {
		const companyUser = alias(cybUser, 'updUser');
		const rows = await db.select({
			id: cybUserUpdateExperience.id,
			experienceId: cybUserUpdateExperience.experienceId,
			user: cybUserUpdateExperience.user,
			salary: cybUserUpdateExperience.salary,
			salaryInhand: cybUserUpdateExperience.salaryInhand,
			salaryMode: cybUserUpdateExperience.salaryMode,
			designation: cybUserUpdateExperience.designation,
			workedTillDate: cybUserUpdateExperience.workedTillDate,
			status: cybUserUpdateExperience.status,
			type: cybUserUpdateExperience.type,
			createDate: cybUserUpdateExperience.createDate,
			userFname: companyUser.fname,
			userLname: companyUser.lname,
			userSlug: companyUser.slug,
			userIndividualId: companyUser.individualId,
			userEmailVerified: companyUser.emailVerified,
			userPhoneVerified: companyUser.phoneVerified,
		})
			.from(cybUserUpdateExperience)
			.leftJoin(companyUser, eq(cybUserUpdateExperience.user, companyUser.id))
			.leftJoin(cybUserExperience, eq(cybUserUpdateExperience.experienceId, cybUserExperience.id))
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserUpdateExperience.status, 1),
				eq(cybUserUpdateExperience.isDeleted, 0),
				eq(cybUserUpdateExperience.type, 1),
			))
			.orderBy(desc(cybUserUpdateExperience.id));
		return rows;
	}

	async getEmploymentRating(experienceId: number) {
		const [result] = await db.select({
			noofrecord: sql<number>`count(*)`,
			avgRating: sql<number>`COALESCE(AVG(${cybUserExperienceRating.rating}), 0)`,
		})
			.from(cybUserExperienceRating)
			.where(and(
				eq(cybUserExperienceRating.experience, experienceId),
				eq(cybUserExperienceRating.status, 1),
				eq(cybUserExperienceRating.isDeleted, 0),
			));
		return result;
	}

	// ====== Update Employment ======

	async approveEmployment(companyId: number, experienceId: number) {
		const result = await db.update(cybUserExperience)
			.set({ approved: 1 })
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.id, experienceId),
			));
		return result;
	}

	async getExperienceById(experienceId: number) {
		const companyUser = alias(cybUser, 'detailCompany');
		const [row] = await db.select({
			id: cybUserExperience.id,
			user: cybUserExperience.user,
			company: cybUserExperience.company,
			designation: cybUserExperience.designation,
			companyName: companyUser.fname,
			companyProfile: companyUser.profile,
			companySocialImage: companyUser.socialImage,
		})
			.from(cybUserExperience)
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.where(eq(cybUserExperience.id, experienceId))
			.limit(1);
		return row;
	}

	async getUserCurrentCompany(userId: number) {
		const [row] = await db.select({
			currentCompany: cybUser.currentCompany,
			currentPossition: cybUser.currentPossition,
		})
			.from(cybUser)
			.where(eq(cybUser.id, userId))
			.limit(1);
		return row;
	}

	async updateUserCurrentPosition(userId: number, companyId: number, designation: number) {
		await db.update(cybUser)
			.set({ currentCompany: companyId, currentPossition: designation })
			.where(eq(cybUser.id, userId));
	}

	async createNotification(sender: number, receiver: number, message: string, link: string, redirect: string, type: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.insert(cybNotifications).values({
			sender,
			receiver,
			message,
			link,
			redirect,
			type,
			createDate: now,
			modifyDate: now,
		});
	}

	// ====== All Wishlist ======

	async getWishlist(companyId: number) {
		const rows = await db.select({
			id: cybCompanyWishlist.id,
			user: cybCompanyWishlist.user,
			createDate: cybCompanyWishlist.createDate,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			fname: cybUser.fname,
			lname: cybUser.lname,
			currentCompany: cybUser.currentCompany,
			currentPossition: cybUser.currentPossition,
			designationName: cybDesignation.name,
		})
			.from(cybCompanyWishlist)
			.leftJoin(cybUser, eq(cybCompanyWishlist.user, cybUser.id))
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.where(and(
				eq(cybCompanyWishlist.company, companyId),
				eq(cybCompanyWishlist.status, 1),
			))
			.orderBy(desc(cybCompanyWishlist.id));
		return rows;
	}

	async getCompanyName(userId: number) {
		const [row] = await db.select({ fname: cybUser.fname })
			.from(cybUser)
			.where(eq(cybUser.id, userId))
			.limit(1);
		return row;
	}

	// ====== Connection / Wishlist / Company Document writes ======

	async findConnection(companyId: number, userId: number) {
		const [row] = await db.select()
			.from(cybCompanyConnection)
			.where(and(
				eq(cybCompanyConnection.company, companyId),
				eq(cybCompanyConnection.user, userId),
				eq(cybCompanyConnection.status, 1),
			))
			.limit(1);
		return row;
	}

	async createConnection(data: {
		company: number;
		user: number;
		currentEmployee?: number;
	}) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybCompanyConnection).values({
			company: data.company,
			user: data.user,
			currentEmployee: data.currentEmployee ?? 0,
			status: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async createWishlist(companyId: number, userId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybCompanyWishlist).values({
			company: companyId,
			user: userId,
			status: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async softDeleteWishlist(id: number, companyId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const result = await db.update(cybCompanyWishlist)
			.set({ status: 0, modifyDate: now })
			.where(and(
				eq(cybCompanyWishlist.id, id),
				eq(cybCompanyWishlist.company, companyId),
				eq(cybCompanyWishlist.status, 1),
			));
		return result;
	}

	async findWishlistById(id: number, companyId: number) {
		const [row] = await db.select()
			.from(cybCompanyWishlist)
			.where(and(
				eq(cybCompanyWishlist.id, id),
				eq(cybCompanyWishlist.company, companyId),
				eq(cybCompanyWishlist.status, 1),
			))
			.limit(1);
		return row;
	}

	async createCompanyDocument(companyId: number, doctype: string | number, docName: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybCompanyDocument).values({
			company: companyId,
			doctype: String(doctype),
			docName,
			status: 0,
			verify: 0,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}
}

export default new companyRepositery();
