import usersRepositery, { USER_PREFIX } from "../repositery/users.repositery";
import designationRepositery from "../repositery/designation.repositery";
import departmentRepositery from "../repositery/department.repositery";
import skillRepositery from "../repositery/skill.repositery";
import employmentRepositery from "../repositery/employment.repositery"
import { isBlank, isEmptyArray } from "../utils/helpers";
import { urlTitle } from "../utils/generator";
import { BadRequestError } from "../middlewares/errorHandler";

import { EmploymentBody, EmploymentInsert } from "../types/employee.types";


type ResolveResult = {
	id: number;
	created: boolean;
}

export const resolveCompany = async (value: string | number, id: number): Promise<ResolveResult> => {
	if (typeof value === "number") {
		return { id: value, created: false };
	}
	const name = value.trim();

	const existing = await usersRepositery.findByName(name, 2)

	if (!isEmptyArray(existing)) {
		return { id: existing[0].id, created: false }
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
	const result = await usersRepositery.create(insertData);
	return { id: result.id, created: true }
};


export const resolveDesignation = async (value: string | number, id: number): Promise<ResolveResult> => {
	if (typeof value === "number") {
		return { id: value, created: false };
	}

	const designation = value.trim()

	const existing = await designationRepositery.findByName(designation)

	if (!isEmptyArray(existing)) {
		return { id: existing[0].id, created: false }
	}

	const slug = await designationRepositery.generateSlug(designation)
	const insertData = {
		"name": designation,
		"user_defined": 1,
		"user_id": id,
		"status": 1,
		slug,
	}

	const result = await designationRepositery.create(insertData)

	return { id: result.id, created: true }
}


export const resolveDepartment = async (value: string | number, id: number): Promise<ResolveResult> => {
	if (typeof value === "number") {
		return { id: value, created: false };
	}

	const department = value.trim()

	const existing = await departmentRepositery.findByName(department)

	if (!isEmptyArray(existing)) {
		return { id: existing[0].id, created: false };
	}
	const insertData = {
		"name": department,
		"user_defined": 1,
		"user_id": id,
		"status": 1,
	}

	const result = await departmentRepositery.create(insertData)
	return { id: result.id, created: true }
}
export const resolveSkill = async (arr: (string | number)[], id: number): Promise<{ ids: number[], created: boolean }> => {
	const filterNumber = arr.filter((item) => typeof item === "number");
	const filterString = arr.filter((item) => typeof item === "string").map((s) => s.trim()).filter((s) => s.length > 0);

	if (isEmptyArray(filterString)) {
		return { ids: filterNumber, created: false };
	}

	const uniqueNames = [...new Set(filterString)];

	const existingSkills = await skillRepositery.findByListOfName(uniqueNames);
	const nameToId = new Map<string, number>();
	existingSkills.forEach((skill) => nameToId.set(skill.name!, skill.id));

	const namesToCreate = uniqueNames.filter((name) => !nameToId.has(name));

	if (!isEmptyArray(namesToCreate)) {
		const created = await skillRepositery.bulkCreate(
			namesToCreate.map((name) => ({
				name,
				user_defined: 1,
				user_id: id,
				status: 1,
			}))
		);
		created.forEach((skill) => nameToId.set(skill.name!, skill.id));
	}

	const resolvedIds = filterString.map((name) => nameToId.get(name)!);

	return { ids: [...filterNumber, ...resolvedIds], created: true };
};


export async function employment_update_service(user_id: number, employment_id: number, data: EmploymentBody, file?: Express.Multer.File,) {
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

	const [company, department, designation, skills] = await Promise.all([
		resolveCompany(data.company, user_id),
		resolveDepartment(data.department, user_id),
		resolveDesignation(data.designation, user_id),
		resolveSkill(data.skill, user_id),
	]);

	const save: Partial<EmploymentInsert> = {
		user: user_id,
		company: company.id,
		department: department.id,
		designation: designation.id,
		skill: JSON.stringify(skills.ids),
		description: data.description,
		employmentType: data.employment_type,
		stillWorking: isStillWorking ? 1 : 0,
		workedTillDate: isStillWorking ? null : data.worked_till_date!,
	};

	if (file)
		save.certificate = file.path;


	if (exist.approved !== 1) {
		Object.assign(save, {
			salary: data.salary,
			salary_inhand: data.salary_inhand,
			salary_mode: data.salary_mode,
			hired: data.hired,
			joining_date: data.joining_date,
		});
	}

	return employmentRepositery.update(employment_id, save);
}
export async function employment_create_service(user_id: number, data: EmploymentBody, file?: Express.Multer.File,) {
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

	const [company, department, designation, skills] = await Promise.all([
		resolveCompany(data.company, user_id),
		resolveDepartment(data.department, user_id),
		resolveDesignation(data.designation, user_id),
		resolveSkill(data.skill, user_id),
	]);

	const save: Partial<EmploymentInsert> = {
		user: user_id,
		company: company.id,
		department: department.id,
		designation: designation.id,
		skill: JSON.stringify(skills.ids),
		description: data.description,
		employmentType: data.employment_type,
		certificate: file?.path ?? null,
		stillWorking: isStillWorking ? 1 : 0,
		workedTillDate: isStillWorking ? null : data.worked_till_date,
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
				currentPossition: designation.id,
				currentCompany: company.id,
			});
		}
	}

	return result;
}
