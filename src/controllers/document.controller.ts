import { Request, Response, NextFunction } from "express";
import { DocumentRequest } from "../types/document.types";
import { AuthUser } from "../types/express";
import { allDocumentListService, createDocumentService, deleteDocumentService, documentDetailService } from "../services/document.service";
import { CommonIdParams } from "../utils/validation";

export async function addDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body } = req.validated as DocumentRequest
		const files = req.files as Express.MulterS3.File[] | undefined

		const messages = await createDocumentService(user_id, body, files)

		return res.status(201).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

export async function allDocumentList(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser

		const data = await allDocumentListService(user_id)

		return res.status(200).json({
			status: true,
			messages: "Document History",
			data,
		})
	} catch (error) {
		next(error)
	}
}

export async function documentDetail(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams

		const data = await documentDetailService(user_id, params.id)

		return res.status(200).json({
			status: true,
			messages: "Document Detail",
			data,
		})
	} catch (error) {
		next(error)
	}
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams

		const messages = await deleteDocumentService(user_id, params.id)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}
