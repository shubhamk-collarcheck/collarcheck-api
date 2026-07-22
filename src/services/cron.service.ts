import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import cronRepositery from "../repositery/cron.repositery";
import loginRepositery from "../repositery/login.repositery";
import { profilePercentageService } from "./job-dashboard.service";
import { sendEmailViaSQS, sendSQSMessage } from "../utils/sqs";
import { encryptUrl } from "../utils/encrypt";

const execFileAsync = promisify(execFile);

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

function parseEmailList(raw: unknown): string[] {
	if (!raw) return [];
	if (Array.isArray(raw)) return [...new Set(raw.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				return [...new Set(parsed.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
			}
		} catch {
			return raw
				.split(/[,;\s]+/)
				.map((e) => e.trim().toLowerCase())
				.filter(Boolean);
		}
	}
	return [];
}

function chunk<T>(arr: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

/** Newsletter opt-in: empty setting OR value == 1 → allow */
async function canSendNewsletter(userId: number): Promise<boolean> {
	const setting = await cronRepositery.getNewsletterSetting(userId);
	if (!setting) return true;
	return String(setting.value) === "1";
}

// ============================================================================
// A. Ops
// ============================================================================

export async function backupService() {
	const host = process.env.DB_HOST || "localhost";
	const user = process.env.DB_USER || process.env.DB_USERNAME || "root";
	const password = process.env.DB_PASSWORD || process.env.DB_PASS || "";
	const database = process.env.DB_NAME || process.env.DB_DATABASE || "";
	const port = process.env.DB_PORT || "3306";

	if (!database) {
		return { status: false, message: "DB_NAME not configured" };
	}

	const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
	const filename = `db-backup-${stamp}.sql`;
	const dir = path.join(process.cwd(), "tmp", "backups");
	await fs.mkdir(dir, { recursive: true });
	const localPath = path.join(dir, filename);

	const dumpBin = process.env.MYSQLDUMP_PATH || "mysqldump";
	const args = [
		`--host=${host}`,
		`--port=${port}`,
		`--user=${user}`,
		"--single-transaction",
		"--quick",
		"--no-tablespaces",
		database,
	];

	try {
		const env = { ...process.env };
		if (password) env.MYSQL_PWD = password;

		const { stdout } = await execFileAsync(dumpBin, args, {
			env,
			maxBuffer: 512 * 1024 * 1024,
		});
		await fs.writeFile(localPath, stdout);

		const s3 = new S3Client({
			region: process.env.AWS_REGION || "ap-south-1",
			credentials: {
				accessKeyId: process.env.AWS_KEY!,
				secretAccessKey: process.env.AWS_SECRET!,
			},
		});

		const serverType = (process.env.SERVER_TYPE || "").toUpperCase();
		// PHP parity: STAGING → database-backups/; else database-backups-staging/
		const prefix = serverType === "STAGING" ? "database-backups" : "database-backups-staging";
		const key = `${prefix}/${filename}`;
		const body = await fs.readFile(localPath);

		await s3.send(
			new PutObjectCommand({
				Bucket: process.env.AWS_BUCKET!,
				Key: key,
				Body: body,
				ContentType: "application/sql",
			})
		);

		await fs.unlink(localPath).catch(() => undefined);

		const s3Url = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;
		return {
			status: true,
			message: "Backup uploaded to S3 successfully",
			s3_url: s3Url,
		};
	} catch (err: any) {
		console.error("[cron] backup error:", err);
		await fs.unlink(localPath).catch(() => undefined);
		const e: any = new Error(err?.message || "Backup failed");
		e.status = 500;
		e.rawBody = err?.message || "Backup failed";
		throw e;
	}
}

export async function updateViewRequestService() {
	await cronRepositery.expireViewRequests();
	return { status: true, message: "View requests updated" };
}

export async function latLongUpdateService() {
	const key = process.env.GOOGLEKEY || process.env.GOOGLE_MAPS_KEY;
	if (!key) {
		return { status: false, message: "GOOGLEKEY not configured" };
	}

	const users = await cronRepositery.getUsersNeedingLatLong(50);
	if (!users.length) {
		return { status: false, message: "Nothing to update" };
	}

	let updated = 0;
	for (const u of users) {
		const address = (u.presentAddress || "").trim();
		if (!address) continue;
		try {
			const q = encodeURIComponent(address);
			const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${q}&key=${key}`;
			const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
			const json: any = await res.json();
			if (json.status === "OK" && json.results?.[0]?.geometry?.location) {
				const { lat, lng } = json.results[0].geometry.location;
				await cronRepositery.upsertUserLatLong(u.userId, String(lat), String(lng));
				updated++;
			}
		} catch (err) {
			console.error("[cron] geocode error for user", u.userId, err);
		}
		await sleep(100); // gentle rate limit
	}

	return updated
		? { status: true, message: "Record update success", updated }
		: { status: false, message: "Nothing to update" };
}

export async function deleteOtpService() {
	await cronRepositery.deleteOldOtps();
	try {
		await cronRepositery.trimMasterNames();
	} catch (err) {
		console.error("[cron] trim names error:", err);
	}
	return { status: true, message: "OTP deleted" };
}

export async function updatePercentageService() {
	const users = await cronRepositery.getUserIdsForPercentage(1000);
	let count = 0;
	for (const u of users) {
		try {
			const pct = await profilePercentageService(u.id);
			const total = pct?.data?.total ?? 0;
			await cronRepositery.updateUserPercentage(u.id, total);
			count++;
		} catch (err) {
			console.error("[cron] percentage error user", u.id, err);
		}
	}
	return { status: true, message: "Percentage updated", count };
}

export async function percentageStatusResetService() {
	await cronRepositery.resetPercentageStatus();
	return { status: true, message: "percentage_status reset" };
}

export async function updateAccountSettingService() {
	const users = await cronRepositery.getUsersMissingAccountSettings();
	for (const u of users) {
		await loginRepositery.createDefaultSettings(u.id);
	}
	return { status: true, message: "Account settings backfilled", count: users.length };
}

// ============================================================================
// B. Email scheduler pipeline
// ============================================================================

export async function createEmailScheduleService(id?: number) {
	const schedules = await cronRepositery.getUpcomingSchedules(id);
	if (!schedules.length) {
		return { status: false, message: "Sechuder not valid Please check Sechuder detail" };
	}

	for (const schedule of schedules) {
		const emails = parseEmailList(schedule.emails);
		if (!emails.length) {
			return { status: false, message: "Scheduler can not create  on empty email list!" };
		}

		await cronRepositery.setScheduleExecute(schedule.id, 1);

		for (const batch of chunk(emails, 500)) {
			await cronRepositery.insertTempEmails(schedule.id, batch);
			await sleep(200); // lighter than PHP sleep(2) for Node
		}
	}

	return { status: true, message: "Scheduler run successfully!" };
}

export async function sendEmailScheduleService(id?: number) {
	const schedules = await cronRepositery.getExecuteSchedules(id);
	if (!schedules.length) {
		return { status: false, message: "Sechuder not valid Please check Sechuder detail " };
	}

	const reactSite = (process.env.REACT_SITE || "https://app.collarcheck.com/").replace(/\/?$/, "/");

	for (const schedule of schedules) {
		const temps = await cronRepositery.getPendingTempEmails(schedule.id, 30);
		for (const temp of temps) {
			const email = (temp.email || "").toLowerCase();
			if (!email) {
				await cronRepositery.updateTempEmail(temp.id, 3);
				continue;
			}

			const user = await cronRepositery.findUserByEmail(email);
			if (!user) {
				await cronRepositery.updateTempEmail(temp.id, 3);
				continue;
			}

			const allowed = await canSendNewsletter(user.id);
			if (!allowed) {
				await cronRepositery.updateTempEmail(temp.id, 3);
				continue;
			}

			const templateId = schedule.template || 0;
			const subject =
				schedule.name ||
				schedule.templateSubject ||
				schedule.templateName ||
				"CollarCheck notification";

			const vars: Record<string, string> = {
				name: `${user.fname || ""} ${user.lname || ""}`.trim() || "there",
				subject: String(subject),
				track_link: `${process.env.API_BASE_URL || process.env.BASE_URL || ""}/wapi/track-email/${user.id}/${schedule.id}`,
				unsubscribe: `${reactSite}unsubscribe/${encryptUrl(user.id)}`,
				type: schedule.type || "",
			};

			try {
				if (templateId) {
					await sendEmailViaSQS(email, templateId, vars, {
						user_id: user.id,
						type: schedule.type || "schedule",
						status: 1,
					});
				} else {
					// fallback generic template 1
					await sendEmailViaSQS(email, 1, vars, {
						user_id: user.id,
						type: schedule.type || "schedule",
						status: 1,
					});
				}

				await cronRepositery.updateTempEmail(temp.id, 1);
				await cronRepositery.insertHistory(schedule.id, email, schedule.template);

				// Optional WhatsApp side effects by type/short
				await maybeWhatsAppSideEffect(schedule, user, email);
			} catch (err) {
				console.error("[cron] send email fail", email, err);
				await cronRepositery.updateTempEmail(temp.id, 2);
			}
		}
	}

	return { status: true, message: "email send successfully!" };
}

async function maybeWhatsAppSideEffect(schedule: any, user: any, email: string) {
	try {
		const type = schedule.type || "";
		const short = schedule.templateShort || "";

		if (type === "CANDIDATE_MATCH_YOUR_JOB") {
			await sendSQSMessage({
				type: "SEND_WHATSAPP",
				payload: { phone: user.phone, template: 193, vars: { name: user.fname || "" } },
			});
		}

		if (type === "UNLOCK_LEVEL") {
			const map: Record<string, number> = {
				BYVLU: 215,
				UL1U: 216,
				UL2U: 217,
				UL3U: 218,
				UL4U: 219,
			};
			const campaign = map[short];
			if (campaign && user.phone) {
				await sendSQSMessage({
					type: "SEND_WHATSAPP",
					payload: { phone: user.phone, template: campaign, vars: { name: user.fname || "" } },
				});
			}
		}
	} catch (err) {
		console.error("[cron] whatsapp side-effect:", err);
	}
}

export async function finalScheduleUpdateService() {
	const completedIds = await cronRepositery.getCompletedScheduleIds();
	for (const id of completedIds) {
		const delivered = await cronRepositery.getTempEmailsByDeliver(id, 1);
		const notDelivered = await cronRepositery.getTempEmailsByDeliver(id, 2);
		const notSend = await cronRepositery.getTempEmailsByDeliver(id, 3);
		await cronRepositery.finalizeSchedule(id, delivered, notDelivered, notSend);
	}

	const inProgress = await cronRepositery.getActiveExecuteSchedules();
	for (const s of inProgress) {
		await cronRepositery.snapshotInProgressSchedule(s.id);
	}

	return { status: true, message: "Final schedule update done", completed: completedIds.length };
}

export async function createRescheduleService(id: number) {
	const schedule = await cronRepositery.getRescheduleDetail(id);
	if (!schedule) {
		return {
			status: false,
			message: "Scheduler not created yet. Please check if the scheduler is complete, then try again",
		};
	}

	const emails = parseEmailList(schedule.notDelivered);
	if (!emails.length) {
		return { status: false, message: "Scheduler not created. Email list is empty." };
	}

	const newId = await cronRepositery.insertSchedular({
		name: schedule.name,
		emails,
		template: schedule.template,
		type: schedule.type || "RESCHEDULE",
		status: 0,
		execute: 0,
	});

	return { status: true, message: "Scheduler create successfully!", id: newId };
}

// ============================================================================
// C. Campaign producers
// ============================================================================

async function produce(
	type: string,
	templateId: number,
	emails: string[],
	name: string
): Promise<{ status: boolean; messages?: string; message?: string; id?: number; raw?: string }> {
	if (!emails.length) {
		return { status: true, messages: "No users found", message: "no record found!" };
	}
	const id = await cronRepositery.insertSchedular({

		type,
		template: templateId,
		emails,
		name,
		status: 1,
		execute: 0,
	});
	// PHP often echoes insert id
	return { status: true, message: "Scheduler created", id, raw: String(id) };
}

export async function cronNoticeService() {
	const emails = await cronRepositery.getNoticeExpiringEmails();
	if (!emails.length) {
		return { status: true, messages: "No users found nearing expiry" };
	}
	const tpl = await cronRepositery.getTemplateById(81);
	return produce("NOTICE", 81, emails, `Employee/company -> ${tpl?.name || "notice"}`);
}

export async function totalNewJobPostService() {
	const results: any[] = [];

	const jobCount = await cronRepositery.countJobsCreatedYesterday();
	if (jobCount > 0) {
		const emails = await cronRepositery.getActiveEmployeeEmails();
		const r = await produce(
			"TOTAL_JOB_POST",
			99,
			emails,
			`${jobCount} New Jobs Posted Today on CollarCheck`
		);
		results.push(r);
	}

	const userCount = await cronRepositery.countEmployeesCreatedToday();
	if (userCount > 0) {
		const emails = await cronRepositery.getClaimedCompanyEmails();
		const r = await produce(
			"TOTAL_NEW_USER",
			100,
			emails,
			`${userCount} candidates have joined CC today.`
		);
		results.push(r);
	}

	if (!results.length) {
		return { status: true, messages: "No new jobs or users" };
	}
	return { status: true, message: "Schedulers created", results };
}

export async function jobViewedNotAppliedService() {
	const emails = await cronRepositery.getJobViewedNotAppliedEmails();
	return produce("JOB_VIEWED_NOT_APPLIED", 101, emails, "Job Viewed but Not Applied");
}

export async function hasNotAppliedAnyJobService() {
	const userEmails = await cronRepositery.getEmployeesNeverAppliedEmails();
	const companyEmails = await cronRepositery.getCompaniesWithNoJobsEmails();
	const results = [];
	if (userEmails.length) {
		results.push(await produce("NOT_APPLIED_JOB", 102, userEmails, "Has not applied any job"));
	}
	if (companyEmails.length) {
		results.push(await produce("NOT_APPLIED_JOB", 103, companyEmails, "Company has no jobs"));
	}
	return results.length
		? { status: true, message: "Schedulers created", results }
		: { status: true, messages: "No records" };
}

export async function newJobMatchYourSkillService() {
	const emails = await cronRepositery.getSkillMatchEmployeeEmails();
	if (!emails.length) {
		return { status: true, message: "no record found!", raw: "no record found!" };
	}
	const tpl = await cronRepositery.getTemplateById(104);
	return produce("NEW_JOB_MATCH_SKILL", 104, emails, tpl?.name || "New Job Match Your Skill");
}

export async function candidateMatchesYourJobRequirementService() {
	const emails = await cronRepositery.getCompaniesPostedJobsTodayEmails();
	const tpl = await cronRepositery.getTemplateById(105);
	return produce(
		"CANDIDATE_MATCH_YOUR_JOB",
		105,
		emails,
		tpl?.name || "Candidate matches your job requirement"
	);
}

export async function gentleReminderService() {
	const emails = await cronRepositery.getGentleReminderCompanyEmails();
	const tpl = await cronRepositery.getTemplateById(88);
	return produce("GENTLE_REMINDER", 88, emails, tpl?.name || "Gentle reminder");
}

export async function markedImmediateJoinerService() {
	const n = await cronRepositery.countImmediateJoiners();
	const emails = await cronRepositery.getCompaniesWithJobsEmails();
	return produce(
		"IMMIDATE_JOINER",
		84,
		emails,
		`${n} Verified Immediate Joiners available on CollarCheck`
	);
}

export async function noLoginOrActionService() {
	const userEmails = await cronRepositery.getNoLoginEmails(1);
	const companyEmails = await cronRepositery.getNoLoginEmails(2);
	const results = [];
	if (userEmails.length) {
		results.push(
			await produce("NO_LOGIN", 106, userEmails, "We miss you — new jobs are waiting")
		);
	}
	if (companyEmails.length) {
		results.push(
			await produce("NO_LOGIN", 107, companyEmails, "Discover talent on CollarCheck")
		);
	}
	return results.length
		? { status: true, message: "Schedulers created", results }
		: { status: true, messages: "No records" };
}

export async function gotAMessageService() {
	const emails = await cronRepositery.getUnreadMessageReceiverEmails();
	const tpl = await cronRepositery.getTemplateById(59);
	return produce("GOT_A_MESSAGE", 59, emails, tpl?.name || "You have new messages");
}

export async function unifiedEmailService() {
	const emails = await cronRepositery.getClaimedCompanyEmails();
	const tpl = await cronRepositery.getTemplateById(110);
	return produce("UNIFIED_MODULE", 110, emails, tpl?.name || "Unified module");
}

export async function sendEmailImportEmployeeService() {
	const emails = await cronRepositery.getImportEmployeeEmails();
	const tpl = await cronRepositery.getTemplateByShort("CYVPN");
	const templateId = tpl?.id || 0;
	return produce(
		"IMPORT_EMPLOYEE",
		templateId,
		emails,
		tpl?.subject || tpl?.name || "Import employee"
	);
}
