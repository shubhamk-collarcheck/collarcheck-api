import companyEmployeeRequestRepositery from "../repositery/company-employee-request.repositery";
import companyReviewRepositery from "../repositery/company-review.repositery";
import employmentRepositery from "../repositery/employee.repositery";
import skillRepositery from "../repositery/skill.repositery";
import { user_verified } from "./users.service";

const S3_PREFIX = process.env.S3_PREFIX || '';

function pageToSqlOffset(page: number, limit: number): number {
	return page <= 1 ? 0 : page * limit - limit;
}

function profileUrl(profile: string | null | undefined, socialImage: string | null | undefined) {
	return profile ? `${S3_PREFIX}${profile}` : (socialImage || '');
}

/** Company branch of PHP ProfilePercentage */
async function companyProfilePercentage(company: Awaited<ReturnType<typeof companyEmployeeRequestRepositery.getCompanyDetailForDashboard>>) {
	if (!company) {
		return { total: 0, uncomplete: [] as string[], complete: {} as Record<string, string | number>, incomplete: [] as { key: string; value: string }[] };
	}

	const checks: { key: string; label: string; points: number; ok: boolean }[] = [
		{ key: 'profile', label: 'Profile Image', points: 3, ok: !!(company.profile || company.socialImage) },
		{ key: 'company_name', label: 'Company Name', points: 2, ok: !!company.fname },
		{ key: 'email', label: 'Email', points: 3, ok: !!company.email },
		{ key: 'email_verified', label: 'Email Verification', points: 3, ok: !!company.emailVerified },
		{ key: 'phone', label: 'Phone No.', points: 3, ok: !!company.phone },
		{ key: 'phone_verified', label: 'Phone verification', points: 3, ok: !!company.phoneVerified },
		{ key: 'website', label: 'Website', points: 5, ok: !!company.website },
		{ key: 'profile_description', label: 'About Company', points: 5, ok: !!company.profileDescription },
		{ key: 'contact_person', label: 'Contact person', points: 2, ok: !!company.contactPerson },
		{ key: 'incorporate_date', label: 'Incorporation Date', points: 5, ok: !!company.incorporateDate },
		{ key: 'turnover', label: 'Turnover', points: 2, ok: !!company.turnover },
		{ key: 'industry', label: 'Industry Type', points: 3, ok: !!company.industry },
		{ key: 'country', label: 'Country', points: 2, ok: !!company.country },
		{ key: 'state', label: 'State', points: 2, ok: !!company.state },
		{ key: 'city', label: 'City', points: 2, ok: !!company.city },
		{ key: 'present_address', label: 'Office Address', points: 2, ok: !!company.presentAddress },
		{
			key: 'social', label: 'Social Media', points: 3,
			ok: !!(company.linkdin || company.youtube || company.instagram || company.facebook || company.twitter),
		},
	];

	const [isVerified, empCount, reviewCount, jobCount, galleryCount, benefitCount] = await Promise.all([
		user_verified(company.id),
		companyEmployeeRequestRepositery.countApprovedEmployees(company.id),
		companyEmployeeRequestRepositery.countCompanyWrittenReviews(company.id),
		companyEmployeeRequestRepositery.getDashboardStats(company.id).then((s) => s.postedJobs),
		companyEmployeeRequestRepositery.countCompanyGallery(company.id),
		companyEmployeeRequestRepositery.countCompanyBenefits(company.id),
	]);

	checks.push(
		{ key: 'company_verification', label: 'Company Verification', points: 10, ok: !!isVerified },
		{ key: 'add_employee', label: 'Add 1 Employee', points: 10, ok: empCount >= 1 },
		{ key: 'write_review', label: 'Write a review', points: 10, ok: reviewCount >= 1 },
		{ key: 'job_post', label: 'Job Post', points: 10, ok: jobCount >= 1 },
		{ key: 'gallery', label: 'Add gallery', points: 3, ok: galleryCount >= 1 },
		{ key: 'benefits', label: 'Add 3 Perks and benefits', points: 5, ok: benefitCount >= 3 },
		{ key: 'company_size', label: 'Employee count', points: 2, ok: !!company.companySize },
	);

	let total = 0;
	const uncomplete: string[] = [];
	const complete: Record<string, string | number> = {};
	const incomplete: { key: string; value: string }[] = [];

	for (const c of checks) {
		if (c.ok) {
			total += c.points;
			complete[c.key] = String(c.points);
		} else {
			uncomplete.push(c.label);
			incomplete.push({ key: c.label, value: `${c.points}%` });
		}
	}

	return { total, uncomplete, complete, incomplete };
}

