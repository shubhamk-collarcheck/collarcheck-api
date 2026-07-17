import jobDashboardRepositery from '../repositery/job-dashboard.repositery';
import { BadRequestError } from '../middlewares/errorHandler';
import { getS3Url } from '../utils/helpers';

const s3Prefix = process.env.S3_PREFIX || '';

// ====== 1. Apply Job ======

export async function applyJobService(userId: number, jobId: number) {
	const job = await jobDashboardRepositery.findJobById(jobId);
	if (!job) {
		throw new BadRequestError("Invalid Job id");
	}

	const existing = await jobDashboardRepositery.findApplicationByJobAndUser(jobId, userId);
	if (existing) {
		return { status: false, messages: "Already Applied" };
	}

	await jobDashboardRepositery.createApplication({ job: jobId, user: userId });
	return { status: true, messages: "Successfully Applied" };
}

// ====== 3. Apply Job List (IDs only) ======

export async function applyJobListService(userId: number) {
	const ids = await jobDashboardRepositery.findAppliedJobIds(userId);
	return {
		status: true,
		messages: "Applied Lists",
		data: ids,
	};
}

// ====== 4. Profile Percentage ======

interface FieldDef {
	key: string;
	label: string;
	points: number;
	check: (user: any) => boolean;
}

function getProfileFields(user: any, experienceApprovedCount: number, experiencePendingCount: number, educationCount: number, skillCount: number, certificateCount: number, languageCount: number, reviewStats: { count: number; avgRating: number }) {
	const isInternational = user.country && user.country !== 101;
	const expApprovedPoints = isInternational ? 15 : 10;
	const reviewPoints = isInternational ? 15 : 10;

	const fields: FieldDef[] = [
		{ key: "profile", label: "Profile", points: 2, check: (u) => !!u.profile },
		{ key: "email", label: "Email", points: 2, check: (u) => !!u.email },
		{ key: "email_verified", label: "Email Verified", points: 3, check: (u) => !!u.emailVerified },
		{ key: "phone", label: "Phone", points: 2, check: (u) => !!u.phone },
		{ key: "phone_verified", label: "Phone Verified", points: 3, check: (u) => !!u.phoneVerified },
		{ key: "dob", label: "Date of Birth", points: 3, check: (u) => !!u.dob },
		{ key: "gender", label: "Gender", points: 2, check: (u) => !!u.gender },
		{ key: "city", label: "City", points: 2, check: (u) => !!u.city },
		{ key: "state", label: "State", points: 2, check: (u) => !!u.state },
		{ key: "accomodation", label: "Accommodation", points: 2, check: (u) => !!u.accomodation },
		{ key: "work_status", label: "Work Status", points: 2, check: (u) => !!u.workStatus },
		{ key: "country", label: "Country", points: 2, check: (u) => !!u.country },
		{ key: "current_company", label: "Current Company", points: 2, check: (u) => !!u.currentCompany },
		{ key: "current_possition", label: "Current Position", points: 2, check: (u) => !!u.currentPossition },
		{ key: "profile_description", label: "Profile Description", points: 5, check: (u) => !!u.profileDescription },
		{ key: "expected_salary", label: "Expected Salary", points: 2, check: (u) => !!u.expectedSalary },
		{ key: "user_experience", label: "Experience", points: 5, check: () => experiencePendingCount > 0 },
		{
			key: "user_experience_approved", label: "Experience Approved", points: expApprovedPoints,
			check: () => experienceApprovedCount > 0,
		},
		{ key: "user_education", label: "Education", points: 10, check: () => educationCount > 0 },
		{ key: "user_skill", label: "Skill", points: 2, check: () => skillCount > 0 },
		{ key: "user_certificate", label: "Certificate", points: 2, check: () => certificateCount > 0 },
		{ key: "user_language", label: "Language", points: 2, check: () => languageCount > 0 },
		{
			key: "review", label: "Review", points: reviewPoints,
			check: () => reviewStats.count > 0,
		},
	];

	return fields;
}

export async function profilePercentageService(userId: number) {
	const [
		user, experienceApprovedCount, experiencePendingCount,
		educationCount, skillCount, certificateCount, languageCount,
		reviewStats,
	] = await Promise.all([
		jobDashboardRepositery.getUserForPercentage(userId),
		jobDashboardRepositery.getUserExperienceApproved(userId),
		jobDashboardRepositery.getUserExperiencePending(userId),
		jobDashboardRepositery.getUserEducationCount(userId),
		jobDashboardRepositery.getUserSkillCount(userId),
		jobDashboardRepositery.getUserCertificateCount(userId),
		jobDashboardRepositery.getUserLanguageCount(userId),
		jobDashboardRepositery.getUserReviewStats(userId),
	]);

	if (!user) {
		throw new BadRequestError("User not found");
	}

	const fields = getProfileFields(
		user, experienceApprovedCount, experiencePendingCount,
		educationCount, skillCount, certificateCount, languageCount,
		reviewStats,
	);

	let total = 0;
	const complete: Record<string, string> = {};
	const uncomplete: string[] = [];
	const incomplete: { key: string; value: string }[] = [];

	for (const field of fields) {
		if (field.check(user)) {
			total += field.points;
			complete[field.key] = String(field.points);
		} else {
			uncomplete.push(field.label);
			incomplete.push({ key: field.label, value: `${field.points}%` });
		}
	}

	return {
		status: true,
		messages: "profile percentage",
		data: { total, complete, uncomplete, incomplete },
	};
}

