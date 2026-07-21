import { Request, Response, NextFunction } from "express";
import {
	ReviewRequest,
	ReviewUpdateRequest,
	ReviewRemoveDocumentQuery,
	ShowHomeReviewRequest,
	ChangeEmploymentBasicRequest,
	EditUserRequest,
} from "../types/profile-review.types";
import { AuthUser } from "../types/express";
import {
	currentCompanyService,
	upsertReviewService,
	deleteReviewService,
	removeReviewDocumentService,
	toggleShowHomeReviewService,
	editUserProfileService,
	changeEmploymentBasicService,
} from "../services/profile-review.service";

export async function currentCompany(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser

		const data = await currentCompanyService(user_id)

		return res.status(200).json({
			status: true,
			messages: "Current company List",
			data,
		})
	} catch (error) {
		next(error)
	}
}


export async function sendCompanyInvite(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser
	} catch (error) {
		next(error)
	}
}

export async function addReview(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body } = req.validated as ReviewRequest
		const files = req.files as Express.MulterS3.File[] | undefined

		const messages = await upsertReviewService(user_id, body, files)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

export async function updateReview(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body } = req.validated as ReviewUpdateRequest
		const files = req.files as Express.MulterS3.File[] | undefined

		const messages = await upsertReviewService(user_id, body, files)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

export async function deleteReview(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as ReviewUpdateRequest

		const messages = await deleteReviewService(user_id, params.id)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

export async function reviewRemoveDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { query } = req.validated as ReviewRemoveDocumentQuery

		const messages = await removeReviewDocumentService(user_id, query.ratingId, query.link)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

export async function showHomeReview(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as ShowHomeReviewRequest

		const messages = await toggleShowHomeReviewService(user_id, params.id)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

/** POST /edit-user?type=1|2|3|4 */
export async function editUser(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { query, body } = req.validated as EditUserRequest
		const files = req.files as | Express.MulterS3.File[] | { [fieldname: string]: Express.MulterS3.File[] } | undefined

		const messages = await editUserProfileService(user_id, query.type, body, files)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

export async function changeEmploymentBasic(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body } = req.validated as ChangeEmploymentBasicRequest

		const messages = await changeEmploymentBasicService(user_id, body)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}