async function mapApplicationCard(
	app: Awaited<ReturnType<typeof companyReviewRepositery.getAllApplication>>[number],
	nameKey: 'fname' | 'name',
) {
	const applicantId = app.userId;
	const [isVerified, rating, userRating] = await Promise.all([
		applicantId != null ? user_verified(applicantId) : Promise.resolve(false),
		applicantId != null
			? companyReviewRepositery.getUserRating(applicantId)
			: Promise.resolve({ rating: 0, noofrecord: 0 }),
		applicantId != null
			? employmentRepositery.getOverallProfileRating(applicantId)
			: Promise.resolve(0),
	]);

	const onExplore = app.onExplore === 1 ? 1 : 0;
	const fullName = `${app.fname || ''} ${app.lname || ''}`.trim();

	return {
		id: app.id,
		job: app.jobTitle || '',
		job_slug: app.jobSlug || '',
		user_id: app.userId,
		individual_id: app.individualId ?? null,
		[nameKey]: fullName,
		email: app.email || '',
		phone: app.phone || '',
		city_name: app.cityName ?? null,
		state_name: app.stateName ?? null,
		country_name: app.countryName ?? null,
		profile: profileUrl(app.profile, app.socialImage),
		slug: app.slug || '',
		company_name: app.companyName ?? null,
		designation_name: app.designationName ?? null,
		present_address: app.presentAddress ?? null,
		profile_description: app.profileDescription ?? null,
		date: app.createDate || '',
		resume: app.resume ? `${S3_PREFIX}${app.resume}` : '',
		resumeName: app.resumeName || '',
		expected_salary: app.expectedSalary ?? null,
		notice_period: app.noticePeriod ?? null,
		notice_date: app.noticeDate ?? null,
		isVerified: !!isVerified,
		rating,
		userRating,
		on_explore: onExplore,
		on_immediate: onExplore === 1 && app.onImmediate === 1 ? 1 : 0,
		on_notice: onExplore === 1 && app.onNotice === 1 ? 1 : 0,
	};
}

class companyEmployeeRequestService {

	async getCompanyDetailService(userId: number, companyId?: number) {
		const targetCompanyId = companyId || userId;
		const company = await companyEmployeeRequestRepositery.getCompanyDetail(targetCompanyId);
		if (!company) {
			return { success: false, message: "Company not found" };
		}

		const totalConnection = await companyEmployeeRequestRepositery.getCompanyConnectionCount(targetCompanyId);
		const followCount = await companyEmployeeRequestRepositery.getCompanyFollowerCount(targetCompanyId);
		const accountDeletion = await companyEmployeeRequestRepositery.getAccountDeleteRequest(targetCompanyId);

		// Check if user is super admin
		const userRelation = await companyEmployeeRequestRepositery.getUserRelation(userId, targetCompanyId);
		const isSuperAdmin = userRelation?.type === 1;

		// Get industry/company size/turnover names
		const industryName = company.industry ? await companyEmployeeRequestRepositery.getIndustryName(company.industry) : '';
		const companyName = company.fname || '';

		return {
			success: true,
			message: "company detail",
			data: {
				id: company.id,
				company_name: companyName,
				email: company.email,
				phone: company.phone,
				profile: company.profile ? `${S3_PREFIX}${company.profile}` : '',
				website: company.website,
				description: company.profileDescription,
				present_address: company.presentAddress,
				country: company.country,
				city: company.city,
				state: company.state,
				country_name: '',
				city_name: '',
				state_name: '',
				slug: company.slug,
				incorporate_date: company.incorporateDate,
				turnover: company.turnover,
				turnover_name: '',
				company_size: company.companySize,
				company_size_name: '',
				industry: company.industry,
				industry_name: industryName,
				totalConnection,
				profile_percentage: 0,
				uncomplete: [],
				complete: [],
				followCount,
				is_verified: company.claimStatus === 1,
				exploreTalent: company.onExplore,
				is_user_relation: !!userRelation,
				currentStatus: {},
				isSuperAdmin,
				account_deletion: !!accountDeletion,
				company_domains: [],
				company_emails: [],
				verificationProcess: { level1: false, level2: false },
				socialLogin: false,
				linkdin: company.linkdin,
				youtube: company.youtube,
				instagram: company.instagram,
				facebook: company.facebook,
				twitter: company.twitter,
			},
		};
	}

