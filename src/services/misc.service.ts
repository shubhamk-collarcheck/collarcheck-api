import miscRepositery from '../repositery/misc.repositery';
import { BadRequestError } from '../middlewares/errorHandler';

const s3Prefix = process.env.S3_PREFIX || '';

// ====== 1. Mark Viewed ======

export async function markViewedService(userId: number, notifId: number) {
	const result = await miscRepositery.markNotificationViewed(userId, notifId);
	if (result[0]?.affectedRows === 0) {
		return { status: false, messages: "Invalid notification id!" };
	}
	return { status: true, messages: "Successfully updated" };
}

// ====== 2. Sidebar Count ======

export async function sidebarCountService(userId: number) {
	const [unreadNotifications, unreandMessageCount] = await Promise.all([
		miscRepositery.getUnreadNotifications(userId),
		miscRepositery.countUnreadMessages(userId),
	]);

	return {
		status: true,
		messages: "Success!",
		data: {
			notification_count: unreadNotifications.length,
			notifications: unreadNotifications.map((n) => ({
				id: n.id,
				sender: n.sender,
				sender_name: n.senderName,
				sender_profile: n.senderProfile ? `${s3Prefix}${n.senderProfile}` : (n.senderSocialImage || ''),
				message: n.message,
				type: n.type,
				is_viewed: n.isViewed,
				create_date: n.createDate,
			})),
			unreandMessageCount,
		},
	};
}

// ====== 3. Leave Reminder Experience ======

export async function leaveReminderExperienceService(userId: number) {
	const user = await miscRepositery.findUserById(userId);
	if (!user) {
		return { status: false, messages: "Access denied" };
	}
	await miscRepositery.setcvPop(userId);
	return { status: true, messages: "Success!" };
}

// ====== 4. Hired ======

export async function hiredService(userId: number) {
	const user = await miscRepositery.findUserById(userId);
	if (!user) {
		return { status: false, messages: "Access denied" };
	}
	const alreadyHired = await miscRepositery.countUserExperiences(userId);
	return { status: true, messages: "Success!", already_hired: alreadyHired };
}

// ====== 5. Save Exploring ======

export async function saveExploringService(userId: number, data: {
	exploring_option?: string;
	on_immediate?: number;
	on_notice?: number;
	notice_period?: number;
	notice_date?: string;
	expected_salary?: string;
	expected_inhand?: string;
	expected_mode?: string;
	notice_employments?: number[];
}) {
	const user = await miscRepositery.findUserById(userId);
	if (!user) {
		return { status: false, messages: "Access denied" };
	}

	const noticeEmploymentsJson = data.notice_employments
		? JSON.stringify(data.notice_employments)
		: undefined;

	await miscRepositery.saveExploring(userId, {
		exploringOption: data.exploring_option,
		onImmediate: data.on_immediate,
		onNotice: data.on_notice,
		noticePeriod: data.notice_period,
		noticeDate: data.notice_date,
		expectedSalary: data.expected_salary,
		expectedInhand: data.expected_inhand,
		expectedMode: data.expected_mode,
		noticeEmployments: noticeEmploymentsJson,
	});

	return { status: true, messages: "Success!" };
}

// ====== 6. CV Details ======

export async function cvDetailsService(userId: number) {
	const userDetail = await miscRepositery.getUserDetailForCv(userId);
	if (!userDetail) {
		return { status: false, messages: "User not found" };
	}

	const [employmentList, educationList, expertiseList, languageList, certificateList] = await Promise.all([
		miscRepositery.getUserExperiences(userId),
		miscRepositery.getUserEducation(userId),
		miscRepositery.getUserSkills(userId),
		miscRepositery.getUserLanguages(userId),
		miscRepositery.getUserCertificates(userId),
	]);

	return {
		status: true,
		data: {
			user_details: {
				id: userDetail.id,
				individual_id: userDetail.individualId,
				fname: userDetail.fname,
				lname: userDetail.lname,
				email: userDetail.email,
				phone: userDetail.phone,
				gender: userDetail.gender,
				dob: userDetail.dob,
				profile_description: userDetail.profileDescription,
				accomodation_name: userDetail.accomodationName,
				country_name: userDetail.countryName,
				state_name: userDetail.stateName,
				city_name: userDetail.cityName,
				present_address: userDetail.presentAddress,
				linkedin: userDetail.linkdin,
				is_verified: false,
				phone_verified: userDetail.phoneVerified,
				email_verified: userDetail.emailVerified,
			},
			employmentList: employmentList.map((e) => ({
				id: e.id,
				user: e.user,
				company: e.company,
				employment_type: e.employmentType,
				designation: e.designation,
				salary: e.salary,
				salary_inhand: e.salaryInhand,
				salary_mode: e.salaryMode,
				joining_date: e.joiningDate,
				worked_till_date: e.workedTillDate,
				still_working: e.stillWorking,
				skill: e.skill,
				description: e.description,
				designation_name: e.designationName,
				employment_type_name: null,
				department_name: e.departmentName,
				company_name: e.companyName,
				approved: e.approved,
			})),
			educationList,
			expertiseList: expertiseList.map((s) => ({
				id: s.id,
				skill: s.skillName,
				rating: s.rating,
			})),
			languageList: languageList.map((l) => ({
				id: l.id,
				language: l.language,
				verbal: l.verbal,
				written: l.written,
				language_name: l.languageName,
			})),
			certificateList,
		},
	};
}

