import { and, asc, desc, eq, sql, like, ne, inArray, or, SQL } from 'drizzle-orm';
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
	cybUserPermission, cybUserGroup, cybUserUpdateExperienceHistory,
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
		if (data.company_size !== undefined) {
			const n = Number(data.company_size);
			setFields.companySize = Number.isFinite(n) ? n : data.company_size;
		}
		if (data.email !== undefined) setFields.email = data.email;
		if (data.phone !== undefined && data.phone !== '') setFields.phone = data.phone;
		if (data.secondPhone !== undefined) setFields.secondPhone = data.secondPhone || null;
		if (data.emailAlternate !== undefined) setFields.emailAlternate = data.emailAlternate || null;
		if (data.landline !== undefined) { /* landline goes to user_details */ }
		if (data.incorporate_date !== undefined) setFields.incorporateDate = data.incorporate_date;
		if (data.turnover !== undefined) {
			const n = Number(data.turnover);
			setFields.turnover = Number.isFinite(n) ? n : data.turnover;
		}
		if (data.profile_description !== undefined) setFields.profileDescription = data.profile_description;
		if (data.website !== undefined) setFields.website = data.website;
		if (data.industry !== undefined) {
			const n = Number(data.industry);
			setFields.industry = Number.isFinite(n) ? n : data.industry;
		}
		// Prefer new upload path; else keep existing S3 URL/path from body.profile
		if (data.profile !== undefined && data.profile !== '') {
			// Strip CDN prefix if FE sent full URL
			const p = String(data.profile);
			const uploadsIdx = p.indexOf('/uploads/');
			setFields.profile = uploadsIdx >= 0 ? p.slice(uploadsIdx + 1) : p.replace(/^https?:\/\/[^/]+\//, '');
		}

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

	// ====== Menu access (PHP checkMenuAccess) ======

	/**
	 * When login user is the company account → allow.
	 * Super-admin (user_group.id === 1) → allow.
	 * Else menu id must appear in user_group.menu_permission JSON for their permission row.
	 */
	async checkMenuAccess(
		loginUserId: number,
		companyId: number,
		menuId: number,
	): Promise<{ ok: boolean; message?: string }> {
		if (loginUserId === companyId) return { ok: true };

		const [perm] = await db
			.select({
				groupId: cybUserPermission.groupId,
				menuPermission: cybUserGroup.menuPermission,
				ugId: cybUserGroup.id,
			})
			.from(cybUserPermission)
			.leftJoin(cybUserGroup, eq(cybUserPermission.groupId, cybUserGroup.id))
			.where(and(
				eq(cybUserPermission.userId, loginUserId),
				eq(cybUserPermission.addedBy, companyId),
				eq(cybUserPermission.isDeleted, 0),
				eq(cybUserPermission.status, 1),
			))
			.limit(1);

		if (!perm) {
			return { ok: false, message: "You don't have permission to access this." };
		}
		// Super admin group row id === 1
		if (perm.ugId === 1 || perm.groupId === 1) return { ok: true };

		try {
			const raw = perm.menuPermission || '[]';
			const menus = JSON.parse(raw);
			const ids = Array.isArray(menus) ? menus.map(Number) : [];
			if (ids.includes(menuId)) return { ok: true };
		} catch {
			// fall through
		}
		return { ok: false, message: "You don't have permission to access this." };
	}

	// ====== All Connection (PHP MainModel::getAllCollections) ======

	private connectionKeywordCondition(keyword: string, us: typeof cybUser): SQL | undefined {
		const trimmed = keyword.trim();
		if (!trimmed) return undefined;
		const words = trimmed.split(/\s+/).filter(Boolean);
		const nameParts = words.map(
			(w) => sql`CONCAT(${us.fname}, ' ', ${us.lname}) LIKE ${`%${w}%`}`,
		);
		// individual_id: if "CC-123" use part after first dash, else whole keyword
		const dash = trimmed.indexOf('-');
		const indivFrag =
			dash >= 0 && trimmed.slice(dash + 1).length > 0
				? trimmed.slice(dash + 1)
				: trimmed;
		const indiv = sql`${us.individualId} LIKE ${`%${indivFrag}%`}`;
		return or(...nameParts, indiv);
	}

	private connectionOrder(sortBy: number | undefined | null, us: typeof cybUser) {
		// empty/missing → ue.id DESC; 1 fname ASC; 2 fname DESC; 3 create ASC; else create DESC
		if (sortBy == null || Number.isNaN(sortBy) || sortBy === 0) {
			return desc(cybUserExperience.id);
		}
		switch (sortBy) {
			case 1: return asc(us.fname);
			case 2: return desc(us.fname);
			case 3: return asc(cybUserExperience.createDate);
			default: return desc(cybUserExperience.createDate);
		}
	}

	/**
	 * type=1 current (still_working=1), else past (still_working=0).
	 * approved=1, status=1, is_deleted=0, GROUP BY user.
	 * limit null → count only (distinct users).
	 */
	async getAllCollections(
		companyId: number,
		opts: {
			keyword?: string;
			sortBy?: number | null;
			/** 1 = current, falsy = past */
			type?: 1 | null;
			limit?: number | null;
			sqlOffset?: number;
		},
	) {
		const stillWorking = opts.type === 1 ? 1 : 0;
		const conditions: SQL[] = [
			eq(cybUserExperience.company, companyId),
			eq(cybUserExperience.approved, 1),
			eq(cybUserExperience.stillWorking, stillWorking),
			eq(cybUserExperience.status, 1),
			eq(cybUserExperience.isDeleted, 0),
			eq(cybUser.isDeleted, 0),
			eq(cybUser.status, 1),
		];
		const kw = this.connectionKeywordCondition(opts.keyword || '', cybUser);
		if (kw) conditions.push(kw);

		// Count path (no limit): distinct users
		if (opts.limit == null) {
			const [row] = await db
				.select({
					count: sql<number>`COUNT(DISTINCT ${cybUser.id})`.mapWith(Number),
				})
				.from(cybUser)
				.innerJoin(cybUserExperience, eq(cybUserExperience.user, cybUser.id))
				.where(and(...conditions));
			return { rows: [] as any[], total: row?.count ?? 0 };
		}

		const orderClause = this.connectionOrder(opts.sortBy, cybUser);
		const rows = await db
			.select({
				user: cybUser.id,
				profile: cybUser.profile,
				socialImage: cybUser.socialImage,
				fname: cybUser.fname,
				lname: cybUser.lname,
				phone: cybUser.phone,
				email: cybUser.email,
				linkdin: cybUser.linkdin,
				youtube: cybUser.youtube,
				instagram: cybUser.instagram,
				facebook: cybUser.facebook,
				individualId: cybUser.individualId,
				slug: cybUser.slug,
				profileDescription: cybUser.profileDescription,
				dob: cybUser.dob,
				presentAddress: cybUser.presentAddress,
				onExplore: cybUser.onExplore,
				onImmediate: cybUser.onImmediate,
				onNotice: cybUser.onNotice,
				modifyDate: cybUser.modifyDate,
				accountCreateDate: cybUser.createDate,
				experienceId: cybUserExperience.id,
				stillWorking: cybUserExperience.stillWorking,
				approved: cybUserExperience.approved,
				connectiondate: cybUserExperience.createDate,
				joiningDate: cybUserExperience.joiningDate,
				workedTillDate: cybUserExperience.workedTillDate,
				designationName: cybDesignation.name,
			})
			.from(cybUser)
			.innerJoin(cybUserExperience, eq(cybUserExperience.user, cybUser.id))
			.innerJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.where(and(...conditions))
			.groupBy(cybUser.id)
			.orderBy(orderClause)
			.limit(opts.limit)
			.offset(opts.sqlOffset ?? 0);

		return { rows, total: rows.length };
	}

	/** @deprecated use getAllCollections — kept for callers */
	async getCurrentEmployees(
		companyId: number,
		keyword: string,
		sortBy: number,
		limit: number,
		sqlOffset: number,
	) {
		const { rows } = await this.getAllCollections(companyId, {
			keyword,
			sortBy,
			type: 1,
			limit,
			sqlOffset,
		});
		return rows;
	}

	async getPastEmployees(
		companyId: number,
		keyword: string,
		sortBy: number,
		limit: number,
		sqlOffset: number,
	) {
		const { rows } = await this.getAllCollections(companyId, {
			keyword,
			sortBy,
			type: null,
			limit,
			sqlOffset,
		});
		return rows;
	}

	async countCurrentEmployees(companyId: number, keyword = ''): Promise<number> {
		const { total } = await this.getAllCollections(companyId, {
			keyword,
			type: 1,
			limit: null,
		});
		return total;
	}

	async countPastEmployees(companyId: number, keyword = ''): Promise<number> {
		const { total } = await this.getAllCollections(companyId, {
			keyword,
			type: null,
			limit: null,
		});
		return total;
	}

	async checkInWishlist(companyId: number, userId: number) {
		const [row] = await db.select({ id: cybCompanyWishlist.id })
			.from(cybCompanyWishlist)
			.where(and(
				eq(cybCompanyWishlist.company, companyId),
				eq(cybCompanyWishlist.user, userId),
				eq(cybCompanyWishlist.status, 1),
			))
			.limit(1);
		return !!row;
	}

	async batchInWishlist(companyId: number, userIds: number[]): Promise<Set<number>> {
		const ids = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
		const set = new Set<number>();
		if (!ids.length) return set;
		const rows = await db
			.select({ user: cybCompanyWishlist.user })
			.from(cybCompanyWishlist)
			.where(and(
				eq(cybCompanyWishlist.company, companyId),
				inArray(cybCompanyWishlist.user, ids),
				eq(cybCompanyWishlist.status, 1),
			));
		for (const r of rows) {
			if (r.user != null) set.add(r.user);
		}
		return set;
	}

	/** PHP get_user_rating: SUM rating + COUNT (not average). */
	async getUserRating(userId: number) {
		const [result] = await db.select({
			noofrecord: sql<number>`count(*)`.mapWith(Number),
			rating: sql<number>`COALESCE(SUM(${cybUserExperienceRating.rating}), 0)`.mapWith(Number),
		})
			.from(cybUserExperienceRating)
			.leftJoin(cybUserExperience, eq(cybUserExperienceRating.experience, cybUserExperience.id))
			.where(and(
				eq(cybUserExperience.user, userId),
				eq(cybUserExperienceRating.status, 1),
				eq(cybUserExperienceRating.isDeleted, 0),
			));
		return {
			rating: result?.rating ?? 0,
			noofrecord: result?.noofrecord ?? 0,
		};
	}

	async batchUserRatings(userIds: number[]) {
		const map = new Map<number, { rating: number; noofrecord: number }>();
		const ids = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0))];
		for (const id of ids) map.set(id, { rating: 0, noofrecord: 0 });
		if (!ids.length) return map;

		const rows = await db
			.select({
				userId: cybUserExperience.user,
				noofrecord: sql<number>`count(*)`.mapWith(Number),
				rating: sql<number>`COALESCE(SUM(${cybUserExperienceRating.rating}), 0)`.mapWith(Number),
			})
			.from(cybUserExperienceRating)
			.innerJoin(cybUserExperience, eq(cybUserExperienceRating.experience, cybUserExperience.id))
			.where(and(
				inArray(cybUserExperience.user, ids),
				eq(cybUserExperienceRating.status, 1),
				eq(cybUserExperienceRating.isDeleted, 0),
			))
			.groupBy(cybUserExperience.user);

		for (const r of rows) {
			if (r.userId != null) {
				map.set(r.userId, { rating: r.rating ?? 0, noofrecord: r.noofrecord ?? 0 });
			}
		}
		return map;
	}

	// ====== All Employment ======

	async getCompanyExperienceList(companyId: number) {
		const expUser = alias(cybUser, 'expUser');
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
			certificate: cybUserExperience.certificate,
			approved: cybUserExperience.approved,
			status: cybUserExperience.status,
			lastReview: cybUserExperience.lastReview,
			createDate: cybUserExperience.createDate,
			designationName: cybDesignation.name,
			departmentName: cybDepartment.name,
			employmentTypeName: cybEmployementType.name,
			userFname: expUser.fname,
			userLname: expUser.lname,
			userProfile: expUser.profile,
			userSocialImage: expUser.socialImage,
			userSlug: expUser.slug,
			userIndividualId: expUser.individualId,
			userClaimStatus: expUser.claimStatus,
			userOnExplore: expUser.onExplore,
			userOnImmediate: expUser.onImmediate,
			userOnNotice: expUser.onNotice,
		})
			.from(cybUserExperience)
			.leftJoin(expUser, eq(cybUserExperience.user, expUser.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(cybDepartment, eq(cybUserExperience.department, cybDepartment.id))
			.leftJoin(cybEmployementType, eq(cybUserExperience.employmentType, cybEmployementType.id))
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.isDeleted, 0),
				eq(expUser.isDeleted, 0),
			))
			.orderBy(desc(cybUserExperience.id));
		return rows;
	}

	/**
	 * PHP get_basic_experience_update_list — no status/type filter on uue.
	 */
	async getBasicExperienceUpdateList(companyId: number) {
		const updUser = alias(cybUser, 'updUser');
		const newDs = alias(cybDesignation, 'newDs');
		const oldDs = alias(cybDesignation, 'oldDs');
		const rows = await db.select({
			id: cybUserUpdateExperience.id,
			experienceId: cybUserUpdateExperience.experienceId,
			user: cybUserUpdateExperience.user,
			salary: cybUserUpdateExperience.salary,
			salaryInhand: cybUserUpdateExperience.salaryInhand,
			salaryMode: cybUserUpdateExperience.salaryMode,
			designationId: cybUserUpdateExperience.designation,
			designation: newDs.name,
			workedTillDate: cybUserUpdateExperience.workedTillDate,
			status: cybUserUpdateExperience.status,
			type: cybUserUpdateExperience.type,
			createDate: cybUserUpdateExperience.createDate,
			modifyDate: cybUserUpdateExperience.modifyDate,
			userFname: updUser.fname,
			userLname: updUser.lname,
			userProfile: updUser.profile,
			userSocialImage: updUser.socialImage,
			userSlug: updUser.slug,
			userIndividualId: updUser.individualId,
			oldDesignation: oldDs.name,
			oldSalary: cybUserExperience.salary,
			lastReview: cybUserExperience.lastReview,
		})
			.from(cybUserUpdateExperience)
			.innerJoin(cybUserExperience, eq(cybUserUpdateExperience.experienceId, cybUserExperience.id))
			.leftJoin(updUser, eq(cybUserExperience.user, updUser.id))
			.leftJoin(newDs, eq(cybUserUpdateExperience.designation, newDs.id))
			.leftJoin(oldDs, eq(cybUserExperience.designation, oldDs.id))
			.where(and(
				eq(cybUserExperience.company, companyId),
				eq(cybUserExperience.isDeleted, 0),
				eq(cybUserUpdateExperience.isDeleted, 0),
			))
			.orderBy(desc(cybUserUpdateExperience.id));
		return rows;
	}

	/**
	 * PHP get_update_experience — COUNT rows join user_experience ↔ user_update_experience
	 * on user with experience_id match. >0 → request_type 3.
	 */
	async countUpdateExperienceForExperience(experienceId: number): Promise<number> {
		const [row] = await db
			.select({ count: sql<number>`count(*)`.mapWith(Number) })
			.from(cybUserExperience)
			.innerJoin(
				cybUserUpdateExperience,
				eq(cybUserExperience.user, cybUserUpdateExperience.user),
			)
			.where(eq(cybUserUpdateExperience.experienceId, experienceId));
		return row?.count ?? 0;
	}

	async batchCountUpdateExperience(experienceIds: number[]): Promise<Map<number, number>> {
		const map = new Map<number, number>();
		const ids = [...new Set(experienceIds.filter((id) => Number.isFinite(id) && id > 0))];
		for (const id of ids) map.set(id, 0);
		if (!ids.length) return map;

		const rows = await db
			.select({
				experienceId: cybUserUpdateExperience.experienceId,
				count: sql<number>`count(*)`.mapWith(Number),
			})
			.from(cybUserUpdateExperience)
			.innerJoin(
				cybUserExperience,
				and(
					eq(cybUserExperience.user, cybUserUpdateExperience.user),
					eq(cybUserUpdateExperience.experienceId, cybUserExperience.id),
				),
			)
			.where(inArray(cybUserUpdateExperience.experienceId, ids))
			.groupBy(cybUserUpdateExperience.experienceId);

		for (const r of rows) {
			map.set(r.experienceId, r.count ?? 0);
		}
		return map;
	}

	/**
	 * PHP get_employment_history — parent=0 rows + optional reply (parent = history.id).
	 */
	async getEmploymentHistory(experienceId: number) {
		const parents = await db
			.select({
				id: cybUserUpdateExperienceHistory.id,
				type: cybUserUpdateExperienceHistory.type,
				salary: cybUserUpdateExperienceHistory.salary,
				salaryInhand: cybUserUpdateExperienceHistory.salaryInhand,
				salaryMode: cybUserUpdateExperienceHistory.salaryMode,
				workedTillDate: cybUserUpdateExperienceHistory.workedTillDate,
				modifyDate: cybUserUpdateExperienceHistory.modifyDate,
				designation: cybUserUpdateExperienceHistory.designation,
				designationName: cybDesignation.name,
			})
			.from(cybUserUpdateExperienceHistory)
			.leftJoin(cybDesignation, eq(cybUserUpdateExperienceHistory.designation, cybDesignation.id))
			.where(and(
				eq(cybUserUpdateExperienceHistory.experienceId, experienceId),
				eq(cybUserUpdateExperienceHistory.parent, 0),
				eq(cybUserUpdateExperienceHistory.isDeleted, 0),
			))
			.orderBy(desc(cybUserUpdateExperienceHistory.id));

		if (!parents.length) return [];

		const parentIds = parents.map((p) => p.id);
		const replies = await db
			.select({
				id: cybUserUpdateExperienceHistory.id,
				parent: cybUserUpdateExperienceHistory.parent,
				type: cybUserUpdateExperienceHistory.type,
				salary: cybUserUpdateExperienceHistory.salary,
				salaryInhand: cybUserUpdateExperienceHistory.salaryInhand,
				salaryMode: cybUserUpdateExperienceHistory.salaryMode,
				workedTillDate: cybUserUpdateExperienceHistory.workedTillDate,
				modifyDate: cybUserUpdateExperienceHistory.modifyDate,
				designation: cybUserUpdateExperienceHistory.designation,
				designationName: cybDesignation.name,
			})
			.from(cybUserUpdateExperienceHistory)
			.leftJoin(cybDesignation, eq(cybUserUpdateExperienceHistory.designation, cybDesignation.id))
			.where(and(
				inArray(cybUserUpdateExperienceHistory.parent, parentIds),
				eq(cybUserUpdateExperienceHistory.isDeleted, 0),
			));

		const replyByParent = new Map<number, (typeof replies)[number]>();
		for (const r of replies) {
			if (r.parent != null && !replyByParent.has(r.parent)) {
				replyByParent.set(r.parent, r);
			}
		}

		return parents.map((p) => {
			const reply = replyByParent.get(p.id);
			return {
				type: p.type,
				designation_name: p.designationName || '',
				worked_till_date: p.workedTillDate,
				salary: p.salary,
				salary_inhand: p.salaryInhand,
				salary_mode: p.salaryMode,
				modify_date: p.modifyDate,
				approved: !!reply,
				reply: reply
					? {
							type: reply.type,
							designation_name: reply.designationName || '',
							salary: reply.salary,
							salary_inhand: reply.salaryInhand,
							salary_mode: reply.salaryMode,
							modify_date: reply.modifyDate,
							worked_till_date: reply.workedTillDate,
						}
					: {},
			};
		});
	}

	async getEmploymentHistoryByExperienceIds(experienceIds: number[]) {
		const map = new Map<number, Awaited<ReturnType<typeof this.getEmploymentHistory>>>();
		const ids = [...new Set(experienceIds.filter((id) => Number.isFinite(id) && id > 0))];
		await Promise.all(
			ids.map(async (id) => {
				map.set(id, await this.getEmploymentHistory(id));
			}),
		);
		return map;
	}

	/** @deprecated — rating list is built in service via reviewRepositery */
	async getEmploymentRating(experienceId: number) {
		const [result] = await db.select({
			noofrecord: sql<number>`count(*)`.mapWith(Number),
			avgRating: sql<number>`COALESCE(AVG(${cybUserExperienceRating.rating}), 0)`.mapWith(Number),
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
