import { NextFunction, Request, Response } from "express";
import { allExperienceService, employmentCreateService, employmentUpdateService } from "../services/employee.service";
import { isBlank, isEmpty, TypedRequest } from "../utils/helpers";
import { EmploymentRequestBody } from "../types/employee.types";
import { z } from "zod";
import { AuthUser } from "../types/express";
import usersRepositery from "../repositery/users.repositery";


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
