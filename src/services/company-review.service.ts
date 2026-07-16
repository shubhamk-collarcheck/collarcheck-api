import companyReviewRepositery from "../repositery/company-review.repositery";
import { Request } from "express";

const S3_PREFIX = process.env.S3_PREFIX || '';

function formatDate(dateStr: string | null | undefined): string {
	if (!dateStr) return '';
	if (dateStr.includes(' ')) return dateStr;
	return new Date(dateStr).toISOString().slice(0, 19).replace('T', ' ');
}

function calculateExpiry(createDate: string): string {
	const date = new Date(createDate);
	date.setHours(date.getHours() + 72);
	return date.toISOString().slice(0, 19).replace('T', ' ');
}

function calculateLeaveExpiry(workedTillDate: string): string {
	const endDate = new Date(workedTillDate);
	const now = new Date();
	const expiry = new Date(endDate);
	expiry.setHours(expiry.getHours() + 72);

	if (expiry < now) {
		const adjusted = new Date(now);
		adjusted.setHours(adjusted.getHours() + 72);
		return adjusted.toISOString().slice(0, 19).replace('T', ' ');
	}
	return expiry.toISOString().slice(0, 19).replace('T', ' ');
}

function buildReviewObject(rating: any, user: any, experience: any) {
	const baseUrl = S3_PREFIX;
	const profileUrl = user?.profile ? `${baseUrl}${user.profile}` : '';
	const designation = experience?.designation || 0;

	return {
		id: rating.id,
		user: `${user?.fname || ''} ${user?.lname || ''}`.trim(),
		profile: profileUrl,
		rating: rating.rating,
		review: rating.review || '',
		designation: designation,
		approved: rating.approved,
		status: rating.approved === 1 ? 'complete' : rating.approved === 0 ? 'pending' : 'rejected',
		doc: rating.doc ? (typeof rating.doc === 'string' ? JSON.parse(rating.doc) : rating.doc) : [],
		edits: 0,
		last_edit: rating.createDate || '',
		hours_left: rating.expiry || '',
		link: rating.link || '',
		averageRating: 0,
		skill_rating: [] as any[],
		history: [] as any[],
		experience_id: rating.experience,
		still_working: experience?.stillWorking || 0,
		lastReview: experience?.lastReview || 0,
		user_slug: user?.slug || '',
	};
}

class companyReviewService {

