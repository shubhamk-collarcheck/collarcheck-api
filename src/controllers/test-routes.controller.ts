import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import type {
	ResumeDownloadBody,
	UpdateNoticeBody,
	SaveEpfoBody,
} from "../types/test-routes.types";
import * as svc from "../services/test-routes.service";

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
	return Object.values(f).flat();
}

export const getSlug = async (req: Request, res: Response, next: NextFunction) => {
	try {
		svc.assertOpsAllowed(req);
		const file = req.file as Express.Multer.File | undefined;
		let text = "";
		if (file?.buffer) {
			text = file.buffer.toString("utf8");
		} else if ((file as { path?: string } | undefined)?.path) {
			const fs = await import("fs/promises");
			text = await fs.readFile((file as { path: string }).path, "utf8");
		} else if (typeof req.body?.csv === "string") {
			text = req.body.csv;
		}
		if (!text) {
			return res.status(200).type("text/plain").send("");
		}
		const result = await svc.importMessageHistoryCsvService(text);
		if (typeof result === "string") {
			return res.status(200).type("text/plain").send(result);
		}
		return res.status(200).json(result);
	} catch (error: unknown) {
		const err = error as { status?: number; message?: string };
		if (err?.status === 403) {
			return res.status(403).json({ status: false, messages: err.message || "Forbidden" });
		}
		next(error);
	}
};

export const mailtest = async (req: Request, res: Response, next: NextFunction) => {
	try {
		svc.assertOpsAllowed(req);
		const result = await svc.mailtestService();
		return res.status(200).json(result);
	} catch (error: unknown) {
		const err = error as { status?: number; message?: string };
		if (err?.status === 403) {
			return res.status(403).json({ status: false, messages: err.message || "Forbidden" });
		}
		next(error);
	}
};

export const updateCcid = async (req: Request, res: Response, next: NextFunction) => {
	try {
		svc.assertOpsAllowed(req);
		const result = await svc.updateCcidService();
		return res.status(200).json(result);
	} catch (error: unknown) {
		const err = error as { status?: number; message?: string };
		if (err?.status === 403) {
			return res.status(403).json({ status: false, messages: err.message || "Forbidden" });
		}
		next(error);
	}
};

export const resumeDownload = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: ResumeDownloadBody };
		const result = await svc.resumeDownloadService(id, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const updateNotice = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: UpdateNoticeBody };
		const result = await svc.updateNoticeService(id, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const digilocker = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.digilockerService();
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const saveEpfo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const body = (req.body || {}) as SaveEpfoBody;
		const result = await svc.saveEpfoService(id, body, uploadFiles(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const resumeTemplate = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.resumeTemplateService();
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const resumeDetails = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const templateId =
			Number((req.validated as { query?: { id?: number } } | undefined)?.query?.id) ||
			Number(req.query.id) ||
			undefined;
		const result = await svc.resumeDetailsService(id, templateId);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};
