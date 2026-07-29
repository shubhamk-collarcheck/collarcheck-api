import { ConflictError, NotFoundError, BadRequestError } from '../middlewares/errorHandler';
import generalRepositery from '../repositery/general.repositery';
import institutionRepositery from '../repositery/institution.repositery';
import courseRepositery from '../repositery/course.repositery';
import departmentRepositery from '../repositery/department.repositery';
import designationRepositery from '../repositery/designation.repositery';
import skillRepositery from '../repositery/skill.repositery';
import employmentRepositery from '../repositery/employee.repositery';
import { get_empoyee_designation_service, get_industry_list_service, get_state_by_employees_service, get_state_by_id_service, get_employee_department_service, get_skill_list_service, get_course_list_service, get_user_skill_service, get_user_experience_skill_service } from './job.service';
import { allEmploymentType } from '../controllers/general.controller';
import { user_verified } from './users.service';

const s3Prefix = process.env.S3_PREFIX || '';

export const getCitiesService = async (state?: number) => {
	return generalRepositery.getCities(state);
};

export const getCitiesByIdService = async (stateId?: number) => {
	return generalRepositery.getCitiesIdName(stateId);
};

export const getStatesService = async (country?: number) => {
	return generalRepositery.getStates(country);
};

function withImageUrl(image: string | null | undefined) {
	return image ? `${s3Prefix}${image}` : '';
}

function withProfileUrl(profile: string | null | undefined, socialImage: string | null | undefined) {
	return profile ? `${s3Prefix}${profile}` : (socialImage || '');
}

export const getCountriesService = async () => {
	const countryData = await generalRepositery.getActiveCountries();
	// PHP: force India (id=101) first
	return [...countryData.filter(c => c.id === 101), ...countryData.filter(c => c.id !== 101)];
};

export const getTurnoverService = async () => {
	return generalRepositery.getActiveTurnovers();
};

export const getNoticePeriodService = async (type?: string) => {
	return generalRepositery.getActiveNoticePeriods(type);
};

export const getCompanySizeService = async () => {
	return generalRepositery.getActiveCompanySizes();
};

export const getIndustriesService = async () => {
	return generalRepositery.getActiveIndustries(30);
};

export const getSalaryService = async () => {
	return generalRepositery.getActiveSalaries();
};

export const getBenefitsService = async () => {
	const rows = await generalRepositery.getActiveBenefits();
	return rows.map(r => ({
		id: r.id,
		name: r.name,
		image: withImageUrl(r.image),
	}));
};

export const getRoleTypesService = async () => {
	return generalRepositery.getActiveRoleTypes();
};

export const getJobExperienceService = async () => {
	return generalRepositery.getActiveJobExperiences();
};

export const getAccomodationService = async () => {
	return generalRepositery.getActiveAccomodations();
};

export const getTagsService = async () => {
	return generalRepositery.getActiveTags();
};

export const getLanguagesService = async () => {
	return generalRepositery.getActiveLanguages();
};

export const getCoursesService = async () => {
	const rows = await courseRepositery.getActiveList(30);
	return rows.map(row => ({
		id: row.id,
		name: row.name,
		image: withImageUrl(row.image),
	}));
};

export const getCourseTypesService = async () => {
	return courseRepositery.getActiveCourseTypes();
};

export const getInstitutionsService = async () => {
	const rows = await institutionRepositery.getActiveList(30);
	return rows.map(row => ({
		id: row.id,
		name: row.name,
		image: withImageUrl(row.image),
	}));
};

export const getEducationDataService = async () => {
	const [institutionList, courseList, courseTypeList, countryList] = await Promise.all([
		getInstitutionsService(),
		getCoursesService(),
		getCourseTypesService(),
		getCountriesService(),
	]);
	return { institutionList, courseList, courseTypeList, countryList };
};


export const getAllDesignationService = async () => {
	return designationRepositery.getRandomActive(30);
};


export const allSkillService = async () => {
	return skillRepositery.getRandomActive(30);
}

export const jobTypeService = async () => {
	return generalRepositery.getActiveJobModes();
}


export const allDepartmentService = async () => {
	return departmentRepositery.getRandomActive(30);
}

export const allCourseTypeService = async () => {
	return courseRepositery.getActiveCourseTypes();
}

export const allEmploymentTypeService = async () => {
	return generalRepositery.getActiveEmploymentTypes();
}


