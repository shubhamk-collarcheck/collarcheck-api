import newRoutesRepositery from "../repositery/new-routes.repositery";
import { get_user_detail, user_verified } from "./users.service";
import { globalSearchService } from "./general.service";
import { allCertificateListService } from "./certificate.service";
import { allEducationListService } from "./education.service";
import { allPortfolioListService } from "./portfolio.service";
import { allExperienceService } from "./employee.service";
import { sendSQSMessage } from "../utils/sqs";
import {
	parseResume,
	extractPdfText,
	fetchUrlBuffer,
	resumePublicUrl,
	emptyParsedResume,
} from "../utils/resumeParse";
import type {
	ReportReviewBody,
	RequestDeleteAccountBody,
	AiGenerateBody,
	FieldSuggestionQuery,
	ManualDocumentBody,
	HiredIdsBody,
} from "../types/new-routes.types";

const s3Prefix = process.env.S3_PREFIX || "";

function nowPlusDays(days: number) {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().slice(0, 19).replace("T", " ");
}

function pageToSqlOffset(page: number, limit: number) {
	const p = Number(page) || 0;
	if (p <= 1) return 0;
	return p * limit - limit;
}

function daysBetween(a: Date, b: Date) {
	const ms = a.getTime() - b.getTime();
	return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ====== 1. splace ======
export async function splaceService() {
	const settings = await newRoutesRepositery.getWebSettings();
	const base = (process.env.PUBLIC_BASE_URL || process.env.S3_PREFIX || "").replace(/\/+$/, "");
	const withBase = (v?: string) => {
		if (!v) return v || "";
		if (/^https?:\/\//i.test(v)) return v;
		return base ? `${base}/${String(v).replace(/^\//, "")}` : v;
	};
	return {
		status: true,
		data: {
			app_name: settings.app_name || settings.config_name || "CollarCheck",
			app_tag_line: settings.app_tag_line || settings.tag_line || "",
			app_logo: withBase(settings.app_logo || settings.logo || ""),
			splace_sceen: withBase(
				settings.splace_sceen || settings.splash_screen || settings.splace_screen || ""
			),
			splace_background_color:
				settings.splace_background_color || settings.splash_background_color || "#FFFFFF",
			app_background_color: settings.app_background_color || "#000000",
		},
	};
}

// ====== 2. report-review ======
export async function reportReviewService(userId: number, body: ReportReviewBody) {
	const review = await newRoutesRepositery.findActiveReview(body.review_id);
	if (!review) {
		return { status: false, messages: "Invalid Review ID" };
	}
	const existing = await newRoutesRepositery.findExistingReport(userId, body.review_id);
	if (existing) {
		return { status: false, messages: "Already Reported!" };
	}
	try {
		await newRoutesRepositery.insertReport({
			userId,
			reviewId: body.review_id,
			message: body.message,
		});
		return { status: true, messages: "Report submitted successfully !" };
	} catch (e) {
		console.error("[report-review]", e);
		return { status: false, messages: "Something went wrong please retry !" };
	}
}

// ====== 3. all-delete-option ======
export async function allDeleteOptionService() {
	const rows = await newRoutesRepositery.listDeleteOptions();
	return {
		status: true,
		data: rows.map((r) => ({ id: r.id, name: r.title || "" })),
	};
}

// ====== 4. request-delete-account ======
export async function requestDeleteAccountService(
	userId: number,
	body: RequestDeleteAccountBody
) {
	const opt = await newRoutesRepositery.findDeleteOption(body.option_id);
	if (!opt) return { status: false, messages: "Invalid Option ID" };
	const open = await newRoutesRepositery.findOpenDeleteRequest(userId, body.option_id);
	if (open) return { status: false, messages: "Already Requested!" };
	try {
		await newRoutesRepositery.insertDeleteRequest({
			userId,
			optionId: body.option_id,
			message: body.message,
			expiry: nowPlusDays(30),
		});
		return { status: true, messages: "Request submitted successfully !" };
	} catch (e) {
		console.error("[request-delete-account]", e);
		return { status: false, messages: "Something went wrong please retry !" };
	}
}

// ====== 5. ai-generate ======
function buildSystemPrompt(type: string, body: AiGenerateBody, userCtx: any): string {
	switch (type) {
		case "USER_DESCRIPTION":
			return `Write a professional bio (max 800 chars) for a user. Base only on: query="${body.query}", designation=${userCtx?.designationName || body.designation || ""}, skills context. Do not invent metrics.`;
		case "COMPANY_DESCRIPTION":
			return `Write a company description. company_name=${body.company_name}, industry=${body.industry}, company_size=${body.company_size}, incorporate_date=${body.incorporate_date}. Use query: ${body.query}`;
		case "EMPLOYMENT_DESCRIPTION":
			return `Write an employment role description for designation=${body.designation} in department=${body.department}. Query: ${body.query}`;
		case "PORTFOLIO_DESCRIPTION":
			return `Write a portfolio project description (30-50 words) for title=${body.title}. Query: ${body.query}`;
		case "REVIEW_USER":
			return `Write a professional review of a person in ≤80 words based on: ${body.query}`;
		case "REVIEW_COMPANY":
			return `Write a professional company review in ≤80 words based on: ${body.query}`;
		default:
			return `Rewrite the following into 2-3 bullet options of about 30 words each. Query: ${body.query}`;
	}
}

export async function aiGenerateService(userId: number, body: AiGenerateBody) {
	const user = await get_user_detail(userId);
	const apiKey = process.env.GPT || process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return { status: false, messages: "GPT API key not configured" };
	}

	const system = buildSystemPrompt(body.type, body, user);
	const userContent =
		body.type === "USER_DESCRIPTION" ? body.query || "" : body.query;

	try {
		const res = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: process.env.GPT_MODEL || "gpt-4.1-mini",
				temperature: 0.3,
				max_tokens: 300,
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: userContent },
				],
			}),
			signal: AbortSignal.timeout(10_000),
		});
		const raw = await res.text();
		if (!res.ok) {
			return { status: false, messages: raw };
		}
		const json = JSON.parse(raw);
		const text =
			json?.choices?.[0]?.message?.content ||
			json?.choices?.[0]?.text ||
			"";
		return { status: true, data: String(text) };
	} catch (e: any) {
		return { status: false, messages: e?.message || String(e) };
	}
}