	async addEmployeeService(companyId: number, data: {
		email?: string;
		phone?: string;
		joining_date: string;
		salary?: string;
		designation?: string;
		department?: string;
		employment_type?: string;
		skill?: string;
		description?: string;
	}) {
		// Find or create user
		let user = await companyEmployeeRequestRepositery.findUserByEmailOrPhone(data.email, data.phone);
		let userId: number;

		if (user) {
			userId = user.id;
		} else {
			userId = await companyEmployeeRequestRepositery.createUser({
				email: data.email,
				phone: data.phone,
			});
		}

		// Parse designation/department/employment_type to IDs if needed
		let designationId: number | undefined;
		let departmentId: number | undefined;
		let employmentTypeId: number | undefined;

		if (data.designation) {
			const parsed = parseInt(data.designation);
			designationId = isNaN(parsed) ? undefined : parsed;
		}
		if (data.department) {
			const parsed = parseInt(data.department);
			departmentId = isNaN(parsed) ? undefined : parsed;
		}
		if (data.employment_type) {
			const parsed = parseInt(data.employment_type);
			employmentTypeId = isNaN(parsed) ? undefined : parsed;
		}

		// Create experience record with approved=3 (pending)
		await companyEmployeeRequestRepositery.createExperience({
			user: userId,
			company: companyId,
			joiningDate: data.joining_date,
			salary: data.salary,
			designation: designationId,
			department: departmentId,
			employmentType: employmentTypeId,
			skill: data.skill,
			description: data.description,
			approved: 3,
		});

		return { success: true, message: "Employee added successfully!" };
	}

	async getEmployeeDetailService(companyId: number, experienceId: number) {
		const experience = await companyEmployeeRequestRepositery.getExperienceDetail(experienceId);
		if (!experience || experience.company !== companyId) {
			return { success: false, message: "Experience not found" };
		}

		const ratingStats = await companyEmployeeRequestRepositery.getExperienceRating(experienceId);
		const user = await companyEmployeeRequestRepositery.getUserById(experience.user || 0);

		return {
			success: true,
			message: "employee detail",
			data: {
				id: experience.id,
				userName: `${experience.fname || ''} ${experience.lname || ''}`.trim(),
				profile: experience.profile ? `${S3_PREFIX}${experience.profile}` : '',
				salary: experience.salary,
				designation: experience.designationName || '',
				department: experience.departmentName || '',
				employment_type: experience.employmentTypeName || '',
				joining_date: experience.joiningDate,
				worked_till_date: experience.workedTillDate,
				still_working: experience.stillWorking,
				approved: experience.approved,
				skill: experience.skill ? experience.skill.split(',').map(Number) : [],
				description: experience.description,
				document: [],
				rating: Number(ratingStats.avgRating),
				employement_id: experience.id,
				slug: experience.slug,
				individual_id: experience.individualId,
				is_verified: user?.claimStatus === 1,
				user_slug: experience.slug,
				lastReview: experience.lastReview || 0,
				updateHistory: [],
			},
		};
	}

	async rejectEmploymentService(companyId: number, experienceId: number, reason?: string) {
		const experience = await companyEmployeeRequestRepositery.getExperienceById(experienceId);
		if (!experience || experience.company !== companyId) {
			return { success: false, message: "Experience not found" };
		}

		await companyEmployeeRequestRepositery.rejectExperience(experienceId);

		return { success: true, message: "Reject successfully!" };
	}

