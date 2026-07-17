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
	const { getStatistics } = await import("./login.service");
	const data = await getStatistics(userId, token);
	if (!data) {
		return { status: false, messages: "User not found" };
	}
	return {
		status: true,
		messages: "Success!",
		data,
	};
}

// ====== 10. Company Profile (auth + public contract) ======

export async function companyProfileService(
	slug: string,
	options?: { viewerId?: number; isPublic?: boolean }
) {
	const isPublic = options?.isPublic ?? false;
	const viewerId = options?.viewerId;

	const company = await miscRepositery.findCompanyBySlug(slug);
	if (!company) {
		return { status: false, messages: "No Company Found!" };
	}

	const companyEmployeeRequestRepositery = (await import('../repositery/company-employee-request.repositery')).default;
	const companyBenefitGalleryRepositery = (await import('../repositery/company-benefit-gallery.repositery')).default;
	const generalRepositery = (await import('../repositery/general.repositery')).default;
	const { user_verified } = await import('./users.service');

	const [activeJobs, similarCompanies, followerCount, followingCount, galleries, benefits, employmentCount, exploreTalent, isVerified] = await Promise.all([
		miscRepositery.getCompanyActiveJobs(company.id, 20),
		isPublic ? Promise.resolve([] as Awaited<ReturnType<typeof miscRepositery.getSimilarCompanies>>) : miscRepositery.getSimilarCompanies(company.id, company.industry, 4),
		companyEmployeeRequestRepositery.getCompanyFollowerCount(company.id),
		companyEmployeeRequestRepositery.getCompanyConnectionCount(company.id),
		companyBenefitGalleryRepositery.getGalleries(company.id),
		companyBenefitGalleryRepositery.getCompanyBenefits(company.id),
		companyEmployeeRequestRepositery.getCompanyConnectionCount(company.id),
		companyEmployeeRequestRepositery.hasActiveJobs(company.id),
		user_verified(company.id),
	]);

	const jobIds = activeJobs.map((j) => j.id);
	const applicationCounts = await miscRepositery.countCompanyApplications(jobIds);
	const appCountMap = new Map(applicationCounts.map((a) => [a.job, a.count]));

	const alljob = activeJobs.map((j) => ({
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
		urgent: j.urgent ?? 0,
	}));

	const topCompany = isPublic
		? []
		: await Promise.all(similarCompanies.map(async (c) => {
			const [fCount, gCount] = await Promise.all([
				companyEmployeeRequestRepositery.getCompanyFollowerCount(c.id),
				companyEmployeeRequestRepositery.getCompanyConnectionCount(c.id),
			]);
			let followStatus = {
				requestSend: false,
				requestApproved: false,
				id: null as number | null,
				followerRequest: false,
				followerRequestApproved: false,
			};
			if (viewerId) {
				const st = await generalRepositery.findFollowRelationship(viewerId, c.id);
				if (st) {
					followStatus = {
						requestSend: true,
						requestApproved: st.status === 1,
						id: st.id,
						followerRequest: false,
						followerRequestApproved: false,
					};
				}
			}
			return {
				id: c.id,
				profile: c.profile ? `${s3Prefix}${c.profile}` : (c.socialImage || ''),
				name: c.fname,
				individual_id: null,
				slug: c.slug,
				city_name: null,
				state_name: null,
				country_name: null,
				followData: { following: gCount, follower: fCount },
				followStatus,
			};
		}));

	const allGallery = galleries.map((g: any) => ({
		...(isPublic ? {} : { id: g.id }),
		name: g.name,
		image: g.image ? (String(g.image).startsWith('http') ? g.image : `${s3Prefix}${g.image}`) : '',
	}));

	const allBenefits = benefits.map((b: any) => ({
		...(isPublic ? {} : { id: b.id }),
		name: b.name,
		image: b.image ? (String(b.image).startsWith('http') ? b.image : `${s3Prefix}${b.image}`) : '',
	}));

	const data: Record<string, unknown> = {
		id: company.id,
		is_verified: isVerified,
		individual_id: company.individualId,
		company_name: company.fname,
		contact_person: company.contactPerson || '',
		email: company.email,
		email_alternate: '',
		phone: company.phone,
		profile: company.profile || '',
		website: company.website || '',
		description: company.profileDescription || '',
		second_phone: '',
		location: company.cityName || '',
		phone_verified: 0,
		email_verified: 0,
		user_type: 'company',
		second_phone_verify: 0,
		email_alternate_verify: 0,
		profile_description: company.profileDescription || '',
		present_address: company.presentAddress || '',
		country: company.country,
		city: company.city,
		state: company.state,
		slug: company.slug,
		country_name: company.countryName || '',
		city_name: company.cityName || '',
		state_name: company.stateName || '',
		linkdin: company.linkdin || '',
		youtube: company.youtube || '',
		instagram: company.instagram || '',
		facebook: company.facebook || '',
		tumblr: '',
		discord: '',
		twitter: company.twitter || '',
		snapchat: '',
		incorporate_date: company.incorporateDate || '',
		turnover: company.turnover,
		claim_status: company.claimStatus,
		turnover_name: company.turnoverName || '',
		industry: company.industry,
		industry_name: company.industryName || '',
		company_size: company.companySize,
		company_size_name: company.companySizeName || '',
		total_employee: employmentCount,
		allEmploymentCount: employmentCount,
		alljob,
		topCompany,
		topUser: [],
		allGallery,
		allBenefits,
		followData: { following: followingCount, follower: followerCount },
		exploreTalent,
	};

	if (!isPublic) {
		data.domainPopulate = true;
		if (viewerId && viewerId !== company.id) {
			const st = await generalRepositery.findFollowRelationship(viewerId, company.id);
			data.following = {
				requestSend: !!st,
				requestApproved: st?.status === 1,
				id: st?.id ?? null,
			};
		}
	}

	return {
		status: true,
		message: "company Detail",
		data,
	};
}

// ====== All User list ======

export async function allUserService(keyword: string | undefined, limit = 10, page = 0) {
	const commonAuthRepositery = (await import('../repositery/common-auth.repositery')).default;
	const { user_verified } = await import('./users.service');
	const designationRepositery = (await import('../repositery/designation.repositery')).default;
	const { cybCities } = await import('../db/schema');
	const db = (await import('../db')).default;
	const { eq } = await import('drizzle-orm');

	const sqlOffset = page <= 1 ? 0 : page * limit - limit;
	const { rows, count } = await commonAuthRepositery.listAllUsers(keyword, limit, sqlOffset);

	const list = await Promise.all(rows.map(async (u) => {
		let designation_name: string | null = null;
		let city_name: string | null = null;
		if (u.currentPossition) {
			const d = await designationRepositery.findById(u.currentPossition);
			designation_name = d?.name ?? null;
		}
		if (u.city) {
			const [city] = await db.select({ name: cybCities.name })
				.from(cybCities)
				.where(eq(cybCities.id, u.city))
				.limit(1);
			city_name = city?.name ?? null;
		}
		const isVerified = await user_verified(u.id);
		return {
			id: u.id,
			individual_id: u.individualId,
			name: u.fullName || `${u.fname ?? ''} ${u.lname ?? ''}`.trim(),
			profile: u.profile ? `${s3Prefix}${u.profile}` : (u.socialImage || ''),
			slug: u.slug,
			designation_name,
			city_name,
			is_verified: isVerified,
		};
	}));

	return {
		status: true,
		messages: "User list",
		data: { list, count },
	};
}
