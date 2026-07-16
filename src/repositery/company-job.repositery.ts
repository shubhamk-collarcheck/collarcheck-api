import { and, asc, desc, eq, sql, like, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybCompanyJob, cybJobTemplate, cybApplication, cybJobCollaborators,
	cybUser, cybDesignation, cybDepartment, cybJobExperiences, cybRoleTypes,
	cybJobMode, cybIndustries, cybSalary, cybCities, cybState, cybCountry,
	cybGalleries, cybNotifications,
} from '../db/schema';

class companyJobRepositery {

	// ====== All Job ======

	async getJobsByStatus(companyId: number, status: number, keyword: string, limit: number, offset: number) {
		const conditions = [
			eq(cybCompanyJob.company, companyId),
			eq(cybCompanyJob.status, status),
			eq(cybCompanyJob.isDeleted, 0),
		];
		if (keyword) {
			conditions.push(sql`(${cybCompanyJob.jobTitle} LIKE ${`%${keyword}%`} OR ${cybCompanyJob.jobDescription} LIKE ${`%${keyword}%`})`);
		}

		const rows = await db.select({ id: cybCompanyJob.id })
			.from(cybCompanyJob)
			.where(and(...conditions))
			.orderBy(desc(cybCompanyJob.modifyDate))
			.limit(limit)
			.offset(offset);
		return rows.map(r => r.id);
	}

	async countJobsByStatus(companyId: number, status: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybCompanyJob)
			.where(and(
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.status, status),
				eq(cybCompanyJob.isDeleted, 0),
			));
		return result.count;
	}

	async getJobDetail(jobId: number) {
		const companyUser = alias(cybUser, 'jobCompany');
		const [row] = await db.select({
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
		})
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
			.leftJoin(cybCities, eq(cybCompanyJob.city, cybCities.id))
			.where(eq(cybCompanyJob.id, jobId))
			.limit(1);
		return row;
	}

	async countJobApplications(jobId: number): Promise<number> {
		const [result] = await db.select({ count: sql<number>`count(*)` })
			.from(cybApplication)
			.where(and(
				eq(cybApplication.job, jobId),
				eq(cybApplication.isDeleted, 0),
			));
		return result.count;
	}

	async getJobCollaborators(jobId: number) {
		const rows = await db.select({
			id: cybJobCollaborators.id,
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

	async getJobGallery(companyId: number) {
		const rows = await db.select({ image: cybGalleries.image })
			.from(cybGalleries)
			.where(and(
				eq(cybGalleries.companyId, companyId),
				eq(cybGalleries.isDeleted, 0),
			));
		return rows.map(r => r.image);
	}

	// ====== Add / Update Job ======

	async findCompanyById(companyId: number) {
		const [row] = await db.select()
			.from(cybUser)
			.where(and(eq(cybUser.id, companyId), eq(cybUser.status, 1), eq(cybUser.userType, 2)));
		return row;
	}

	async createJob(data: Record<string, any>) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybCompanyJob).values({
			...data,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async updateJob(jobId: number, data: Record<string, any>) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		data.modifyDate = now;
		await db.update(cybCompanyJob)
			.set(data)
			.where(eq(cybCompanyJob.id, jobId));
	}

	async createTemplate(data: Record<string, any>) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const [{ id }] = await db.insert(cybJobTemplate).values({
			...data,
			createDate: now,
			modifyDate: now,
		}).$returningId();
		return id;
	}

	async updateTemplate(templateId: number, data: Record<string, any>) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		data.modifyDate = now;
		await db.update(cybJobTemplate)
			.set(data)
			.where(eq(cybJobTemplate.id, templateId));
	}

	async findDesignationByName(name: string) {
		const [row] = await db.select()
			.from(cybDesignation)
			.where(and(eq(cybDesignation.name, name), eq(cybDesignation.status, 1)));
		return row;
	}

	async createDesignation(name: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
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
		const [row] = await db.select()
			.from(cybDepartment)
			.where(and(eq(cybDepartment.name, name), eq(cybDepartment.status, 1)));
		return row;
	}

	async createDepartment(name: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
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
		const [row] = await db.select()
			.from(cybIndustries)
			.where(and(eq(cybIndustries.name, name), eq(cybIndustries.isDeleted, 0)));
		return row;
	}

	async createIndustry(name: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
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
		const [row] = await db.select()
			.from(cybCities)
			.where(eq(cybCities.name, name));
		return row;
	}

	async createCity(name: string, stateId: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
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

	// ====== Job Status Change ======

	async findJobByIdAndCompany(jobId: number, companyId: number) {
		const [row] = await db.select()
			.from(cybCompanyJob)
			.where(and(
				eq(cybCompanyJob.id, jobId),
				eq(cybCompanyJob.company, companyId),
				eq(cybCompanyJob.isDeleted, 0),
			));
		return row;
	}

	async updateJobStatus(jobId: number, status: number) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const setFields: Record<string, any> = { status };
		if (status === 1) {
			setFields.createDate = now;
		}
		await db.update(cybCompanyJob)
			.set(setFields)
			.where(eq(cybCompanyJob.id, jobId));
	}

	// ====== Delete Job ======

	async softDeleteJob(jobId: number, companyId: number) {
		const result = await db.update(cybCompanyJob)
			.set({ isDeleted: 1 })
			.where(and(
				eq(cybCompanyJob.id, jobId),
				eq(cybCompanyJob.company, companyId),
			));
		return result;
	}

	// ====== Cancel Job ======

	async cancelJob(jobId: number, companyId: number) {
		const result = await db.update(cybCompanyJob)
			.set({ status: 2 })
			.where(and(
				eq(cybCompanyJob.id, jobId),
				eq(cybCompanyJob.company, companyId),
			));
		return result;
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

	async getUserDetail(userId: number) {
		const [row] = await db.select({
			id: cybUser.id,
			fname: cybUser.fname,
			lname: cybUser.lname,
			email: cybUser.email,
			slug: cybUser.slug,
		})
			.from(cybUser)
			.where(eq(cybUser.id, userId))
			.limit(1);
		return row;
	}

	async createNotification(sender: number, receiver: number, message: string, link: string, redirect: string) {
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
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
		for (const id of ids) {
			await db.update(cybCompanyJob)
				.set({ status: 2 })
				.where(and(
					eq(cybCompanyJob.id, id),
					eq(cybCompanyJob.company, companyId),
				));
		}
	}

	async multiUpdateJobStatus(ids: number[], status: number, companyId: number) {
		for (const id of ids) {
			const [job] = await db.select({ id: cybCompanyJob.id })
				.from(cybCompanyJob)
				.where(and(
					eq(cybCompanyJob.id, id),
					eq(cybCompanyJob.company, companyId),
				));

			if (job) {
				await db.update(cybCompanyJob)
					.set({ status })
					.where(eq(cybCompanyJob.id, id));
			}
		}
	}
}

export default new companyJobRepositery();