// ====== 6. message-search ======
export async function messageSearchService(userId: number, keyword: string) {
	const search = await globalSearchService(keyword || "", undefined, 20, 0, {});
	const data: any[] = [];

	for (const u of search.userList || []) {
		data.push({
			id: u.id,
			individual_id: u.individual_id || u.individualId || null,
			name: u.fname || u.name || u.full_name || "",
			profile: u.profile || "",
			slug: u.slug || "",
			company_name: u.company_name || "",
			designation_name: u.designation_name || "",
			userRating: u.userRating ?? u.rating ?? 0,
			is_verified: !!(u.is_verified ?? u.emailVerified ?? u.phoneVerified),
			on_explore: u.on_explore ?? 0,
			on_immediate: u.on_immediate ?? 0,
			on_notice: u.on_notice ?? 0,
			show_notice_popup: false,
		});
	}

	for (const c of search.companyList || []) {
		const exploreTalent =
			c.exploreTalent ?? (await newRoutesRepositery.hasActiveJobs(c.id));
		data.push({
			id: c.id,
			individual_id: c.individual_id || c.individualId || null,
			name: c.fname || c.name || "",
			profile: c.profile || "",
			slug: c.slug || "",
			country_name: c.country_name || null,
			state_name: c.state_name || c.stateName || null,
			city_name: c.city_name || c.cityName || null,
			industry_name: c.industry_name || c.industryName || null,
			is_verified: !!(c.is_verified),
			exploreTalent,
		});
	}

	return { status: true, data };
}

