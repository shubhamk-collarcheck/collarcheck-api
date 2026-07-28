import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybCompanyJob, cybJobTemplate, cybApplication, cybJobCollaborators,
	cybUser, cybDesignation, cybDepartment, cybJobExperiences, cybRoleTypes,
	cybJobMode, cybIndustries, cybSalary, cybCities, cybState, cybCountry,
	cybGalleries, cybNotifications,
} from '../db/schema';

export type JobWriteData = {
	company: number;
	jobTitle?: string | null;
	jobDescription?: string | null;
	slug?: string | null;
	rolesResponsibility?: string | null;
	department?: number | null;
	experience?: string | number | null;
	skill?: string | null;
	roleType?: number | null;
	document?: string | null;
	country?: number | null;
	state?: number | null;
	city?: number | null;
	jobMode?: number | null;
	industry?: number | null;
	designation?: number | null;
	urgent?: number | null;
	vacancy?: number | null;
	salary?: number | null;
	status?: number | null;
	templateName?: string | null;
};

function nowSql(): string {
	return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function affectedRows(result: unknown): number {
	if (Array.isArray(result)) {
		return Number((result as { affectedRows?: number }[])[0]?.affectedRows ?? 0);
	}
	return Number((result as { affectedRows?: number } | undefined)?.affectedRows ?? 0);
}

/** List buckets for company all-job (draft=0, publish=1, cancel=2). */
export type JobStatusBuckets = {
	draftIds: number[];
	publishIds: number[];
	cancelIds: number[];
};

export type JobStatusCounts = {
	draft: number;
	publish: number;
	cancel: number;
};

const ALL_JOB_STATUSES = [0, 1, 2] as const;

class companyJobRepositery {


	private companyJobsBaseWhere(companyId: number, keyword: string) {
		const conditions = [
			eq(cybCompanyJob.company, companyId),
			eq(cybCompanyJob.isDeleted, 0),
			inArray(cybCompanyJob.status, [...ALL_JOB_STATUSES]),
		];
		if (keyword) {
			conditions.push(
				sql`(${cybCompanyJob.jobTitle} LIKE ${`%${keyword}%`} OR ${cybCompanyJob.jobDescription} LIKE ${`%${keyword}%`})`,
			);
		}
		return and(...conditions);
	}

	/**
	 * One query: paginated job ids for draft/publish/cancel via ROW_NUMBER per status.
	 * Replaces 3× getJobsByStatus(status).
	 */
	async getJobIdsBucketedByStatus(companyId: number, keyword: string, limit: number, offset: number,): Promise<JobStatusBuckets> {
		const ranked = db.select({
			id: cybCompanyJob.id,
			status: cybCompanyJob.status,
			rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${cybCompanyJob.status} ORDER BY ${cybCompanyJob.modifyDate} DESC)`.as('rn'),
		})
			.from(cybCompanyJob)
			.where(this.companyJobsBaseWhere(companyId, keyword))
			.as('ranked_jobs');

		const rows = await db.select({
			id: ranked.id,
			status: ranked.status,
		}).from(ranked).where(and(
			sql`${ranked.rn} > ${offset}`,
			sql`${ranked.rn} <= ${offset + limit}`,
		))
			.orderBy(asc(ranked.status), asc(ranked.rn));

		const buckets: JobStatusBuckets = {
			draftIds: [],
			publishIds: [],
			cancelIds: [],
		};

		for (const row of rows) {
			if (row.status === 0) buckets.draftIds.push(row.id);
			else if (row.status === 1) buckets.publishIds.push(row.id);
			else if (row.status === 2) buckets.cancelIds.push(row.id);
		}

		return buckets;
	}

	/**
	 * One query: badge totals per status via GROUP BY.
	 * Replaces 3× countJobsByStatus(status). Counts ignore keyword (tab totals).
	 */
	async countJobsGroupedByStatus(companyId: number): Promise<JobStatusCounts> {
		const rows = await db
			.select({
				status: cybCompanyJob.status,
				count: sql<number>`count(*)`,
			})
			.from(cybCompanyJob)
			.where(and(
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.isDeleted, 0),
				inArray(cybCompanyJob.status, [...ALL_JOB_STATUSES]),
			))
			.groupBy(cybCompanyJob.status);

		const counts: JobStatusCounts = { draft: 0, publish: 0, cancel: 0 };
		for (const row of rows) {
			const n = Number(row.count);
			if (row.status === 0) counts.draft = n;
			else if (row.status === 1) counts.publish = n;
			else if (row.status === 2) counts.cancel = n;
		}
		return counts;
	}

	private jobDetailSelect(companyUser: ReturnType<typeof alias<typeof cybUser, 'jobCompany'>>) {
		return {
			id: cybCompanyJob.id,
			company: cybCompanyJob.company,
			jobTitle: cybCompanyJob.jobTitle,
			jobDescription: cybCompanyJob.jobDescription,
			slug: cybCompanyJob.slug,
			rolesResponsibility: cybCompanyJob.rolesResponsibility,
			department: cybCompanyJob.department,
			experience: cybCompanyJob.experience,
			skill: cybCompanyJob.skill,
			roleType: cybCompanyJob.roleType,
			document: cybCompanyJob.document,
			country: cybCompanyJob.country,
			state: cybCompanyJob.state,
			city: cybCompanyJob.city,
			jobMode: cybCompanyJob.jobMode,
			industry: cybCompanyJob.industry,
			designation: cybCompanyJob.designation,
			urgent: cybCompanyJob.urgent,
			vacancy: cybCompanyJob.vacancy,
			salary: cybCompanyJob.salary,
			status: cybCompanyJob.status,
			createDate: cybCompanyJob.createDate,
			modifyDate: cybCompanyJob.modifyDate,
			companyName: companyUser.fname,
			companyProfile: companyUser.profile,
			companySocialImage: companyUser.socialImage,
			companySlug: companyUser.slug,
			companyIndividualId: companyUser.individualId,
			companyEmailVerified: companyUser.emailVerified,
			companyPhoneVerified: companyUser.phoneVerified,
			experienceName: cybJobExperiences.name,
			departmentName: cybDepartment.name,
			roleTypeName: cybRoleTypes.name,
			designationName: cybDesignation.name,
			jobModeName: cybJobMode.name,
			industryName: cybIndustries.name,
			salaryName: cybSalary.name,
			countryName: cybCountry.name,
			stateName: cybState.name,
			cityName: cybCities.name,
		};
	}

	private jobDetailQuery() {
		const companyUser = alias(cybUser, 'jobCompany');
		return db.select(this.jobDetailSelect(companyUser))
			.from(cybCompanyJob)
			.leftJoin(companyUser, eq(cybCompanyJob.company, companyUser.id))
			.leftJoin(cybJobExperiences, eq(cybCompanyJob.experience, cybJobExperiences.id))
			.leftJoin(cybDepartment, eq(cybCompanyJob.department, cybDepartment.id))
			.leftJoin(cybRoleTypes, eq(cybCompanyJob.roleType, cybRoleTypes.id))
			.leftJoin(cybDesignation, eq(cybCompanyJob.designation, cybDesignation.id))
			.leftJoin(cybJobMode, eq(cybCompanyJob.jobMode, cybJobMode.id))
			.leftJoin(cybIndustries, eq(cybCompanyJob.industry, cybIndustries.id))
			.leftJoin(cybSalary, eq(cybCompanyJob.salary, cybSalary.id))
			.leftJoin(cybCountry, eq(cybCompanyJob.country, cybCountry.id))
			.leftJoin(cybState, eq(cybCompanyJob.state, cybState.id))
			.leftJoin(cybCities, eq(cybCompanyJob.city, cybCities.id));
	}

	async getJobDetail(jobId: number) {
		const [row] = await this.jobDetailQuery()
			.where(eq(cybCompanyJob.id, jobId))
			.limit(1);
		return row;
	}

	async getJobDetailsByIds(jobIds: number[]) {
		if (jobIds.length === 0) return [];
		return this.jobDetailQuery()
			.where(inArray(cybCompanyJob.id, jobIds));
	}

	async countJobApplications(jobId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybApplication)
			.where(and(
				eq(cybApplication.job, jobId),
				eq(cybApplication.isDeleted, 0),
			));
		return Number(result.count);
	}

	async countApplicationsByJobIds(jobIds: number[]): Promise<Map<number, number>> {
		const counts = new Map<number, number>();
		if (jobIds.length === 0) return counts;

		const rows = await db.select({
			jobId: cybApplication.job,
			count: sql<number>`count(*)`,
		})
			.from(cybApplication)
			.where(and(
				inArray(cybApplication.job, jobIds),
				eq(cybApplication.isDeleted, 0),
			))
			.groupBy(cybApplication.job);

		for (const row of rows) {
			if (row.jobId != null) {
				counts.set(row.jobId, Number(row.count));
			}
		}
		return counts;
	}

	async getJobCollaborators(jobId: number) {
		const rows = await db.select({
			id: cybJobCollaborators.id,
			jobId: cybJobCollaborators.jobId,
			userId: cybJobCollaborators.userId,
			role: cybJobCollaborators.role,
			userFname: cybUser.fname,
			userLname: cybUser.lname,
			userSlug: cybUser.slug,
			userIndividualId: cybUser.individualId,
			userProfile: cybUser.profile,
			userSocialImage: cybUser.socialImage,
			designationName: cybDesignation.name,
		})
			.from(cybJobCollaborators)
			.leftJoin(cybUser, sql`CAST(${cybJobCollaborators.userId} AS UNSIGNED) = ${cybUser.id}`)
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.where(and(
				eq(cybJobCollaborators.jobId, jobId),
				eq(cybJobCollaborators.isDeleted, 0),
			));
		return rows;
	}

	async getCollaboratorsByJobIds(jobIds: number[]) {
		const byJob = new Map<number, Awaited<ReturnType<companyJobRepositery['getJobCollaborators']>>>();
		if (jobIds.length === 0) return byJob;

		const rows = await db.select({
			id: cybJobCollaborators.id,
			jobId: cybJobCollaborators.jobId,
			userId: cybJobCollaborators.userId,
			role: cybJobCollaborators.role,
			userFname: cybUser.fname,
			userLname: cybUser.lname,
			userSlug: cybUser.slug,
			userIndividualId: cybUser.individualId,
			userProfile: cybUser.profile,
			userSocialImage: cybUser.socialImage,
			designationName: cybDesignation.name,
		})
			.from(cybJobCollaborators)
			.leftJoin(cybUser, sql`CAST(${cybJobCollaborators.userId} AS UNSIGNED) = ${cybUser.id}`)
			.leftJoin(cybDesignation, eq(cybUser.currentPossition, cybDesignation.id))
			.where(and(
				inArray(cybJobCollaborators.jobId, jobIds),
				eq(cybJobCollaborators.isDeleted, 0),
			));

		for (const row of rows) {
			const jobId = row.jobId;
			if (jobId == null) continue;
			const list = byJob.get(jobId) ?? [];
			list.push(row);
			byJob.set(jobId, list);
		}
		return byJob;
	}

	async getJobGallery(companyId: number) {
		const rows = await db.select({ image: cybGalleries.image })
			.from(cybGalleries)
			.where(and(
				eq(cybGalleries.companyId, companyId),
				eq(cybGalleries.isDeleted, 0),
			));
		return rows.map((r) => r.image);
	}

	// ====== Add / Update Job ======

	async findCompanyById(companyId: number) {
		const [row] = await db.select({
			id: cybUser.id,
			fname: cybUser.fname,
			userType: cybUser.userType,
			status: cybUser.status,
		})
			.from(cybUser)
			.where(and(eq(cybUser.id, companyId), eq(cybUser.status, 1), eq(cybUser.userType, 2)))
			.limit(1);
		return row;
	}

	async createJob(data: JobWriteData) {
		const now = nowSql();
		const [{ id }] = await db.insert(cybCompanyJob).values({
			...data,
			experience: data.experience != null ? String(data.experience) : null,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async updateJob(jobId: number, companyId: number, data: JobWriteData) {
		const now = nowSql();
		const result = await db.update(cybCompanyJob)
			.set({
				...data,
				experience: data.experience != null ? String(data.experience) : data.experience,
				modifyDate: now,
			})
			.where(and(
				eq(cybCompanyJob.id, jobId),
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.isDeleted, 0),
			));
		return affectedRows(result);
	}

	async createTemplate(data: JobWriteData) {
		const now = nowSql();
		const [{ id }] = await db.insert(cybJobTemplate).values({
			...data,
			experience: data.experience != null ? String(data.experience) : null,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async updateTemplate(templateId: number, companyId: number, data: JobWriteData) {
		const now = nowSql();
		const result = await db.update(cybJobTemplate)
			.set({
				...data,
				experience: data.experience != null ? String(data.experience) : data.experience,
				modifyDate: now,
			})
			.where(and(
				eq(cybJobTemplate.id, templateId),
				eq(cybJobTemplate.company, companyId),
				eq(cybJobTemplate.isDeleted, 0),
			));
		return affectedRows(result);
	}

	async findDesignationByName(name: string) {
		const [row] = await db.select({ id: cybDesignation.id, name: cybDesignation.name })
			.from(cybDesignation)
			.where(and(eq(cybDesignation.name, name), eq(cybDesignation.status, 1)))
			.limit(1);
		return row;
	}

	async createDesignation(name: string) {
		const now = nowSql();
		const [{ id }] = await db.insert(cybDesignation).values({
			name,
			status: 1,
			userDefined: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async findDepartmentByName(name: string) {
		const [row] = await db.select({ id: cybDepartment.id, name: cybDepartment.name })
			.from(cybDepartment)
			.where(and(eq(cybDepartment.name, name), eq(cybDepartment.status, 1)))
			.limit(1);
		return row;
	}

	async createDepartment(name: string) {
		const now = nowSql();
		const [{ id }] = await db.insert(cybDepartment).values({
			name,
			status: 1,
			userDefined: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async findIndustryByName(name: string) {
		const [row] = await db.select({ id: cybIndustries.id, name: cybIndustries.name })
			.from(cybIndustries)
			.where(and(eq(cybIndustries.name, name), eq(cybIndustries.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async createIndustry(name: string) {
		const now = nowSql();
		const [{ id }] = await db.insert(cybIndustries).values({
			name,
			status: 1,
			userDefined: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async findCityByName(name: string) {
		const [row] = await db.select({ id: cybCities.id, name: cybCities.name })
			.from(cybCities)
			.where(eq(cybCities.name, name))
			.limit(1);
		return row;
	}

	async createCity(name: string, stateId: number) {
		const now = nowSql();
		const [{ id }] = await db.insert(cybCities).values({
			name,
			state: stateId,
			status: 1,
			userDifined: 1,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async getStateName(stateId: number) {
		const [row] = await db.select({ name: cybState.name })
			.from(cybState)
			.where(eq(cybState.id, stateId))
			.limit(1);
		return row?.name ?? null;
	}

	async getDesignationName(designationId: number) {
		const [row] = await db.select({ name: cybDesignation.name })
			.from(cybDesignation)
			.where(eq(cybDesignation.id, designationId))
			.limit(1);
		return row?.name ?? null;
	}

	async getExperienceName(experienceId: number) {
		const [row] = await db.select({ name: cybJobExperiences.name })
			.from(cybJobExperiences)
			.where(eq(cybJobExperiences.id, experienceId))
			.limit(1);
		return row?.name ?? null;
	}

	// ====== Job Status Change ======

	async findJobByIdAndCompany(jobId: number, companyId: number) {
		const [row] = await db.select({
			id: cybCompanyJob.id,
			company: cybCompanyJob.company,
			status: cybCompanyJob.status,
			jobTitle: cybCompanyJob.jobTitle,
		})
			.from(cybCompanyJob)
			.where(and(
				eq(cybCompanyJob.id, jobId),
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.isDeleted, 0),
			))
			.limit(1);
		return row;
	}

	async updateJobStatus(jobId: number, companyId: number, status: number) {
		const now = nowSql();
		const setFields: { status: number; createDate?: string } = { status };
		if (status === 1) {
			setFields.createDate = now;
		}
		const result = await db.update(cybCompanyJob)
			.set(setFields)
			.where(and(
				eq(cybCompanyJob.id, jobId),
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.isDeleted, 0),
			));
		return affectedRows(result);
	}

	// ====== Delete Job ======

	async softDeleteJob(jobId: number, companyId: number) {
		const result = await db.update(cybCompanyJob)
			.set({ isDeleted: 1 })
			.where(and(
				eq(cybCompanyJob.id, jobId),
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.isDeleted, 0),
			));
		return affectedRows(result);
	}

	// ====== Cancel Job ======

	async cancelJob(jobId: number, companyId: number) {
		const result = await db.update(cybCompanyJob)
			.set({ status: 2 })
			.where(and(
				eq(cybCompanyJob.id, jobId),
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.isDeleted, 0),
			));
		return affectedRows(result);
	}

	async getJobApplicants(jobId: number) {
		const rows = await db.select({
			userId: cybApplication.user,
			createDate: cybApplication.createDate,
		})
			.from(cybApplication)
			.where(and(
				eq(cybApplication.job, jobId),
				eq(cybApplication.isDeleted, 0),
			));
		return rows;
	}

	async createNotification(sender: number, receiver: number, message: string, link: string, redirect: string) {
		const now = nowSql();
		await db.insert(cybNotifications).values({
			sender,
			receiver,
			message,
			link,
			redirect,
			createDate: now,
			modifyDate: now,
		});
	}

	async createNotifications(
		items: { sender: number; receiver: number; message: string; link: string; redirect: string }[],
	) {
		if (items.length === 0) return;
		const now = nowSql();
		await db.insert(cybNotifications).values(
			items.map((item) => ({
				...item,
				createDate: now,
				modifyDate: now,
			})),
		);
	}

	// ====== Job Template ======

	async getTemplateList(companyId: number) {
		const rows = await db.select({
			id: cybJobTemplate.id,
			templateName: cybJobTemplate.templateName,
		})
			.from(cybJobTemplate)
			.where(and(
				eq(cybJobTemplate.company, companyId),
				eq(cybJobTemplate.isDeleted, 0),
			))
			.groupBy(cybJobTemplate.templateName)
			.orderBy(asc(cybJobTemplate.id));
		return rows;
	}

	async getTemplateDetail(templateId: number, companyId: number) {
		const companyUser = alias(cybUser, 'tplCompany');
		const [row] = await db.select({
			id: cybJobTemplate.id,
			company: cybJobTemplate.company,
			jobTitle: cybJobTemplate.jobTitle,
			templateName: cybJobTemplate.templateName,
			jobDescription: cybJobTemplate.jobDescription,
			slug: cybJobTemplate.slug,
			rolesResponsibility: cybJobTemplate.rolesResponsibility,
			department: cybJobTemplate.department,
			experience: cybJobTemplate.experience,
			skill: cybJobTemplate.skill,
			roleType: cybJobTemplate.roleType,
			document: cybJobTemplate.document,
			country: cybJobTemplate.country,
			state: cybJobTemplate.state,
			city: cybJobTemplate.city,
			jobMode: cybJobTemplate.jobMode,
			industry: cybJobTemplate.industry,
			designation: cybJobTemplate.designation,
			urgent: cybJobTemplate.urgent,
			vacancy: cybJobTemplate.vacancy,
			salary: cybJobTemplate.salary,
			status: cybJobTemplate.status,
			createDate: cybJobTemplate.createDate,
			companyName: companyUser.fname,
			companyProfile: companyUser.profile,
			companySocialImage: companyUser.socialImage,
			companyIndividualId: companyUser.individualId,
			experienceName: cybJobExperiences.name,
			departmentName: cybDepartment.name,
			roleTypeName: cybRoleTypes.name,
			designationName: cybDesignation.name,
			jobModeName: cybJobMode.name,
			industryName: cybIndustries.name,
			salaryName: cybSalary.name,
			countryName: cybCountry.name,
			stateName: cybState.name,
			cityName: cybCities.name,
		})
			.from(cybJobTemplate)
			.leftJoin(companyUser, eq(cybJobTemplate.company, companyUser.id))
			.leftJoin(cybJobExperiences, eq(cybJobTemplate.experience, cybJobExperiences.id))
			.leftJoin(cybDepartment, eq(cybJobTemplate.department, cybDepartment.id))
			.leftJoin(cybRoleTypes, eq(cybJobTemplate.roleType, cybRoleTypes.id))
			.leftJoin(cybDesignation, eq(cybJobTemplate.designation, cybDesignation.id))
			.leftJoin(cybJobMode, eq(cybJobTemplate.jobMode, cybJobMode.id))
			.leftJoin(cybIndustries, eq(cybJobTemplate.industry, cybIndustries.id))
			.leftJoin(cybSalary, eq(cybJobTemplate.salary, cybSalary.id))
			.leftJoin(cybCountry, eq(cybJobTemplate.country, cybCountry.id))
			.leftJoin(cybState, eq(cybJobTemplate.state, cybState.id))
			.leftJoin(cybCities, eq(cybJobTemplate.city, cybCities.id))
			.where(and(
				eq(cybJobTemplate.id, templateId),
				eq(cybJobTemplate.company, companyId),
				eq(cybJobTemplate.isDeleted, 0),
			))
			.limit(1);
		return row;
	}

	// ====== Multi Operations ======

	async multiCancelJobs(ids: number[], companyId: number) {
		if (ids.length === 0) return 0;
		const result = await db.update(cybCompanyJob)
			.set({ status: 2 })
			.where(and(
				inArray(cybCompanyJob.id, ids),
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.isDeleted, 0),
			));
		return affectedRows(result);
	}

	async multiUpdateJobStatus(ids: number[], status: number, companyId: number) {
		if (ids.length === 0) return 0;
		const setFields: { status: number; createDate?: string } = { status };
		if (status === 1) {
			setFields.createDate = nowSql();
		}
		const result = await db.update(cybCompanyJob)
			.set(setFields)
			.where(and(
				inArray(cybCompanyJob.id, ids),
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.isDeleted, 0),
			));
		return affectedRows(result);
	}
}

export default new companyJobRepositery();
