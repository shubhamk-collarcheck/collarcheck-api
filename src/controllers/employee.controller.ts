import { NextFunction, Request, Response } from "express";
import { employment_create_service, employment_update_service } from "../services/employee.service";
import { isBlank, isEmpty, TypedRequest } from "../utils/helpers";
import { EmploymentRequestBody } from "../types/employee.types";
import { z } from "zod";
import { AuthUser } from "../types/express";


export async function updloadResume(req: Request, res: Response, next: NextFunction) {
	try {

	} catch (error) {
		next(error)
	}

}

export async function addExperience(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: userId } = req.auth as AuthUser;

		const { body, params } = req.validated as EmploymentRequestBody;
		const result = await employment_create_service(userId, body, req.file);

		return res.status(201).json({ message: "succefull", done: result });

	} catch (err) {
		next(err);
	}
}

export async function updateExperience(req: Request, res: Response, next: NextFunction) {
	try {
		const userId = req.auth!.id;

		const { body, params } = req.validated as EmploymentRequestBody;
		const result = await employment_update_service(userId, params.employment_id!, body, req.file);

		return res.status(201).json({ message: "succefull", done: result });

	} catch (err) {
		next(err);
	}
}