	async getAllReviewService(companyId: number, keyword?: string, userId?: string) {
		const s3Prefix = process.env.S3_PREFIX || '';

		// Get experiences with reviews (exclude lastReview)
		const experiences = await companyReviewRepositery.getAllExperience(companyId, true);
		const lastReviewExperiences = await companyReviewRepositery.getAllExperience(companyId, false, true);

		const pendingData: any[] = [];
		const completeData: any[] = [];
		const allEmployee: any[] = [];
		const lastReviewArr: any[] = [];

		// Process regular experiences
		for (const exp of experiences) {
			const user = exp.user ? await companyReviewRepositery.getUserById(exp.user) : null;
			const reviews = await companyReviewRepositery.getAllExperienceRating(exp.id, companyId);

			if (reviews.length === 0) {
				// Employment only, no review
				const empObj = {
					id: exp.id,
					user: `${user?.fname || ''} ${user?.lname || ''}`.trim(),
					profile: user?.profile ? `${s3Prefix}${user.profile}` : '',
					designation: exp.designation,
					still_working: exp.stillWorking,
					experience_id: exp.id,
					status: 'employment',
				};
				allEmployee.push(empObj);
			}

			for (const review of reviews) {
				const history = await companyReviewRepositery.getReviewHistory(review.id);
				const avgRating = await companyReviewRepositery.getSkillRatingAverage(review.id);
				const skillRatings = await companyReviewRepositery.getSkillRatings(review.id);

				const reviewObj = {
					id: review.id,
					user: `${user?.fname || ''} ${user?.lname || ''}`.trim(),
					profile: user?.profile ? `${s3Prefix}${user.profile}` : '',
					rating: review.rating,
					review: review.review || '',
					designation: exp.designation,
					approved: review.approved,
					status: review.approved === 1 ? 'complete' : review.approved === 0 ? 'pending' : 'rejected',
					doc: review.doc ? (typeof review.doc === 'string' ? JSON.parse(review.doc) : review.doc) : [],
					edits: history.length,
					last_edit: review.createDate || '',
					hours_left: review.expiry || '',
					link: review.link || '',
					averageRating: Number(avgRating),
					skill_rating: skillRatings,
					history: history.map((h: any) => ({
						rating: h.rating,
						review: h.review,
						create_date: h.createDate,
					})),
					experience_id: review.experience,
					still_working: exp.stillWorking,
					lastReview: exp.lastReview || 0,
					user_slug: user?.slug || '',
				};

				if (review.approved === 0) {
					pendingData.push(reviewObj);
				} else if (review.approved === 1) {
					completeData.push(reviewObj);
				}

				allEmployee.push(reviewObj);
			}
		}

		// Process lastReview experiences
		for (const exp of lastReviewExperiences) {
			const user = exp.user ? await companyReviewRepositery.getUserById(exp.user) : null;
			const reviews = await companyReviewRepositery.getAllExperienceRating(exp.id, companyId);

			if (reviews.length === 0) {
				const empObj = {
					id: exp.id,
					user: `${user?.fname || ''} ${user?.lname || ''}`.trim(),
					profile: user?.profile ? `${s3Prefix}${user.profile}` : '',
					designation: exp.designation,
					still_working: exp.stillWorking,
					experience_id: exp.id,
					status: 'employment',
				};
				lastReviewArr.push(empObj);
			}

			for (const review of reviews) {
				const history = await companyReviewRepositery.getReviewHistory(review.id);
				const avgRating = await companyReviewRepositery.getSkillRatingAverage(review.id);
				const skillRatings = await companyReviewRepositery.getSkillRatings(review.id);

				const reviewObj = {
					id: review.id,
					user: `${user?.fname || ''} ${user?.lname || ''}`.trim(),
					profile: user?.profile ? `${s3Prefix}${user.profile}` : '',
					rating: review.rating,
					review: review.review || '',
					designation: exp.designation,
					approved: review.approved,
					status: review.approved === 1 ? 'complete' : review.approved === 0 ? 'pending' : 'rejected',
					doc: review.doc ? (typeof review.doc === 'string' ? JSON.parse(review.doc) : review.doc) : [],
					edits: history.length,
					last_edit: review.createDate || '',
					hours_left: review.expiry || '',
					link: review.link || '',
					averageRating: Number(avgRating),
					skill_rating: skillRatings,
					history: history.map((h: any) => ({
						rating: h.rating,
						review: h.review,
						create_date: h.createDate,
					})),
					experience_id: review.experience,
					still_working: exp.stillWorking,
					lastReview: exp.lastReview || 0,
					user_slug: user?.slug || '',
				};
				lastReviewArr.push(reviewObj);
			}
		}

		return {
			pending_count: pendingData.length,
			active_count: completeData.length,
			employement_count: allEmployee.length - pendingData.length - completeData.length,
			allcount: allEmployee.length + lastReviewArr.length,
			pendingData,
			completeData,
			allEmployee,
			lastReviewArr,
		};
	}