export const allWorkTypeService = async () => {
	return generalRepositery.getActiveWorkTypes();
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



/** Fisher–Yates shuffle (mutates copy) — pure business helper, not DB */
function shuffleInPlace<T>(arr: T[]): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

/**
 * PHP FrontModel tier-shuffle: pool ordered by total_employment DESC,
 * split into 3 tiers, shuffle each, merge, take first N.
 */
function tierShuffleTake<T>(pool: T[], take: number): T[] {
	if (pool.length === 0) return [];
	const tierSize = Math.ceil(pool.length / 3);
	const top = shuffleInPlace(pool.slice(0, tierSize));
	const mid = shuffleInPlace(pool.slice(tierSize, tierSize * 2));
	const low = shuffleInPlace(pool.slice(tierSize * 2));
	return [...top, ...mid, ...low].slice(0, take);
}

export const employmentListService = async (id?: string) => {
	const [
		designationList,
		departmentList,
		salaryList,
		skillList,
		employementTypeList,
		companyPool,
		userCount,
	] = await Promise.all([
		getAllDesignationService(),
		allDepartmentService(),
		getSalaryService(),
		allSkillService(),
		allEmploymentTypeService(),
		generalRepositery.getDefaultCompanyPool(30),
		generalRepositery.countActiveEmployees(),
	]);

	const companyRows = tierShuffleTake(companyPool, 10);
	const userOffset = userCount > 10 ? Math.floor(Math.random() * (userCount - 10 + 1)) : 0;
	const userRows = await generalRepositery.getDefaultUserList(10, userOffset);

	const companyIds = companyRows.map((c) => c.id);
	const activeJobIds = await generalRepositery.getActiveJobCompanyIds(companyIds);
	const activeJobCompanySet = new Set(activeJobIds);

	const companyList: Array<Record<string, unknown>> = [];
	for (const c of companyRows) {
		companyList.push({
			id: c.id,
			individual_id: c.individualId,
			company_logo: withProfileUrl(c.profile, c.socialImage),
			company: c.fname,
			contact_person: c.contactPerson,
			city_name: c.cityName ?? null,
			state_name: c.stateName ?? null,
			industry_name: c.industryName ?? null,
			is_verified: await user_verified(c.id),
			exploreTalent: activeJobCompanySet.has(c.id) ? 1 : 0,
			total_employment: Number(c.totalEmployment) || 0,
		});
	}

	const userList: Array<Record<string, unknown>> = [];
	for (const u of userRows) {
		userList.push({
			id: u.id,
			individual_id: u.individualId,
			profile: withProfileUrl(u.profile, u.socialImage),
			name: u.fullName,
			slug: u.slug,
			designation_name: u.designationName ?? null,
			company_name: u.companyName ?? null,
			userRating: await employmentRepositery.getOverallProfileRating(u.id),
			is_verified: await user_verified(u.id),
		});
	}

	// Optional ?id= prepend (partial objects — PHP shape)
	// Prefer Zod-validated query in the controller; here accept number or numeric string from route.
	if (id != null && id !== '') {
		const parsedId = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
		if (Number.isFinite(parsedId)) {
			const currUser = await generalRepositery.getUserForEmploymentPrepend(parsedId);
			if (currUser) {
				if (currUser.userType === 1) {
					userList.push({
						id: currUser.id,
						individual_id: currUser.individualId,
						profile: withProfileUrl(currUser.profile, currUser.socialImage),
						name: `${currUser.fname || ''} ${currUser.lname || ''}`.trim(),
					});
				} else {
					companyList.push({
						id: currUser.id,
						individual_id: currUser.individualId,
						company_logo: withProfileUrl(currUser.profile, currUser.socialImage),
						company: currUser.fname,
						contact_person: currUser.contactPerson,
					});
				}
			}
		}
	}

	const data: Record<string, unknown> = {
		designationList,
		departmentList,
		salaryList,
		skillList: skillList || [],
		employementTypeList, // legacy typo — do not rename
	};

	if (companyList.length > 0) data.companyList = companyList;
	if (userList.length > 0) data.userList = userList;

	return data;
}


export const jobFilterDataListService = async (slug?: string, type?: string) => {
	const empty = {
		countryList: [], stateList: [], cityList: [], designationList: [],
		departmentList: [], skillList: [], industryList: [], salaryList: [],
		jobExperienceList: [], companyList: [], roleTypeList: [],
		company_benefit: [], jobModeList: [],
	};
	if (!slug) return empty;

	const meta = await generalRepositery.getJobMetaBySlug(slug);
	if (!meta) return empty;

	const countryIds = meta.countryId ? String(meta.countryId).split(',').map(Number).filter(Boolean) : [];
	const stateIds = meta.stateId ? String(meta.stateId).split(',').map(Number).filter(Boolean) : [];
	const cityIds = meta.cityId ? String(meta.cityId).split(',').map(Number).filter(Boolean) : [];

	const jobRows = await generalRepositery.getJobsForFilter(countryIds, stateIds, cityIds);

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
			} catch { /* ignore bad skill JSON */ }
		}
	}

	const [
		countryList, stateList, cityList, designationList, departmentList,
		skillList, industryList, salaryList, jobExperienceList, companyList,
		roleTypeList, jobModeList, company_benefit,
	] = await Promise.all([
		countryIds.length > 0
			? generalRepositery.getCountriesByIds(countryIds)
			: getCountriesService(),
		stateIds.length > 0
			? get_state_by_id_service(stateIds)
			: generalRepositery.getStatesByIds(stateIds.length > 0 ? stateIds : [0]),
		cityIds.length > 0
			? generalRepositery.getCitiesByIds(cityIds)
			: generalRepositery.getCitiesSample(100),
		uniqueDesignations.length > 0
			? generalRepositery.getDesignationsByIds(uniqueDesignations)
			: getAllDesignationService(),
		uniqueDepartments.length > 0
			? generalRepositery.getDepartmentsByIds(uniqueDepartments)
			: allDepartmentService(),
		allSkillIds.size > 0
			? get_skill_list_service([...allSkillIds])
			: allSkillService(),
		uniqueIndustries.length > 0
			? generalRepositery.getIndustriesByIds(uniqueIndustries)
			: getIndustriesService(),
		uniqueSalaries.length > 0
			? generalRepositery.getSalariesByIds(uniqueSalaries)
			: getSalaryService(),
		uniqueExperiences.length > 0
			? generalRepositery.getJobExperiencesByIds(uniqueExperiences)
			: getJobExperienceService(),
		uniqueCompanies.length > 0
			? generalRepositery.getCompanyNamesByIds(uniqueCompanies)
			: generalRepositery.getCompanyNamesSample(30),
		uniqueRoleTypes.length > 0
			? generalRepositery.getRoleTypesByIds(uniqueRoleTypes)
			: getRoleTypesService(),
		uniqueJobModes.length > 0
			? generalRepositery.getJobModesByIds(uniqueJobModes)
			: jobTypeService(),
		generalRepositery.getBenefitsUsedByCompanies(),
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
	return generalRepositery.getExperienceReviews(employmentId, order);
}


export const starRatingEmployeesService = async (star: number) => {
	const usersWithRating = await generalRepositery.getEmployeesForStarRating(50);

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
	const invite = await generalRepositery.getCompanyInviteById(Number(token));
	if (!invite) return null;

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
	await generalRepositery.insertSuggestion({
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
	_filters: Record<string, any> = {},
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
		const { rows, count } = await generalRepositery.searchCompanies(keyword, limit, offset);
		results.companyList = rows.map(c => ({
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
		results.companyListCount = count;
	}

	if (!type || type === 'employees') {
		const { rows, count } = await generalRepositery.searchEmployees(keyword, limit, offset);
		results.userList = rows.map(u => ({
			id: u.id,
			name: u.fullName,
			slug: u.slug,
			profile: u.profile ? `${s3Prefix}${u.profile}` : (u.socialImage || ''),
			userRating: u.percentage || 0,
			is_verified: (u.emailVerified || u.phoneVerified) ? 1 : 0,
			designation_name: u.designationName,
			company_name: u.companyName,
		}));
		results.userListCount = count;
	}

	if (!type || type === 'jobs') {
		const { rows, count } = await generalRepositery.searchJobs(keyword, limit, offset);
		results.jobList = rows.map(j => ({
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
		results.jobListCount = count;
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
// PHP inverted naming: followed_id = initiator, follower_id = target

type FollowListRow = Awaited<ReturnType<typeof generalRepositery.getFollowerList>>[number];

function pageToSqlOffset(page: number, limit: number): number {
	return page <= 1 ? 0 : page * limit - limit;
}

async function mapFollowCard(row: FollowListRow, actingUserId: number) {
	const remoteUserId = row.userId;
	const userType = row.userType ?? 1;
	const isVerified = await user_verified(remoteUserId);
	const followBack = await generalRepositery.checkFollowBack(actingUserId, remoteUserId);

	const profile = row.profile ? `${s3Prefix}${row.profile}` : (row.socialImage || null);
	const name = userType === 2
		? (row.fname || '')
		: `${row.fname || ''} ${row.lname || ''}`.trim();

	const base: Record<string, unknown> = {
		id: row.id,
		individual_id: row.individualId ?? null,
		name,
		profile,
		slug: row.slug || '',
		user_type: userType,
		user_id: remoteUserId,
		is_verified: !!isVerified,
		state_name: row.stateName ?? null,
		country_name: row.countryName ?? null,
		followBack,
		create_date: row.createDate ?? null,
		notice_date: row.noticeDate ?? null,
	};

	if (userType === 1) {
		const onExplore = row.onExplore === 1 ? 1 : 0;
		const today = new Date().toISOString().slice(0, 10);
		const noticeDate = row.noticeDate ? row.noticeDate.slice(0, 10) : null;
		base.designation_name = row.designationName ?? null;
		base.on_explore = onExplore;
		base.on_immediate = onExplore === 1 && row.onImmediate === 1 ? 1 : 0;
		base.on_notice = onExplore === 1 && noticeDate && noticeDate > today ? 1 : 0;
	} else {
		base.industry_name = row.industryName ?? null;
		base.exploreTalent = await generalRepositery.companyHasActiveJobs(remoteUserId);
	}

	return base;
}

/** limit/offset already Zod-coerced numbers from followDataListGeneralQuerySchema */
export const followDataListGeneralService = async (
	userId: number,
	limit = 50,
	offsetPage = 0,
) => {
	const sqlOffset = pageToSqlOffset(offsetPage, limit);

	const [followers, following, followerCount, followingCount] = await Promise.all([
		generalRepositery.getFollowerList(userId, limit, sqlOffset),
		generalRepositery.getFollowingList(userId, limit, sqlOffset),
		generalRepositery.countFollowerList(userId),
		generalRepositery.countFollowingList(userId),
	]);

	const [followerList, followingList] = await Promise.all([
		Promise.all(followers.map((f) => mapFollowCard(f, userId))),
		Promise.all(following.map((f) => mapFollowCard(f, userId))),
	]);

	return {
		status: true,
		messages: "Follow Data List",
		data: {
			followerList,
			followerCount,
			followingList,
			followingCount,
		},
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

// ====== Logout (GET /wapi/logout) ======

export const logoutService = async (
	userId: number,
	meta?: { ip?: string; userAgent?: string }
) => {
	const now = new Date().toISOString().slice(0, 19).replace("T", " ");
	await generalRepositery.clearUserToken(userId, now);
	await generalRepositery.insertLoginHistory({
		userId,
		ipAddress: meta?.ip || null,
		userAgent: meta?.userAgent || "",
		logoutAt: now,
	});

	return { status: true, message: "Logged out successfully" };
};

// ====== Unfollow (Endpoint #16) ======
// Acting user stops following target: row followed_id=me, follower_id=target, status=1

export const unfollowService = async (userId: number, targetUserId: number) => {
	if (!targetUserId) {
		return { status: false, messages: "Id Required" };
	}

	const follow = await generalRepositery.findFollowRelationship(userId, targetUserId, true);
	if (!follow) {
		return { status: false, messages: "you can't unfollow you are not following yet!" };
	}

	try {
		await generalRepositery.softDeleteFollowByRowId(follow.id);
		return { status: true, messages: "Unfollowed Successfully!" };
	} catch {
		return { status: false, messages: "Something went wrong!" };
	}
};

// ====== Remove Follower (Endpoint #17) ======
// Acting user removes initiator: row follower_id=me, followed_id=path id

export const removeFollowerService = async (userId: number, initiatorUserId: number) => {
	if (!initiatorUserId) {
		return { status: false, messages: "Id Required" };
	}

	const follow = await generalRepositery.findFollowRelationship(initiatorUserId, userId, false);
	if (!follow) {
		return { status: false, messages: "you can't unfollow you are not follower yet!" };
	}

	try {
		await generalRepositery.softDeleteFollowByRowId(follow.id);
		return { status: true, messages: "Unfollowed Successfully!" };
	} catch {
		return { status: false, messages: "Something went wrong!" };
	}
};

// ====== Multi Unfollow (Endpoint #18) ======
// body.id[] = target user ids; no status=1 filter (unlike single unfollow)

export const multiUnfollowService = async (userId: number, ids: number[]) => {
	if (!ids || ids.length === 0) {
		return { status: false, messages: "Id Required" };
	}

	try {
		for (const targetId of ids) {
			const follow = await generalRepositery.findFollowRelationship(userId, targetId, false);
			if (!follow) {
				return { status: false, messages: "you can't unfollow you are not following yet!" };
			}
			await generalRepositery.softDeleteFollowByRowId(follow.id);
		}
		return { status: true, messages: "Unfollowed Successfully!" };
	} catch {
		return { status: false, messages: "Something went wrong!" };
	}
};

// ====== Multi Remove Follower (Endpoint #19) ======
// body.id[] = initiator user ids

export const multiRemoveFollowerService = async (userId: number, ids: number[]) => {
	if (!ids || ids.length === 0) {
		return { status: false, messages: "Id Required" };
	}

	try {
		for (const initiatorId of ids) {
			const follow = await generalRepositery.findFollowRelationship(initiatorId, userId, false);
			if (!follow) {
				return { status: false, messages: "you can't unfollow you are not follower yet!" };
			}
			await generalRepositery.softDeleteFollowByRowId(follow.id);
		}
		return { status: true, messages: "Unfollowed Successfully!" };
	} catch {
		return { status: false, messages: "Something went wrong!" };
	}
};

// ====== Follow (POST) ======
// Body follower_id = target. Insert: followed_id=me, follower_id=target

export const followUserService = async (currentUserId: number, targetUserId: number) => {
	if (!targetUserId) {
		return { status: false, messages: "The follower id field is required." };
	}

	const target = await generalRepositery.getUserById(targetUserId);
	if (!target) {
		return { status: false, messages: "Invalid Follwer Id" };
	}

	const existing = await generalRepositery.findFollowRelationship(currentUserId, targetUserId, false);
	if (existing) {
		return { status: false, messages: "Already Followed" };
	}

	// Company targets auto-accept; employees stay pending (status 0)
	const status = target.userType === 2 ? 1 : 0;

	try {
		await generalRepositery.createFollow({
			followedId: currentUserId,
			followerId: targetUserId,
			status,
		});
		return { status: true, messages: "Request Send successfully!" };
	} catch {
		return { status: false, messages: "Request not Send please retry!" };
	}
};

export const acceptFollowService = async (userId: number, followId: number) => {
	if (!followId) {
		return { status: false, messages: "Invalid Id" };
	}

	const follow = await generalRepositery.findFollowById(followId);
	if (!follow) {
		return { status: false, messages: "Invalid Id" };
	}

	// Recipient is follower_id (target of the follow request)
	if (follow.followerId !== userId) {
		return { status: false, messages: "Invalid request!" };
	}

	try {
		await generalRepositery.acceptFollow(followId);
		return { status: true, messages: "followed Successfully!" };
	} catch {
		return { status: false, messages: "Something went wrong!" };
	}
};

export const rejectFollowService = async (userId: number, followId: number) => {
	if (!followId) {
		return { status: false, messages: "Invalid Id" };
	}

	const follow = await generalRepositery.findFollowById(followId);
	if (!follow) {
		return { status: false, messages: "Invalid Id" };
	}

	if (follow.followerId !== userId) {
		return { status: false, messages: "Invalid Reject request !" };
	}

	try {
		await generalRepositery.rejectFollow(followId);
		return { status: true, messages: "Reject Successfully!" };
	} catch {
		return { status: false, messages: "Something went wrong!" };
	}
};

export const multiAcceptFollowService = async (userId: number, ids: number[]) => {
	if (!ids || ids.length === 0) {
		return { status: false, messages: "id Required!" };
	}

	for (const id of ids) {
		const result = await acceptFollowService(userId, id);
		if (!result.status) {
			return result;
		}
	}
	return { status: true, messages: "followed Successfully!" };
};

export const multiRejectFollowService = async (userId: number, ids: number[]) => {
	if (!ids || ids.length === 0) {
		return { status: false, messages: "id Required!" };
	}

	for (const id of ids) {
		const result = await rejectFollowService(userId, id);
		if (!result.status) {
			return result;
		}
	}
	return { status: true, messages: "Reject Successfully!" };
};

export const deleteMessageService = async (
	userId: number,
	messageHistoryId: number,
	userType?: string
) => {
	if (!userType || (userType !== 'user' && userType !== 'company')) {
		return { status: false, messages: "User Type required ad should be user or company " };
	}

	const row = await generalRepositery.findMessageHistoryByIdAny(messageHistoryId);
	if (!row) {
		return { status: false, messages: "No Message Found" };
	}

	if (row.sender !== userId && row.receiver !== userId) {
		return { status: false, messages: "Access denied" };
	}

	try {
		await generalRepositery.softDeleteMessageHistory(messageHistoryId);
		return { status: true, messages: " Deleted Sucessfully" };
	} catch {
		return { status: false, messages: "Try again something went wrong " };
	}
};

export const skillByCategoryService = async (categoryId: number) => {
	const rows = await skillRepositery.findByCategory(categoryId);
	return {
		status: true,
		messages: "",
		data: rows.map((r) => ({
			id: r.id,
			department: r.department ?? categoryId,
			name: r.name,
		})),
	};
};
