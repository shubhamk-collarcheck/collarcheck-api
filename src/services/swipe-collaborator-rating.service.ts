import repo from "../repositery/swipe-collaborator-rating.repositery";
import { sendSQSMessage } from "../utils/sqs";
import type {
	AlternateEmptyBody,
	CollaboratorRequestBody,
	AddSkillRatingBody,
	UpdateShowProfileRatingBody,
	ShowRatingQuery,
} from "../types/swipe-collaborator-rating.types";

const s3Prefix = process.env.S3_PREFIX || "";
const site = process.env.REACT_SITE || "https://www.collarcheck.com";

function nowSql() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function pageToSqlOffset(page: number, limit: number) {
	const p = Number(page) || 0;
	if (p <= 1) return 0;
	return p * limit - limit;
}

function stripXss(input: string): string {
	return String(input || "")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.trim();
}

/** Limit free-text skill names to ~7 words (PHP word_limiter) */
function wordLimiter(text: string, limit = 7): string {
	const words = text.trim().split(/\s+/).filter(Boolean);
	return words.slice(0, limit).join(" ");
}

function emailDomainOf(email: string | null | undefined): string {
	if (!email || !email.includes("@")) return "";
	return email.slice(email.lastIndexOf("@") + 1).toLowerCase().trim();
}

async function safeSqs(type: "SEND_EMAIL" | "SEND_WHATSAPP" | "SEND_PUSH", payload: Record<string, any>) {
	try {
		await sendSQSMessage({ type, payload });
	} catch (e) {
		console.error("SQS side-effect failed (non-fatal):", e);
	}
}

// ====== 1. swipe-number ======
export async function swipeNumberService(userId: number) {
	try {
		const user = await repo.findActiveUser(userId);
		if (!user) return { status: false, message: "User Detail not found!" };

		const phone = user.phone ?? null;
		const phoneVerify = user.phoneVerified ?? 0;
		const secondPhone = user.secondPhone ?? null;
		const secondPhoneVerify = user.secondPhoneVerify ?? 0;

		const primaryValid = !!phone && Number(phoneVerify) === 1;
		const secondaryValid = !!secondPhone && Number(secondPhoneVerify) === 1;

		if (!primaryValid || !secondaryValid) {
			return {
				status: false,
				message: "Check primary or secondary phone number must be provided and verified.",
			};
		}

		await repo.updateUserPhones(userId, secondPhone, phone);
		return { status: true, message: "Number Swipe successfully" };
	} catch {
		return { status: false, messages: "Someting went wrong!" };
	}
}

// ====== 2. alternate-empty ======
export async function alternateEmptyService(userId: number, body: AlternateEmptyBody) {
	try {
		const user = await repo.findActiveUser(userId);
		if (!user) return { status: false, message: "User Detail not found!" };

		const type = body.type?.trim();
		if (!type) return { status: false, message: "type is required!." };

		let updated = false;
		if (type === "phone" && user.secondPhone) {
			await repo.clearSecondPhone(userId);
			updated = true;
		}
		if (type === "email" && user.emailAlternate) {
			await repo.clearEmailAlternate(userId);
			updated = true;
		}

		if (updated) return { status: true, message: "Update successfully" };
		return { status: false, message: "Nothing to update!" };
	} catch {
		return { status: false, messages: "Someting went wrong!" };
	}
}

