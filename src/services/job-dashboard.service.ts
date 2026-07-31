import jobDashboardRepositery from '../repositery/job-dashboard.repositery';
import employmentRepositery from '../repositery/employee.repositery';
import companyRepositery from '../repositery/company.repositery';
import reviewRepositery from '../repositery/review.repositery';
import skillRepositery from '../repositery/skill.repositery';
import { BadRequestError } from '../middlewares/errorHandler';
import { getS3Url } from '../utils/helpers';
import { decodeCertificateURLs } from '../utils/decoders';
import { user_verified } from './users.service';

const s3Prefix = process.env.S3_PREFIX || '';

function profileUrl(profile: string | null | undefined, socialImage?: string | null | undefined): string {
	if (profile) return `${s3Prefix}${profile}`;
	return socialImage || '';
}

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

// ====== 4. Profile Percentage (employee branch — locked labels/weights) ======

type PctCheck = {
	key: string;
	label: string;
	points: number;
	ok: boolean;
};

/**
 * PHP GeneralApi::ProfilePercentage for user_type == 1.
 * Labels/typos locked by debug/employee-dashboard-endpoint.md.
 */
export async function profilePercentageService(userId: number) {
	const [
		user, experienceApprovedCount, experienceAnyCount,
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

	const isDomestic = Number(user.country) === 101;
	const isInternational = !!user.country && !isDomestic;
	const expApprovedPoints = isInternational ? 15 : 10;
	const reviewPoints = isInternational ? 15 : 10;
	const experienceApprovedOk = experienceApprovedCount > 0;

	const checks: PctCheck[] = [
		{ key: 'profile', label: 'Profile Image', points: 2, ok: !!(user.profile || user.socialImage) },
		{ key: 'email', label: 'Email', points: 2, ok: !!user.email },
		{ key: 'email_verified', label: 'Email Verification', points: 3, ok: !!user.emailVerified },
		{ key: 'phone', label: 'Phone No.', points: 2, ok: !!user.phone },
		{ key: 'phone_verified', label: 'Phone verification', points: 3, ok: !!user.phoneVerified },
		{ key: 'user_experience', label: 'Experience', points: 5, ok: experienceAnyCount > 0 },
		{ key: 'user_experience_approved', label: 'Experience Approved', points: expApprovedPoints, ok: experienceApprovedOk },
		{ key: 'user_education', label: 'Education', points: 10, ok: educationCount > 0 },
		{ key: 'user_skill', label: 'Skill', points: 2, ok: skillCount > 0 },
		{ key: 'user_language', label: 'Language', points: 2, ok: languageCount > 0 },
	];

	// Review only scored when experience approved is already complete
	if (experienceApprovedOk) {
		checks.push({
			key: 'review',
			label: 'Review',
			points: reviewPoints,
			ok: Number(reviewStats.count) > 0,
		});
	}

	checks.push(
		{ key: 'present_address', label: 'Present Address', points: 10, ok: !!user.presentAddress },
		{ key: 'permanent_address', label: 'Permanent Address', points: 2, ok: !!user.permanentAddress },
		{ key: 'resume', label: 'Resume', points: 2, ok: !!user.resume },
		{ key: 'dob', label: 'Date of Birth', points: 2, ok: !!user.dob },
		{ key: 'accomodation', label: 'Accomodation', points: 2, ok: !!user.accomodation },
		{ key: 'work_status', label: 'Work Status', points: 2, ok: !!user.workStatus },
		{ key: 'country', label: 'Country', points: 2, ok: !!user.country },
		{ key: 'city', label: 'City', points: 2, ok: !!user.city },
		{
			key: 'social',
			label: 'Social Media',
			points: 2,
			ok: !!(user.linkdin || user.youtube || user.instagram || user.facebook || user.twitter),
		},
	);

	// Domestic only (country == 101)
	if (isDomestic) {
		const verified = await user_verified(userId);
		checks.push({
			key: 'user_verified',
			label: 'Verify Pending',
			points: 10,
			ok: verified,
		});
	}

	checks.push(
		{ key: 'profile_description', label: 'Profile Descripton', points: 5, ok: !!user.profileDescription },
		{ key: 'current_company', label: 'Current company', points: 2, ok: !!user.currentCompany },
		{ key: 'current_possition', label: 'Current Position', points: 2, ok: !!user.currentPossition },
		{ key: 'user_certificate', label: 'Certificate', points: 2, ok: certificateCount > 0 },
		{ key: 'expected_salary', label: 'Expected salary', points: 2, ok: !!user.expectedSalary },
	);

	let total = 0;
	const complete: Record<string, number> = {};
	const uncomplete: string[] = [];
	const incomplete: { key: string; value: string }[] = [];

	for (const field of checks) {
		if (field.ok) {
			total += field.points;
			complete[field.key] = field.points;
		} else {
			uncomplete.push(field.label);
			incomplete.push({ key: field.label, value: `${field.points}%` });
		}
	}

	return {
		status: true,
		messages: 'profile percentage',
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
	const user = await jobDashboardRepositery.getUserForPercentage(userId);
	if (!user) {
		return { status: false, messages: "Access Denied!" };
	}

	if (!ids || ids.length === 0) {
		return { status: false, messages: "id Required!" };
	}

	try {
		for (const id of ids) {
			const request = await jobDashboardRepositery.findViewRequestByIdAndUser(id, userId);
			if (!request) {
				return { status: false, messages: "Invalid delete id!" };
			}
			await jobDashboardRepositery.softDeleteViewRequest(id, userId);
		}
		return { status: true, messages: "Delete Successfully!" };
	} catch {
		return { status: false, messages: "Something went wrong!" };
	}
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

	try {
		const request = await jobDashboardRepositery.findViewRequestByIdAndUser(id, userId);
		if (!request) {
			return { status: false, messages: "Record not found!" };
		}

		const toggledStatus = request.status === 0 ? 1 : 0;
		const days = day || 1;
		const expiryDate = new Date();
		expiryDate.setDate(expiryDate.getDate() + days);
		const expiry = expiryDate.toISOString().slice(0, 19).replace('T', ' ');

		// PHP: if access present, JSON-stringify into DB column as-is
		let accessJson: string;
		if (access == null) {
			accessJson = JSON.stringify(['1', '2']);
		} else if (typeof access === 'string') {
			accessJson = access;
		} else {
			accessJson = JSON.stringify(access);
		}

		await jobDashboardRepositery.approveViewRequest(id, toggledStatus, expiry, accessJson);
		return { status: true, messages: "Approved successfully!" };
	} catch {
		return { status: false, messages: "Access denied" };
	}
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

/**
 * PHP date_diff month component only (`$interval->m`, 0–11) — NOT years*12.
 * Dashboard bug magnet: full tenure months disagree with PHP.
 */
function phpMonthRemainder(
	joiningDate: string | null | undefined,
	workedTillDate: string | null | undefined,
	stillWorking: boolean,
): number {
	if (!joiningDate) return 0;
	const start = new Date(joiningDate);
	if (Number.isNaN(start.getTime())) return 0;

	let end: Date;
	if (workedTillDate) {
		end = new Date(workedTillDate);
		if (Number.isNaN(end.getTime())) return 0;
	} else if (stillWorking) {
		end = new Date();
	} else {
		return 0;
	}

	const fullMonths =
		(end.getFullYear() - start.getFullYear()) * 12 +
		(end.getMonth() - start.getMonth()) -
		(end.getDate() < start.getDate() ? 1 : 0);
	return Math.max(0, fullMonths % 12);
}

function emailDomainOf(email: string): string {
	if (!email || !email.includes('@')) return '';
	return email.split('@').pop()?.toLowerCase().trim() || '';
}

function formatScore(score: number): number | string {
	if (!score || score === 0) return 0;
	return Number.isInteger(score) ? score : score.toFixed(1);
}

async function buildVerificationProcess(
	workEmail: string | null | undefined,
	companyId: number | null | undefined,
	approved: number | null | undefined,
	salary: string | number | null | undefined,
): Promise<{ level1: boolean; level2: boolean; level3: boolean; level4: boolean }> {
	const email = (workEmail || '').toLowerCase().trim();
	const emailDomain = emailDomainOf(email);
	const cid = companyId || 0;

	const companyVerifyDetails = cid
		? await jobDashboardRepositery.getCompanyVerifiedDomains(cid)
		: [];
	let level1 = false;

	if (companyVerifyDetails.length > 0) {
		let matchFound = false;
		let hasVerified = false;
		for (const val of companyVerifyDetails) {
			if (val.isVerified === 1) hasVerified = true;
			if (val.domain && val.domain.toLowerCase().trim() === emailDomain) {
				matchFound = true;
				break;
			}
			if (val.email && val.email.includes('@')) {
				if (emailDomainOf(val.email) === emailDomain) {
					matchFound = true;
					break;
				}
			}
		}
		if (!hasVerified) {
			if (email) level1 = true;
		} else {
			level1 = matchFound;
		}
	} else if (email) {
		level1 = true;
	}

	let level2 = false;
	if (level1 && cid) {
		const existDomain = await jobDashboardRepositery.countCompanyVerifiedDomainOrEmail(cid);
		level2 = existDomain > 0;
	}

	const level3 = approved === 1;
	const level4 = approved === 1 && !!salary;

	return { level1, level2, level3, level4 };
}

type StillWorkingExp = Awaited<ReturnType<typeof jobDashboardRepositery.getStillWorkingExperiences>>[number];

async function buildCurrentEmployees(userId: number, currentUserId: number) {
	const experiences = await jobDashboardRepositery.getStillWorkingExperiences(userId);
	if (experiences.length === 0) return [];

	// Group by company; seed = first row (ordered still_working DESC, joining_date DESC)
	const grouped = new Map<number, StillWorkingExp[]>();
	for (const exp of experiences) {
		const companyId = exp.company!;
		if (!grouped.has(companyId)) grouped.set(companyId, []);
		grouped.get(companyId)!.push(exp);
	}

	const allExpIds = experiences.map((e) => e.id);
	const companyIds = [...grouped.keys()];

	const [
		updateListMap,
		invitedCompanyIds,
		employmentStatusMap,
		totalRatingMap,
		allRatings,
		skillNameMap,
		sendReminderCompanyIds,
	] = await Promise.all([
		employmentRepositery.getExperienceUpdateListByExperienceIds(allExpIds),
		companyRepositery.checkInvitationSendByCompanyIds(companyIds, currentUserId),
		reviewRepositery.getEmploymentStatusByExperienceIds(allExpIds),
		reviewRepositery.getTotalRatingByExperienceIds(allExpIds),
		reviewRepositery.getRatingsByExperienceIds(allExpIds),
		batchSkillNamesFromRows(experiences),
		jobDashboardRepositery.getPendingApproveCompanyIds(userId),
	]);

	// Outer added_by uses invitation to experience.user (employee) when currentUser === user
	const invitedToEmployee = await companyRepositery.checkInvitationSendByCompanyIds(
		companyIds,
		userId,
	);

	const ratingIds = allRatings.map((r) => r.id);
	const [historyMap, skillRatingMap] = await Promise.all([
		ratingIds.length > 0
			? reviewRepositery.getRatingHistory(ratingIds) as Promise<Record<number, any[]>>
			: Promise.resolve({} as Record<number, any[]>),
		ratingIds.length > 0
			? skillRepositery.getReviewsWithSkills(ratingIds, 0)
			: Promise.resolve({} as Record<number, any[]>),
	]);

	const ratingsByExperience = new Map<number, typeof allRatings>();
	for (const rating of allRatings) {
		const expId = rating.experience!;
		if (!ratingsByExperience.has(expId)) ratingsByExperience.set(expId, []);
		ratingsByExperience.get(expId)!.push(rating);
	}

	const ratingMap = new Map<number, Record<string, any>[]>();
	for (const [expId, ratings] of ratingsByExperience) {
		ratingMap.set(expId, ratings.map((r) => {
			const history = historyMap[r.id] ?? [];
			const skills = skillRatingMap[r.id] ?? [];
			let doc: string | string[] | null = null;
			if (r.doc) {
				try {
					const paths = JSON.parse(r.doc);
					if (Array.isArray(paths)) {
						doc = paths.map((path: string) => getS3Url(path));
					}
				} catch {
					doc = r.doc;
				}
			}
			return {
				id: r.id,
				approved: r.approved,
				status: r.approved === 1 ? 'complete' : 'pending',
				doc,
				date: r.modifyDate ?? r.createDate,
				link: r.link ?? '',
				show_home: r.showHome,
				show_review: r.showReview,
				history,
				skill_rating: skills,
				rating: r.rating,
				review: r.review,
			};
		}));
	}

	const currentEmployees: any[] = [];

	for (const [companyId, companyExps] of grouped) {
		const seed = companyExps[0];

		const [isVerified, employmentScoreRaw, hired] = await Promise.all([
			user_verified(companyId),
			employmentRepositery.getAllEmploymentScore(userId, companyId),
			jobDashboardRepositery.hasHiredAtCompany(userId, companyId),
		]);

		let totalExperienceMonths = 0;
		const lists = await Promise.all(companyExps.map(async (exp) => {
			totalExperienceMonths += phpMonthRemainder(
				exp.joiningDate,
				exp.workedTillDate,
				exp.stillWorking === 1,
			);

			let skill: { id: number; name: string }[] = [];
			if (exp.skill) {
				try {
					const decoded = JSON.parse(exp.skill);
					if (Array.isArray(decoded)) {
						skill = decoded.map(Number).filter(Boolean)
							.map((id: number) => ({ id, name: skillNameMap.get(id) ?? '' }))
							.filter((s) => s.name);
					}
				} catch { /* ignore bad JSON */ }
			}

			const designationScore = await employmentRepositery.getAverageRatingBySkill(exp.id);
			const verificationProcess = await buildVerificationProcess(
				exp.workEmail,
				companyId,
				exp.approved,
				exp.salary,
			);

			const updateRow = updateListMap.get(exp.id);
			const ratings = ratingMap.get(exp.id) ?? [];

			return {
				id: exp.id,
				haveSalary: !!exp.salary,
				haveDocument: !!exp.certificate,
				haveReview: ratings.length > 0,
				work_email: exp.workEmail ?? '',
				employment_type: exp.employementName ?? '',
				designation: exp.designationName ?? '',
				joining_date: exp.joiningDate,
				worked_till_date: exp.workedTillDate ?? '',
				still_working: exp.stillWorking ?? 0,
				approved: exp.approved,
				description: exp.description ?? '',
				salary: exp.salary,
				salary_inhand: exp.salaryInhand,
				salary_mode: exp.salaryMode,
				department: exp.departmentName ?? '',
				claim_status: exp.claimStatus ? 1 : 0,
				company_slug: exp.companySlug ?? '',
				skill,
				document: decodeCertificateURLs(exp.certificate),
				added_by: invitedToEmployee.has(companyId),
				employment_status: employmentStatusMap.get(exp.id) ?? 'pending',
				basic_update_list: updateRow ? [updateRow] : [],
				designation_score: formatScore(designationScore),
				rating: ratings,
				totalRating: totalRatingMap.get(exp.id) ?? { rating: 0, noofrecord: 0 },
				status: exp.status,
				verificationProcess,
			};
		}));

		const stillWorkingFlag = lists.some(
			(l) => l.still_working === 1 && l.approved !== 2,
		) ? 1 : 0;

		currentEmployees.push({
			id: seed.id,
			company_logo: profileUrl(seed.companyProfile, seed.companySocialImage),
			company: seed.companyName ?? '',
			company_id: companyId,
			individual_id: seed.individualId ?? '',
			is_verified: isVerified,
			joining_date: seed.joiningDate,
			worked_till_date: seed.workedTillDate ?? '',
			claim_status: seed.claimStatus ? 1 : 0,
			added_by: invitedCompanyIds.has(companyId),
			approved: seed.approved,
			status: seed.status,
			company_slug: seed.companySlug ?? '',
			user_slug: seed.userSlug ?? '',
			hired,
			sendReminder: sendReminderCompanyIds.has(companyId),
			showSalaryStatus: 1,
			employmentScore: formatScore(employmentScoreRaw),
			totalExperienceMonths,
			lists,
			still_working: stillWorkingFlag,
		});
	}

	return currentEmployees;
}

async function batchSkillNamesFromRows(rows: { skill: string | null }[]) {
	const allSkillIds = new Set<number>();
	for (const exp of rows) {
		if (!exp.skill) continue;
		try {
			const decoded = JSON.parse(exp.skill);
			if (Array.isArray(decoded)) {
				for (const id of decoded.map(Number).filter(Boolean)) {
					allSkillIds.add(id);
				}
			}
		} catch { /* ignore */ }
	}
	return skillRepositery.getSkillNamesByIds([...allSkillIds]);
}

/**
 * GET /wapi/employee/dashboard
 * @param userId acting id (req.auth.id — honours X-Company)
 * @param currentUserId JWT human (req.auth.user_id)
 * Success omits `messages` entirely.
 */
export async function dashboardService(userId: number, currentUserId: number) {
	const [
		jobsApplieds,
		connections,
		followRequests,
		messages,
		percentage,
		followList,
		skillList,
		currentEmployees,
	] = await Promise.all([
		jobDashboardRepositery.countAppliedJobs(userId),
		jobDashboardRepositery.countConnections(userId),
		jobDashboardRepositery.countFollowRequestsNotAccepted(userId),
		jobDashboardRepositery.countUnreadMessages(userId),
		profilePercentageService(userId),
		jobDashboardRepositery.getPendingFollowRequests(userId),
		jobDashboardRepositery.getUserSkillsWithRating(userId),
		buildCurrentEmployees(userId, currentUserId),
	]);

	return {
		status: true,
		data: {
			jobsApplieds,
			connections,
			followRequests,
			messages,
			percentage: percentage.data,
			followList: followList.map((item) => ({
				id: item.id,
				status: item.status,
				create_date: item.createDate,
				fname: item.fname,
				lname: item.lname,
				profile: profileUrl(item.profile, item.socialImage),
				slug: item.slug,
				user_type: item.userType,
				individual_id: item.individualId,
				designation_name: item.designationName,
				company_name: item.companyName,
				state_name: item.stateName,
				country_name: item.countryName,
			})),
			skillList: skillList.map((s) => ({
				id: s.id,
				skill: s.skill || '',
				rating: s.rating,
			})),
			currentEmployees,
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