	async addReviewService(companyId: number, data: {
		experience_id: number;
		rating: number;
		review: string;
		link?: string;
		show_review?: number;
		doc?: string;
	}, reviewId?: number) {
		const experience = await companyReviewRepositery.getExperienceById(data.experience_id);
		if (!experience) {
			return { success: false, message: "Experience not found" };
		}

		if (reviewId) {
			// Update existing review
			const existingReview = await companyReviewRepositery.getReviewById(reviewId);
			if (!existingReview) {
				return { success: false, message: "Review not found" };
			}

			const editCount = await companyReviewRepositery.getReviewHistoryCount(reviewId);
			if (editCount >= 3) {
				return { success: false, message: "No More Edits allowed" };
			}

			if (existingReview.expiry) {
				const expiryDate = new Date(existingReview.expiry);
				if (expiryDate < new Date()) {
					return { success: false, message: "Can't modify after 72 hours" };
				}
			}

			const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
			await companyReviewRepositery.updateReview(reviewId, {
				approved: 1,
				showReview: data.show_review,
				createDate: now,
				rating: data.rating,
				review: data.review,
				doc: data.doc,
				link: data.link,
			});

			await companyReviewRepositery.createReviewHistory({
				ratingId: reviewId,
				rating: data.rating,
				review: data.review,
				doc: data.doc,
				link: data.link,
			});

			return { success: true, message: "Successfully updated" };
		} else {
			// Create new review
			const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
			const expiry = calculateExpiry(now);

			const reviewId = await companyReviewRepositery.createReview({
				experience: data.experience_id,
				company: companyId,
				rating: data.rating,
				review: data.review,
				doc: data.doc,
				link: data.link,
				addedBy: companyId,
				showReview: data.show_review,
				expiry,
			});

			await companyReviewRepositery.createReviewHistory({
				ratingId: reviewId,
				rating: data.rating,
				review: data.review,
				doc: data.doc,
				link: data.link,
			});

			if (experience.lastReview === 1) {
				await companyReviewRepositery.clearLastReviewFlag(data.experience_id);
			}

			// Create notification
			if (experience.user) {
				await companyReviewRepositery.createNotification(
					companyId,
					experience.user,
					`New review added for your experience`,
					`/experience/${data.experience_id}`,
					'review',
				);
			}

			return { success: true, message: "Successfully added" };
		}
	}

	async rejectReviewService(companyId: number, reviewId: number) {
		const review = await companyReviewRepositery.rejectReview(reviewId, companyId);
		if (!review) {
			return { success: false, message: "Access Denied!" };
		}

		// Send notification
		const experience = await companyReviewRepositery.getExperienceById(review.experience || 0);
		if (experience?.user) {
			await companyReviewRepositery.createNotification(
				companyId,
				experience.user,
				`Your review request has been rejected`,
				`/experience/${review.experience}`,
				'review',
			);
		}

		return { success: true, message: " Review rejected Sucessfully!" };
	}

	async viewReviewDetailService(companyId: number, experienceId: number) {
		const experience = await companyReviewRepositery.getExperienceById(experienceId);
		if (!experience) {
			return { success: false, message: "No experience found!" };
		}

		const user = await companyReviewRepositery.getUserById(experience.user || 0);
		const reviews = await companyReviewRepositery.getAllExperienceRating(experienceId, companyId);

		const s3Prefix = process.env.S3_PREFIX || '';
		const reviewData = [];

		for (const review of reviews) {
			const history = await companyReviewRepositery.getReviewHistory(review.id);

			reviewData.push({
				id: review.id,
				user: `${user?.fname || ''} ${user?.lname || ''}`.trim(),
				rating: review.rating,
				review: review.review || '',
				designation: experience.designation,
				approved: review.approved,
				status: review.approved === 1 ? 'complete' : review.approved === 0 ? 'pending' : 'rejected',
				doc: review.doc ? (typeof review.doc === 'string' ? JSON.parse(review.doc) : review.doc) : [],
				edits: history.length,
				last_edit: review.createDate || '',
				hours_left: review.expiry || '',
				history: history.map((h: any) => ({
					rating: h.rating,
					review: h.review,
					create_date: h.createDate,
				})),
			});
		}

		return {
			success: true,
			message: "review edit list",
			data: {
				user: `${user?.fname || ''} ${user?.lname || ''}`.trim(),
				profile: user?.profile ? `${s3Prefix}${user.profile}` : '',
				designation: experience.designation,
				review: reviewData,
			},
		};
	}

	async addHelpService(companyId: number, data: {
		id: number;
		subject: string;
		message: string;
	}) {
		const experience = await companyReviewRepositery.getExperienceById(data.id);
		if (!experience) {
			return { success: false, message: "Experience not found" };
		}

		await companyReviewRepositery.createHelp({
			company: companyId,
			experience: data.id,
			subject: data.subject,
			message: data.message,
		});

		return { success: true, message: "Successfully added" };
	}

