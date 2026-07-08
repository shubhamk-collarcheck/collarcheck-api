import usersRepositery, { USER_PREFIX, USER_TYPE } from "../repositery/users.repositery";
import designationRepositery from "../repositery/designation.repositery";
import departmentRepositery from "../repositery/department.repositery";
import skillRepositery from "../repositery/skill.repositery";
import employmentRepositery from "../repositery/employee.repositery"
import companyRepositery from "../repositery/company.repositery"
import reviewRepositery from "../repositery/review.repositery"
import { isBlank, isEmptyArray, getS3Url } from "../utils/helpers";
import { urlTitle } from "../utils/generator";
import { BadRequestError } from "../middlewares/errorHandler";

import { EmploymentBody, EmploymentInsert } from "../types/employee.types";


import type { NewUser } from "../types/user.types";
import type { NewDesignation } from "../types/designation.types";
import type { NewDepartment } from "../types/department.types";
import type { NewSkill } from "../types/skill.types";
import db from "../db";
import { cybDepartment, cybDesignation, cybSkill, cybUser } from "../db/schema";
import { decodeS3URL, decodeSkill } from "../utils/decoders";


type ResolveResult<T> = {
	id: number | null
	data: T | null
}

export const resolveCompany = async (value: string | number, id: number): Promise<ResolveResult<NewUser>> => {
	if (typeof value === "number") {
		return { id: value, data: null };
	}
	const name = value.trim();

	const existing = await usersRepositery.findByName(name, USER_TYPE.COMPANY)

	if (!isEmptyArray(existing)) {
		return { id: existing[0].id, data: null }
	}
	const uniqueId = await usersRepositery.generateUniqueId(USER_PREFIX.COMPANY)
	const uniqueSlug = await usersRepositery.generateSlug(`${name}-${uniqueId}`)
	const insertData = {
		"fname": name,
		"user_type": 2,
		"user_defined_company": 1,
		"claim_status": 0,
		"created_by": id,
		"status": 1,
		"individual_id": uniqueId,
		"slug": uniqueSlug
	}
	return { id: null, data: insertData }
};


export const resolveDesignation = async (value: string | number, id: number): Promise<ResolveResult<NewDesignation>> => {
	if (typeof value === "number") {
		return { id: value, data: null };
	}

	const designation = value.trim()

	const existing = await designationRepositery.findByName(designation)

	if (!isEmptyArray(existing)) {
		return { id: existing[0].id, data: null }
	}

	const slug = await designationRepositery.generateSlug(designation)
	const insertData = {
		"name": designation,
		"user_defined": 1,
		"user_id": id,
		"status": 1,
		slug,
	}


	return { id: null, data: insertData }
}


export const resolveDepartment = async (value: string | number, id: number): Promise<ResolveResult<NewDepartment>> => {
	if (typeof value === "number") {
		return { id: value, data: null };
	}

	const department = value.trim()

	const existing = await departmentRepositery.findByName(department)

	if (!isEmptyArray(existing)) {
		return { id: existing[0].id, data: null };
	}
	const insertData = {
		"name": department,
		"user_defined": 1,
		"user_id": id,
		"status": 1,
	}

	return { id: null, data: insertData }
}
export const resolveSkill = async (arr: (string | number)[], id: number): Promise<{ ids: number[], data: NewSkill[] }> => {
	const filterNumber = arr.filter((item) => typeof item === "number");
	const filterString = arr.filter((item) => typeof item === "string").map((s) => s.trim()).filter((s) => s.length > 0);

	if (isEmptyArray(filterString)) {
		return { ids: filterNumber, data: [] };
	}

	const uniqueNames = [...new Set(filterString)];

	const existingSkills = await skillRepositery.findByListOfName(uniqueNames);
	const nameToId = new Map<string, number>();
	existingSkills.forEach((skill) => nameToId.set(skill.name!, skill.id));

	const nameAlreadyExistId = existingSkills.map((skill) => skill.id)

	const namesToCreate = uniqueNames.filter((name) => !nameToId.has(name));

	let createSkillsData: NewSkill[] = []
	if (!isEmptyArray(namesToCreate)) {
		createSkillsData = namesToCreate.map((name) => ({
			name,
			user_defined: 1,
			user_id: id,
			status: 1,
		}))
	}


	return { ids: [...filterNumber, ...nameAlreadyExistId], data: createSkillsData };
};


