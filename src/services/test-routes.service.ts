import testRoutesRepositery from "../repositery/test-routes.repositery";
import usersRepositery, { USER_PREFIX, USER_TYPE } from "../repositery/users.repositery";
import { editUserProfileService } from "./profile-review.service";
import {
	employmentCreateService,
	employmentUpdateService,
} from "./employee.service";
import {
	createEducationService,
	updateEducationService,
} from "./education.service";
import { addSkillService } from "./skill.service";
import { upsertLanguageService } from "./language.service";
import {
	createCertificateService,
	updateCertificateService,
} from "./certificate.service";
import { downloadCvService } from "./new-routes.service";
import { digilockerService } from "./account-migration.service";
import type {
	ResumeDownloadBody,
	UpdateNoticeBody,
	SaveEpfoBody,
} from "../types/test-routes.types";

const s3Prefix = process.env.S3_PREFIX || "";

function asArray(val: unknown): any[] {
	if (val === undefined || val === null || val === "") return [];
	if (Array.isArray(val)) return val;
	if (typeof val === "object") return Object.values(val as object);
	return [val];
}

function encryptMessage(text: string): string {
	// Legacy encrypt_url was reversible obfuscation; store as-is (or base64)
	return Buffer.from(String(text || ""), "utf8").toString("base64");
}

/** Guard for dangerous public ops endpoints */
export function assertOpsAllowed(req: { headers: any }) {
	if (process.env.ALLOW_PUBLIC_OPS === "1") return;
	const key = req.headers["x-ops-key"] || req.headers["x-admin-key"];
	const expected = process.env.OPS_KEY;
	if (expected && key === expected) return;
	if (process.env.NODE_ENV !== "production" && !expected) return;
	const err: any = new Error("Ops endpoint disabled");
	err.status = 403;
	throw err;
}

// ====== 1. CSV → message_history (misnamed get-slug) ======
export async function importMessageHistoryCsvService(csvText: string) {
	const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length);
	if (lines.length < 2) return "ok";

	// skip header
	for (let i = 1; i < lines.length; i++) {
		const cols = parseCsvLine(lines[i]);
		if (cols.length < 4) continue;
		const sender = Number(cols[2]) || 0;
		const receiver = Number(cols[3]) || 0;
		if (!sender || !receiver) continue;

		// Fixed mapping vs PHP bugs: use dedicated date columns when present
		await testRoutesRepositery.insertMessageHistory({
			messageId: Number(cols[1]) || 0,
			sender,
			receiver,
			message: encryptMessage(cols[4] || ""),
			doc: cols[5] || null,
			isViewed: Number(cols[6]) || 0,
			forApproval: cols[7] !== undefined ? Number(cols[7]) : 1,
			viewDatetime: cols[8] || null,
			isDeleted: cols[9] !== undefined ? Number(cols[9]) : 0,
			createDate: cols[10] || undefined,
			modifyDate: cols[11] || undefined,
		});
	}
	return "ok";
}

function parseCsvLine(line: string): string[] {
	const out: string[] = [];
	let cur = "";
	let inQ = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			inQ = !inQ;
			continue;
		}
		if (ch === "," && !inQ) {
			out.push(cur.trim());
			cur = "";
			continue;
		}
		cur += ch;
	}
	out.push(cur.trim());
	return out;
}

// ====== 2. mailtest ======
export async function mailtestService() {
	const mail = {
		name: "Test User",
		otp: "123456",
		company: "CollarCheck",
		link: process.env.REACT_SITE || "https://www.collarcheck.com",
		track_link: "",
		to: process.env.MAILTEST_TO || "dev@collarcheck.com",
		template: "email/schedule/employee/unlock_level1_user",
		note: "Dev smoke payload only — email not sent by default",
	};
	return mail;
}

// ====== 3. update-ccid ======
export async function updateCcidService() {
	const users = await testRoutesRepositery.usersMissingIndividualId();
	let updated = 0;
	for (const u of users) {
		const prefix =
			u.userType === USER_TYPE.COMPANY ? USER_PREFIX.COMPANY : USER_PREFIX.EMPLOYEE;
		const individualId = await usersRepositery.generateUniqueId(prefix);
		const name = `${u.fname || ""} ${u.lname || ""}`.trim() || "user";
		const slug = await usersRepositery.generateSlug(`${name}-${individualId}`);
		await testRoutesRepositery.updateUserCcid(u.id!, individualId, slug);
		updated++;
	}
	return { status: true, messages: "CCID backfill complete", updated };
}

