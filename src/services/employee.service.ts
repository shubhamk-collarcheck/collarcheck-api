import usersRepositery, { USER_PREFIX, USER_TYPE } from "../repositery/users.repositery";
import designationRepositery from "../repositery/designation.repositery";
import departmentRepositery from "../repositery/department.repositery";
import skillRepositery from "../repositery/skill.repositery";
import employmentRepositery from "../repositery/employment.repositery"
import { isBlank, isEmptyArray } from "../utils/helpers";
import { urlTitle } from "../utils/generator";
import { BadRequestError } from "../middlewares/errorHandler";

import { EmploymentBody, EmploymentInsert } from "../types/employee.types";
import { ComposeTransform } from "node:stream";


import type { NewUser } from "../types/user.types";
import type { NewDesignation } from "../types/designation.types";
import type { NewDepartment } from "../types/department.types";
import type { NewSkill } from "../types/skill.types";
import db from "../db";
import { cybDepartment, cybDesignation, cybSkill, cybUser } from "../db/schema";


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
		save.certificate = file.path;


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

	const { companyId, departmentId, designationId, skillIds } = await employmentTransaction(user_id, data);

	const save: Partial<EmploymentInsert> = {
		user: user_id,
		company: companyId,
		department: departmentId,
		designation: designationId,
		skill: JSON.stringify(skillIds),
		description: data.description,
		employmentType: data.employment_type,
		certificate: file?.path ?? null,
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