	async getAllApplicationService(companyId: number, jobId: number, keyword?: string, limit = 50, offset = 0) {
		// Check collaborator access
		const collaborators = await companyReviewRepositery.getCollaboratorCompanyIds(companyId);
		const isCollaborator = collaborators.length > 0;

		if (isCollaborator) {
			const assignedJobIds = collaborators.map(c => c.jobId).filter(Boolean);
			if (!assignedJobIds.includes(jobId)) {
				return { success: false, message: "Access denied", data: [], job_title: '', totalCounts: 0 };
			}
		}

		const applications = await companyReviewRepositery.getAllApplication(jobId, companyId, keyword, limit, offset);
		const totalCounts = await companyReviewRepositery.getApplicationCount(jobId);
		const jobTitle = await companyReviewRepositery.getJobTitle(jobId);

		const s3Prefix = process.env.S3_PREFIX || '';

		const data = applications.map(app => ({
			id: app.id,
			job: jobTitle,
			job_slug: '',
			user_id: app.userId,
			individual_id: app.individualId || '',
			fname: `${app.fname || ''} ${app.lname || ''}`.trim(),
			email: app.email || '',
			phone: app.phone || '',
			city_name: '',
			state_name: '',
			country_name: '',
			profile: app.profile ? `${s3Prefix}${app.profile}` : '',
			slug: app.slug || '',
			company_name: '',
			designation_name: '',
			present_address: app.presentAddress || '',
			profile_description: app.profileDescription || '',
			date: app.createDate || '',
			resume: app.resume ? `${s3Prefix}${app.resume}` : '',
			resumeName: app.resumeName || '',
			expected_salary: app.expectedSalary || '',
			notice_period: app.noticePeriod || 0,
			notice_date: app.noticeDate || '',
			isVerified: false,
			rating: { noofrecord: 0, avgRating: 0 },
			userRating: 0,
			on_explore: app.onExplore || 0,
			on_immediate: app.onImmediate || 0,
			on_notice: app.onNotice || 0,
		}));

		return {
			success: true,
			message: "Application",
			data,
			job_title: jobTitle,
			totalCounts,
		};
	}

	async updateBasicExperienceService(companyId: number, id: number) {
		const updateRecord = await companyReviewRepositery.getUpdateExperienceRecord(id);
		if (!updateRecord) {
			return { success: false, message: "Record not found!" };
		}

		const user = updateRecord.user ? await companyReviewRepositery.getUserById(updateRecord.user) : null;
		if (updateRecord.user && !user) {
			return { success: false, message: "User not found!" };
		}

		const experience = await companyReviewRepositery.getExperienceById(updateRecord.experienceId);
		if (!experience) {
			return { success: false, message: "Experience not found!" };
		}

		if (updateRecord.type === 1) {
			// Leave/end employment
			const workedTillDate = updateRecord.workedTillDate || new Date().toISOString().slice(0, 10);
			await companyReviewRepositery.applyLeaveUpdate(updateRecord.experienceId, workedTillDate);

			if (user?.currentCompany === companyId) {
				await companyReviewRepositery.updateUserCompanyPosition(updateRecord.user, {
					currentCompany: null,
					currentPossition: null,
				});
			}

			const expiry = calculateLeaveExpiry(workedTillDate);
			await companyReviewRepositery.updateExperienceExpiry(updateRecord.experienceId, expiry);
		} else if (updateRecord.type === 2) {
			// Promotion/salary change
			await companyReviewRepositery.applyPromotionUpdate(updateRecord.experienceId, {
				salary: updateRecord.salary || undefined,
				salaryInhand: updateRecord.salaryInhand || undefined,
				salaryMode: updateRecord.salaryMode || undefined,
				designation: updateRecord.designation || undefined,
			});

			if (experience.stillWorking === 1 && experience.company === companyId) {
				await companyReviewRepositery.updateUserCompanyPosition(updateRecord.user, {
					currentPossition: updateRecord.designation || null,
				});
			} else if (!user?.currentCompany) {
				await companyReviewRepositery.updateUserCompanyPosition(updateRecord.user, {
					currentPossition: updateRecord.designation || null,
					currentCompany: companyId,
				});
			}
		}

		await companyReviewRepositery.deleteUpdateExperienceRecord(id);

		return { success: true, message: "Update successfully !" };
	}
}

export default new companyReviewService();