// ====== 4. resume-download ======
export async function resumeDownloadService(userId: number, body: ResumeDownloadBody) {
	if (!userId) return { status: false, messages: "Invalid user id !" };
	try {
		await testRoutesRepositery.insertResumeDownload(userId, body.templete_id);
		return { status: true, messages: "Record saved successfully !" };
	} catch (e) {
		console.error("[resume-download]", e);
		return { status: false, messages: "Something Went Wrong" };
	}
}

// ====== 5. update-notice ======
export async function updateNoticeService(userId: number, body: UpdateNoticeBody) {
	try {
		const onNotice = body.on_notice;
		await testRoutesRepositery.updateNotice(userId, {
			onNotice,
			noticeDate: onNotice === 1 ? body.notice_date || null : null,
			noticeEmployments:
				onNotice === 1
					? JSON.stringify(body.notice_employments || [])
					: null,
		});
		return { status: true, messages: "Record update successfully" };
	} catch (e) {
		console.error("[update-notice]", e);
		return { status: false, messages: "Something Went Wrong" };
	}
}

// ====== 6. digilocker ======
export { digilockerService };

// ====== 7. save-epfo (CV popup orchestrator) ======
export async function saveEpfoService(
	userId: number,
	body: SaveEpfoBody,
	files: Express.MulterS3.File[] = []
) {
	// Always dismiss popup
	await testRoutesRepositery.setCvPop(userId, 0);

	const formType = Number(body.form_type);

	try {
		switch (formType) {
			case 1: {
				// basic then address
				await editUserProfileService(
					userId,
					{
						type: 1,
						fname: body.fname,
						lname: body.lname,
						dob: body.dob,
						gender: body.gender != null ? Number(body.gender) : undefined,
						display_type: body.display_type != null ? Number(body.display_type) : undefined,
						profile_description: body.profile_description,
					} as any,
					files
				);
				await editUserProfileService(userId, {
					type: 2,
					country: body.country != null ? Number(body.country) : undefined,
					state: body.state != null ? Number(body.state) : undefined,
					city: body.city != null ? Number(body.city) : undefined,
					accomodation: body.accomodation != null ? Number(body.accomodation) : undefined,
					present_address: body.present_address,
				} as any);
				return { status: true, messages: "Basic Details save successfully" };
			}
			case 2: {
				const companies = asArray(body.company);
				if (!companies.length) {
					return { status: true, messages: "Record updated" };
				}
				for (let i = 0; i < companies.length; i++) {
					const expId = asArray(body.experience_id)[i];
					const row: any = {
						company: companies[i],
						employment_type: Number(asArray(body.employment_type)[i]) || 1,
						designation: asArray(body.designation)[i],
						salary: String(asArray(body.salary)[i] ?? ""),
						salary_inhand: asArray(body.salary_inhand)[i] || "In Hand",
						salary_mode: asArray(body.salary_mode)[i] || "Per Annum",
						joining_date: asArray(body.joining_date)[i],
						worked_till_date: asArray(body.worked_till_date)[i],
						department: asArray(body.department)[i],
						still_working:
							asArray(body.still_working)[i] === "1" ||
							asArray(body.still_working)[i] === 1 ||
							asArray(body.still_working)[i] === true,
						description: asArray(body.description)[i] || "",
						skill: asArray(
							body.skill?.[i] ?? body[`skill[${i}]`] ?? body.skill
						).map(String),
						hired: false,
					};
					const rowFiles = files.filter(
						(f) =>
							f.fieldname === `document[${i}]` ||
							f.fieldname === `document[${i}][]` ||
							(f.fieldname === "document" && i === 0)
					);
					if (expId) {
						await employmentUpdateService(userId, Number(expId), row, rowFiles);
					} else {
						await employmentCreateService(userId, row, rowFiles);
					}
				}
				return { status: true, messages: "Employment records saved successfully" };
			}
			case 3: {
				const unis = asArray(body.university);
				for (let i = 0; i < unis.length; i++) {
					const eduId = asArray(body.education_id)[i];
					const row: any = {
						university: unis[i],
						course_type: asArray(body.course_type)[i],
						course: asArray(body.course)[i],
						starting_date: asArray(body.starting_date)[i],
						ending_date: asArray(body.ending_date)[i],
						state: asArray(body.state)[i],
						city: asArray(body.city)[i],
						country: asArray(body.country)[i],
						ishighest: asArray(body.ishighest)[i],
						ongoing: asArray(body.ongoing)[i],
					};
					const rowFiles = files.filter(
						(f) =>
							f.fieldname === `document[${i}]` ||
							f.fieldname === "document"
					);
					if (eduId) {
						await updateEducationService(userId, Number(eduId), row, rowFiles);
					} else {
						await createEducationService(userId, row, rowFiles);
					}
				}
				return { status: true, messages: "Education records saved successfully" };
			}
			case 4: {
				const skills = asArray(body.skill);
				const ratings = asArray(body.rating);
				for (let i = 0; i < skills.length; i++) {
					await addSkillService(userId, {
						skill: skills[i],
						rating: Number(ratings[i]) || 1,
					} as any);
				}
				const languages = asArray(body.language);
				const verbal = asArray(body.verbal);
				const written = asArray(body.written);
				for (let i = 0; i < languages.length; i++) {
					await upsertLanguageService(userId, {
						language: languages[i],
						verbal: Number(verbal[i]) || 1,
						written: Number(written[i]) || 1,
					} as any);
				}
				if (!skills.length && !languages.length) {
					return { status: true, messages: "Record update" };
				}
				return { status: true, messages: "Expertise & Lingo saved successfully" };
			}
			case 5: {
				const unis = asArray(body.university);
				for (let i = 0; i < unis.length; i++) {
					const certPk = asArray(body.certificateid)[i] || asArray(body.certificate_id)[i];
					const row: any = {
						university: unis[i],
						course: asArray(body.course)[i],
						start_date: asArray(body.start_date)[i],
						end_date: asArray(body.end_date)[i],
						url: asArray(body.url)[i],
						ongoing: asArray(body.ongoing)[i],
					};
					const rowFiles = files.filter(
						(f) =>
							f.fieldname === `document[${i}]` ||
							f.fieldname === "document" ||
							f.fieldname === "document[]"
					);
					if (certPk) {
						await updateCertificateService(userId, Number(certPk), row, rowFiles);
					} else {
						await createCertificateService(userId, row, rowFiles);
					}
				}
				return { status: true, messages: "Certificate records saved successfully" };
			}
			default:
				return { status: false, messages: "Invalid form_type" };
		}
	} catch (e: any) {
		console.error("[save-epfo]", e);
		if (formType === 2) {
			return { status: false, messages: "Employmnent not added" };
		}
		return { status: false, messages: e?.message || "Something Went Wrong" };
	}
}