	async rejectPromotionService(companyId: number, experienceId: number, type: number) {
		await companyEmployeeRequestRepositery.deleteUpdateExperience(experienceId, type);

		return { success: true, message: "Reject successfully!" };
	}

	async leaveExperienceService(companyId: number, data: {
		id: number;
		type: number;
		worked_till_date?: string;
		rating?: number;
		review?: string;
		salary?: string;
		designation?: string;
		salary_inhand?: string;
		salary_mode?: string;
	}) {
		const experience = await companyEmployeeRequestRepositery.getExperienceById(data.id);
		if (!experience || experience.company !== companyId) {
			return { success: false, message: "Experience not found" };
		}

		if (data.type === 1) {
			// Leave
			const workedTillDate = data.worked_till_date || new Date().toISOString().slice(0, 10);
			await companyEmployeeRequestRepositery.updateExperienceLeave(data.id, workedTillDate);

			if (experience.user) {
				const user = await companyEmployeeRequestRepositery.getUserById(experience.user);
				if (user?.currentCompany === companyId) {
					await companyEmployeeRequestRepositery.updateUserCurrentPosition(experience.user, {
						currentCompany: null,
						currentPossition: null,
					});
				}

				// Set expiry to 72 hours from leave date
				const expiryDate = new Date(workedTillDate);
				expiryDate.setHours(expiryDate.getHours() + 72);
				await companyEmployeeRequestRepositery.updateExperienceExpiry(data.id, expiryDate.toISOString().slice(0, 19).replace('T', ' '));
			}
		} else if (data.type === 2 || data.type === 3) {
			// Promotion
			let designationId: number | undefined;
			if (data.designation) {
				const parsed = parseInt(data.designation);
				designationId = isNaN(parsed) ? undefined : parsed;
			}

			await companyEmployeeRequestRepositery.updateExperiencePromotion(data.id, {
				salary: data.salary,
				salaryInhand: data.salary_inhand,
				salaryMode: data.salary_mode,
				designation: designationId,
			});

			if (experience.stillWorking === 1 && experience.user) {
				const user = await companyEmployeeRequestRepositery.getUserById(experience.user);
				if (user?.currentCompany === companyId) {
					await companyEmployeeRequestRepositery.updateUserCurrentPosition(experience.user, {
						currentPossition: designationId || null,
					});
				} else if (!user?.currentCompany) {
					await companyEmployeeRequestRepositery.updateUserCurrentPosition(experience.user, {
						currentPossition: designationId || null,
						currentCompany: companyId,
					});
				}
			}
		}

		return { success: true, message: "Update successfully !" };
	}

	async reviewUniqueUsersService(companyId: number, keyword?: string) {
		const employees = await companyEmployeeRequestRepositery.getUniqueEmployeesWithReviews(companyId, keyword);

		const result = [];
		const seenUsers = new Set<number>();

		for (const emp of employees) {
			if (!emp.userId || seenUsers.has(emp.userId)) continue;
			seenUsers.add(emp.userId);

			const ratingStats = await companyEmployeeRequestRepositery.getUserRatingStats(emp.userId, companyId);
			const designationName = emp.designation ? await companyEmployeeRequestRepositery.getDesignationName(emp.designation) : '';

			result.push({
				id: emp.experienceId,
				user_id: emp.userId,
				is_verified: false,
				designation: designationName,
				user_slug: emp.slug,
				user: `${emp.fname || ''} ${emp.lname || ''}`.trim(),
				profile: emp.profile ? `${S3_PREFIX}${emp.profile}` : '',
				rating: Number(ratingStats.avgRating),
				noofrecord: ratingStats.count,
				employmentScore: emp.stillWorking ? 100 : 0,
				pendingReview: 0,
				on_explore: emp.onExplore || 0,
				on_immediate: emp.onImmediate || 0,
				on_notice: emp.onNotice || 0,
			});
		}

		return { success: true, message: "review list", data: result };
	}

	async validToReviewService(companyId: number, userId: number) {
		const experience = await companyEmployeeRequestRepositery.checkValidToReview(companyId, userId);

		return {
			success: true,
			data: {
				review: !!experience,
				experinece_id: experience?.id || 0,
				requestSend: false,
				requestApproved: false,
			},
		};
	}

