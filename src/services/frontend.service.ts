import { ZodError } from "zod";
import frontendRepositery from "../repositery/frontend.repositery";
import { user_verified } from "./users.service";
import { sendSQSMessage } from "../utils/sqs";
import {
	saveEnquiryBodySchema,
	type SaveEnquiryBody,
	type TopCompanyQuery,
	type SitemapQuery,
} from "../types/frontend.types";

const s3Prefix = process.env.S3_PREFIX || "";

function nowSqlDatetime() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/** Legacy page param: page <= 1 → 0, else page * limit - limit */
export function pageToSqlOffset(page: number, limit: number): number {
	const p = Number(page) || 0;
	if (p <= 1) return 0;
	return p * limit - limit;
}

// ====== 2. GET /wapi/home/top-company ======

export async function getTopCompanyService(
	query: TopCompanyQuery,
	viewerId: number
) {
	try {
		const limit = query.limit ?? 10;
		const sqlOffset = pageToSqlOffset(query.offset ?? 0, limit);

		const [rows, totalCounts] = await Promise.all([
			frontendRepositery.getTopCompanies({ limit, sqlOffset, viewerId }),
			frontendRepositery.countTopCompanies(viewerId),
		]);

		const data = [];
		for (const row of rows) {
			const [followData, followRow, exploreTalent, isVerified] = await Promise.all([
				frontendRepositery.getFollowCounts(row.id),
				frontendRepositery.getFollowStatus(viewerId, row.id),
				frontendRepositery.hasActiveJobs(row.id),
				user_verified(row.id),
			]);

			const profile = row.profile
				? `${s3Prefix}${row.profile}`
				: row.socialImage || "";

			const following = followRow
				? { requestSend: true, requestApproved: followRow.status === 1 }
				: { requestSend: false, requestApproved: false };

			data.push({
				id: row.id,
				profile,
				name: `${row.fname || ""} ${row.lname || ""}`,
				city_name: row.cityName || "",
				individual_id: row.individualId,
				state_name: row.stateName || "",
				country_name: row.countryName || "",
				experienceCount: row.experienceCount ?? 0,
				city: row.cityName || "",
				slug: row.slug,
				turnover_name: row.turnoverName || null,
				company_size_name: row.companySizeName || null,
				industry_name: row.industryName || null,
				distance: 0,
				is_verified: isVerified,
				followData,
				following,
				exploreTalent,
			});
		}

		return {
			status: true,
			message: "top company list",
			data,
			totalCounts,
		};
	} catch (error: any) {
		return {
			status: false,
			messages: error?.message || String(error),
		};
	}
}

// ====== 3–4. Contact / Career enquiries ======

function validateEnquiryBody(body: unknown):
	| { ok: true; data: SaveEnquiryBody }
	| { ok: false; messages: string } {
	try {
		const data = saveEnquiryBodySchema.parse(body ?? {});

		// Optional phone: if present must be numeric, length 10–15
		if (data.phone !== undefined && data.phone !== "") {
			const phone = data.phone;
			if (!/^\d+$/.test(phone)) {
				return { ok: false, messages: "The Phone field must contain only numbers." };
			}
			if (phone.length < 10 || phone.length > 15) {
				return {
					ok: false,
					messages:
						phone.length < 10
							? "The Phone field must be at least 10 characters in length."
							: "The Phone field cannot exceed 15 characters in length.",
				};
			}
		}

		return { ok: true, data };
	} catch (error) {
		if (error instanceof ZodError) {
			const messages = error.issues.map((i) => i.message).join(",");
			return { ok: false, messages };
		}
		return { ok: false, messages: "Invalid data" };
	}
}

function buildEnquiryEmailHtml(params: {
	firstName: string;
	lastName?: string;
	email: string;
	phone?: string;
	company?: string;
	message?: string;
	createDate: string;
	configName: string;
}) {
	const name = [params.firstName, params.lastName].filter(Boolean).join(" ");
	return `
		<p>New enquiry received on <strong>${params.configName}</strong></p>
		<ul>
			<li><strong>Name:</strong> ${name}</li>
			<li><strong>Email:</strong> ${params.email}</li>
			<li><strong>Phone:</strong> ${params.phone || "-"}</li>
			<li><strong>Company:</strong> ${params.company || "-"}</li>
			<li><strong>Message:</strong> ${params.message || "-"}</li>
			<li><strong>Date:</strong> ${params.createDate}</li>
		</ul>
	`;
}

