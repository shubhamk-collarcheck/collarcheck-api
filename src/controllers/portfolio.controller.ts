//controller

import { Request, Response, NextFunction } from "express";
import { PortfolioRequest, PortfolioUpdateRequest } from "../types/portfolio.types";
import { AuthUser } from "../types/express";
import { addPortfolioService, updatePortfolioService } from "../services/portfolio.service";


export async function addPortfolio(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body } = req.validated as PortfolioRequest
		const file = req.file as Express.MulterS3.File | undefined

		const messages = await addPortfolioService(user_id, body, file)

		return res.status(201).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

export async function updatePortfolio(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body, params } = req.validated as PortfolioUpdateRequest
		const file = req.file as Express.MulterS3.File | undefined

		const messages = await updatePortfolioService(user_id, params.id, body, file)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}
