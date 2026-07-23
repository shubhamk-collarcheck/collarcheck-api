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

function handle(fn: (req: Request) => Promise<unknown>) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const result = await fn(req);
			// user-highest-level returns bare boolean `true`
			if (typeof result === "boolean") {
				return res.status(200).send(result);
			}
			return res.status(200).json(result);
		} catch (e) {
			next(e);
		}
	};
}

function actingId(req: Request) {
	return (req.auth as AuthUser).id;
}
function loginUserId(req: Request) {
	return (req.auth as AuthUser).user_id;
}

export const swipeNumber = handle((req) => svc.swipeNumberService(actingId(req)));

export const alternateEmpty = handle((req) => {
	const body =
		(req.validated as { body?: AlternateEmptyBody } | undefined)?.body ??
		(req.body as AlternateEmptyBody);
	return svc.alternateEmptyService(actingId(req), body || {});
});

export const clarity = handle((req) => {
	const numOfDays =
		(req.validated as { query?: { numOfDays?: string | number } } | undefined)?.query?.numOfDays ??
		(req.query.numOfDays as string | undefined);
	return svc.clarityService(numOfDays);
});

export const collaboratorRequest = handle((req) => {
	const { body } = req.validated as { body: CollaboratorRequestBody };
	return svc.collaboratorRequestService(actingId(req), loginUserId(req), body);
});

export const acceptCollaborator = handle((req) =>
	svc.acceptCollaboratorService(actingId(req), Number(req.params.id))
);

export const collaboratorList = handle((req) => {
	const q =
		(req.validated as { query?: ListQuery } | undefined)?.query ??
		({
			limit: Number(req.query.limit) || 20,
			offset: Number(req.query.offset) || 0,
		} as ListQuery);
	return svc.collaboratorListService(actingId(req), q.limit ?? 20, q.offset ?? 0);
});

export const jobCollaboratorList = handle((req) => {
	const q =
		(req.validated as { query?: ListQuery } | undefined)?.query ??
		({
			limit: Number(req.query.limit) || 20,
			offset: Number(req.query.offset) || 0,
			job_id: req.query.job_id != null ? Number(req.query.job_id) : undefined,
		} as ListQuery);
	// PHP getVar — also accept body
	const jobId =
		q.job_id ??
		(req.body?.job_id != null ? Number(req.body.job_id) : undefined) ??
		(req.query.job_id != null ? Number(req.query.job_id) : undefined);
	return svc.jobCollaboratorListService(actingId(req), jobId, q.limit ?? 20, q.offset ?? 0);
});

export const getQuestion = handle(() => svc.getQuestionService());

export const deleteEmailDomains = handle((req) =>
	svc.deleteEmailDomainService(actingId(req), Number(req.params.id))
);

export const userHighestLevel = handle(() => svc.userHighestLevelService());

export const addSkillRating = handle((req) => {
	const body =
		(req.validated as { body?: AddSkillRatingBody } | undefined)?.body ??
		(req.body as AddSkillRatingBody);
	const id = req.params.id ? Number(req.params.id) : undefined;
	return svc.addSkillRatingService(actingId(req), body || {}, id);
});

export const editRatingList = handle((req) => svc.editReviewRatingService(Number(req.params.id)));

export const showRating = handle((req) => {
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
	return svc.showProfileRatingService(actingId(req), { experience_id, type });
});

export const updateShowProfileRating = handle((req) => {
	const body =
		(req.validated as { body?: UpdateShowProfileRatingBody } | undefined)?.body ??
		(req.body as UpdateShowProfileRatingBody);
	return svc.updateShowProfileRatingService(actingId(req), body || {});
});

export const addCompanySkillRating = handle((req) => {
	const body =
		(req.validated as { body?: AddSkillRatingBody } | undefined)?.body ??
		(req.body as AddSkillRatingBody);
	const id = req.params.id ? Number(req.params.id) : undefined;
	return svc.addCompanyReviewService(actingId(req), loginUserId(req), body || {}, id);
});

export const ratingAverage = handle((req) => svc.ratingAverageService(actingId(req)));
