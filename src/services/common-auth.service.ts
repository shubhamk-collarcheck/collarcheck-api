import commonAuthRepositery from '../repositery/common-auth.repositery';

const s3Prefix = process.env.S3_PREFIX || '';

// ====== 1. Get Setting ======

export async function getSettingService(userId: number) {
	const settings = await commonAuthRepositery.getSettings(userId);
	const data: Record<string, string> = {};
	for (const s of settings) {
		if (s.key) data[s.key] = s.value || '';
	}
	return { status: true, messages: "All setting", data };
}

// ====== 2. Save Setting ======

export async function saveSettingService(userId: number, body: Record<string, any>) {
	const entries = Object.entries(body);
	if (entries.length === 0) {
		return { status: true, messages: "Record updated!" };
	}

	for (const [key, value] of entries) {
		const existing = await commonAuthRepositery.findSettingByKey(userId, key);
		const count = await commonAuthRepositery.countSettingByKey(userId, key);

		if (existing) {
			if (count > 1) {
				await commonAuthRepositery.deleteDuplicateSettings(userId, key);
				await commonAuthRepositery.insertSetting(userId, key, String(value));
			} else {
				await commonAuthRepositery.updateSetting(existing.id, userId, key, String(value));
			}
		} else {
			await commonAuthRepositery.insertSetting(userId, key, String(value));
		}
	}

	return { status: true, messages: "Record updated!" };
}

// ====== 3. Auth User Profile ======

function checkDataPermission(targetUserId: number, viewerUserId: number): boolean {
	if (targetUserId === viewerUserId) return true;
	return false;
}

function formatSalary(salary: any): string {
	if (!salary) return '';
	return String(salary);
}