export async function employmentTransaction(user_id: number, data: EmploymentBody) {
	const [company, department, designation, skills] = await Promise.all([
		resolveCompany(data.company, user_id),
		resolveDepartment(data.department, user_id),
		resolveDesignation(data.designation, user_id),
		resolveSkill(data.skill, user_id),
	]);

	const result = await db.transaction(async (tx) => {
		let companyId = company.id;
		if (!companyId && company.data) {
			const [inserted] = await tx.insert(cybUser).values(company.data).$returningId();
			companyId = inserted.id;
		}

		let departmentId = department.id;
		if (!departmentId && department.data) {
			const [inserted] = await tx.insert(cybDepartment).values(department.data).$returningId();
			departmentId = inserted.id;
		}

		let designationId = designation.id;
		if (!designationId && designation.data) {
			const [inserted] = await tx.insert(cybDesignation).values(designation.data).$returningId();
			designationId = inserted.id;
		}

		let skillIds = [...skills.ids];
		if (!isEmptyArray(skills.data)) {
			const inserted = await tx.insert(cybSkill).values(skills.data).$returningId();
			skillIds = [...skillIds, ...inserted.map((s) => s.id)];
		}

		return { companyId, departmentId, designationId, skillIds };
	});

	return result;
}




export async function employmentUpdateService(user_id: number, employment_id: number, data: EmploymentBody, file?: Express.MulterS3.File) {
	const exist = await employmentRepositery.findById(employment_id);

	if (!exist) {
		throw new BadRequestError("employment_id is wrong");
	}

	const isStillWorking = data.still_working || data.worked_till_date === "present";

	if (!isStillWorking) {
		const joiningDate = new Date(data.joining_date);
		const workedTillDate = new Date(data.worked_till_date!);

		if (workedTillDate <= joiningDate) {
			throw new BadRequestError(
				"Worked till date cannot be less than or equal to joining date"
			);
		}
	}

	const { companyId, departmentId, designationId, skillIds } = await employmentTransaction(user_id, data);

	const save: Partial<EmploymentInsert> = {
		user: user_id,
		company: companyId,
		department: departmentId,
		designation: designationId,
		skill: JSON.stringify(skillIds),
		description: data.description,
		employmentType: data.employment_type,
		stillWorking: isStillWorking ? 1 : 0,
		workedTillDate: isStillWorking ? null : data.worked_till_date!,
	};

	if (file)
		save.certificate = file.location;


	if (exist.approved !== 1) {
		Object.assign(save, {
			salary: data.salary,
			salaryInhand: data.salary_inhand,
			salaryMode: data.salary_mode,
			hired: data.hired ? 1 : 0,
			joiningDate: data.joining_date,
		});
	}

	return employmentRepositery.update(employment_id, save);
}

export async function employmentCreateService(user_id: number, data: EmploymentBody, file?: Express.MulterS3.File) {
	const isStillWorking = data.still_working || data.worked_till_date === "present";

	if (!isStillWorking) {
		const joiningDate = new Date(data.joining_date);
		const workedTillDate = new Date(data.worked_till_date!);

		if (workedTillDate <= joiningDate) {
			throw new BadRequestError(
				"Worked till date cannot be greater than joining date"
			);
		}
	}

	const { companyId, departmentId, designationId, skillIds } = await employmentTransaction(user_id, data);

	const save: Partial<EmploymentInsert> = {
		user: user_id,
		company: companyId,
		department: departmentId,
		designation: designationId,
		skill: JSON.stringify(skillIds),
		description: data.description,
		employmentType: data.employment_type,
		certificate: file?.location ?? null,
		stillWorking: isStillWorking ? 1 : 0,
		workedTillDate: isStillWorking ? null : data.worked_till_date,
		salary: data.salary,
		salaryInhand: data.salary_inhand,
		salaryMode: data.salary_mode,
		hired: data.hired ? 1 : 0,
		joiningDate: data.joining_date,
	};

	const result = await employmentRepositery.create(save);

	const employmentCount = await employmentRepositery.countByUserId(user_id);

	if (employmentCount === 1 && isStillWorking) {
		const user = await usersRepositery.findById(user_id);

		if (
			user &&
			!user.currentPossition &&
			!user.currentCompany
		) {
			await usersRepositery.update(user_id, {
				currentPossition: designationId,
				currentCompany: companyId,
			});
		}
	}

	return result;
}

