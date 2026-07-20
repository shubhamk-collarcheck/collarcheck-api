import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import type {
	ReportReviewBody,
	RequestDeleteAccountBody,
	AiGenerateBody,
	FieldSuggestionQuery,
	ManualDocumentBody,
	HiredIdsBody,
} from "../types/new-routes.types";
import * as svc from "../services/new-routes.service";

function uploadFiles(req: Request): Express.MulterS3.File[] {
	const f = req.files as
		| { [k: string]: Express.MulterS3.File[] }
		| Express.MulterS3.File[]
		| undefined;
	if (!f) {
		const single = req.file as Express.MulterS3.File | undefined;
		return single ? [single] : [];
	}
	if (Array.isArray(f)) return f;
	return [
		...(f.document || []),
		...(f["document[]"] || []),
		...(f.file || []),
		...(f.resume || []),
	];
}

export async function splace(_req: Request, res: Response, next: NextFunction) {
	try {
		return res.status(200).json(await svc.splaceService());
	} catch (e) {
		next(e);
	}
}

export async function reportReview(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: ReportReviewBody };
		return res.status(200).json(await svc.reportReviewService(id, body));
	} catch (e) {
		next(e);
	}
}

export async function allDeleteOption(_req: Request, res: Response, next: NextFunction) {
	try {
		return res.status(200).json(await svc.allDeleteOptionService());
	} catch (e) {
		next(e);
	}
}

export async function requestDeleteAccount(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: RequestDeleteAccountBody };
		return res.status(200).json(await svc.requestDeleteAccountService(id, body));
	} catch (e) {
		next(e);
	}
}

export async function aiGenerate(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: AiGenerateBody };
		return res.status(200).json(await svc.aiGenerateService(id, body));
	} catch (e) {
		next(e);
	}
}

export async function messageSearch(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const keyword =
			(req.validated as any)?.query?.keyword ??
			(req.query.keyword as string) ??
			"";
		return res.status(200).json(await svc.messageSearchService(id, keyword));
	} catch (e) {
		next(e);
	}
}

export async function fieldSuggestion(req: Request, res: Response, next: NextFunction) {
	try {
		const query =
			(req.validated as { query: FieldSuggestionQuery } | undefined)?.query ??
			({
				keyword: String(req.query.keyword || ""),
				field: String(req.query.field || ""),
				type: req.query.type as string | undefined,
				limit: Number(req.query.limit) || 30,
				offset: Number(req.query.offset) || 0,
			} as FieldSuggestionQuery);
		return res.status(200).json(await svc.fieldSuggestionService(query));
	} catch (e) {
		next(e);
	}
}

export async function checkCcid(req: Request, res: Response, next: NextFunction) {
	try {
		const ccid =
			(req.validated as any)?.body?.ccid ??
			(req.body?.ccid as string) ??
			"";
		if (!ccid) {
			return res.status(200).json({ status: false, messages: "The Ccid field is required." });
		}
		return res.status(200).json(await svc.checkCcidService(String(ccid)));
	} catch (e) {
		next(e);
	}
}

export async function followRevoke(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: { user_id: number } };
		return res.status(200).json(await svc.followRevokeService(id, body.user_id));
	} catch (e) {
		next(e);
	}
}

export async function manualDocumentSubmit(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: ManualDocumentBody };
		const files = uploadFiles(req);
		return res.status(200).json(await svc.manualDocumentSubmitService(id, body, files));
	} catch (e) {
		next(e);
	}
}

export async function faqs(_req: Request, res: Response, next: NextFunction) {
	try {
		return res.status(200).json(await svc.faqsService());
	} catch (e) {
		next(e);
	}
}

export async function hiredThrow(req: Request, res: Response, next: NextFunction) {
	try {
		const { id, user_type } = req.auth as AuthUser;
		return res.status(200).json(await svc.hiredThrowService(id, user_type));
	} catch (e) {
		next(e);
	}
}

export async function updateHiredStatus(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: HiredIdsBody };
		return res.status(200).json(await svc.updateHiredStatusService(id, body));
	} catch (e) {
		next(e);
	}
}

export async function declineHiredStatus(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: HiredIdsBody };
		return res.status(200).json(await svc.declineHiredStatusService(id, body));
	} catch (e) {
		next(e);
	}
}

export async function downloadCv(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		return res.status(200).json(await svc.downloadCvService(id));
	} catch (e) {
		next(e);
	}
}

export async function autoFetch(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const files = uploadFiles(req);
		const file = files[0] || (req.file as Express.MulterS3.File | undefined);
		return res.status(200).json(await svc.autoFetchService(id, file));
	} catch (e) {
		next(e);
	}
}

export async function resumeFetch(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		return res.status(200).json(await svc.resumeFetchService(id));
	} catch (e) {
		next(e);
	}
}

export async function resume(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		return res.status(200).json(await svc.resumeOpenAiService(id));
	} catch (e) {
		next(e);
	}
}

export async function resumeParse(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		return res.status(200).json(await svc.resumeParseService(id));
	} catch (e) {
		next(e);
	}
}