export async function authUserProfileService(slug: string, currentUserId: number, currentUserType: number) {
	const targetUser = await commonAuthRepositery.findUserBySlug(slug);
	if (!targetUser || targetUser.userType !== 1) {
		return { status: false, messages: "No User Found!" };
	}

	const targetId = targetUser.id;
	const isSelf = currentUserId === targetId;

	const [userDetail, viewRequest] = await Promise.all([
		commonAuthRepositery.getUserDetail(targetId),
		isSelf ? null : commonAuthRepositery.getViewRequest(targetId, currentUserId),
	]);

	if (!userDetail) {
		return { status: false, messages: "No User Found!" };
	}

	const showSalary = isSelf || !!viewRequest;
	const showReview = isSelf || !!viewRequest;
	const showData = checkDataPermission(targetId, currentUserId);

	const [experienceIds, educationList, skills, languages, certificates, portfolios] = await Promise.all([
		commonAuthRepositery.getExperienceIds(targetId, isSelf),
		commonAuthRepositery.getEducationList(targetId),
		commonAuthRepositery.getUserSkills(targetId),
		commonAuthRepositery.getUserLanguages(targetId),
		commonAuthRepositery.getCertificates(targetId),
		commonAuthRepositery.getUserPortfolios(targetId),
	]);

	const experiences = await Promise.all(
		experienceIds.map((id) => commonAuthRepositery.getExperienceDetail(id))
	);

	const [followerCount, followingCount, followStatus, ratingScore, accountSettings] = await Promise.all([
		commonAuthRepositery.getFollowerCount(targetId),
		commonAuthRepositery.getFollowingCount(targetId),
		isSelf ? false : commonAuthRepositery.getFollowStatus(currentUserId, targetId),
		commonAuthRepositery.getOverallProfileScore(targetId),
		isSelf ? commonAuthRepositery.getSettings(currentUserId) : null,
	]);

	const settingData: Record<string, string> = {};
	if (accountSettings) {
		for (const s of accountSettings) {
			if (s.key) settingData[s.key] = s.value || '';
		}
	}

	const stillWorking = experiences.find((e) => e?.stillWorking === 1);

	return {
		status: true,
		messages: "Success!",
		data: {
			id: userDetail.id,
			individual_id: userDetail.individualId,
			fname: userDetail.fname,
			lname: userDetail.lname,
			profile: userDetail.profile ? `${s3Prefix}${userDetail.profile}` : (userDetail.socialImage || ''),
			state_name: userDetail.stateName,
			showReview,
			showSalary,
			present_address: showData ? userDetail.presentAddress : '',
			email: showData ? userDetail.email : '',
			email_alternate: showData ? userDetail.emailAlternate : '',
			phone: showData ? userDetail.phone : '',
			second_phone: showData ? userDetail.secondPhone : '',
			dob: showData ? userDetail.dob : '',
			setting: settingData,
			employement_history: [],
			employement_history_new: experiences.map((e) => ({
				id: e?.id,
				company_name: e?.companyName,
				designation_name: e?.designationName,
				salary: showSalary ? formatSalary(e?.salary) : '',
				salary_inhand: showSalary ? formatSalary(e?.salaryInhand) : '',
				salary_mode: e?.salaryMode,
				joining_date: e?.joiningDate,
				worked_till_date: e?.workedTillDate,
				still_working: e?.stillWorking,
				skill: e?.skill,
				description: e?.description,
				designation_id: e?.designation,
				department_name: e?.departmentName,
				employment_type_name: e?.employmentTypeName,
				company_id: e?.company,
				approved: e?.approved,
				status: e?.status,
				company_profile: e?.companyProfile ? `${s3Prefix}${e?.companyProfile}` : (e?.companySocialImage || ''),
				company_slug: e?.companySlug,
			})),
			all_document: [],
			all_certificate: certificates.map((c) => ({
				id: c.id,
				university: c.university,
				course: c.course,
				start_date: c.startDate,
				end_date: c.endDate,
				ongoing: c.ongoing,
				document: c.certificate ? `${s3Prefix}${c.certificate}` : '',
				certificate_id: c.certificateId,
				url: c.url,
			})),
			all_portfolio: portfolios.map((p) => ({
				id: p.id,
				type: p.type,
				title: p.title,
				description: p.description,
				youtube: p.youtube,
				image: p.image ? `${s3Prefix}${p.image}` : '',
				video: p.video,
				pdf: p.pdf ? `${s3Prefix}${p.pdf}` : '',
				url: p.url,
			})),
			all_education: educationList.map((ed) => ({
				id: ed.id,
				university: ed.university,
				course_type: ed.courseType,
				course: ed.course,
				state: ed.state,
				city: ed.city,
				starting_date: ed.startingDate,
				ending_date: ed.endingDate,
				country: ed.country,
				ishighest: ed.ishighest,
				ongoing: ed.ongoing,
				document: ed.certificate ? `${s3Prefix}${ed.certificate}` : '',
			})),
			social_image: userDetail.socialImage || '',
			profile_type: userDetail.userType,
			totalRating: ratingScore,
			userRating: ratingScore,
			second_phone_verify: userDetail.secondPhoneVerify,
			email_alternate_verify: userDetail.emailAlternateVerify,
			location: userDetail.city,
			work_status: userDetail.workStatus,
			work_status_name: userDetail.workTypeName,
			current_position: userDetail.currentPossition,
			current_company: userDetail.currentCompany,
			profile_description: userDetail.profileDescription,
			linkdin: userDetail.linkdin,
			youtube: userDetail.youtube,
			instagram: userDetail.instagram,
			facebook: userDetail.facebook,
			twitter: userDetail.twitter,
			gender_name: userDetail.genderName,
			gender: userDetail.gender,
			is_verified: false,
			user_type: "user",
			phone_verified: userDetail.phoneVerified,
			email_verified: userDetail.emailVerified,
			still_working_position: stillWorking?.designation,
			still_working_company: stillWorking?.company,
			still_working: stillWorking?.stillWorking || 0,
			still_working_company_name: stillWorking?.companyName || null,
			still_working_position_name: stillWorking?.designationName || null,
			accomodation_name: userDetail.accomodationName,
			same_address: !!userDetail.sameAddress,
			country: userDetail.country,
			city: userDetail.city,
			state: userDetail.state,
			industry: userDetail.industry,
			country_name: userDetail.countryName,
			resume: userDetail.resume ? `${s3Prefix}${userDetail.resume}` : '',
			resumeName: userDetail.resumeName || '',
			notice_period: userDetail.noticePeriod,
			notice_period_name: userDetail.noticePeriodName || '',
			notice_date: userDetail.noticeDate || '',
			show_notice_popup: false,
			on_explore: userDetail.onExplore,
			on_immediate: userDetail.onImmediate,
			on_notice: userDetail.onNotice,
			expected_salary: userDetail.expectedSalary,
			industry_name: userDetail.industryName,
			slug: userDetail.slug,
			all_Skill: skills.map((s) => ({
				id: s.id,
				skill: s.skillName,
				rating: s.rating,
			})),
			all_languages: languages.map((l) => ({
				id: l.id,
				name: l.languageName,
				verbal: l.verbal,
				written: l.written,
			})),
			followData: { follower: followerCount, following: followingCount },
			topCompany: [],
			topUser: [],
			following: followStatus,
			authuser: isSelf,
		},
	};
}