	async followRequestListService(companyId: number, limit = 6, offset = 0) {
		const requests = await companyEmployeeRequestRepositery.getFollowRequests(companyId, limit, offset);

		return {
			success: true,
			messages: "Follower List",
			data: {
				follow: requests.map(r => ({
					id: r.id,
					individual_id: r.individualId,
					name: `${r.fname || ''} ${r.lname || ''}`.trim(),
					profile: r.profile ? `${S3_PREFIX}${r.profile}` : '',
					slug: r.slug,
					user_type: r.userType,
					create_date: r.createDate,
				})),
			},
		};
	}

	/**
	 * GET /wapi/company/dashboard
	 * limit/offsetPage are Zod-coerced; offset is page number (default limit 10).
	 */
	async dashboardService(companyId: number, limit = 10, offsetPage = 0) {
		const company = await companyEmployeeRequestRepositery.getCompanyDetailForDashboard(companyId);
		if (!company) {
			return { status: false as const, messages: "Company not found!" };
		}

		const sqlOffset = pageToSqlOffset(offsetPage, limit);

		const [stats, pendingRequests, appRows, mostAppliedJob, percentage] = await Promise.all([
			companyEmployeeRequestRepositery.getDashboardStats(companyId),
			companyEmployeeRequestRepositery.getPendingEmploymentRequests(companyId, limit, sqlOffset),
			// dashboard applications: company-wide, no job filter, isVerify unset → ASC (PHP)
			companyReviewRepositery.getAllApplication({
				companyId,
				isVerify: false,
				limit,
				sqlOffset,
			}),
			companyEmployeeRequestRepositery.getTopAppliedJobs(companyId, limit, sqlOffset),
			companyProfilePercentage(company),
		]);

		const employementRequestList = await Promise.all(pendingRequests.map(async (r) => {
			let skillNames: string[] = [];
			if (r.skill) {
				try {
					const ids = JSON.parse(r.skill as string);
					if (Array.isArray(ids) && ids.length) {
						const map = await skillRepositery.getSkillNamesByIds(ids.map(Number).filter(Boolean));
						skillNames = [...map.values()];
					}
				} catch { /* ignore */ }
			}

			const docs = r.certificate
				? String(r.certificate).split(',').filter(Boolean).map((p) => `${S3_PREFIX}${p.trim()}`)
				: [];

			const onExplore = r.onExplore === 1 ? 1 : 0;
			const isVerified = r.user != null ? await user_verified(r.user) : false;

			return {
				id: r.id,
				profile: profileUrl(r.profile, r.socialImage),
				userName: `${r.fname || ''} ${r.lname || ''}`.trim(),
				salary: r.salary || '',
				employment_type: r.employmentTypeName || '',
				designation: r.designationName || '',
				joining_date: r.joiningDate || '',
				worked_till_date: r.workedTillDate || '',
				still_working: r.stillWorking,
				approved: r.approved,
				skill: skillNames,
				description: r.description || '',
				document: docs,
				salary_inhand: r.salaryInhand || '',
				salary_mode: r.salaryMode || '',
				department: r.departmentName || '',
				claim_status: r.claimStatus ? 1 : 0,
				rating: [] as unknown[],
				employment_status: 'pending',
				employement_id: r.id,
				slug: r.slug || '',
				individual_id: r.individualId ?? null,
				status: r.status,
				is_verified: !!isVerified,
				user_slug: r.slug || '',
				updateHistory: [] as unknown[],
				on_explore: onExplore,
				on_immediate: onExplore === 1 && r.onImmediate === 1 ? 1 : 0,
				on_notice: onExplore === 1 && r.onNotice === 1 ? 1 : 0,
			};
		}));

		const allApplicationList = await Promise.all(
			appRows.map((app) => mapApplicationCard(app, 'name'))
		);

		return {
			status: true as const,
			data: {
				postedJobs: stats.postedJobs,
				applications: stats.applications,
				currentEmployies: stats.currentEmployies,
				followRequests: [] as unknown[],
				messages: stats.messages,
				employementRequestList,
				percentage,
				allApplicationList,
				mostAppliedJob,
			},
		};
	}

