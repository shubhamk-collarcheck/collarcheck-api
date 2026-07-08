import { NextFunction, Request, Response } from "express";
import { allExperienceService, employmentCreateService, employmentUpdateService, experienceDetailService } from "../services/employee.service";
import { EmploymentRequestBody } from "../types/employee.types";
import { AuthUser } from "../types/express";
import { USER_TYPE } from "../repositery/users.repositery";
import { CommonIdParams } from "../utils/validation";


export async function updloadResume(req: Request, res: Response, next: NextFunction) {
	try {

	} catch (error) {
		next(error)
	}

}

export async function addExperience(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body, params } = req.validated as EmploymentRequestBody;
		const result = await employmentCreateService(user_id, body, req.file as Express.MulterS3.File);

		return res.status(201).json({ message: "successful", done: result });

	} catch (err) {
		next(err);
	}
}

export async function updateExperience(req: Request, res: Response, next: NextFunction) {
	try {

		const { user_id } = req.auth as AuthUser;
		const { body, params } = req.validated as EmploymentRequestBody;
		const result = await employmentUpdateService(user_id, params.employment_id!, body, req.file as Express.MulterS3.File);

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


export async function detailExperience(req: Request, res: Response, next: NextFunction) {
	try {
		const auth = req.auth as AuthUser
		const { params } = req.validated as { params: CommonIdParams }
		const result = await experienceDetailService(params.id, auth.user_id, auth.user_type ?? USER_TYPE.EMPLOYEE)

		return res.status(200).json({
			status: true,
			message: 'Employement History',
			data: result
		})
	} catch (err) {
		next(err)
	}
}