// ====== 7. field-suggestion ======
export async function fieldSuggestionService(query: FieldSuggestionQuery) {
	const limit = query.limit || 30;
	const sqlOffset = pageToSqlOffset(query.offset || 0, limit);
	const keyword = query.keyword || "";
	const field = (query.field || "").toLowerCase();

	if (field === "user") {
		const rows = await newRoutesRepositery.suggestUsers(keyword, limit, sqlOffset);
		const data = [];
		for (const r of rows) {
			data.push({
				id: r.id,
				name: [r.fname, r.lname].filter(Boolean).join(" "),
				profile: r.profile ? `${s3Prefix}${r.profile}` : r.socialImage || "",
				individual_id: r.individualId,
				designation_name: r.designationName || "",
				company_name: r.companyName || "",
				userRating: 0,
				is_verified: await user_verified(r.id),
			});
		}
		return { status: true, data };
	}

	if (field === "company") {
		const nonclaim = (query.type || "").toLowerCase() === "nonclaim";
		const rows = await newRoutesRepositery.suggestCompanies(
			keyword,
			limit,
			sqlOffset,
			nonclaim
		);
		const data = [];
		for (const r of rows) {
			data.push({
				id: r.id,
				company: r.fname,
				company_logo: r.profile ? `${s3Prefix}${r.profile}` : r.socialImage || "",
				individual_id: r.individualId,
				city_name: r.cityName || "",
				state_name: r.stateName || "",
				industry_name: r.industryName || "",
				is_verified: await user_verified(r.id),
				total_employment: r.totalEmployment ?? 0,
				claim_status: r.claimStatus ?? 0,
			});
		}
		return { status: true, data };
	}

	if (field === "benefit_id" || field === "benefits") {
		const rows = await newRoutesRepositery.suggestBenefits(keyword, limit, sqlOffset);
		return {
			status: true,
			data: rows.map((r) => ({ id: r.id, name: r.name })),
		};
	}

	if (field) {
		const rows = await newRoutesRepositery.suggestFromWhitelist(
			field,
			keyword,
			limit,
			sqlOffset
		);
		return {
			status: true,
			data: rows.map((r) => ({ id: r.id, name: r.name })),
		};
	}

	return { status: true, data: [] };
}

// ====== 8. check-ccid ======
export async function checkCcidService(ccid: string) {
	const row = await newRoutesRepositery.findByIndividualId(ccid.trim());
	if (!row) return { status: false, messages: "Invalid Referral Code" };
	return { status: true, messages: "Valid Referral Code" };
}

// ====== 9. follow-revoke ======
export async function followRevokeService(actingUserId: number, followerId: number) {
	const row = await newRoutesRepositery.findFollow(actingUserId, followerId);
	if (!row) return { status: false, messages: "Invalid Request !!" };
	await newRoutesRepositery.softDeleteFollow(actingUserId, followerId);
	return { status: true, messages: "Revoke Successfully !" };
}

// ====== 10. manual-document-submit ======
export async function manualDocumentSubmitService(
	userId: number,
	body: ManualDocumentBody,
	files: Express.MulterS3.File[]
) {
	if (!files.length) {
		return { status: false, messages: "The Document field is required." };
	}
	try {
		const urls = files.map((f) => f.key || (f as any).location || f.originalname);
		const docs = JSON.stringify(urls);
		const existing = await newRoutesRepositery.findManualDoc(userId);
		if (existing) {
			await newRoutesRepositery.updateManualDoc(existing.id, {
				doctype: body.doctype,
				description: body.description,
				docs,
			});
		} else {
			await newRoutesRepositery.insertManualDoc({
				userId,
				doctype: body.doctype,
				description: body.description,
				docs,
			});
		}
		return { status: true, msg: "Request Submited Successfully" };
	} catch (e) {
		console.error("[manual-document-submit]", e);
		return { status: false, msg: "Something getting wrong please retry" };
	}
}

