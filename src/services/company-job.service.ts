import companyJobRepositery from '../repositery/company-job.repositery';
import type { AllJobQuery } from '../types/company-job.types';

const s3Prefix = process.env.S3_PREFIX || '';

type JobDetailRow = NonNullable<Awaited<ReturnType<typeof companyJobRepositery.getJobDetail>>>;
type CollaboratorRow = Awaited<ReturnType<typeof companyJobRepositery.getJobCollaborators>>[number];

function generateSlug(title: string, stateName: string | null, designationName: string | null, experienceName: string | null): string {
	const now = new Date();
	const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(2)}`;
	const random = Math.floor(1000 + Math.random() * 9000);
	const parts = [
		title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
		stateName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '',
		designationName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '',
		experienceName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '',
		dateStr,
		random,
	].filter(Boolean);
	return parts.join('-');
}

function profileUrl(profile: string | null | undefined, socialImage: string | null | undefined) {
	return profile ? `${s3Prefix}${profile}` : (socialImage || '');
}

function formatJobDetail(
	job: JobDetailRow,
	opts: {
		companyId: number;
		applicationCount: number;
		collaborators: CollaboratorRow[];
		gallery: (string | null)[];
	},
) {
	const { companyId, applicationCount, collaborators, gallery } = opts;
	const isVerified = job.companyEmailVerified === 1 || job.companyPhoneVerified === 1;
	// userId is text in cyb_job_collaborators
	const companyIdKey = String(companyId);
	const isCollaborator = collaborators.some((c) => c.userId === companyIdKey);

	return {
		id: job.id,
		individual_id: job.companyIndividualId,
		job_title: job.jobTitle,
		job_description: job.jobDescription,
		roles_responsibility: job.rolesResponsibility,
		department_name: job.departmentName,
		experience_name: job.experienceName,
		role_type_name: job.roleTypeName,
		job_mode_name: job.jobModeName,
		industry_name: job.industryName,
		designation_name: job.designationName,
		country_name: job.countryName,
		state_name: job.stateName,
		city_name: job.cityName,
		salary_name: job.salaryName,
		company_name: job.companyName,
		profile: profileUrl(job.companyProfile, job.companySocialImage),
		document: job.document ? `${s3Prefix}${job.document}` : '',
		applicationCount,
		status: job.status,
		slug: job.slug,
		create_date: job.createDate,
		gallery: gallery.map((g) => (g ? `${s3Prefix}${g}` : '')),
		company_slug: job.companySlug,
		is_verified: isVerified,
		apply: false,
		// Locked PHP key (typo preserved)
		colloborator: isCollaborator,
		collaboratorList: collaborators.map((c) => ({
			id: c.id,
			full_name: `${c.userFname ?? ''} ${c.userLname ?? ''}`.trim(),
			slug: c.userSlug,
			individual_id: c.userIndividualId,
			profile: profileUrl(c.userProfile, c.userSocialImage),
			designation_name: c.designationName,
		})),
		totalCount: collaborators.length,
	};
}

function mapJobsByIds(
	ids: number[],
	jobById: Map<number, JobDetailRow>,
	appCounts: Map<number, number>,
	collabsByJob: Map<number, CollaboratorRow[]>,
	gallery: (string | null)[],
	companyId: number,
) {
	return ids
		.map((id) => {
			const job = jobById.get(id);
			if (!job) return null;
			return formatJobDetail(job, {
				companyId,
				applicationCount: appCounts.get(id) ?? 0,
				collaborators: collabsByJob.get(id) ?? [],
				gallery,
			});
		})
		.filter((job): job is NonNullable<typeof job> => job != null);
}

// ====== 1. All Job ======

export async function allJobService(companyId: number, query: AllJobQuery['query']) {
	const { keyword, limit, offset } = query;

	const [draftIds, publishIds, cancelIds, draftCount, publishCount, cancelCount] = await Promise.all([
		companyJobRepositery.getJobsByStatus(companyId, 0, keyword, limit, offset),
		companyJobRepositery.getJobsByStatus(companyId, 1, keyword, limit, offset),
		companyJobRepositery.getJobsByStatus(companyId, 2, keyword, limit, offset),
		companyJobRepositery.countJobsByStatus(companyId, 0),
		companyJobRepositery.countJobsByStatus(companyId, 1),
		companyJobRepositery.countJobsByStatus(companyId, 2),
	]);

	const allIds = [...draftIds, ...publishIds, ...cancelIds];
	const uniqueIds = [...new Set(allIds)];

	const [jobRows, appCounts, collabsByJob, gallery] = await Promise.all([
		companyJobRepositery.getJobDetailsByIds(uniqueIds),
		companyJobRepositery.countApplicationsByJobIds(uniqueIds),
		companyJobRepositery.getCollaboratorsByJobIds(uniqueIds),
		companyJobRepositery.getJobGallery(companyId),
	]);

	const jobById = new Map(jobRows.map((row) => [row.id, row]));

	return {
		status: true,
		messages: "job List",
		data: {
			draftJobs: mapJobsByIds(draftIds, jobById, appCounts, collabsByJob, gallery, companyId),
			publishJobs: mapJobsByIds(publishIds, jobById, appCounts, collabsByJob, gallery, companyId),
			cancelJobs: mapJobsByIds(cancelIds, jobById, appCounts, collabsByJob, gallery, companyId),
			draftJobsCounts: draftCount,
			publishJobsCounts: publishCount,
			cancelJobsCounts: cancelCount,
		},
	};
}

// ====== 2. Add / Update Job ======

export async function addJobService(companyId: number, data: Record<string, any>, jobDocPath?: string) {
	const company = await companyJobRepositery.findCompanyById(companyId);
	if (!company) {
		return { status: false, messages: "Invalid Company !" };
	}

	if (data.status === 3) {
		if (!data.template_name) {
			return { status: false, messages: "template_name is required for templates." };
		}

		const templateData: Record<string, any> = {
			company: companyId,
			jobTitle: data.job_title,
			templateName: data.template_name,
			jobDescription: data.job_description,
			rolesResponsibility: data.roles_responsibility,
			department: data.department,
			experience: data.experience,
			skill: data.skill ? JSON.stringify(data.skill) : null,
			roleType: data.role_type,
			document: jobDocPath || data.document,
			country: data.country,
			state: data.state,
			city: data.city,
			jobMode: data.job_mode,
			industry: data.industry,
			designation: data.designation,
			urgent: data.urgent ? 1 : 0,
			vacancy: data.vacancy,
			salary: data.salary,
			status: 3,
		};

		if (data.template_id) {
			await companyJobRepositery.updateTemplate(data.template_id, templateData);
			return { status: true, messages: "Template updated successfully", jobId: data.template_id };
		} else {
			const templateId = await companyJobRepositery.createTemplate(templateData);
			return { status: true, messages: "Template created successfully", jobId: templateId };
		}
	}

	if (!data.job_title || !data.job_description) {
		return { status: false, messages: "job_title,job_description are required." };
	}

	let designationId = data.designation;
	if (designationId && isNaN(Number(designationId))) {
		const existing = await companyJobRepositery.findDesignationByName(designationId);
		designationId = existing ? existing.id : await companyJobRepositery.createDesignation(designationId);
	} else if (designationId) {
		designationId = Number(designationId);
	}

	let departmentId = data.department;
	if (departmentId && isNaN(Number(departmentId))) {
		const existing = await companyJobRepositery.findDepartmentByName(departmentId);
		departmentId = existing ? existing.id : await companyJobRepositery.createDepartment(departmentId);
	} else if (departmentId) {
		departmentId = Number(departmentId);
	}

	let industryId = data.industry;
	if (industryId && isNaN(Number(industryId))) {
		const existing = await companyJobRepositery.findIndustryByName(industryId);
		industryId = existing ? existing.id : await companyJobRepositery.createIndustry(industryId);
	} else if (industryId) {
		industryId = Number(industryId);
	}

	let cityId = data.city;
	if (cityId && isNaN(Number(cityId))) {
		const existing = await companyJobRepositery.findCityByName(cityId);
		cityId = existing ? existing.id : await companyJobRepositery.createCity(cityId, data.state || 0);
	} else if (cityId) {
		cityId = Number(cityId);
	}

	const jobData: Record<string, any> = {
		company: companyId,
		jobTitle: data.job_title,
		jobDescription: data.job_description,
		rolesResponsibility: data.roles_responsibility,
		department: departmentId,
		experience: data.experience,
		skill: data.skill ? JSON.stringify(data.skill) : null,
		roleType: data.role_type,
		document: jobDocPath || data.document,
		country: data.country,
		state: data.state,
		city: cityId,
		jobMode: data.job_mode,
		industry: industryId,
		designation: designationId,
		urgent: data.urgent ? 1 : 0,
		vacancy: data.vacancy,
		salary: data.salary,
		status: data.status || 0,
	};

	if (data.slug) {
		jobData.slug = data.slug;
	} else {
		const stateName = null;
		const designationName = designationId ? String(designationId) : null;
		const experienceName = data.experience ? String(data.experience) : null;
		jobData.slug = generateSlug(data.job_title, stateName, designationName, experienceName);
	}

	if (data.id) {
		await companyJobRepositery.updateJob(data.id, jobData);
		return { status: true, messages: "Record updated successfully", jobId: data.id };
	} else {
		const jobId = await companyJobRepositery.createJob(jobData);
		return { status: true, messages: "Record created successfully", jobId };
	}
}

// ====== 3. Job Status Change ======

export async function jobStatusChangeService(companyId: number, jobId: number) {
	const job = await companyJobRepositery.findJobByIdAndCompany(jobId, companyId);
	if (!job) {
		return { status: false, messages: "Invalid Record !" };
	}

	const newStatus = job.status === 1 ? 0 : 1;
	await companyJobRepositery.updateJobStatus(jobId, newStatus);
	return { status: true, messages: "Record udpated!" };
}

// ====== 4. Delete Job ======

export async function deleteJobService(companyId: number, jobId: number) {
	const result = await companyJobRepositery.softDeleteJob(jobId, companyId);
	if (!result[0]?.affectedRows) {
		return { status: false, messages: "Try again something went wrong " };
	}
	return { status: true, messages: " Job Delete Sucessfully" };
}

// ====== 5. Cancel Job ======

export async function cancelJobService(companyId: number, jobId: number) {
	const result = await companyJobRepositery.cancelJob(jobId, companyId);
	if (!result[0]?.affectedRows) {
		return { status: false, messages: "Try again something went wrong " };
	}

	const job = await companyJobRepositery.getJobDetail(jobId);
	if (job) {
		await companyJobRepositery.createNotification(
			companyId,
			companyId,
			`Your job "${job.jobTitle}" has been closed.`,
			`/job/${jobId}`,
			'job',
		);

		const applicants = await companyJobRepositery.getJobApplicants(jobId);
		for (const applicant of applicants) {
			if (applicant.userId) {
				await companyJobRepositery.createNotification(
					companyId,
					applicant.userId,
					`The position "${job.jobTitle}" at ${job.companyName} is no longer available.`,
					`/job/${jobId}`,
					'job',
				);
			}
		}
	}

	return { status: true, messages: " Job cancel Sucessfully" };
}

// ====== 6. Job Detail ======

export async function jobDetailService(companyId: number, jobId: number) {
	const job = await companyJobRepositery.getJobDetail(jobId);
	if (!job || job.company !== companyId) {
		return { status: false, messages: "No Record found!" };
	}

	const [applicationCount, collaborators, gallery] = await Promise.all([
		companyJobRepositery.countJobApplications(job.id),
		companyJobRepositery.getJobCollaborators(job.id),
		companyJobRepositery.getJobGallery(job.company),
	]);

	const detail = formatJobDetail(job, {
		companyId,
		applicationCount,
		collaborators,
		gallery,
	});
	return {
		status: true,
		messages: "Job Detail",
		data: detail,
	};
}

// ====== 7. Job Template Detail ======

export async function jobTemplateDetailService(companyId: number, templateId: number) {
	const template = await companyJobRepositery.getTemplateDetail(templateId, companyId);
	if (!template) {
		return { status: false, messages: "No Record found!" };
	}

	return {
		status: true,
		messages: "Job Template Detail",
		data: {
			id: template.id,
			individual_id: template.companyIndividualId,
			job_title: template.jobTitle,
			template_name: template.templateName,
			job_description: template.jobDescription,
			roles_responsibility: template.rolesResponsibility,
			department_name: template.departmentName,
			experience_name: template.experienceName,
			role_type_name: template.roleTypeName,
			job_mode_name: template.jobModeName,
			industry_name: template.industryName,
			designation_name: template.designationName,
			country_name: template.countryName,
			state_name: template.stateName,
			city_name: template.cityName,
			salary_name: template.salaryName,
			company_name: template.companyName,
			profile: template.companyProfile ? `${s3Prefix}${template.companyProfile}` : (template.companySocialImage || ''),
			document: template.document ? `${s3Prefix}${template.document}` : '',
			status: template.status,
			slug: template.slug,
			create_date: template.createDate,
		},
	};
}

// ====== 8. Job Template List ======

export async function jobTemplateService(companyId: number) {
	const templates = await companyJobRepositery.getTemplateList(companyId);
	if (templates.length === 0) {
		return { status: false, messages: "No Record found!" };
	}

	return {
		status: true,
		messages: "Template List",
		data: templates.map((t) => ({
			id: t.id,
			template_name: t.templateName,
		})),
	};
}

// ====== 9. Multi Cancel Job ======

export async function multiCancelJobService(companyId: number, ids: number[]) {
	await companyJobRepositery.multiCancelJobs(ids, companyId);
	return { status: true, messages: " Job cancel Sucessfully" };
}

// ====== 10. Multi Job Status Change ======

export async function multiJobStatusChangeService(companyId: number, ids: number[], status: number) {
	await companyJobRepositery.multiUpdateJobStatus(ids, status, companyId);
	return { status: true, messages: " Job update Sucessfully" };
}
