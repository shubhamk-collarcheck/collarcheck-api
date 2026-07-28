import companyJobRepositery, { type JobWriteData } from '../repositery/company-job.repositery';
import type { AddJobBody, AllJobQuery } from '../types/company-job.types';

const s3Prefix = process.env.S3_PREFIX || '';

type JobDetailRow = NonNullable<Awaited<ReturnType<typeof companyJobRepositery.getJobDetail>>>;
type CollaboratorRow = Awaited<ReturnType<typeof companyJobRepositery.getJobCollaborators>>[number];
type TemplateDetailRow = NonNullable<Awaited<ReturnType<typeof companyJobRepositery.getTemplateDetail>>>;

function generateSlug(
	title: string,
	stateName: string | null,
	designationName: string | null,
	experienceName: string | null,
): string {
	const now = new Date();
	const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getFullYear()).slice(2)}`;
	const random = Math.floor(1000 + Math.random() * 9000);
	const slugify = (value: string | null | undefined) =>
		(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

	const parts = [
		slugify(title),
		slugify(stateName),
		slugify(designationName),
		slugify(experienceName),
		dateStr,
		String(random),
	].filter(Boolean);

	return parts.join('-');
}

function profileUrl(profile: string | null | undefined, socialImage: string | null | undefined) {
	return profile ? `${s3Prefix}${profile}` : (socialImage || '');
}

function documentUrl(document: string | null | undefined) {
	return document ? `${s3Prefix}${document}` : '';
}

/** Resolve form value that may be a numeric id or a free-text name (auto-create). */
async function resolveNamedId(
	value: string | number | undefined,
	findByName: (name: string) => Promise<{ id: number } | undefined>,
	createByName: (name: string) => Promise<number>,
): Promise<number | undefined> {
	if (value == null || value === '') return undefined;

	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : undefined;
	}

	const trimmed = value.trim();
	if (!trimmed) return undefined;

	if (/^\d+$/.test(trimmed)) {
		return Number(trimmed);
	}

	const existing = await findByName(trimmed);
	return existing ? existing.id : createByName(trimmed);
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
		document: documentUrl(job.document),
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

function formatTemplateDetail(template: TemplateDetailRow) {
	return {
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
		profile: profileUrl(template.companyProfile, template.companySocialImage),
		document: documentUrl(template.document),
		status: template.status,
		slug: template.slug,
		create_date: template.createDate,
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

async function resolveJobLookups(data: AddJobBody) {
	const [designationId, departmentId, industryId, cityId] = await Promise.all([
		resolveNamedId(
			data.designation,
			(name) => companyJobRepositery.findDesignationByName(name),
			(name) => companyJobRepositery.createDesignation(name),
		),
		resolveNamedId(
			data.department,
			(name) => companyJobRepositery.findDepartmentByName(name),
			(name) => companyJobRepositery.createDepartment(name),
		),
		resolveNamedId(
			data.industry,
			(name) => companyJobRepositery.findIndustryByName(name),
			(name) => companyJobRepositery.createIndustry(name),
		),
		resolveNamedId(
			data.city,
			(name) => companyJobRepositery.findCityByName(name),
			(name) => companyJobRepositery.createCity(name, data.state ?? 0),
		),
	]);

	return { designationId, departmentId, industryId, cityId };
}

function buildJobWriteData(
	companyId: number,
	data: AddJobBody,
	lookups: { designationId?: number; departmentId?: number; industryId?: number; cityId?: number },
	jobDocPath: string | undefined,
	extras: Partial<JobWriteData> = {},
): JobWriteData {
	return {
		company: companyId,
		jobTitle: data.job_title,
		jobDescription: data.job_description,
		rolesResponsibility: data.roles_responsibility,
		department: lookups.departmentId,
		experience: data.experience,
		skill: data.skill ? JSON.stringify(data.skill) : null,
		roleType: data.role_type,
		document: jobDocPath || data.document || null,
		country: data.country,
		state: data.state,
		city: lookups.cityId,
		jobMode: data.job_mode,
		industry: lookups.industryId,
		designation: lookups.designationId,
		urgent: data.urgent ? 1 : 0,
		vacancy: data.vacancy,
		salary: data.salary,
		status: data.status ?? 0,
		...extras,
	};
}

/** PHP allJob: `offset` query param is a 1-based page, not a SQL offset. */
function pageToSqlOffset(page: number, limit: number): number {
	return page <= 1 ? 0 : page * limit - limit;
}

// ====== 1. All Job ======

export async function allJobService(companyId: number, query: AllJobQuery['query']) {
	const { keyword, limit, offset: page } = query;
	const sqlOffset = pageToSqlOffset(page, limit);

	const [buckets, statusCounts, gallery] = await Promise.all([
		companyJobRepositery.getJobIdsBucketedByStatus(companyId, keyword, limit, sqlOffset),
		companyJobRepositery.countJobsGroupedByStatus(companyId),
		companyJobRepositery.getJobGallery(companyId),
	]);

	const { draftIds, publishIds, cancelIds } = buckets;
	const uniqueIds = [...new Set([...draftIds, ...publishIds, ...cancelIds])];

	const [jobRows, appCounts, collabsByJob] = await Promise.all([
		companyJobRepositery.getJobDetailsByIds(uniqueIds),
		companyJobRepositery.countApplicationsByJobIds(uniqueIds),
		companyJobRepositery.getCollaboratorsByJobIds(uniqueIds),
	]);

	const jobById = new Map(jobRows.map((row) => [row.id, row]));

	return {
		status: true,
		messages: "job List",
		data: {
			draftJobs: mapJobsByIds(draftIds, jobById, appCounts, collabsByJob, gallery, companyId),
			publishJobs: mapJobsByIds(publishIds, jobById, appCounts, collabsByJob, gallery, companyId),
			cancelJobs: mapJobsByIds(cancelIds, jobById, appCounts, collabsByJob, gallery, companyId),
			draftJobsCounts: statusCounts.draft,
			publishJobsCounts: statusCounts.publish,
			cancelJobsCounts: statusCounts.cancel,
		},
	};
}

// ====== 2. Add / Update Job ======

export async function addJobService(companyId: number, data: AddJobBody, jobDocPath?: string) {
	const company = await companyJobRepositery.findCompanyById(companyId);
	if (!company) {
		return { status: false, messages: "Invalid Company !" };
	}

	// status=3 → job_template
	if (data.status === 3) {
		if (!data.template_name) {
			return { status: false, messages: "template_name is required for templates." };
		}

		const lookups = await resolveJobLookups(data);
		const templateData = buildJobWriteData(companyId, data, lookups, jobDocPath, {
			templateName: data.template_name,
			status: 3,
		});

		if (data.template_id) {
			const updated = await companyJobRepositery.updateTemplate(data.template_id, companyId, templateData);
			if (!updated) {
				return { status: false, messages: "No Record found!" };
			}
			return { status: true, messages: "Template updated successfully", jobId: data.template_id };
		}

		const templateId = await companyJobRepositery.createTemplate(templateData);
		return { status: true, messages: "Template created successfully", jobId: templateId };
	}

	if (!data.job_title || !data.job_description) {
		return { status: false, messages: "job_title,job_description are required." };
	}

	const lookups = await resolveJobLookups(data);

	let slug = data.slug;
	if (!slug) {
		const [stateName, designationName, experienceName] = await Promise.all([
			data.state != null ? companyJobRepositery.getStateName(data.state) : Promise.resolve(null),
			lookups.designationId != null
				? companyJobRepositery.getDesignationName(lookups.designationId)
				: Promise.resolve(null),
			data.experience != null
				? companyJobRepositery.getExperienceName(data.experience)
				: Promise.resolve(null),
		]);
		slug = generateSlug(data.job_title, stateName, designationName, experienceName);
	}

	const jobData = buildJobWriteData(companyId, data, lookups, jobDocPath, {
		slug,
		status: data.status ?? 0,
	});

	if (data.id) {
		const updated = await companyJobRepositery.updateJob(data.id, companyId, jobData);
		if (!updated) {
			return { status: false, messages: "Invalid Record !" };
		}
		return { status: true, messages: "Record updated successfully", jobId: data.id };
	}

	const jobId = await companyJobRepositery.createJob(jobData);
	return { status: true, messages: "Record created successfully", jobId };
}

// ====== 3. Job Status Change ======

export async function jobStatusChangeService(companyId: number, jobId: number) {
	const job = await companyJobRepositery.findJobByIdAndCompany(jobId, companyId);
	if (!job) {
		return { status: false, messages: "Invalid Record !" };
	}

	// Locked PHP toggle: published (1) → draft (0); anything else → publish (1)
	const newStatus = job.status === 1 ? 0 : 1;
	await companyJobRepositery.updateJobStatus(jobId, companyId, newStatus);
	return { status: true, messages: "Record udpated!" };
}

// ====== 4. Delete Job ======

export async function deleteJobService(companyId: number, jobId: number) {
	const rows = await companyJobRepositery.softDeleteJob(jobId, companyId);
	if (!rows) {
		return { status: false, messages: "Try again something went wrong " };
	}
	return { status: true, messages: " Job Delete Sucessfully" };
}

// ====== 5. Cancel Job ======

export async function cancelJobService(companyId: number, jobId: number) {
	const rows = await companyJobRepositery.cancelJob(jobId, companyId);
	if (!rows) {
		return { status: false, messages: "Try again something went wrong " };
	}

	const job = await companyJobRepositery.getJobDetail(jobId);
	if (job) {
		const applicants = await companyJobRepositery.getJobApplicants(jobId);
		const notifications: {
			sender: number;
			receiver: number;
			message: string;
			link: string;
			redirect: string;
		}[] = [
				{
					sender: companyId,
					receiver: companyId,
					message: `Your job "${job.jobTitle}" has been closed.`,
					link: `/job/${jobId}`,
					redirect: 'job',
				},
			];

		for (const applicant of applicants) {
			if (applicant.userId != null) {
				notifications.push({
					sender: companyId,
					receiver: applicant.userId,
					message: `The position "${job.jobTitle}" at ${job.companyName} is no longer available.`,
					link: `/job/${jobId}`,
					redirect: 'job',
				});
			}
		}

		await companyJobRepositery.createNotifications(notifications);
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

	return {
		status: true,
		messages: "Job Detail",
		data: formatJobDetail(job, {
			companyId,
			applicationCount,
			collaborators,
			gallery,
		}),
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
		data: formatTemplateDetail(template),
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