	async sidebarCountService(companyId: number) {
		const reviewRequest = await companyEmployeeRequestRepositery.getPendingReviewCount(companyId);
		const employmentRequest = await companyEmployeeRequestRepositery.getPendingEmploymentRequests(companyId, 100, 0);
		const followRequests = await companyEmployeeRequestRepositery.getFollowRequestCount(companyId);

		return {
			success: true,
			data: {
				reviewRequest: reviewRequest,
				employmentRequest: employmentRequest.length,
				followList: followRequests,
			},
		};
	}

	async companyListService(userId: number, limit = 16, offset = 0) {
		const page = offset;
		const sqlOffset = page <= 1 ? 0 : page * limit - limit;
		const relations = await companyEmployeeRequestRepositery.getCompanyRelations(userId);

		// Simple pagination over relations list
		const pageSlice = relations.slice(sqlOffset, sqlOffset + limit);

		const myCompany = [];
		for (const rel of pageSlice) {
			const companyId = rel.companyId || 0;
			const [followerCount, followingCount, industryName, exploreTalent, companyDetail] = await Promise.all([
				companyEmployeeRequestRepositery.getCompanyFollowerCount(companyId),
				companyEmployeeRequestRepositery.getCompanyConnectionCount(companyId),
				rel.industry ? companyEmployeeRequestRepositery.getIndustryName(rel.industry) : Promise.resolve(''),
				companyEmployeeRequestRepositery.hasActiveJobs(companyId),
				companyEmployeeRequestRepositery.getCompanyDetail(companyId),
			]);

			const accountDeletion = await companyEmployeeRequestRepositery.getAccountDeleteRequest(companyId);

			myCompany.push({
				id: companyId,
				individual_id: rel.individualId,
				profile: rel.profile ? `${S3_PREFIX}${rel.profile}` : '',
				name: rel.fname || companyDetail?.fname || '',
				city_name: '',
				state_name: '',
				country_name: '',
				claim_status: rel.claimStatus ?? companyDetail?.claimStatus,
				status: rel.status,
				slug: rel.slug || companyDetail?.slug,
				company_size_name: '',
				industry_name: industryName,
				is_verified: (rel.claimStatus ?? companyDetail?.claimStatus) === 1,
				followData: { following: followingCount, follower: followerCount },
				following: { requestSend: false, requestApproved: false },
				exploreTalent,
				user_group: rel.type === 1 ? [{ id: 1, name: 'Super Admin' }] : [],
				user_details: [],
				user_count: 0,
				account_deletion: !!accountDeletion,
				currentStatus: (rel.claimStatus ?? companyDetail?.claimStatus) === 1 ? 1 : 4,
				isSuperAdmin: rel.type === 1,
			});
		}

		return {
			status: true,
			messages: "Company list",
			data: { myCompany },
		};
	}

	async allMessageListService(userId: number, slug?: string, limit = 50, offset = 0) {
		const threads = await companyEmployeeRequestRepositery.getMessageThreads(userId, limit, offset);
		const messages = [];

		for (const thread of threads) {
			const otherUserId = thread.sender === userId ? thread.receiver : thread.sender;
			const otherUser = await companyEmployeeRequestRepositery.getUserById(otherUserId);
			const history = await companyEmployeeRequestRepositery.getMessageHistory(thread.id);

			messages.push({
				chat_id: thread.id,
				sender: thread.sender,
				senderName: thread.sender === userId ? 'Me' : `${otherUser?.fname || ''} ${otherUser?.lname || ''}`.trim(),
				receiverName: thread.receiver === userId ? 'Me' : `${otherUser?.fname || ''} ${otherUser?.lname || ''}`.trim(),
				receiver_profile: otherUser?.profile ? `${S3_PREFIX}${otherUser.profile}` : '',
				receiver: otherUserId,
				receiver_slug: otherUser?.slug,
				timestamp: thread.createDate,
				user_type: otherUser?.userType,
				designation_name: '',
				industry_name: '',
				is_verified: otherUser?.claimStatus === 1,
				on_explore: otherUser?.onExplore || 0,
				count: history.length,
				message: history.map(m => ({
					message_id: m.id,
					message: m.message,
					document: m.doc ? JSON.parse(m.doc) : [],
					sender: m.sender,
					receiver: m.receiver,
					datetime: m.createDate,
					is_viewed: m.isViewed,
					senderName: m.sender === userId ? 'Me' : `${otherUser?.fname || ''} ${otherUser?.lname || ''}`.trim(),
					receiverName: m.receiver === userId ? 'Me' : `${otherUser?.fname || ''} ${otherUser?.lname || ''}`.trim(),
					profile: m.sender === userId ? '' : (otherUser?.profile ? `${S3_PREFIX}${otherUser.profile}` : ''),
					receiver_profile: m.receiver === userId ? '' : (otherUser?.profile ? `${S3_PREFIX}${otherUser.profile}` : ''),
				})),
			});
		}

		return { success: true, messages: "message list", data: messages };
	}