async function queueEnquiryEmail(opts: {
	page: "contact" | "career";
	body: SaveEnquiryBody;
	createDate: string;
}) {
	const settings = await frontendRepositery.getWebSettings();
	const configName =
		settings.config_name || settings.configName || "CollarCheck";
	const contactEmail = (
		settings.contact_email ||
		settings.contactEmail ||
		process.env.CONTACT_EMAIL ||
		""
	).toLowerCase();

	if (!contactEmail) {
		console.warn("[ENQUIRY] No contact_email in settings / CONTACT_EMAIL env — skipping email");
		return;
	}

	const subject = `New Enquiry From ${configName} ${opts.page} page`;
	const html = buildEnquiryEmailHtml({
		firstName: opts.body.firstName,
		lastName: opts.body.lastName,
		email: opts.body.email,
		phone: opts.body.phone,
		company: opts.body.company,
		message: opts.body.message,
		createDate: opts.createDate,
		configName,
	});

	const action =
		opts.page === "contact" ? "save enquiries" : "save career enquiries";

	await sendSQSMessage({
		type: "SEND_EMAIL",
		payload: {
			mail: {
				email: contactEmail,
				subject,
				body: html,
			},
			action,
		},
	});
}

export async function saveEnquiryService(rawBody: unknown) {
	const validated = validateEnquiryBody(rawBody);
	if (!validated.ok) {
		return { status: false, messages: validated.messages };
	}

	const body = validated.data;
	const createDate = nowSqlDatetime();

	try {
		await frontendRepositery.insertEnquiry({
			firstName: body.firstName,
			lastName: body.lastName ?? null,
			email: body.email,
			phone: body.phone ?? "",
			company: body.company ?? null,
			message: body.message ?? null,
			createDate,
		});
	} catch (error) {
		console.error("[ENQUIRY] insert failed:", error);
		return {
			status: false,
			data: null,
			message: "Something getting wrong please retry",
		};
	}

	try {
		await queueEnquiryEmail({ page: "contact", body, createDate });
	} catch (error) {
		// Insert already succeeded — do not fail the client for queue issues
		console.error("[ENQUIRY] email queue failed:", error);
	}

	return {
		status: true,
		data: null,
		message: "Enquiry Sent Successfully",
	};
}

export async function saveCareerEnquiryService(rawBody: unknown) {
	const validated = validateEnquiryBody(rawBody);
	if (!validated.ok) {
		return { status: false, messages: validated.messages };
	}

	const body = validated.data;
	const createDate = nowSqlDatetime();

	try {
		await frontendRepositery.insertCareerEnquiry({
			firstName: body.firstName,
			lastName: body.lastName ?? null,
			email: body.email,
			phone: body.phone ?? "",
			company: body.company ?? null,
			message: body.message ?? null,
			createDate,
		});
	} catch (error) {
		console.error("[CAREER ENQUIRY] insert failed:", error);
		return {
			status: false,
			data: null,
			message: "Something getting wrong please retry",
		};
	}

	try {
		await queueEnquiryEmail({ page: "career", body, createDate });
	} catch (error) {
		console.error("[CAREER ENQUIRY] email queue failed:", error);
	}

	return {
		status: true,
		data: null,
		message: "Enquiry Sent Successfully",
	};
}

// ====== 5. GET /wapi/general/sitemap ======

export async function sitemapService(query: SitemapQuery) {
	try {
		const type = (query.type || "").trim().toLowerCase();
		const includeAll = type === "";
		const data: Record<string, Array<{ slug?: string | null; job_slug?: string | null }>> = {};

		if (includeAll || type === "company") {
			const rows = await frontendRepositery.getCompanySlugs();
			data.companyList = rows
				.filter((r) => r.slug)
				.map((r) => ({ slug: r.slug }));
		}
		if (includeAll || type === "user") {
			const rows = await frontendRepositery.getUserSlugs();
			data.userList = rows
				.filter((r) => r.slug)
				.map((r) => ({ slug: r.slug }));
		}
		if (includeAll || type === "job") {
			const rows = await frontendRepositery.getJobSlugs();
			data.jobList = rows
				.filter((r) => r.slug)
				.map((r) => ({ slug: r.slug }));
		}
		if (includeAll || type === "meta") {
			const rows = await frontendRepositery.getJobMetaSlugs();
			data.metaJobList = rows
				.filter((r) => r.job_slug)
				.map((r) => ({ job_slug: r.job_slug }));
		}

		return {
			status: true,
			message: "list",
			data,
		};
	} catch (error: any) {
		return {
			status: false,
			messages: error?.message || String(error),
		};
	}
}

// ====== 6–7. GET|POST /wapi/data-deletion (Meta stub) ======

export async function dataDeletionService() {
	const id = Math.floor(Math.random() * (99999 - 11111 + 1)) + 11111;
	const base =
		process.env.DATA_DELETION_STATUS_URL ||
		"https://www.collarcheck.com/deletion";
	return {
		url: `${base}?id=${id}`,
		confirmation_code: id,
	};
}
