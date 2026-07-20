import { NextFunction, Request, Response } from "express";
import { allExperienceService, allEmployementNewService, deleteExperienceService, employmentCreateService, employmentUpdateService, experienceDetailService } from "../services/employee.service";
import { EmploymentRequestBody } from "../types/employee.types";
import { AuthUser } from "../types/express";
import { USER_TYPE } from "../repositery/users.repositery";
import { CommonIdParams } from "../utils/validation";

/** Normalize multer .fields() / .array() output for employment document uploads. */
function employmentFiles(req: Request): Express.MulterS3.File[] {
	const f = req.files as
		| { [fieldname: string]: Express.MulterS3.File[] }
		| Express.MulterS3.File[]
		| undefined;
	if (!f) return [];
	if (Array.isArray(f)) return f;
	return [
		...(f.document || []),
		...(f["document[]"] || []),
		...(f.file || []),
	];
}

export async function updloadResume(req: Request, res: Response, next: NextFunction) {
	try {

	} catch (error) {
		next(error)
	}

}

export async function addExperience(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as EmploymentRequestBody;
		const result = await employmentCreateService(user_id, body, employmentFiles(req));

		return res.status(201).json({ message: "successful", done: result });

	} catch (err) {
		next(err);
	}
}

export async function updateExperience(req: Request, res: Response, next: NextFunction) {
	try {

		const { user_id } = req.auth as AuthUser;
		const { body, params } = req.validated as EmploymentRequestBody;
		const result = await employmentUpdateService(user_id, params.employment_id!, body, employmentFiles(req));

		return res.status(201).json({ message: "successful", done: result });

	} catch (err) {
		next(err);
	}
}


export async function allExperience(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const result = await allExperienceService(user_id);
		return res.status(201).json({
			status: true,
			message: 'Employement History',
			data: result
		})

	} catch (err) {
		next(err)
	}
}

export async function allEmployementNew(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const result = await allEmployementNewService(user_id);
		return res.status(200).json({
			status: true,
			message: 'Employement History',
			data: result
		})
	} catch (err) {
		next(err)
	}
}


export async function detailExperience(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_type, user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams
		const { detail, skill, rating, employmentStatus, companyLogo, document } =
			await experienceDetailService(params.id, user_id, user_type ?? USER_TYPE.EMPLOYEE)

		return res.status(200).json({
			status: true,
			message: 'Employement History',
			data: {
				id: detail.id,
				company_logo: companyLogo,
				company: detail.companyName,
				company_id: detail.company,
				user_id: detail.userId,
				name: `${detail.fname ?? ""} ${detail.lname ?? ""}`.trim(),
				salary: detail.salary,
				employment_type: detail.employmentType,
				employment_name: detail.employementName,
				designation: detail.designationName,
				designationId: detail.designation,
				departmentId: detail.department,
				hired: detail.hired,
				joining_date: detail.joiningDate,
				worked_till_date: detail.workedTillDate,
				still_working: detail.stillWorking ?? 0,
				approved: detail.approved,
				description: detail.description,
				salary_inhand: detail.salaryInhand,
				salary_mode: detail.salaryMode,
				department: detail.departmentName,
				skill,
				document,
				rating,
				employment_status: employmentStatus,
				claim_status: detail.claimStatus ? 1 : 0,
				added_by: detail.invitedBy === user_id,
			}
		})
	} catch (err) {
		next(err)
	}
}

export async function deleteExperience(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams
		const type = req.query.type as string | undefined
		const result = await deleteExperienceService(params.id, user_id, type)
		return res.status(result.status ? 200 : 400).json(result)
	} catch (err) {
		next(err)
	}
}