// ====== 11. faqs ======
export async function faqsService() {
	try {
		const data = await newRoutesRepositery.listFaqs();
		return { status: true, message: "Faqs Detail", data };
	} catch (e: any) {
		return { status: false, messages: e?.message || String(e) };
	}
}

// ====== 12. hired-throw ======
export async function hiredThrowService(userId: number, userType: number | null) {
	const user = await get_user_detail(userId);
	if (!user) return { status: false, message: "Access denied" };

	if (userType === 1) {
		const [apps, employments] = await Promise.all([
			newRoutesRepositery.getUserApplications(userId),
			newRoutesRepositery.getUserEmployments(userId),
		]);
		const companyApplyDate = new Map<number, Date>();
		for (const a of apps) {
			if (a.companyId == null || !a.createDate) continue;
			const d = new Date(a.createDate);
			const prev = companyApplyDate.get(a.companyId);
			if (!prev || d < prev) companyApplyDate.set(a.companyId, d);
		}

		const data = [];
		for (const exp of employments) {
			if (exp.hired === 1 || exp.hired === 2) continue;
			if (!exp.company || !exp.joiningDate) continue;
			const applyDate = companyApplyDate.get(exp.company);
			if (!applyDate) continue;
			const join = new Date(exp.joiningDate);
			const diff = daysBetween(applyDate, join);
			if (diff < 0 || diff > 120) continue;
			data.push({
				popup_show: true,
				employment_id: exp.id,
				profile: exp.companyProfile
					? `${s3Prefix}${exp.companyProfile}`
					: exp.companySocial || "",
				name: [exp.userFname, exp.userLname].filter(Boolean).join(" "),
				individual_id: exp.individualId,
				designation: exp.designationName || "",
				company_name: exp.companyName || "",
			});
		}
		return { status: true, message: "Hired from CollarCheck", data };
	}

	// Company branch
	const jobIds = await newRoutesRepositery.getCompanyJobIds(userId);
	const apps = await newRoutesRepositery.getApplicationsForJobs(jobIds);
	const userIds = [...new Set(apps.map((a) => a.user).filter((id): id is number => id != null))];
	const [employments, users] = await Promise.all([
		newRoutesRepositery.getEmploymentsByUserIds(userIds),
		newRoutesRepositery.getUsersByIds(userIds),
	]);
	const userMap = new Map(users.map((u) => [u.id, u]));
	const applyByUser = new Map<number, Date>();
	for (const a of apps) {
		if (a.user == null || !a.createDate) continue;
		const d = new Date(a.createDate);
		const prev = applyByUser.get(a.user);
		if (!prev || d < prev) applyByUser.set(a.user, d);
	}

	const data = [];
	for (const exp of employments) {
		if (exp.hired === 1 || exp.hired === 2) continue;
		if (exp.company !== userId) continue;
		if (!exp.user || !exp.joiningDate) continue;
		const applyDate = applyByUser.get(exp.user);
		if (!applyDate) continue;
		const join = new Date(exp.joiningDate);
		const diff = daysBetween(applyDate, join);
		if (diff < 0 || diff > 120) continue;
		const u = userMap.get(exp.user);
		data.push({
			user_id: exp.user,
			name: u ? [u.fname, u.lname].filter(Boolean).join(" ") : "",
			designation: exp.designationName || "",
			employment_id: exp.id,
			individual_id: u?.individualId || null,
			profile: u?.profile ? `${s3Prefix}${u.profile}` : u?.socialImage || "",
			popup_show: true,
		});
	}
	return { status: true, message: "Hired from CollarCheck", data };
}

