import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import type {
	AlternateEmptyBody,
	CollaboratorRequestBody,
	AddSkillRatingBody,
	UpdateShowProfileRatingBody,
	ListQuery,
} from "../types/swipe-collaborator-rating.types";
import * as svc from "../services/swipe-collaborator-rating.service";

export const swipeNumber = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.swipeNumberService(id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const alternateEmpty = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const body =
			(req.validated as { body?: AlternateEmptyBody } | undefined)?.body ??
			(req.body as AlternateEmptyBody);
		const result = await svc.alternateEmptyService(id, body || {});
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const clarity = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const numOfDays =
			(req.validated as { query?: { numOfDays?: string | number } } | undefined)?.query?.numOfDays ??
			(req.query.numOfDays as string | undefined);
		const result = await svc.clarityService(numOfDays);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const collaboratorRequest = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id, user_id } = req.auth as AuthUser;
		const { body } = req.validated as { body: CollaboratorRequestBody };
		const result = await svc.collaboratorRequestService(id, user_id, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const acceptCollaborator = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.acceptCollaboratorService(id, Number(req.params.id));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const collaboratorList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const q =
			(req.validated as { query?: ListQuery } | undefined)?.query ??
			({
				limit: Number(req.query.limit) || 20,
				offset: Number(req.query.offset) || 0,
			} as ListQuery);
		const result = await svc.collaboratorListService(id, q.limit ?? 20, q.offset ?? 0);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const jobCollaboratorList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const q =
			(req.validated as { query?: ListQuery } | undefined)?.query ??
			({
				limit: Number(req.query.limit) || 20,
				offset: Number(req.query.offset) || 0,
				job_id: req.query.job_id != null ? Number(req.query.job_id) : undefined,
			} as ListQuery);
		const jobId =
			q.job_id ??
			(req.body?.job_id != null ? Number(req.body.job_id) : undefined) ??
			(req.query.job_id != null ? Number(req.query.job_id) : undefined);
		const result = await svc.jobCollaboratorListService(id, jobId, q.limit ?? 20, q.offset ?? 0);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const getQuestion = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.getQuestionService();
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const deleteEmailDomains = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.deleteEmailDomainService(id, Number(req.params.id));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const userHighestLevel = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.userHighestLevelService();
		// PHP returns bare boolean `true`
		if (typeof result === "boolean") {
			return res.status(200).send(result);
		}
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const addSkillRating = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const body =
			(req.validated as { body?: AddSkillRatingBody } | undefined)?.body ??
			(req.body as AddSkillRatingBody);
		const ratingId = req.params.id ? Number(req.params.id) : undefined;
		const result = await svc.addSkillRatingService(id, body || {}, ratingId);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const editRatingList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.editReviewRatingService(Number(req.params.id));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const showRating = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const experience_id =
			req.query.experience_id != null
				? Number(req.query.experience_id)
				: req.body?.experience_id != null
					? Number(req.body.experience_id)
					: undefined;
		const type =
			(req.query.type as string | undefined) ??
			(req.body?.type as string | undefined) ??
			undefined;
		const result = await svc.showProfileRatingService(id, { experience_id, type });
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const updateShowProfileRating = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const body =
			(req.validated as { body?: UpdateShowProfileRatingBody } | undefined)?.body ??
			(req.body as UpdateShowProfileRatingBody);
		const result = await svc.updateShowProfileRatingService(id, body || {});
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const addCompanySkillRating = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id, user_id } = req.auth as AuthUser;
		const body =
			(req.validated as { body?: AddSkillRatingBody } | undefined)?.body ??
			(req.body as AddSkillRatingBody);
		const ratingId = req.params.id ? Number(req.params.id) : undefined;
		const result = await svc.addCompanyReviewService(id, user_id, body || {}, ratingId);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const ratingAverage = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.ratingAverageService(id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};