// ====== 7. Edit Profile ======

export async function editProfileService(userId: number, data: Record<string, any>) {
	const user = await miscRepositery.findUserById(userId);
	if (!user) {
		return { status: false, messages: "User not found" };
	}

	await miscRepositery.editUserProfile(userId, data);
	return { status: true, messages: "Success!", id: userId };
}

// ====== 8. All Company ======

export async function allCompanyService(keyword: string, limit: number, offset: number, total: number) {
	if (total === 1) {
		const count = await miscRepositery.countAllCompany(keyword || '');
		return { status: true, messages: "Success!", data: count };
	}

	const companies = await miscRepositery.searchAllCompany(keyword || '', limit, offset);
	return {
		status: true,
		messages: "Success!",
		data: companies.map((c) => ({
			id: c.id,
			fname: c.fname,
			slug: c.slug,
			profile: c.profile ? `${s3Prefix}${c.profile}` : (c.socialImage || ''),
		})),
	};
}

// ====== 9. User Detail ======

export async function userDetailService(userId: number, token: string) {
	const user = await miscRepositery.findUserById(userId);
	if (!user) {
		return { status: false, messages: "User not found" };
	}

	const companyUser = user.userType === 2
		? await miscRepositery.findUserById(user.currentCompany || 0)
		: null;

	return {
		status: true,
		messages: "Success!",
		data: {
			id: user.id,
			loginauth: token,
			individual_id: user.individualId,
			profile: user.profile ? `${s3Prefix}${user.profile}` : (user.socialImage || ''),
			profile_type: user.userType,
			fname: user.fname,
			lname: user.lname,
			email: user.email,
			phone: user.phone,
			second_phone: user.secondPhone,
			work_status: user.workStatus,
			current_position: user.currentPossition,
			current_company: user.currentCompany,
			profile_description: user.profileDescription,
			linkdin: user.linkdin,
			phone_verified: user.phoneVerified,
			email_verified: user.emailVerified,
			slug: user.slug,
			dob: user.dob,
			gender: user.gender,
			country: user.country,
			city: user.city,
			state: user.state,
			industry: user.industry,
			on_explore: user.onExplore,
			on_immediate: user.onImmediate,
			on_notice: user.onNotice,
			notice_period: user.noticePeriod,
			expected_salary: user.expectedSalary,
			expected_inhand: user.expectedInhand,
			expected_mode: user.expectedMode,
			accomodation_name: null,
			present_address: user.presentAddress,
			country_name: null,
			city_name: null,
			state_name: null,
			industry_name: null,
			work_status_name: null,
			current_company_name: companyUser?.fname || null,
			still_working_position: null,
			still_working_company_name: companyUser?.fname || null,
			reminderExperience: false,
			reminderExperienceList: [],
			cvPop: user.cvPop === 1,
			followCount: 0,
			account_deletion: false,
			manual_verify: false,
			noticeEmployments: [],
		},
	};
}

// ====== 10. Company Profile ======

export async function companyProfileService(slug: string) {
	const company = await miscRepositery.findCompanyBySlug(slug);
	if (!company) {
		return { status: false, messages: "No Company Found!" };
	}

	const [activeJobs, similarCompanies] = await Promise.all([
		miscRepositery.getCompanyActiveJobs(company.id, 20),
		miscRepositery.getSimilarCompanies(company.id, company.industry, 4),
	]);

	const jobIds = activeJobs.map((j) => j.id);
	const applicationCounts = await miscRepositery.countCompanyApplications(jobIds);
	const appCountMap = new Map(applicationCounts.map((a) => [a.job, a.count]));

	return {
		status: true,
		messages: "Success!",
		company_profile: {
			id: company.id,
			company_name: company.fname,
			fname: company.fname,
			email: company.email,
			slug: company.slug,
			industry_name: company.industryName,
			company_size_name: company.companySizeName,
			turnover_name: company.turnoverName,
			country_name: company.countryName,
			city_name: company.cityName,
			state_name: company.stateName,
			present_address: company.presentAddress,
			description: company.profileDescription,
			website: company.website,
			linkdin: company.linkdin,
			profile: company.profile ? `${s3Prefix}${company.profile}` : '',
			social_image: company.socialImage || '',
			followerCount: 0,
		},
		jobList: activeJobs.map((j) => ({
			id: j.id,
			title: j.jobTitle,
			experience_name: j.experienceName,
			department_name: j.departmentName,
			role_type_name: j.roleTypeName,
			vacancy: j.vacancy,
			slug: j.slug,
			country_name: j.countryName,
			state_name: j.stateName,
			city_name: j.cityName,
			designation_name: j.designationName,
			salary: j.salaryName,
			no_of_application: appCountMap.get(j.id) || 0,
			create_date: j.createDate,
			urgent: j.urgent,
		})),
		similarCompany: similarCompanies.map((c) => ({
			id: c.id,
			company_name: c.fname,
			slug: c.slug,
			profile: c.profile ? `${s3Prefix}${c.profile}` : (c.socialImage || ''),
		})),
		totalConnectionCount: 0,
	};
}