// ====== 13–14. hired status ======
export async function updateHiredStatusService(userId: number, body: HiredIdsBody) {
	const user = await get_user_detail(userId);
	if (!user) return { status: false, message: "Access denied" };
	if (!body.ids?.length) return { status: false, message: "ID is required." };

	const { affected } = await newRoutesRepositery.setHiredStatus(body.ids, 1);
	if (!affected) return { status: false, message: "Failed to update record!" };

	const experiences = await newRoutesRepositery.getExperiencesByIds(body.ids);
	const site = process.env.REACT_SITE || "https://www.collarcheck.com";
	for (const exp of experiences) {
		try {
			if (exp.userEmail) {
				await sendSQSMessage({
					type: "SEND_EMAIL",
					payload: {
						mail: {
							email: exp.userEmail,
							subject: "Congratulations, You're Hired!",
							body: `<p>Hi ${exp.userName || ""},</p><p>Your employment was marked as hired via CollarCheck.</p><p><a href="${site}/dashboard/user/employment">View employment</a></p>`,
							template: 93,
						},
						trigger: { user_id: exp.userId || 0, type: "hired_confirmation_user", status: 1 },
						action: "hired_confirmation_user",
					},
				});
			}
			if (exp.companyEmail) {
				await sendSQSMessage({
					type: "SEND_EMAIL",
					payload: {
						mail: {
							email: exp.companyEmail,
							subject: "Candidate Successfully Hired",
							body: `<p>Hi ${exp.companyName || ""},</p><p>A candidate was marked hired via CollarCheck.</p><p><a href="${site}/dashboard/company/employments">View employments</a></p>`,
							template: 94,
						},
						trigger: { user_id: exp.companyId || 0, type: "hired_confirmation_company", status: 1 },
						action: "hired_confirmation_company",
					},
				});
			}
		} catch (e) {
			console.error("[update-hired-status] email queue failed", e);
		}
	}

	return { status: true, message: "Record updated successfully." };
}

export async function declineHiredStatusService(userId: number, body: HiredIdsBody) {
	const user = await get_user_detail(userId);
	if (!user) return { status: false, message: "Access denied" };
	if (!body.ids?.length) return { status: false, message: "ID is required." };

	const { affected } = await newRoutesRepositery.setHiredStatus(body.ids, 2);
	if (!affected) return { status: false, message: "Failed to update record!" };
	return { status: true, message: "Record updated successfully." };
}

// ====== 15. download-cv ======
export async function downloadCvService(userId: number) {
	const user = await get_user_detail(userId);
	if (!user) return { status: false, message: "Access denied" };

	const [basic, experience_details, certificate_details, education_details, portfolio_details] =
		await Promise.all([
			get_user_detail(userId),
			allExperienceService(userId).catch(() => []),
			allCertificateListService(userId).catch(() => []),
			allEducationListService(userId).catch(() => []),
			allPortfolioListService(userId).catch(() => []),
		]);

	const empty =
		!basic &&
		(!experience_details || !(experience_details as any[]).length) &&
		(!certificate_details || !(certificate_details as any[]).length) &&
		(!education_details || !(education_details as any[]).length) &&
		(!portfolio_details || !(portfolio_details as any[]).length);

	if (empty) {
		return {
			status: false,
			message: "No record found!",
			data: {
				basic_details: null,
				experience_details: null,
				certificate_details: null,
				education_details: null,
				portfolio_details: null,
			},
		};
	}

	return {
		status: true,
		data: {
			basic_details: basic,
			experience_details,
			certificate_details,
			education_details,
			portfolio_details,
		},
	};
}

// ====== 16–17. resume parse paths ======
async function parseUserResumeFromKey(keyOrUrl: string) {
	const url = resumePublicUrl(keyOrUrl);
	const buf = await fetchUrlBuffer(url);
	if (!buf) return emptyParsedResume();
	const text = await extractPdfText(buf);
	return parseResume(text);
}

