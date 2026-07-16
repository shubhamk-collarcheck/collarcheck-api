import companyEmployeeRequestRepositery from "../repositery/company-employee-request.repositery";

const S3_PREFIX = process.env.S3_PREFIX || '';

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

	async dashboardService(companyId: number, limit = 10, offset = 0) {
		const stats = await companyEmployeeRequestRepositery.getDashboardStats(companyId);
		const pendingRequests = await companyEmployeeRequestRepositery.getPendingEmploymentRequests(companyId);

		return {
			success: true,
			data: {
				postedJobs: stats.postedJobs,
				applications: 0,
				currentEmployies: stats.currentEmployies,
				followRequests: [],
				messages: 0,
				employementRequestList: pendingRequests.map(r => ({
					id: r.id,
					userName: `${r.fname || ''} ${r.lname || ''}`.trim(),
					profile: r.profile ? `${S3_PREFIX}${r.profile}` : '',
					approved: r.approved,
					designation: r.designationName || '',
				})),
				percentage: { total: 0, uncomplete: [], complete: [] },
				allApplicationList: [],
				mostAppliedJob: [],
			},
		};
	}

	async sidebarCountService(companyId: number) {
		const reviewRequest = await companyEmployeeRequestRepositery.getPendingReviewCount(companyId);
		const employmentRequest = await companyEmployeeRequestRepositery.getPendingEmploymentRequests(companyId);
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
		const relations = await companyEmployeeRequestRepositery.getCompanyRelations(userId);

		const myCompany = [];
		for (const rel of relations) {
			const followerCount = await companyEmployeeRequestRepositery.getCompanyFollowerCount(rel.companyId || 0);
			const followingCount = await companyEmployeeRequestRepositery.getCompanyConnectionCount(rel.companyId || 0);
			const industryName = rel.industry ? await companyEmployeeRequestRepositery.getIndustryName(rel.industry) : '';

			myCompany.push({
				id: rel.companyId,
				individual_id: rel.individualId,
				profile: rel.profile ? `${S3_PREFIX}${rel.profile}` : '',
				name: rel.fname || '',
				city_name: '',
				state_name: '',
				country_name: '',
				claim_status: rel.claimStatus,
				status: rel.status,
				slug: rel.slug,
				company_size_name: '',
				industry_name: industryName,
				is_verified: rel.claimStatus === 1,
				followData: { follower: followerCount, following: followingCount },
				following: { requestSend: false, requestApproved: false },
				exploreTalent: rel.onExplore,
				user_group: [],
				user_details: [],
				user_count: 0,
				account_deletion: false,
				currentStatus: {},
				isSuperAdmin: rel.type === 1,
			});
		}

		return { success: true, data: { myCompany } };
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