// ====== 5. Approve Employment ======

export async function approvedEmploymentService(userId: number, id: number) {
	const experience = await jobDashboardRepositery.findExperienceByIdAndUser(id, userId);
	if (!experience) {
		return {
			status: false,
			messages: "The requested employment details could not be found, or you do not have permission to access them.",
		};
	}

	await jobDashboardRepositery.approveExperience(id);

	if (experience.stillWorking === 1) {
		const user = await jobDashboardRepositery.getUserForPercentage(userId);
		if (user && !user.currentCompany && !user.currentPossition) {
			await jobDashboardRepositery.updateUserCurrentPosition(
				userId,
				experience.designation!,
				experience.company!,
			);
		}
	}

	return { status: true, messages: "Approved successfully!" };
}

// ====== 6. All View Request ======

function mapViewRequestItem(item: any) {
	return {
		id: item.id,
		individual_id: item.individualId,
		company_name: item.companyName,
		claim_status: item.claimStatus,
		profile: item.profile ? `${s3Prefix}${item.profile}` : '',
		slug: item.slug,
		create_date: item.createDate,
		status: item.status,
		expiry: item.expiry,
		user_type: item.userType,
		designation_name: item.designationName,
		country_name: item.countryName,
		state_name: item.stateName,
		city_name: item.cityName,
	};
}

function mapFollowItem(item: any) {
	const onExplore = item.onExplore ? 1 : 0;
	return {
		id: item.id,
		individual_id: item.individualId,
		name: `${item.fname ?? ''} ${item.lname ?? ''}`.trim(),
		profile: item.profile ? `${s3Prefix}${item.profile}` : '',
		slug: item.slug,
		user_type: item.userType,
		create_date: item.createDate,
		designation_name: item.designationName,
		country_name: item.countryName,
		state_name: item.stateName,
		city_name: item.cityName,
		on_explore: onExplore,
		on_immediate: onExplore === 1 ? (item.onImmediate ? 1 : 0) : 0,
		on_notice: onExplore === 1 ? (item.onNotice ? 1 : 0) : 0,
	};
}

export async function allViewRequestService(userId: number, limit: number, offset: number) {
	const [viewRequests, followRequests, allRequestCount, followListCount] = await Promise.all([
		jobDashboardRepositery.getViewRequestsPaginated(userId, limit, offset),
		jobDashboardRepositery.getFollowRequestsPaginated(userId, limit, offset),
		jobDashboardRepositery.countViewRequests(userId),
		jobDashboardRepositery.countFollowRequests(userId),
	]);

	return {
		status: true,
		messages: "All view request List",
		data: {
			viewReqest: viewRequests.map(mapViewRequestItem),
			follow: followRequests.map(mapFollowItem),
			allRequestCount,
			followListCount,
		},
	};
}

// ====== 7. Approve View Request ======

export async function approvedVeiwRequestService(userId: number, id: number, access?: string | string[], day?: number) {
	const request = await jobDashboardRepositery.findViewRequestByIdAndUser(id, userId);
	if (!request) {
		return { status: false, messages: "Record not found!" };
	}

	const toggledStatus = request.status === 0 ? 1 : 0;
	const accessArray = access
		? (Array.isArray(access) ? access : [access])
		: ['1', '2'];
	const accessJson = JSON.stringify(accessArray);
	const days = day || 1;
	const expiryDate = new Date();
	expiryDate.setDate(expiryDate.getDate() + days);
	const expiry = expiryDate.toISOString().slice(0, 19).replace('T', ' ');

	await jobDashboardRepositery.approveViewRequest(id, toggledStatus, expiry, accessJson);
	return { status: true, messages: "Approved successfully!" };
}

// ====== 8. Reject View Request ======

export async function rejectVeiwRequestService(userId: number, id: number) {
	const request = await jobDashboardRepositery.findViewRequestByIdAndUser(id, userId);
	if (!request) {
		return { status: false, messages: "Record not found!" };
	}

	await jobDashboardRepositery.rejectViewRequest(id);
	return { status: true, messages: "Reject successfully!" };
}

// ====== 9. Delete View Request ======

export async function deleteViewRequestService(userId: number, id: number) {
	const request = await jobDashboardRepositery.findViewRequestByIdAndUser(id, userId);
	if (!request) {
		return { status: false, messages: "Record not found!!" };
	}

	await jobDashboardRepositery.softDeleteViewRequest(id, userId);
	return { status: true, messages: "Delete successfully!" };
}