	async addMessageService(senderId: number, receiverId: number, message: string, doc?: string) {
		// Check if message thread exists
		let thread = await companyEmployeeRequestRepositery.findMessage(senderId, receiverId);
		if (!thread) {
			thread = await companyEmployeeRequestRepositery.findMessage(receiverId, senderId);
		}

		let messageId: number;
		if (thread) {
			messageId = thread.id;
		} else {
			messageId = await companyEmployeeRequestRepositery.createMessage({
				sender: senderId,
				receiver: receiverId,
			});
		}

		await companyEmployeeRequestRepositery.createMessageHistory({
			messageId,
			sender: senderId,
			receiver: receiverId,
			message,
			doc,
		});

		return { success: true, messages: "Successfully added" };
	}

	async chatMessageReadService(userId: number, messageId: number) {
		await companyEmployeeRequestRepositery.markMessagesAsRead(messageId, userId);

		return { success: true, messages: "Successfully updated" };
	}

	async followDataListService(userId: number, limit = 50, offset = 0) {
		const { followers, following } = await companyEmployeeRequestRepositery.getFollowData(userId, limit, offset);

		const followerList = [];
		for (const f of followers) {
			followerList.push({
				id: f.id,
				individual_id: f.individualId,
				name: `${f.fname || ''} ${f.lname || ''}`.trim(),
				designation_name: '',
				state_name: '',
				country_name: '',
				profile: f.profile ? `${S3_PREFIX}${f.profile}` : '',
				slug: f.slug,
				user_type: f.userType,
				user_id: f.followerId,
				is_verified: false,
				followBack: false,
				create_date: f.createDate,
				notice_date: '',
				on_explore: f.onExplore || 0,
				on_immediate: f.onImmediate || 0,
				on_notice: f.onNotice || 0,
			});
		}

		const followingList = [];
		for (const f of following) {
			followingList.push({
				id: f.id,
				individual_id: f.individualId,
				name: `${f.fname || ''} ${f.lname || ''}`.trim(),
				designation_name: '',
				state_name: '',
				country_name: '',
				profile: f.profile ? `${S3_PREFIX}${f.profile}` : '',
				slug: f.slug,
				user_type: f.userType,
				user_id: f.followedId,
				is_verified: false,
				followBack: false,
				create_date: f.createDate,
				notice_date: '',
				on_explore: f.onExplore || 0,
				on_immediate: f.onImmediate || 0,
				on_notice: f.onNotice || 0,
			});
		}

		return {
			success: true,
			messages: "Follow Data List",
			data: {
				followerList,
				followerCount: [],
				followingList,
				followingCount: [],
			},
		};
	}

	async claimCompanyService(data: {
		email?: string;
		phone?: string;
		contact_person?: string;
		website?: string;
		company?: string;
		message?: string;
	}) {
		await companyEmployeeRequestRepositery.createClaimCompany({
			email: data.email,
			phone: data.phone,
			contactPerson: data.contact_person,
			website: data.website,
			company: data.company,
			message: data.message,
		});

		return { success: true, msg: "Record saved Successfully" };
	}

	async revokeDeleteAccountService(userId: number, companyId?: number) {
		await companyEmployeeRequestRepositery.revokeDeleteAccount(userId, companyId);

		return { success: true, messages: "Account revoked successfully" };
	}
}

export default new companyEmployeeRequestService();