export async function allExperienceService(user_id: number) {
	const experienceList = await usersRepositery.getUserExperience(user_id);

	if (experienceList.length === 0) return [];

	const experienceIds = experienceList.map(e => e.id);
	const companyIds = [...new Set(experienceList.map(e => e.company!).filter(Boolean))];

	const [updateListMap, invitedCompanyIds, employmentStatusMap, totalRatingMap, allRatings, skillNameMap] = await Promise.all([
		employmentRepositery.getExperienceUpdateListByExperienceIds(experienceIds),
		companyRepositery.checkInvitationSendByCompanyIds(companyIds, user_id),
		reviewRepositery.getEmploymentStatusByExperienceIds(experienceIds),
		reviewRepositery.getTotalRatingByExperienceIds(experienceIds),
		reviewRepositery.getRatingsByExperienceIds(experienceIds),
		batchSkillNames(experienceList),
	]);

	// Enrich ratings with history and skills
	const ratingIds = allRatings.map(r => r.id);
	const [historyMap, skillRatingMap] = await Promise.all([
		ratingIds.length > 0
			? reviewRepositery.getRatingHistory(ratingIds) as Promise<Record<number, any[]>>
			: Promise.resolve({} as Record<number, any[]>),
		ratingIds.length > 0
			? skillRepositery.getReviewsWithSkills(ratingIds, 0)
			: Promise.resolve({} as Record<number, any[]>),
	]);

	const ratingsByExperience = new Map<number, typeof allRatings>();
	for (const rating of allRatings) {
		const expId = rating.experience!;
		if (!ratingsByExperience.has(expId)) {
			ratingsByExperience.set(expId, []);
		}
		ratingsByExperience.get(expId)!.push(rating);
	}

	const ratingMap = new Map<number, Record<string, any>[]>();
	for (const [expId, ratings] of ratingsByExperience) {
		const enriched = ratings.map(r => {
			const history = historyMap[r.id] ?? [];
			const skills = skillRatingMap[r.id] ?? [];
			let doc: string | string[] | null = null;
			if (r.doc) {
				try {
					const paths = JSON.parse(r.doc);
					if (Array.isArray(paths)) {
						doc = paths.map((path: string) => getS3Url(path));
					}
				} catch {
					doc = r.doc;
				}
			}
			return {
				id: r.id,
				approved: r.approved,
				status: r.approved === 1 ? 'complete' : 'pending',
				doc,
				date: r.modifyDate,
				link: r.link,
				show_home: r.showHome,
				show_review: r.showReview,
				history,
				skill_rating: skills,
				rating: r.rating,
				review: r.review,
			};
		});
		ratingMap.set(expId, enriched);
	}

	const data = experienceList.map((experience) => {
		const onExplore = experience.onExplore ? 1 : 0;

		let showOnExplore = 0;

		const onImmediate = showOnExplore === 1 ? (experience.onImmediate ? 1 : 0) : 0;
		const onNotice = showOnExplore === 1 ? (experience.onNotice ? 1 : 0) : 0;

		let skill: { id: number; name: string }[] = [];
		if (experience.skill) {
			try {
				const decoded = JSON.parse(experience.skill);
				if (Array.isArray(decoded)) {
					skill = decoded.map(Number).filter(Boolean)
						.map((id: number) => ({ id, name: skillNameMap.get(id) ?? '' }))
						.filter(s => s.name);
				}
			} catch { }
		}

		return {
			id: experience.id,
			company_logo: decodeS3URL(experience.profile),
			company: experience.companyName,
			company_id: experience.company,
			salary: experience.salary,
			employment_type: experience.employementName,
			designation: experience.designationName,
			joining_date: experience.joiningDate,
			worked_till_date: experience.workedTillDate,
			still_working: experience.stillWorking ?? 0,
			approved: experience.approved,
			description: experience.description,
			salary_inhand: experience.salaryInhand,
			salary_mode: experience.salaryMode,
			department: experience.departmentName,
			claim_status: experience.claimStatus ? 1 : 0,
			company_slug: experience.companySlug,
			skill,
			basic_update_list: updateListMap.get(experience.id) ?? null,
			document: decodeS3URL(experience.certificate),
			rating: ratingMap.get(experience.id) ?? [],
			added_by: invitedCompanyIds.has(experience.company!),
			employment_status: employmentStatusMap.get(experience.id) ?? 'pending',
			totalRating: totalRatingMap.get(experience.id) ?? { rating: 0, noofrecord: 0 },
			status: experience.status,
			on_explore: showOnExplore,
			on_immediate: onImmediate,
			on_notice: onNotice,
		};
	});

	return data;
}

export async function experienceDetailService(experience_id: number, user_id: number, user_type: number) {
	const detail = await employmentRepositery.getExperienceDetail(experience_id);

	if (!detail) {
		throw new BadRequestError("Invalid Experience!");
	}

	if (user_type === 1) {
		if (user_id !== detail.userId) {
			throw new BadRequestError("Access Denied!");
		}
	} else {
		if (user_id !== detail.company) {
			throw new BadRequestError("Access Denied!");
		}
	}

	const [skill, rating, employmentStatus] = await Promise.all([
		decodeSkill(detail.skill),
		reviewRepositery.getRating(experience_id),
		reviewRepositery.getEmploymentStatus(experience_id),
	]);

	const companyLogo = detail.companyProfile
		? decodeS3URL(detail.companyProfile)
		: (detail.companySocialImage ?? "");

	return {
		detail,
		skill,
		rating,
		employmentStatus,
		companyLogo,
		document: decodeS3URL(detail.certificate),
	};
}

async function batchSkillNames(experienceList: any[]) {
	const allSkillIds = new Set<number>();
	for (const exp of experienceList) {
		if (exp.skill) {
			try {
				const decoded = JSON.parse(exp.skill);
				if (Array.isArray(decoded)) {
					for (const id of decoded.map(Number).filter(Boolean)) {
						allSkillIds.add(id);
					}
				}
			} catch { }
		}
	}
	return skillRepositery.getSkillNamesByIds([...allSkillIds]);
}
















































































































































































































































