// ====== 4. Send User Profile View Request ======

export async function sendUserProfileViewRequestService(senderId: number, senderType: number, targetId: number) {
	if (senderType === 2) {
		return { status: false, messages: "Only user can request to salary !" };
	}

	const sender = await commonAuthRepositery.findUserById(senderId);
	if (!sender || sender.status !== 1) {
		return { status: false, messages: "User Not Found!" };
	}

	const target = await commonAuthRepositery.findUserById(targetId);
	if (!target || target.status !== 1) {
		return { status: false, messages: "User Not Found!" };
	}

	const existingCount = await commonAuthRepositery.checkExistingViewRequest(targetId, senderId);
	if (existingCount >= 1) {
		return { status: false, messages: "Already Request send!" };
	}

	await commonAuthRepositery.createViewRequest(targetId, senderId);

	await commonAuthRepositery.createNotification(
		senderId,
		targetId,
		`${sender.fname} has requested to view your full profile.`,
		`/user-profile/${sender.slug}`,
		'profile',
	);

	return { status: true, message: "Full Profile Access Request Sent!" };
}

// ====== 5. People List ======

export async function peopleListService(userId: number) {
	const exploringDetails = await commonAuthRepositery.getUserExploringDetails(userId);
	let peopleIds: number[] = [];

	if (exploringDetails?.exploringDetails) {
		try {
			const parsed = JSON.parse(exploringDetails.exploringDetails);
			if (Array.isArray(parsed)) {
				peopleIds = parsed.map(Number).filter(Boolean);
			}
		} catch {
			peopleIds = [];
		}
	}

	const [selectedUsers, selectedCompanies, randomUsers, randomCompanies] = await Promise.all([
		commonAuthRepositery.getExploringUserList(peopleIds.filter((id) => id > 0)),
		Promise.resolve([]),
		commonAuthRepositery.getRandomUsers(peopleIds, 10),
		commonAuthRepositery.getRandomCompanies(peopleIds, 10),
	]);

	const selectedUserIds = new Set(peopleIds);
	const selectedUserData = selectedUsers.filter((u) => u.userType === 1);
	const selectedCompanyData = selectedUsers.filter((u) => u.userType === 2);

	return {
		status: true,
		data: {
			selectedUserList: selectedUserData.map((u) => ({
				id: u.id,
				individual_id: u.individualId,
				profile: u.profile ? `${s3Prefix}${u.profile}` : (u.socialImage || ''),
				name: `${u.fname ?? ''} ${u.lname ?? ''}`.trim(),
				checked: 1,
			})),
			selectedCompanyList: selectedCompanyData.map((c) => ({
				id: c.id,
				individual_id: c.individualId,
				company_logo: c.profile ? `${s3Prefix}${c.profile}` : (c.socialImage || ''),
				company: c.fname,
				checked: 1,
			})),
			userList: randomUsers.map((u) => ({
				id: u.id,
				individual_id: u.individualId,
				profile: u.profile ? `${s3Prefix}${u.profile}` : (u.socialImage || ''),
				name: `${u.fname ?? ''} ${u.lname ?? ''}`.trim(),
				checked: 0,
			})),
			companyList: randomCompanies.map((c) => ({
				id: c.id,
				individual_id: c.individualId,
				company_logo: c.profile ? `${s3Prefix}${c.profile}` : (c.socialImage || ''),
				company: c.fname,
				checked: 0,
			})),
		},
	};
}