// ====== 8. resume-template ======
export async function resumeTemplateService() {
	const rows = await testRoutesRepositery.listResumeTemplates();
	if (!rows.length) {
		return { status: false, message: "Template data not found" };
	}
	return {
		status: true,
		data: rows.map((r) => ({
			id: r.id,
			name: r.name,
			thumbnail: r.thumbnail ? `${s3Prefix}${r.thumbnail}` : "",
			template_path: r.templatePath,
			type: r.type,
		})),
	};
}

// ====== 9. resume-details ======
export async function resumeDetailsService(userId: number, templateId?: number) {
	if (!templateId) {
		return "Template not found";
	}
	const template = await testRoutesRepositery.getResumeTemplate(templateId);
	if (!template) return "Template not found";

	const user = await testRoutesRepositery.getUserBasic(userId);
	if (!user) return "User not found";

	// In-process CV data (no HTTP loopback)
	const cv = await downloadCvService(userId);
	const site = (process.env.REACT_SITE || "https://www.collarcheck.com").replace(/\/+$/, "");
	const profileUrl = user.slug ? `${site}/profile/${user.slug}` : site;
	const logo = process.env.CC_LOGO_URL || `${s3Prefix}uploads/logo.png`;

	// Prefer JSON for API clients; HTML optional via ACCEPT or query format=html
	return {
		status: true,
		template: {
			id: template.id,
			name: template.name,
			template_path: template.templatePath,
			thumbnail: template.thumbnail ? `${s3Prefix}${template.thumbnail}` : "",
		},
		profileUrl,
		cc_logo: logo,
		qrSrc: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(profileUrl)}`,
		detail: cv.status ? cv.data : null,
		messages: cv.status ? undefined : cv.message,
	};
}
