import companyReviewRepositery from "../repositery/company-review.repositery";
import employmentRepositery from "../repositery/employee.repositery";
import { user_verified } from "./users.service";
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

	async getAllApplicationService(
		actingUserId: number,
		jobId?: number,
		keyword?: string,
		limit = 50,
		offsetPage = 0,
	) {
		const s3Prefix = process.env.S3_PREFIX || '';
		const pageToSqlOffset = (page: number, pageSize: number) =>
			page <= 1 ? 0 : page * pageSize - pageSize;
		const sqlOffset = pageToSqlOffset(offsetPage, limit);

		const collabRows = await companyReviewRepositery.getCollaboratorRows(actingUserId);
		const companyIds = [...new Set(
			collabRows.map((c) => c.companyId).filter((id): id is number => id != null)
		)];
		const jobIds = [...new Set(
			collabRows.map((c) => c.jobId).filter((id): id is number => id != null)
		)];

		const filter: {
			jobId?: number;
			companyId?: number;
			companyIds?: number[];
			keyword?: string;
			isVerify: boolean;
			limit: number;
			sqlOffset: number;
		} = {
			jobId,
			keyword,
			isVerify: await user_verified(actingUserId),
			limit,
			sqlOffset,
		};

		if (collabRows.length > 0) {
			filter.companyIds = companyIds;
			// When a specific job is requested, collaborator must be assigned to it
			if (jobId != null && !jobIds.includes(jobId)) {
				return {
					status: false as const,
					messages: "Access denied",
					job_title: '',
					data: [] as const,
					totalCounts: 0,
				};
			}
		} else {
			filter.companyId = actingUserId;
		}

		const { jobTitle, jobSlug } = jobId != null
			? await companyReviewRepositery.getJobTitleAndSlug(jobId)
			: { jobTitle: '', jobSlug: '' };

		const [rows, totalCounts] = await Promise.all([
			companyReviewRepositery.getAllApplication(filter),
			companyReviewRepositery.countAllApplication({
				jobId: filter.jobId,
				companyId: filter.companyId,
				companyIds: filter.companyIds,
				keyword: filter.keyword,
			}),
		]);

		const data = await Promise.all(rows.map(async (app) => {
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

			// Exploring flags (show_exploring not ported — use raw flags when on_explore)
			const onExplore = app.onExplore === 1 ? 1 : 0;
			const onImmediate = onExplore === 1 && app.onImmediate === 1 ? 1 : 0;
			const onNotice = onExplore === 1 && app.onNotice === 1 ? 1 : 0;

			return {
				id: app.id,
				job: app.jobTitle || jobTitle || '',
				job_slug: app.jobSlug || jobSlug || '',
				user_id: app.userId,
				individual_id: app.individualId ?? null,
				fname: `${app.fname || ''} ${app.lname || ''}`.trim(),
				email: app.email || '',
				phone: app.phone || '',
				city_name: app.cityName ?? null,
				state_name: app.stateName ?? null,
				country_name: app.countryName ?? null,
				profile: app.profile
					? `${s3Prefix}${app.profile}`
					: (app.socialImage || ''),
				slug: app.slug || '',
				company_name: app.companyName ?? null,
				designation_name: app.designationName ?? null,
				present_address: app.presentAddress ?? null,
				profile_description: app.profileDescription ?? null,
				date: app.createDate || '',
				resume: app.resume ? `${s3Prefix}${app.resume}` : '',
				resumeName: app.resumeName || '',
				expected_salary: app.expectedSalary ?? null,
				notice_period: app.noticePeriod ?? null,
				notice_date: app.noticeDate ?? null,
				isVerified: !!isVerified,
				rating,
				userRating,
				on_explore: onExplore,
				on_immediate: onImmediate,
				on_notice: onNotice,
			};
		}));

		return {
			status: true as const,
			messages: "Application",
			job_title: jobTitle,
			data,
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