export async function autoFetchService(
	userId: number,
	file?: Express.MulterS3.File
) {
	if (!file) {
		return { status: false, messages: "The Resume field is required." };
	}
	try {
		const key = file.key || (file as any).location || "";
		const name = file.originalname || "resume.pdf";
		await newRoutesRepositery.updateUserResume(userId, key, name);

		let text = "";
		// Prefer local S3 download via public URL
		const url = resumePublicUrl(key);
		const buf = await fetchUrlBuffer(url);
		if (buf) text = await extractPdfText(buf);

		const data = parseResume(text);
		return { status: true, data };
	} catch (e) {
		console.error("[auto-fetch]", e);
		return { status: false, messages: "Something went worng" };
	}
}

export async function resumeFetchService(userId: number) {
	const user = await newRoutesRepositery.getUserResume(userId);
	if (!user?.resume) {
		return { status: false, messages: "No Resume found !" };
	}
	try {
		const data = await parseUserResumeFromKey(user.resume);
		return { status: true, data };
	} catch (e: any) {
		return { status: false, messages: e?.message || "Something went worng" };
	}
}

// ====== 18–19. OpenAI resume extract (clean Node port) ======
export async function resumeOpenAiService(userId: number) {
	const user = await newRoutesRepositery.getUserResume(userId);
	if (!user?.resume) {
		return { status: false, messages: "No Resume found !" };
	}
	const apiKey = process.env.OPENAI_API_KEY || process.env.GPT;
	if (!apiKey) {
		// Fall back to regex parser
		const data = await parseUserResumeFromKey(user.resume);
		return { status: true, data: JSON.stringify(data) };
	}

	try {
		const data = await parseUserResumeFromKey(user.resume);
		const res = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: process.env.GPT_MODEL || "gpt-4.1-mini",
				temperature: 0.2,
				messages: [
					{
						role: "system",
						content:
							"Extract basic resume details as concise plain text from the provided structured parse hints.",
					},
					{
						role: "user",
						content: `Extract the basic details from the given resume.\nHints: ${JSON.stringify(data)}`,
					},
				],
				max_tokens: 800,
			}),
			signal: AbortSignal.timeout(30_000),
		});
		const raw = await res.text();
		if (!res.ok) return { status: false, messages: raw };
		const json = JSON.parse(raw);
		const text = json?.choices?.[0]?.message?.content || "";
		return { status: true, data: text };
	} catch (e: any) {
		return { status: false, messages: e?.message || String(e) };
	}
}

/** resume-parse: structured OpenAI extraction (replaces broken Assistants stub). */
export async function resumeParseService(userId: number) {
	const user = await newRoutesRepositery.getUserResume(userId);
	if (!user?.resume) {
		return { error: "No Resume found !" };
	}
	const data = await parseUserResumeFromKey(user.resume);
	const apiKey = process.env.OPENAI_API_KEY || process.env.GPT;
	if (!apiKey) {
		return { response: { parsed: data } };
	}
	try {
		const res = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: process.env.GPT_MODEL || "gpt-4.1-mini",
				temperature: 0.2,
				response_format: { type: "json_object" },
				messages: [
					{
						role: "system",
						content:
							"Return a JSON object with resume fields: name, email, mobile, skills, education, experience.",
					},
					{
						role: "user",
						content: `Parse this resume text hints into JSON: ${JSON.stringify(data)}`,
					},
				],
				max_tokens: 1000,
			}),
			signal: AbortSignal.timeout(30_000),
		});
		const raw = await res.text();
		if (!res.ok) return { error: "File upload failed", detail: raw };
		const json = JSON.parse(raw);
		const content = json?.choices?.[0]?.message?.content;
		let parsed: unknown = content;
		try {
			parsed = JSON.parse(content);
		} catch {
			/* keep string */
		}
		return { response: { parsed, raw: json } };
	} catch (e: any) {
		return { error: e?.message || "File upload failed" };
	}
}