// ====== 3. clarity ======
export async function clarityService(numOfDays?: string | number) {
	const token = process.env.CLARITY_TOKEN;
	const query = new URLSearchParams();
	if (numOfDays != null && numOfDays !== "") query.set("numOfDays", String(numOfDays));
	const url = `https://www.clarity.ms/export-data/api/v1/project-live-insights?${query.toString()}`;

	try {
		const res = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token || ""}`,
				Accept: "application/json",
			},
			signal: AbortSignal.timeout(30_000),
		});
		const text = await res.text();
		const id = await repo.insertClarity(text);
		if (id) return { status: true, message: "record save success" };
		return { status: false, message: "record not saved" };
	} catch (e: any) {
		// curl-style error key for transport failures
		if (e?.name === "TimeoutError" || e?.name === "AbortError" || e?.cause || e?.message) {
			return { status: false, error: e?.message || String(e) };
		}
		return { status: false, message: "record not saved" };
	}
}

// ====== 4. collaborator-request ======
export async function collaboratorRequestService(
	companyId: number,
	loginUserId: number,
	body: CollaboratorRequestBody
) {
	try {
		if (!body.job_id) {
			return { status: false, message: "The Job Id field is required." };
		}

		const userIds = (body.user_id || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
		const jobId = body.job_id;
		const company = await repo.findUserById(companyId);
		const job = await repo.findJobById(jobId);

		const oldRows = await repo.getJobCollaborators(companyId, jobId);
		const oldUserIds = oldRows.map((r) => Number(r.userId)).filter((n) => Number.isFinite(n));
		const remainIds = oldUserIds.filter((id) => !userIds.includes(id));

		for (const uid of userIds) {
			const existing = await repo.findJobCollaborator(companyId, jobId, uid);
			if (!existing) {
				await repo.insertJobCollaborator({
					invitedBy: loginUserId,
					jobId,
					companyId,
					userId: uid,
				});
				const userdetail = await repo.findUserById(uid);
				if (userdetail && company) {
					await repo.createNotification({
						sender: company.id,
						receiver: userdetail.id,
						message: `You have been added as a collaborator by ${company.fullName || ""} to view the job post`,
						link: "/dashboard/user/jobs",
					});
				}
			}

			const userdetail = await repo.findUserById(uid);
			if (userdetail) {
				const name = `${userdetail.fname || ""} ${userdetail.lname || ""}`.trim();
				const companyName = company?.fullName || "";
				const jobTitle = job?.jobTitle || "";
				await safeSqs("SEND_EMAIL", {
					mail: {
						email: userdetail.email,
						subject: " You've Been Added as a Collaborator on a Job Post",
						name,
						company_name: companyName,
						job_title: jobTitle,
						link: `${site}dashboard/user/jobs`,
						template: 117,
					},
					trigger: {
						user: userdetail.id,
						email: userdetail.email,
						template: "117",
						create_date: nowSql(),
						modify_date: nowSql(),
					},
					action: " You've Been Added as a Collaborator on a Job Post",
				});
				if (userdetail.phone) {
					await safeSqs("SEND_WHATSAPP", {
						phone: userdetail.phone,
						campaign_id: 225,
						payload: { name, jobtitle: jobTitle },
						action: " You've Been Added as a Collaborator on a Job Post",
					});
				}
			}
		}

		// Company-side email/WhatsApp
		const collaboratorCount = await repo.countDistinctCollaborators(companyId, jobId);
		if (company) {
			const companyName = company.fullName || "";
			const jobTitle = job?.jobTitle || "";
			await safeSqs("SEND_EMAIL", {
				mail: {
					email: company.email,
					subject: "Collaborator Added Successfully!",
					name: companyName,
					job_title: jobTitle,
					total_collaborator: collaboratorCount,
					link: `${site}dashboard/company/jobs`,
					template: 118,
				},
				trigger: {
					user: company.id,
					email: company.email,
					template: "118",
					create_date: nowSql(),
					modify_date: nowSql(),
				},
				action: "Collaborator Added Successfully!",
			});
			if (company.phone) {
				await safeSqs("SEND_WHATSAPP", {
					phone: company.phone,
					campaign_id: 224,
					payload: { company: companyName, jobtitle: jobTitle, number: collaboratorCount },
					action: "Collaborator Added Successfully!",
				});
			}
		}

		for (const rid of remainIds) {
			await repo.deleteJobCollaborator(companyId, jobId, rid);
		}

		return { status: true, message: "collaborators saved successfully!" };
	} catch {
		return { status: false, messages: "Someting went wrong!" };
	}
}

// ====== 5. accept-colloborator ======
export async function acceptCollaboratorService(userId: number, collaboratorRowId: number) {
	try {
		const row = await repo.findCollaboratorRequest(collaboratorRowId, userId);
		if (!row) return { status: false, message: "Invalid collaborators request" };

		await repo.acceptCollaborator(collaboratorRowId);
		return { status: true, message: "Accept successfully!" };
	} catch {
		return { status: false, messages: "Someting went wrong!" };
	}
}

// ====== 6. collaborator-list ======
export async function collaboratorListService(userId: number, limit = 20, offsetPage = 0) {
	try {
		const offset = pageToSqlOffset(offsetPage, limit);
		const base = { userId, limit, offset };

		const [draftJobs, publishJobs, cancelJobs] = await Promise.all([
			repo.getCollaboratorJobs({ ...base, status: 3 }) as Promise<any[]>,
			repo.getCollaboratorJobs({ ...base, status: 1 }) as Promise<any[]>,
			repo.getCollaboratorJobs({ ...base, status: 2 }) as Promise<any[]>,
		]);

		const [draftJobsCounts, publishJobsCounts, cancelJobsCounts] = await Promise.all([
			repo.getCollaboratorJobs({ userId, status: 3 }) as Promise<number>,
			repo.getCollaboratorJobs({ userId, status: 1 }) as Promise<number>,
			repo.getCollaboratorJobs({ userId, status: 2 }) as Promise<number>,
		]);

		return {
			status: true,
			message: "Colloborator list",
			data: {
				draftJobs,
				publishJobs,
				cancelJobs,
				draftJobsCounts,
				publishJobsCounts,
				cancelJobsCounts,
			},
		};
	} catch {
		return { status: false, messages: "Someting went wrong!" };
	}
}

// ====== 7. job-collaborator-list ======
export async function jobCollaboratorListService(
	companyId: number,
	jobId: number | undefined,
	limit = 20,
	offsetPage = 0
) {
	try {
		const offset = pageToSqlOffset(offsetPage, limit);
		const jid = Number(jobId) || 0;

		const listRaw = (await repo.getJobCollaboratorPeople({
			companyId,
			jobId: jid,
			limit,
			offset,
		})) as any[];

		const totalCount = (await repo.getJobCollaboratorPeople({
			companyId,
			jobId: jid,
		})) as number;

		const list = listRaw.map((val) => ({
			id: val.id,
			full_name: val.full_name,
			slug: val.slug,
			individual_id: val.individual_id,
			profile: val.profile ? `${s3Prefix}${val.profile}` : val.social_image || null,
			designation_name: val.designation_name,
		}));

		return {
			status: true,
			message: "Colloborator list",
			data: { list, totalCount },
		};
	} catch {
		return { status: false, messages: "Someting went wrong!" };
	}
}

// ====== 8. get_question ======
export async function getQuestionService() {
	try {
		const rows = await repo.getChatQuestions();
		return {
			status: true,
			data: rows.map((r) => ({
				type: r.type,
				question: r.question,
				answer: r.answer,
			})),
		};
	} catch (e: any) {
		return { status: false, messages: e?.message || "Someting went wrong!" };
	}
}

// ====== 9. delete-email-domains ======
export async function deleteEmailDomainService(companyId: number, domainRowId: number) {
	try {
		const record = await repo.findDomainById(domainRowId, companyId);
		if (!record) return { status: false, message: "Record not found" };

		const email = (record.email || "").trim();
		const domain = (record.domain || "").trim();

		if (email) {
			const totalVerified = await repo.countVerifiedEmails(companyId);
			const isCurrentVerified = Number(record.isVerified) === 1;
			if (isCurrentVerified && totalVerified <= 1) {
				return { status: false, message: "At least one verified email is required" };
			}

			await repo.softDeleteDomain(domainRowId);
			const ed = emailDomainOf(email);
			if (ed) await repo.unverifyEmailBasedDomain(companyId, ed);

			return { status: true, message: "Email deleted successfully" };
		}

		if (domain) {
			await repo.softDeleteDomain(domainRowId);

			const relatedEmails = await repo.getActiveEmailsForCompany(companyId);
			let lastResult: unknown = true;
			for (const row of relatedEmails) {
				const ed = emailDomainOf(row.email);
				if (ed === domain.toLowerCase()) {
					await repo.softDeleteDomainByIdFull(row.id);
					lastResult = true;
				}
			}

			// Notify linked employees + company (side effects)
			const userDetails = await repo.getDomainLinkedUsers(companyId);
			const companyDomain = domain.toLowerCase();
			for (const user of userDetails) {
				const ed = emailDomainOf(user.work_email);
				if (ed === companyDomain) {
					await repo.clearWorkEmail(user.experience_id);
					if (user.email) {
						await safeSqs("SEND_EMAIL", {
							mail: {
								email: user.email,
								subject: "Domain Verification Request Rejected!",
								name: user.full_name,
								link: `${site}dashboard/user`,
								template: 115,
							},
							trigger: {
								user: user.user,
								email: user.email,
								template: 115,
								create_date: nowSql(),
								modify_date: nowSql(),
							},
							action: "Domain Verification Request Rejected!",
						});
					}
					if (user.phone) {
						await safeSqs("SEND_WHATSAPP", {
							phone: String(user.phone).trim(),
							campaign_id: 200,
							payload: { name: user.full_name },
							action: "Domain Verification Request Rejected!",
						});
					}
				}
			}

			const company = await repo.findUserById(companyId);
			if (company) {
				await safeSqs("SEND_EMAIL", {
					mail: {
						email: company.email,
						subject: "Domain Verification Request Rejected!",
						name: company.fullName,
						link: `${site}dashboard/company/my-domains`,
						template: 116,
					},
					trigger: {
						user: companyId,
						email: company.email,
						template: 116,
						create_date: nowSql(),
						modify_date: nowSql(),
					},
					action: "Domain Verification Request Rejected!",
				});
				if (company.phone) {
					await safeSqs("SEND_WHATSAPP", {
						phone: String(company.phone).trim(),
						campaign_id: 201,
						payload: { company: company.fullName },
						action: "Domain Verification Request Rejected!",
					});
				}
			}

			// PHP quirk: failure branch may still return status true
			if (lastResult) {
				return { status: true, message: "Domain deleted successfully" };
			}
			return { status: true, message: "Something went wrong!" };
		}

		return { status: false, message: "Record not found" };
	} catch (e: any) {
		return { status: false, message: e?.message || "Something went wrong!" };
	}
}

// ====== 10. user-highest-level ======
async function getVerificationProcessDetails(experienceId: number) {
	const row = await repo.getExperienceForVerification(experienceId);
	if (!row) {
		return { level1: false, level2: false, level3: false, level4: false };
	}

	const email = (row.workEmail || "").toLowerCase().trim();
	const emailDomain = emailDomainOf(email);
	const companyId = row.company || 0;

	const companyVerifyDetails = companyId ? await repo.getCompanyVerifiedDomains(companyId) : [];
	let level1 = false;

	if (companyVerifyDetails.length > 0) {
		let matchFound = false;
		let hasVerified = false;
		for (const val of companyVerifyDetails) {
			if (Number(val.isVerified) === 1) hasVerified = true;
			if (val.domain && val.domain.toLowerCase().trim() === emailDomain) {
				matchFound = true;
				break;
			}
			if (val.email && val.email.includes("@")) {
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
	if (level1 && companyId) {
		const existDomain = await repo.countCompanyVerifiedDomainOrEmail(companyId);
		level2 = existDomain > 0;
	}

	const level3 = Number(row.approved) === 1;
	const level4 = Number(row.approved) === 1 && !!row.salary;

	return { level1, level2, level3, level4 };
}

export async function userHighestLevelService() {
	const users = await repo.getDistinctExperienceUsers();
	if (!users.length) return true;

	const existing = await repo.getExistingUserLevels();
	const existingUsers = new Set(existing.map((r) => Number(r.user)));

	const insertData: { user: number; level: number }[] = [];
	const updateData: { user: number; level: number }[] = [];

	for (const userData of users) {
		const userId = Number(userData.user);
		if (!userId) continue;

		const employments = await repo.getUserExperiences(userId);
		let finalLevel = 0;

		for (const employment of employments) {
			const levels = await getVerificationProcessDetails(employment.id);
			if (levels.level4) finalLevel = Math.max(finalLevel, 4);
			else if (levels.level3) finalLevel = Math.max(finalLevel, 3);
			else if (levels.level2) finalLevel = Math.max(finalLevel, 2);
			else if (levels.level1) finalLevel = Math.max(finalLevel, 1);
		}

		if (finalLevel <= 0) continue;

		const row = { user: userId, level: finalLevel };
		if (existingUsers.has(userId)) updateData.push(row);
		else insertData.push(row);
	}

	if (insertData.length) await repo.insertUserLevels(insertData);
	for (const row of updateData) {
		await repo.updateUserLevel(row.user, row.level);
	}

	return true;
}

// ====== skill resolve + upsert helper ======
async function resolveSkillId(skillInput: string | number, userId: number, limitWords = true): Promise<number | null> {
	if (skillInput === null || skillInput === undefined || skillInput === "") return null;

	const asNum = Number(skillInput);
	if (Number.isFinite(asNum) && String(asNum) === String(skillInput).trim()) {
		return asNum;
	}

	let skillName = String(skillInput).trim();
	if (limitWords) skillName = wordLimiter(skillName, 7);
	if (!skillName) return null;

	const existing = await repo.findSkillByName(skillName);
	if (existing) return existing.id;
	return repo.insertSkill(skillName, userId);
}

async function upsertSkillRatings(opts: {
	reviewId: number;
	experienceId: number;
	userId: number;
	skillIds: (string | number)[];
	ratings: (string | number)[];
	existingUserId: number;
	historyId?: number;
	limitWords?: boolean;
}) {
	const skillIds = Array.isArray(opts.skillIds) ? opts.skillIds : [];
	const ratings = Array.isArray(opts.ratings) ? opts.ratings : [];
	const existingSkills = await repo.getSkillRatingsForReview(
		opts.reviewId,
		opts.existingUserId,
		opts.experienceId
	);

	for (let key = 0; key < skillIds.length; key++) {
		const skillInput = skillIds[key];
		if (skillInput === null || skillInput === undefined || skillInput === "") continue;
		const rating = ratings[key];
		if (rating === null || rating === undefined || rating === "") continue;

		const skillId = await resolveSkillId(skillInput, opts.userId, opts.limitWords !== false);
		if (!skillId) continue;

		const ratingNum = Number(rating);

		if (existingSkills[key]) {
			await repo.updateSkillRating(existingSkills[key].id, skillId, ratingNum);
			if (opts.historyId) {
				await repo.insertSkillRatingHistory({
					reviewHistoryId: opts.historyId,
					skillId,
					rating: ratingNum,
				});
			}
		} else {
			await repo.insertSkillRating({
				reviewId: opts.reviewId,
				experienceId: opts.experienceId,
				userId: opts.userId,
				skillId,
				rating: ratingNum,
			});
			if (opts.historyId) {
				await repo.insertSkillRatingHistory({
					reviewHistoryId: opts.historyId,
					skillId,
					rating: ratingNum,
				});
			}
		}
	}
}

// ====== 11–12. employee add-skill-rating ======
export async function addSkillRatingService(userId: number, body: AddSkillRatingBody, reviewId?: number) {
	try {
		const review = (body.review || "").trim();
		const skillIds = body.skill_id || [];
		const ratings = body.rating || [];

		if (!review && (!skillIds.length || !ratings.length)) {
			return {
				status: false,
				message: "Either review is required OR both skill and rating are required",
			};
		}

		const experienceID = body.experience_id ?? body.experience ?? 0;
		const exp = experienceID ? await repo.getExperienceByIdAny(Number(experienceID)) : null;

		const saveReview = stripXss(body.review || "");

		let finalReviewId = reviewId;

		if (reviewId) {
			const reviewdetail = await repo.getRatingByIdAny(reviewId);
			if (reviewdetail && Number(reviewdetail.approved) === 1) {
				return {
					status: false,
					messages: "Company have approved your rating, can't change review",
				};
			}
			await repo.updateExperienceRating(reviewId, {
				company: exp?.company ?? null,
				experience: experienceID || null,
				review: saveReview,
			});
		} else {
			finalReviewId = await repo.insertExperienceRating({
				company: exp?.company ?? null,
				experience: experienceID || null,
				review: saveReview,
			});
			if (!finalReviewId) {
				return { status: false, messages: "Review not added!!" };
			}
		}

		await upsertSkillRatings({
			reviewId: finalReviewId!,
			experienceId: Number(experienceID),
			userId,
			skillIds,
			ratings,
			existingUserId: userId,
			limitWords: true,
		});

		// Side effects (non-fatal)
		try {
			const experiencedetail = experienceID
				? await repo.getExperienceDetailForNotify(Number(experienceID))
				: null;
			if (experiencedetail) {
				await repo.createNotification({
					sender: userId,
					receiver: experiencedetail.company || 0,
					message: `Hi, ${experiencedetail.company_name || ""} you got a review from ${experiencedetail.fname || ""} ${experiencedetail.lname || ""}`,
					link: "/dashboard/company/reviews",
					redirect: "company-reviews",
				});

				const name = `${experiencedetail.fname || ""} ${experiencedetail.lname || ""}`.trim();
				await safeSqs("SEND_EMAIL", {
					mail: {
						email: experiencedetail.email,
						subject: "Your Review Request Has Been Sent",
						name,
						company_name: experiencedetail.company_name,
						link: `${site}dashboard/user/employment`,
						template: 65,
					},
					trigger: {
						user: experiencedetail.user,
						email: experiencedetail.email,
						template: "65",
						create_date: nowSql(),
						modify_date: nowSql(),
					},
					action: "Your Review Request Has Been Sent",
				});
				if (experiencedetail.user_phone) {
					await safeSqs("SEND_WHATSAPP", {
						phone: String(experiencedetail.user_phone).trim(),
						campaign_id: 214,
						payload: { name, company: experiencedetail.company_name },
						action: "Your Review Request Has Been Sent",
					});
				}
				await safeSqs("SEND_EMAIL", {
					mail: {
						email: experiencedetail.company_email,
						subject: `${name} Requested a Review`,
						name,
						company_name: experiencedetail.company_name,
						link: `${site}dashboard/company/reviews`,
						template: 66,
					},
					trigger: {
						user: experiencedetail.company,
						email: experiencedetail.company_email,
						template: "66",
						create_date: nowSql(),
						modify_date: nowSql(),
					},
					action: `${name} Requested a Review`,
				});
				if (experiencedetail.company_phone) {
					await safeSqs("SEND_WHATSAPP", {
						phone: String(experiencedetail.company_phone).trim(),
						campaign_id: 213,
						payload: { name, company: experiencedetail.company_name },
						action: `${name} Requested a Review`,
					});
				}
			}
		} catch (e) {
			console.error("addSkillRating side-effects:", e);
		}

		return {
			status: true,
			messages: reviewId ? "Review updated successfully" : "Review added successfully",
		};
	} catch {
		return { status: false, messages: "Access denied" };
	}
}

// ====== 13. edit-rating-list ======
export async function editReviewRatingService(reviewId: number) {
	try {
		const reviewDetails = await repo.getRatingById(reviewId);
		if (!reviewDetails) return { status: false, message: "Review not found" };

		const skillRating = await repo.getReviewsWithSkills(reviewId);
		const ratingSkills = skillRating.map((val) => ({
			id: val.skill_id,
			name: val.name,
			rating: Number(val.rating),
		}));

		return {
			status: true,
			data: {
				review_id: reviewId,
				experience: reviewDetails.experience,
				review: reviewDetails.review,
				ratingSkills,
			},
		};
	} catch {
		return { status: false, messages: "Access denied" };
	}
}

// ====== 14. show-rating ======
export async function showProfileRatingService(userId: number, q: ShowRatingQuery) {
	try {
		const experienceId = q.experience_id;
		const type = (q.type || "").trim();

		if (!experienceId) {
			return { status: false, message: "Experience ID required" };
		}

		const expDetails = await repo.getExperienceById(experienceId);
		if (!expDetails) {
			return { status: false, message: "Experience details not found!!" };
		}

		const isOwner = userId === expDetails.user;

		// Base reviews via skill_rating join (PHP parity)
		const reviewOpts: { approved?: number; skillShowHome?: number } = {};
		if (type === "show") reviewOpts.approved = 1;
		if (!isOwner) {
			reviewOpts.skillShowHome = 1;
			reviewOpts.approved = 1;
		}

		const reviewsVia = await repo.getReviewsViaSkillRating(experienceId, reviewOpts);
		if (!reviewsVia.length && type !== "public" && type !== "all") {
			return { status: false, message: "No data found" };
		}

		const reviewIds = reviewsVia.map((r) => r.id).filter(Boolean) as number[];
		const skillRows = reviewIds.length ? await repo.getReviewsWithSkills(reviewIds) : [];

		if (type === "show") {
			const reviewdetails = await repo.getApprovedReviewsForExperience(experienceId);
			const reviewArr = reviewdetails.map((rev) => ({
				review_id: rev.id,
				review: rev.review,
				approved: rev.approved,
				show_home: Number(rev.showHome),
			}));
			const skillArr = skillRows.map((row) => ({
				skill_rating_id: row.id,
				skill_id: row.skill_id,
				name: row.name,
				rating: Number(row.rating),
				show_home: Number(row.show_home),
			}));
			return {
				status: true,
				data: { review: reviewArr, skill_rating: skillArr },
			};
		}

		let final: any[] = [];

		if (type === "public") {
			const skillRowsAll = await repo.getSkillRowsByExperience(experienceId);
			const skillMap: Record<number, any[]> = {};
			for (const row of skillRowsAll) {
				const rid = row.review_id!;
				if (!skillMap[rid]) skillMap[rid] = [];
				skillMap[rid].push({
					skill_id: row.skill_id,
					name: row.name,
					rating: Number(row.rating),
					show_home: Number(row.show_home),
				});
			}

			const skillReviewIds = skillRowsAll.map((r) => r.review_id!).filter(Boolean);
			const mergedIds = [...new Set([...reviewIds, ...skillReviewIds])];
			const reviews = await repo.getApprovedRatingsByIds(mergedIds);

			for (const rev of reviews) {
				const allSkills = skillMap[rev.id] || [];
				const visibleSkills = allSkills.filter((s) => s.show_home === 1);
				const isReviewVisible = Number(rev.show_home) === 1;
				if (!isReviewVisible && !visibleSkills.length) continue;

				final.push({
					id: rev.id,
					review: isReviewVisible ? rev.review || "" : "",
					approved: Number(rev.approved),
					create_date: rev.create_date,
					show_home: Number(rev.show_home),
					skill_rating: visibleSkills,
				});
			}
		} else if (type === "all") {
			const wopts: { showHome?: number; approved?: number } = {};
			if (!isOwner) {
				wopts.showHome = 1;
				wopts.approved = 1;
			}
			const reviewdetails = await repo.getReviewsForExperience(experienceId, wopts);
			const skillMap: Record<number, any[]> = {};
			for (const row of skillRows) {
				const rid = row.review_id!;
				if (!skillMap[rid]) skillMap[rid] = [];
				skillMap[rid].push({
					skill_id: row.skill_id,
					name: row.name,
					rating: Number(row.rating),
					show_home: Number(row.show_home),
				});
			}
			final = reviewdetails.map((rev) => ({
				id: rev.id,
				review: rev.review,
				approved: Number(rev.approved),
				create_date: rev.createDate,
				show_home: Number(rev.showHome),
				skill_rating: skillMap[rev.id] || [],
			}));
		} else {
			// default grouped from skill join reviews
			const skillMap: Record<number, any[]> = {};
			for (const row of skillRows) {
				const rid = row.review_id!;
				if (!skillMap[rid]) skillMap[rid] = [];
				skillMap[rid].push({
					skill_id: row.skill_id,
					name: row.name,
					rating: Number(row.rating),
					show_home: Number(row.show_home),
				});
			}
			final = reviewsVia.map((rev) => ({
				id: rev.id,
				review: rev.review,
				approved: Number(rev.approved),
				create_date: rev.create_date,
				show_home: Number(rev.show_home),
				skill_rating: skillMap[rev.id!] || [],
			}));
		}

		if (!final.length && type !== "show") {
			// PHP still returns empty data array for public/all when built from empty — but early empty reviews returns No data found only before type branching for non-public
			// For public/all after processing empty is ok with status true + empty
		}

		return { status: true, data: final };
	} catch {
		return { status: false, message: "Access denied" };
	}
}

// ====== 15. update-show-profile-rating ======
export async function updateShowProfileRatingService(userId: number, body: UpdateShowProfileRatingBody) {
	try {
		const experienceId = body.experience_id;
		const reviewIds = (body.review_id || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
		const skillRatingIds = (body.skill_rating_id || [])
			.map(Number)
			.filter((n) => Number.isFinite(n) && n > 0);

		if (experienceId) {
			await repo.resetShowHomeForExperience(experienceId);
		}
		await repo.setReviewShowHome(reviewIds);
		await repo.setSkillRatingShowHome(skillRatingIds);

		return { status: true, message: "Updated successfully" };
	} catch {
		return { status: false, messages: "Access denied" };
	}
}

// ====== 16–17. company add-skill-rating ======
export async function addCompanyReviewService(
	companyId: number,
	loginUserId: number,
	body: AddSkillRatingBody,
	reviewId?: number
) {
	try {
		const reviewText = (body.review || "").trim();
		const skillIds = body.skill_id || [];
		const ratings = body.rating || [];

		if (!reviewText && (!skillIds.length || !ratings.length)) {
			return {
				status: false,
				message: "Either review is required OR both skill and rating are required",
			};
		}

		const experienceID = body.experience_id ?? body.experience;
		if (!experienceID) {
			return { status: false, messages: "Experience is required" };
		}

		const experienceDetail = await repo.getExperienceByIdAny(Number(experienceID));
		if (!experienceDetail) {
			return { status: false, messages: "Invalid experience" };
		}

		const review = stripXss(body.review || "");
		const showReview = String(body.show_review) === "1" ? 1 : 0;

		let finalReviewId = reviewId;
		let historyId: number | undefined;
		let reviewDetail: Awaited<ReturnType<typeof repo.getRatingByIdAny>> | null = null;

		if (reviewId) {
			reviewDetail = await repo.getRatingByIdAny(reviewId);
			if (!reviewDetail) {
				return { status: false, messages: "Review not found" };
			}

			const allreview = await repo.getRatingHistory(reviewDetail.id);
			if (Number(experienceDetail.stillWorking) === 0 && allreview.length >= 3) {
				return { status: false, messages: "No More Edits allowed" };
			}

			if (reviewDetail.expiry && reviewDetail.expiry < nowSql()) {
				return { status: false, messages: "Can't modify after 72 hours" };
			}

			const save: Record<string, unknown> = {
				company: experienceDetail.company ?? null,
				experience: experienceID,
				review,
				showReview,
				approved: 1,
			};

			if (!reviewDetail.expiry) {
				const expiry = new Date();
				expiry.setHours(expiry.getHours() + 72);
				save.expiry = expiry.toISOString().slice(0, 19).replace("T", " ");
				save.createDate = nowSql();
			}

			await repo.updateExperienceRating(reviewId, save);
			historyId = await repo.insertRatingHistory({
				ratingId: reviewId,
				review,
			});
			finalReviewId = reviewId;
		} else {
			if (Number(experienceDetail.stillWorking) === 0) {
				const existing = await repo.findRatingByExperience(experienceDetail.id);
				if (existing) {
					return { status: false, messages: "Review already exists" };
				}
			}

			const expiry = new Date();
			expiry.setHours(expiry.getHours() + 72);

			finalReviewId = await repo.insertExperienceRating({
				company: experienceDetail.company ?? null,
				experience: experienceID,
				review,
				showReview,
				rating: 0,
				link: body.link || null,
				addedBy: 1,
				status: 1,
				approved: 1,
				expiry: expiry.toISOString().slice(0, 19).replace("T", " "),
			});

			historyId = await repo.insertRatingHistory({
				ratingId: finalReviewId,
				rating: 0,
				review,
				link: body.link || null,
			});
		}

		if (experienceDetail.lastReview) {
			await repo.clearLastReview(experienceDetail.id);
		}

		// PHP: existing skills keyed by experience user; inserts use login user_id
		await upsertSkillRatings({
			reviewId: finalReviewId!,
			experienceId: Number(experienceID),
			userId: loginUserId,
			skillIds,
			ratings,
			existingUserId: experienceDetail.user || loginUserId,
			historyId,
			limitWords: false,
		});

		// Side effects
		try {
			const experiencedetail = await repo.getExperienceDetailForNotify(Number(experienceID));
			if (experiencedetail) {
				const msg = reviewDetail
					? `Hi, ${experiencedetail.fname || ""} ${experiencedetail.lname || ""} your reveiw has been updated by ${experiencedetail.company_name || ""}`
					: `Hi, ${experiencedetail.fname || ""} ${experiencedetail.lname || ""} you got a review from ${experiencedetail.company_name || ""}`;

				await repo.createNotification({
					sender: companyId,
					receiver: experiencedetail.user_id || experiencedetail.user || 0,
					message: msg,
					link: "/dashboard/user/employment",
					redirect: "profile",
					type: "employment",
				});

				const name = `${experiencedetail.fname || ""} ${experiencedetail.lname || ""}`.trim();
				await safeSqs("SEND_EMAIL", {
					mail: {
						email: experiencedetail.email,
						subject: `Your Review from ${experiencedetail.company_name || ""} is Here!`,
						name,
						company_name: experiencedetail.company_name,
						link: `${site}dashboard/user/employment`,
						template: 69,
					},
					action: "add review company side",
				});
				await safeSqs("SEND_EMAIL", {
					mail: {
						email: experiencedetail.company_email,
						subject: "Thank You for Sharing Your Feedback",
						name,
						company_name: experiencedetail.company_name,
						link: `${site}dashboard/user/employment`,
						template: 70,
					},
					action: "Thank You for Sharing Your Feedback",
				});
				if (experiencedetail.company_phone) {
					await safeSqs("SEND_WHATSAPP", {
						phone: experiencedetail.company_phone,
						campaign_id: 164,
						payload: { company: experiencedetail.company_name, name },
						action: "Thank You for Sharing Your Feedback",
					});
				}
			}
		} catch (e) {
			console.error("addCompanyReview side-effects:", e);
		}

		return {
			status: true,
			messages: reviewId ? "Review updated successfully" : "Review added successfully",
		};
	} catch (e: any) {
		return { status: false, messages: e?.message || "Access denied" };
	}
}

// ====== 18. rating-average ======
function calculateSessionAverage(
	sessions: { latest: number | null; previous: number | null; others: number | null },
	sessionWeight: { type: string | null; weight: string | null }[]
) {
	const latestSessionAvg = sessions.latest ?? null;
	const previousSessionAvg = sessions.previous ?? null;
	const otherSessionAvg = sessions.others ?? null;

	let totalValue = 0;
	let countSession = 0;
	if (latestSessionAvg) {
		totalValue += latestSessionAvg;
		countSession++;
	}
	if (previousSessionAvg) {
		totalValue += previousSessionAvg;
		countSession++;
	}
	if (otherSessionAvg) {
		totalValue += otherSessionAvg;
		countSession++;
	}
	const sessionAvg = countSession ? Math.round((totalValue / countSession) * 100) / 100 : 0;

	let progressiveSession = 0;
	for (const weight of sessionWeight) {
		const w = Number(weight.weight) || 0;
		switch (weight.type) {
			case "latest":
				progressiveSession += (latestSessionAvg || 0) * w;
				break;
			case "previous":
				progressiveSession += (previousSessionAvg || 0) * w;
				break;
			case "others":
				progressiveSession += (otherSessionAvg || 0) * w;
				break;
		}
	}

	return {
		session_avg: sessionAvg,
		progressive_session: Math.round(progressiveSession * 100) / 100,
	};
}

function calculateDesignationScore(
	sessionAvg: number,
	progressiveSession: number,
	criteriaData: { avg_rating: number }[],
	sessionWeight: { type: string | null; weight: string | null }[]
) {
	let totalCriteria = 0;
	let criteriaCount = 0;
	for (const row of criteriaData) {
		totalCriteria += row.avg_rating;
		criteriaCount++;
	}
	const criteriaLifetimesScore = criteriaCount
		? Math.round((totalCriteria / criteriaCount) * 100) / 100
		: 0;

	const uniqueSkillCount = criteriaData.length;
	const uniqueCriteria = Math.min(uniqueSkillCount * 0.5, 5);

	let final_score = 0;
	for (const weights of sessionWeight) {
		const weight = Number(weights.weight) || 0;
		switch (weights.type) {
			case "session_avg":
				final_score += sessionAvg * weight;
				break;
			case "progressive":
				final_score += progressiveSession * weight;
				break;
			case "criteria_lifetime":
				final_score += criteriaLifetimesScore * weight;
				break;
			case "unique_criteria":
				final_score += uniqueCriteria * weight;
				break;
		}
	}

	return {
		session_avg: sessionAvg,
		progressive_session: progressiveSession,
		criteria_lifetimes_score: criteriaLifetimesScore,
		unique_criteria: uniqueCriteria,
		final_designation_score: Math.round(final_score * 100) / 100,
	};
}

async function getAverageSessionData(userId: number, experienceId: number) {
	const sessions = await repo.getSessionReviewIds(userId, experienceId);
	const latestId = sessions[0]?.review_id ?? null;
	const previousId = sessions[1]?.review_id ?? null;
	const otherIds = sessions.slice(2).map((s) => s.review_id!).filter(Boolean);

	const latestAvg = Math.round((await repo.getAvgByReview(latestId)) * 100) / 100;
	const previousAvg = Math.round((await repo.getAvgByReview(previousId)) * 100) / 100;
	const othersAvg = Math.round((await repo.getAvgByMultipleReviews(otherIds)) * 100) / 100;

	const averageSession = { latest: latestAvg, previous: previousAvg, others: othersAvg };
	const criteriaData = await repo.getCriteriaAvgBySkill(userId, experienceId);
	const sessionWeight = await repo.getRatingWeights(1);
	const sessionScores = calculateSessionAverage(averageSession, sessionWeight);
	const sessionWeights = await repo.getRatingWeights(2);

	return calculateDesignationScore(
		sessionScores.session_avg,
		sessionScores.progressive_session,
		criteriaData,
		sessionWeights
	);
}

export async function ratingAverageService(userId: number) {
	try {
		if (!userId) {
			return { status: false, message: "User ID required" };
		}
		// PHP parity: experience_id HARDCODED to 3752
		const data = await getAverageSessionData(userId, 3752);
		return { status: true, designation_score: data };
	} catch (e: any) {
		return { status: false, message: e?.message || "Something went wrong!" };
	}
}
