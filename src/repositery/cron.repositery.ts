import { and, asc, eq, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import db from "../db";
import {
	cybSchedulars,
	cybSchedularEmailTemp,
	cybSchedularHistory,
	cybEmailTemplates,
	cybUser,
	cybUserDetails,
	cybUserProfileViewRequest,
	cybOtp,
	cybAccountSetting,
	cybCompanyJob,
	cybApplication,
	cybViewImpressions,
	cybUserSkill,
	cybUserExperience,
	cybMessageHistory,
} from "../db/schema";

function nowStr() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function dateOnly(d = new Date()) {
	return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().slice(0, 19).replace("T", " ");
}

function dateDaysAgo(n: number) {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().slice(0, 10);
}

class CronRepository {
	// ── view requests ────────────────────────────────────────────────

	async expireViewRequests() {
		const today = dateOnly();
		const result = await db
			.update(cybUserProfileViewRequest)
			.set({ status: 0 })
			.where(
				and(
					eq(cybUserProfileViewRequest.isDeleted, 0),
					sql`DATE(${cybUserProfileViewRequest.expiry}) < ${today}`
				)
			);
		return result;
	}

	// ── OTP / trim master data ───────────────────────────────────────

	async deleteOldOtps() {
		const today = dateOnly();
		await db
			.delete(cybOtp)
			.where(sql`DATE(${cybOtp.createDate}) < ${today}`);
	}

	async trimMasterNames() {
		await db.execute(sql`UPDATE cyb_department SET name = TRIM(name)`);
		await db.execute(sql`UPDATE cyb_designation SET name = TRIM(name)`);
		await db.execute(sql`UPDATE cyb_institutions SET name = TRIM(name)`);
		await db.execute(sql`UPDATE cyb_courses SET name = TRIM(name)`);
		await db.execute(sql`UPDATE cyb_skill SET name = TRIM(name)`);
		await db.execute(sql`UPDATE cyb_state SET name = TRIM(name)`);
	}

	// ── lat/long ─────────────────────────────────────────────────────

	async getUsersNeedingLatLong(limit = 100) {
		return db
			.select({
				userId: cybUser.id,
				presentAddress: cybUser.presentAddress,
				city: cybUser.city,
				state: cybUser.state,
				country: cybUser.country,
				detailsId: cybUserDetails.id,
				latitude: cybUserDetails.latitude,
				longitude: cybUserDetails.longitude,
			})
			.from(cybUser)
			.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
			.where(
				and(
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0),
					or(
						isNull(cybUserDetails.latitude),
						eq(cybUserDetails.latitude, ""),
						isNull(cybUserDetails.longitude),
						eq(cybUserDetails.longitude, "")
					),
					sql`${cybUser.presentAddress} IS NOT NULL AND ${cybUser.presentAddress} != ''`
				)
			)
			.limit(limit);
	}

	async upsertUserLatLong(userId: number, latitude: string, longitude: string) {
		const [existing] = await db
			.select({ id: cybUserDetails.id })
			.from(cybUserDetails)
			.where(eq(cybUserDetails.userId, userId))
			.limit(1);
		if (existing) {
			await db
				.update(cybUserDetails)
				.set({ latitude, longitude })
				.where(eq(cybUserDetails.userId, userId));
		} else {
			await db.insert(cybUserDetails).values({ userId, latitude, longitude });
		}
	}

	// ── percentage ───────────────────────────────────────────────────

	async getUserIdsForPercentage(limit = 1000) {
		return db
			.select({ id: cybUser.id })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0),
					eq(cybUser.percentageStatus, 0),
					or(ne(cybUser.userType, 2), eq(cybUser.claimStatus, 1))
				)
			)
			.orderBy(asc(cybUser.id))
			.limit(limit);
	}

	async updateUserPercentage(userId: number, percentage: number) {
		await db
			.update(cybUser)
			.set({ percentage, percentageStatus: 1, modifyDate: nowStr() })
			.where(eq(cybUser.id, userId));
	}

	async resetPercentageStatus() {
		await db.update(cybUser).set({ percentageStatus: 0 });
	}

	// ── account settings backfill ────────────────────────────────────

	async getUsersMissingAccountSettings() {
		return db
			.select({
				id: cybUser.id,
				userType: cybUser.userType,
			})
			.from(cybUser)
			.leftJoin(cybAccountSetting, eq(cybAccountSetting.userId, cybUser.id))
			.where(
				and(
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0),
					isNull(cybAccountSetting.id),
					or(eq(cybUser.userType, 1), and(eq(cybUser.userType, 2), eq(cybUser.claimStatus, 1)))
				)
			)
			.groupBy(cybUser.id, cybUser.userType)
			.limit(500);
	}

	// ── schedulars pipeline ──────────────────────────────────────────

	async getUpcomingSchedules(id?: number) {
		const now = nowStr();
		const conditions = [
			eq(cybSchedulars.status, 1),
			eq(cybSchedulars.execute, 0),
			eq(cybSchedulars.isDeleted, 0),
		];
		if (id) {
			conditions.push(eq(cybSchedulars.id, id));
		} else {
			conditions.push(lte(cybSchedulars.trigger, now));
		}

		return db.select({
			id: cybSchedulars.id,
			name: cybSchedulars.name,
			emails: cybSchedulars.emails,
			template: cybSchedulars.template,
			type: cybSchedulars.type,
			trigger: cybSchedulars.trigger,
			status: cybSchedulars.status,
			execute: cybSchedulars.execute,
			templatePath: cybEmailTemplates.templatePath,
			templateSubject: cybEmailTemplates.subject,
			templateShort: cybEmailTemplates.short,
			templateName: cybEmailTemplates.name,
		})
			.from(cybSchedulars)
			.leftJoin(cybEmailTemplates, eq(cybSchedulars.template, cybEmailTemplates.id))
			.where(and(...conditions));
	}

	async getExecuteSchedules(id?: number) {
		const now = nowStr();
		const conditions = [
			eq(cybSchedulars.status, 1),
			eq(cybSchedulars.execute, 1),
			eq(cybSchedulars.isDeleted, 0),
		];
		if (id) {
			conditions.push(eq(cybSchedulars.id, id));
		} else {
			conditions.push(lte(cybSchedulars.trigger, now));
		}

		return db
			.select({
				id: cybSchedulars.id,
				name: cybSchedulars.name,
				emails: cybSchedulars.emails,
				template: cybSchedulars.template,
				type: cybSchedulars.type,
				trigger: cybSchedulars.trigger,
				status: cybSchedulars.status,
				execute: cybSchedulars.execute,
				templatePath: cybEmailTemplates.templatePath,
				templateSubject: cybEmailTemplates.subject,
				templateShort: cybEmailTemplates.short,
				templateName: cybEmailTemplates.name,
			})
			.from(cybSchedulars)
			.leftJoin(cybEmailTemplates, eq(cybSchedulars.template, cybEmailTemplates.id))
			.where(and(...conditions));
	}

	async setScheduleExecute(id: number, execute: number) {
		await db
			.update(cybSchedulars)
			.set({ execute, modifyDate: nowStr() })
			.where(eq(cybSchedulars.id, id));
	}

	async insertTempEmails(schedularId: number, emails: string[]) {
		const now = nowStr();
		if (!emails.length) return;
		// insert in chunks of 500 handled by caller
		await db.insert(cybSchedularEmailTemp).values(
			emails.map((email) => ({
				schedularId,
				email,
				status: 0,
				deliver: 0,
				createDate: now,
				modifyDate: now,
			}))
		);
	}

	async getPendingTempEmails(schedularId: number, limit = 30) {
		return db
			.select()
			.from(cybSchedularEmailTemp)
			.where(
				and(eq(cybSchedularEmailTemp.schedularId, schedularId), eq(cybSchedularEmailTemp.status, 0))
			)
			.orderBy(asc(cybSchedularEmailTemp.id))
			.limit(limit);
	}

	async updateTempEmail(id: number, deliver: number) {
		await db
			.update(cybSchedularEmailTemp)
			.set({ status: 1, deliver, modifyDate: nowStr() })
			.where(eq(cybSchedularEmailTemp.id, id));
	}

	async insertHistory(schedularId: number, email: string, template: number | null) {
		await db.insert(cybSchedularHistory).values({
			schedularId,
			email,
			template: template ?? null,
			createDate: nowStr(),
			modifyDate: nowStr(),
		});
	}

	async findUserByEmail(email: string) {
		const [row] = await db
			.select()
			.from(cybUser)
			.where(and(eq(cybUser.email, email.toLowerCase()), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async getNewsletterSetting(userId: number) {
		const [row] = await db
			.select()
			.from(cybAccountSetting)
			.where(and(eq(cybAccountSetting.userId, userId), eq(cybAccountSetting.key, "newsletter")))
			.limit(1);
		return row;
	}

	async getCompletedScheduleIds() {
		// schedules that have temp rows, none pending (status=0) and none deliver=0
		const rows = await db
			.select({
				schedularId: cybSchedularEmailTemp.schedularId,
				pending: sql<number>`SUM(CASE WHEN ${cybSchedularEmailTemp.status} = 0 THEN 1 ELSE 0 END)`,
				unset: sql<number>`SUM(CASE WHEN ${cybSchedularEmailTemp.deliver} = 0 THEN 1 ELSE 0 END)`,
			})
			.from(cybSchedularEmailTemp)
			.groupBy(cybSchedularEmailTemp.schedularId);

		return rows
			.filter((r) => Number(r.pending) === 0 && Number(r.unset) === 0 && r.schedularId)
			.map((r) => r.schedularId as number);
	}

	async getTempEmailsByDeliver(schedularId: number, deliver: number) {
		const rows = await db
			.select({ email: cybSchedularEmailTemp.email })
			.from(cybSchedularEmailTemp)
			.where(
				and(
					eq(cybSchedularEmailTemp.schedularId, schedularId),
					eq(cybSchedularEmailTemp.deliver, deliver)
				)
			);
		return rows.map((r) => r.email).filter(Boolean) as string[];
	}

	async finalizeSchedule(
		id: number,
		delivered: string[],
		notDelivered: string[],
		notSend: string[]
	) {
		await db
			.update(cybSchedulars)
			.set({
				delivered: JSON.stringify(delivered),
				notDelivered: JSON.stringify(notDelivered),
				notSend: JSON.stringify(notSend),
				execute: 0,
				status: 2,
				modifyDate: nowStr(),
				sentTime: nowStr(),
			})
			.where(eq(cybSchedulars.id, id));
		await db.delete(cybSchedularEmailTemp).where(eq(cybSchedularEmailTemp.schedularId, id));
	}

	async snapshotInProgressSchedule(id: number) {
		const delivered = await this.getTempEmailsByDeliver(id, 1);
		const notDelivered = await this.getTempEmailsByDeliver(id, 2);
		const notSend = await this.getTempEmailsByDeliver(id, 3);
		await db
			.update(cybSchedulars)
			.set({
				delivered: JSON.stringify(delivered),
				notDelivered: JSON.stringify(notDelivered),
				notSend: JSON.stringify(notSend),
				modifyDate: nowStr(),
			})
			.where(and(eq(cybSchedulars.id, id), eq(cybSchedulars.status, 1), eq(cybSchedulars.execute, 1)));
	}

	async getActiveExecuteSchedules() {
		return db
			.select({ id: cybSchedulars.id })
			.from(cybSchedulars)
			.where(
				and(
					eq(cybSchedulars.status, 1),
					eq(cybSchedulars.execute, 1),
					eq(cybSchedulars.isDeleted, 0)
				)
			);
	}

	async getRescheduleDetail(id: number) {
		const [row] = await db
			.select()
			.from(cybSchedulars)
			.where(
				and(
					eq(cybSchedulars.id, id),
					eq(cybSchedulars.execute, 0),
					eq(cybSchedulars.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async insertSchedular(data: {
		name?: string | null;
		emails: string[];
		template: number | null;
		type: string;
		status?: number;
		execute?: number;
		trigger?: string;
	}) {
		const now = nowStr();
		const [{ id }] = await db.insert(cybSchedulars).values({
			name: data.name || null,
			emails: JSON.stringify(data.emails),
			template: data.template,
			type: data.type,
			status: data.status ?? 1,
			execute: data.execute ?? 0,
			trigger: data.trigger || now,
			isDeleted: 0,
			createDate: now,
			modifyDate: now,
		})
			.$returningId();
		return id;
	}

	async getTemplateById(id: number) {
		const [row] = await db.select().from(cybEmailTemplates).where(eq(cybEmailTemplates.id, id)).limit(1);
		return row;
	}

	async getTemplateByShort(short: string) {
		const [row] = await db
			.select()
			.from(cybEmailTemplates)
			.where(eq(cybEmailTemplates.short, short))
			.limit(1);
		return row;
	}

	// ── producers: audience queries ──────────────────────────────────

	async getNoticeExpiringEmails() {
		const yesterday = dateDaysAgo(1);
		const rows = await db
			.select({ email: cybUser.email })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0),
					eq(cybUser.onNotice, 1),
					sql`DATE(${cybUser.noticeDate}) = ${yesterday}`,
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			);
		return [...new Set(rows.map((r) => r.email!.toLowerCase()))];
	}

	async countJobsCreatedYesterday() {
		const yesterday = dateDaysAgo(1);
		const [row] = await db
			.select({ count: sql<number>`count(*)` })
			.from(cybCompanyJob)
			.where(
				and(
					eq(cybCompanyJob.status, 1),
					eq(cybCompanyJob.isDeleted, 0),
					sql`DATE(${cybCompanyJob.createDate}) = ${yesterday}`
				)
			);
		return Number(row?.count || 0);
	}

	async getActiveEmployeeEmails() {
		const rows = await db
			.select({ email: cybUser.email })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.userType, 1),
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0),
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			);
		return [...new Set(rows.map((r) => r.email!.toLowerCase()))];
	}

	async countEmployeesCreatedToday() {
		const today = dateOnly();
		const [row] = await db
			.select({ count: sql<number>`count(*)` })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.userType, 1),
					eq(cybUser.isDeleted, 0),
					sql`DATE(${cybUser.createDate}) = ${today}`
				)
			);
		return Number(row?.count || 0);
	}

	async getClaimedCompanyEmails() {
		const rows = await db
			.select({ email: cybUser.email })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.userType, 2),
					eq(cybUser.claimStatus, 1),
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0),
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			);
		return [...new Set(rows.map((r) => r.email!.toLowerCase()))];
	}

	async getJobViewedNotAppliedEmails() {
		const cutoff = daysAgo(7);
		const impressions = await db
			.selectDistinct({ userId: cybViewImpressions.currentUser })
			.from(cybViewImpressions)
			.where(
				and(
					eq(cybViewImpressions.type, "Job"),
					eq(cybViewImpressions.isDeleted, 0),
					lt(cybViewImpressions.createDate, cutoff)
				)
			);

		const emails: string[] = [];
		for (const imp of impressions) {
			const [applied] = await db
				.select({ id: cybApplication.id })
				.from(cybApplication)
				.where(and(eq(cybApplication.user, imp.userId), eq(cybApplication.isDeleted, 0)))
				.limit(1);
			if (applied) continue;
			const [user] = await db
				.select({ email: cybUser.email })
				.from(cybUser)
				.where(
					and(
						eq(cybUser.id, imp.userId),
						eq(cybUser.status, 1),
						eq(cybUser.isDeleted, 0),
						sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
					)
				)
				.limit(1);
			if (user?.email) emails.push(user.email.toLowerCase());
		}
		return [...new Set(emails)];
	}

	async getEmployeesNeverAppliedEmails() {
		const employees = await db
			.select({ id: cybUser.id, email: cybUser.email })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.userType, 1),
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0),
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			);
		const emails: string[] = [];
		for (const e of employees) {
			const [applied] = await db
				.select({ id: cybApplication.id })
				.from(cybApplication)
				.where(and(eq(cybApplication.user, e.id), eq(cybApplication.isDeleted, 0)))
				.limit(1);
			if (!applied && e.email) emails.push(e.email.toLowerCase());
		}
		return [...new Set(emails)];
	}

	async getCompaniesWithNoJobsEmails() {
		const companies = await db
			.select({ id: cybUser.id, email: cybUser.email })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.userType, 2),
					eq(cybUser.claimStatus, 1),
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0),
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			);
		const emails: string[] = [];
		for (const c of companies) {
			const [job] = await db
				.select({ id: cybCompanyJob.id })
				.from(cybCompanyJob)
				.where(and(eq(cybCompanyJob.company, c.id), eq(cybCompanyJob.isDeleted, 0)))
				.limit(1);
			if (!job && c.email) emails.push(c.email.toLowerCase());
		}
		return [...new Set(emails)];
	}

	async getSkillMatchEmployeeEmails() {
		const users = await db
			.select({ id: cybUser.id, email: cybUser.email })
			.from(cybUser)
			.innerJoin(cybUserSkill, eq(cybUserSkill.user, cybUser.id))
			.where(
				and(
					eq(cybUser.userType, 1),
					eq(cybUser.onExplore, 1),
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0),
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			)
			.groupBy(cybUser.id, cybUser.email);

		// Only if there are open jobs
		const [openJob] = await db
			.select({ id: cybCompanyJob.id })
			.from(cybCompanyJob)
			.where(and(eq(cybCompanyJob.status, 1), eq(cybCompanyJob.isDeleted, 0)))
			.limit(1);
		if (!openJob) return [];

		return [...new Set(users.map((u) => u.email!.toLowerCase()))];
	}

	async getCompaniesPostedJobsTodayEmails() {
		const today = dateOnly();
		const rows = await db
			.select({ email: cybUser.email })
			.from(cybCompanyJob)
			.innerJoin(cybUser, eq(cybUser.id, cybCompanyJob.company))
			.where(
				and(
					eq(cybCompanyJob.isDeleted, 0),
					sql`DATE(${cybCompanyJob.createDate}) = ${today}`,
					eq(cybUser.isDeleted, 0),
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			);
		return [...new Set(rows.map((r) => r.email!.toLowerCase()))];
	}

	async getUnreadMessageReceiverEmails() {
		const rows = await db
			.select({ email: cybUser.email })
			.from(cybMessageHistory)
			.innerJoin(cybUser, eq(cybUser.id, cybMessageHistory.receiver))
			.where(
				and(
					eq(cybMessageHistory.isViewed, 0),
					eq(cybMessageHistory.isDeleted, 0),
					sql`${cybMessageHistory.createDate} >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			);
		return [...new Set(rows.map((r) => r.email!.toLowerCase()))];
	}

	async getGentleReminderCompanyEmails() {
		const cutoff = daysAgo(7);
		const rows = await db
			.select({ email: cybUser.email })
			.from(cybUserExperience)
			.innerJoin(cybUser, eq(cybUser.id, cybUserExperience.company))
			.where(
				and(
					eq(cybUserExperience.approved, 0),
					eq(cybUserExperience.isDeleted, 0),
					lt(cybUserExperience.createDate, cutoff),
					eq(cybUser.userType, 2),
					eq(cybUser.isDeleted, 0),
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			);
		return [...new Set(rows.map((r) => r.email!.toLowerCase()))];
	}

	async countImmediateJoiners() {
		const [row] = await db
			.select({ count: sql<number>`count(*)` })
			.from(cybUser)
			.where(
				and(
					eq(cybUser.onImmediate, 1),
					eq(cybUser.onExplore, 1),
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0)
				)
			);
		return Number(row?.count || 0);
	}

	async getCompaniesWithJobsEmails() {
		const rows = await db
			.select({ email: cybUser.email })
			.from(cybUser)
			.innerJoin(cybCompanyJob, eq(cybCompanyJob.company, cybUser.id))
			.where(
				and(
					eq(cybUser.userType, 2),
					eq(cybUser.claimStatus, 1),
					eq(cybUser.status, 1),
					eq(cybUser.isDeleted, 0),
					eq(cybCompanyJob.isDeleted, 0),
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			)
			.groupBy(cybUser.email);
		return [...new Set(rows.map((r) => r.email!.toLowerCase()))];
	}

	async getNoLoginEmails(userType: 1 | 2) {
		const cutoff = dateDaysAgo(7);
		const conditions = [
			eq(cybUser.userType, userType),
			eq(cybUser.status, 1),
			eq(cybUser.isDeleted, 0),
			sql`DATE(${cybUser.loginTime}) < ${cutoff}`,
			sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`,
		];
		if (userType === 2) conditions.push(eq(cybUser.claimStatus, 1));
		const rows = await db
			.select({ email: cybUser.email })
			.from(cybUser)
			.where(and(...conditions));
		return [...new Set(rows.map((r) => r.email!.toLowerCase()))];
	}

	async getImportEmployeeEmails() {
		const rows = await db
			.select({ email: cybUser.email })
			.from(cybUserDetails)
			.innerJoin(cybUser, eq(cybUser.id, cybUserDetails.userId))
			.where(
				and(
					eq(cybUserDetails.import, 1),
					eq(cybUser.isDeleted, 0),
					sql`${cybUser.email} IS NOT NULL AND ${cybUser.email} != ''`
				)
			);
		return [...new Set(rows.map((r) => r.email!.toLowerCase()))];
	}
}

export default new CronRepository();
