import { Request, Response, NextFunction } from "express";
import { LanguageRequest } from "../types/language.types";
import { AuthUser } from "../types/express";
import { allLanguageListService, deleteLanguageService, languageDetailService, upsertLanguageService } from "../services/language.service";
import { CommonIdParams } from "../utils/validation";

export async function addLanguage(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body } = req.validated as LanguageRequest

		const messages = await upsertLanguageService(user_id, body)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

export async function allLanguageList(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser

		const data = await allLanguageListService(user_id)

		return res.status(200).json({
			status: true,
			messages: "Language List",
			data,
		})
	} catch (error) {
		next(error)
	}
}

export async function languageDetail(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams

		const data = await languageDetailService(user_id, params.id)

		return res.status(200).json({
			status: true,
			messages: "Language Detail",
			data,
		})
	} catch (error) {
		next(error)
	}
}

export async function deleteLanguage(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams

		const messages = await deleteLanguageService(user_id, params.id)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}
