import { Request, Response, NextFunction } from "express";
import { CompanyInviteRequest } from "../types/company-invite.types";
import { AuthUser } from "../types/express";
import { createCompanyInviteService } from "../services/company-invite.service";

export async function sendCompanyInvite(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body } = req.validated as CompanyInviteRequest

		const messages = await createCompanyInviteService(user_id, body)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}