// ====== Multi delete / approve view requests ======

export async function multiDeleteViewRequestService(userId: number, ids: number[]) {
	if (!ids || ids.length === 0) {
		return { status: false, messages: "id Required!" };
	}

	for (const id of ids) {
		const request = await jobDashboardRepositery.findViewRequestByIdAndUser(id, userId);
		if (!request) {
			return { status: false, messages: "Invalid delete id!" };
		}
		try {
			await jobDashboardRepositery.softDeleteViewRequest(id, userId);
		} catch {
			return { status: false, messages: "Delete unsuccessfully!" };
		}
	}

	return { status: true, messages: "Delete Successfully!" };
}

export async function multiApprovedVeiwRequestService(
	userId: number,
	id: number,
	access?: string | string[] | Record<string, number>,
	day?: number
) {
	if (!id) {
		return { status: false, messages: "The id field is required." };
	}

	let accessPayload: string | string[] | undefined;
	if (access && typeof access === 'object' && !Array.isArray(access)) {
		accessPayload = JSON.stringify(access);
	} else {
		accessPayload = access as string | string[] | undefined;
	}

	return approvedVeiwRequestService(userId, id, accessPayload, day);
}

// ====== 10. Check Current Company ======

export async function checkCurrentCompanyService(userId: number, employmentId?: number) {
	const employments = await jobDashboardRepositery.findCurrentEmployments(userId, employmentId);
	return {
		status: true,
		data: {
			currentWorking: employments.length > 0,
			ids: employments.map(e => ({
				id: e.id,
				company_name: e.companyName,
				department_name: e.departmentName,
				designation_name: e.designationName,
			})),
		},
	};
}

// ====== 11. Dashboard ======

export async function dashboardService(userId: number) {
	const [
		jobsApplieds, connections, followRequests, messages,
		percentage, followList, skillList, currentEmployees,
	] = await Promise.all([
		jobDashboardRepositery.countAppliedJobs(userId),
		jobDashboardRepositery.countConnections(userId),
		jobDashboardRepositery.countFollowRequests(userId),
		jobDashboardRepositery.countUnreadMessages(userId),
		profilePercentageService(userId),
		jobDashboardRepositery.getTopPendingFollowRequests(userId, 10),
		jobDashboardRepositery.getUserSkillsWithRating(userId),
		jobDashboardRepositery.getCurrentEmployments(userId),
	]);

	return {
		status: true,
		data: {
			jobsApplieds,
			connections,
			followRequests,
			messages,
			percentage: percentage.data,
			followList: followList.map((item: any) => ({
				id: item.id,
				status: item.status,
				create_date: item.createDate,
				fname: item.fname,
				lname: item.lname,
				profile: item.profile ? `${s3Prefix}${item.profile}` : '',
				slug: item.slug,
				user_type: item.userType,
				individual_id: item.individualId,
				designation_name: item.designationName,
				company_name: item.companyName,
				state_name: item.stateName,
				country_name: item.countryName,
			})),
			skillList: skillList.map((s: any) => ({
				id: s.id,
				skill: s.skill,
				rating: s.rating,
			})),
			currentEmployees: currentEmployees.map((e: any) => ({
				id: e.id,
				company: e.company,
				designation: e.designation,
				department: e.department,
				joining_date: e.joiningDate,
				company_name: e.companyName,
				company_slug: e.companySlug,
				designation_name: e.designationName,
				department_name: e.departmentName,
			})),
		},
	};
}

// ====== 12. Applied Job (Paginated) ======

export async function appliedjobService(userId: number, limit: number, offset: number) {
	const [jobs, totalCount] = await Promise.all([
		jobDashboardRepositery.findAppliedJobsPaginated(userId, limit, offset),
		jobDashboardRepositery.countAppliedJobs(userId),
	]);

	return {
		status: true,
		data: {
			jobsApplieds: jobs.map((j: any) => ({
				id: j.id,
				job: j.job,
				user: j.user,
				create_date: j.createDate,
				job_title: j.jobTitle,
				slug: j.slug,
				fname: j.fname,
				profile: j.profile ? `${s3Prefix}${j.profile}` : '',
				city_name: j.cityName,
				state_name: j.stateName,
				country_name: j.countryName,
				industry_name: j.industryName,
				department_name: j.departmentName,
				experience_name: j.experienceName,
				role_type_name: j.roleTypeName,
				designation_name: j.designationName,
				salary_name: j.salaryName,
				job_mode_name: j.jobModeName,
				job_status: j.jobStatus,
				delete_status: j.deleteStatus,
			})),
			totalCount,
		},
	};
}

// ====== 13. Remove Resume ======

export async function removeResumeService(userId: number) {
	await jobDashboardRepositery.clearUserResume(userId);
	return { status: true, messages: "Resume delete successfull!" };
}
