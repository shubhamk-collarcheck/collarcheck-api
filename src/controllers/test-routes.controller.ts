import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import type {
	ResumeDownloadBody,
	UpdateNoticeBody,
	SaveEpfoBody,
} from "../types/test-routes.types";
import * as svc from "../services/test-routes.service";

function handle(fn: (req: Request) => Promise<unknown>) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const result = await fn(req);
			if (typeof result === "string") {
				return res.status(200).type("text/plain").send(result);
			}
			return res.status(200).json(result);
		} catch (e: any) {
			if (e?.status === 403) {
				return res.status(403).json({ status: false, messages: e.message });
			}
			next(e);
		}
	};
}

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

// 1. CSV import (ops-guarded)
export const getSlug = handle(async (req) => {
	svc.assertOpsAllowed(req);
	const file = req.file as Express.Multer.File | undefined;
	if (!file?.buffer && !(file as any)?.path) {
		// multer memory or disk
		const anyFile = file as any;
		if (!anyFile) return "";
	}
	let text = "";
	if (file?.buffer) {
		text = file.buffer.toString("utf8");
	} else if ((file as any)?.path) {
		const fs = await import("fs/promises");
		text = await fs.readFile((file as any).path, "utf8");
	} else if (typeof req.body?.csv === "string") {
		text = req.body.csv;
	}
	if (!text) return "";
	return svc.importMessageHistoryCsvService(text);
});

// 2. mailtest (ops-guarded)
export const mailtest = handle(async (req) => {
	svc.assertOpsAllowed(req);
	return svc.mailtestService();
});

// 3. update-ccid (ops-guarded)
export const updateCcid = handle(async (req) => {
	svc.assertOpsAllowed(req);
	return svc.updateCcidService();
});

// 4. resume-download
export const resumeDownload = handle((req) => {
	const { id } = req.auth as AuthUser;
	const { body } = req.validated as { body: ResumeDownloadBody };
	return svc.resumeDownloadService(id, body);
});

// 5. update-notice
export const updateNotice = handle((req) => {
	const { id } = req.auth as AuthUser;
	const { body } = req.validated as { body: UpdateNoticeBody };
	return svc.updateNoticeService(id, body);
});

// 6. digilocker
export const digilocker = handle(() => svc.digilockerService());

// 7. save-epfo
export const saveEpfo = handle((req) => {
	const { id } = req.auth as AuthUser;
	const body = (req.body || {}) as SaveEpfoBody;
	return svc.saveEpfoService(id, body, uploadFiles(req));
});

// 8. resume-template
export const resumeTemplate = handle(() => svc.resumeTemplateService());

// 9. resume-details
export const resumeDetails = handle((req) => {
	const { id } = req.auth as AuthUser;
	const templateId =
		Number((req.validated as any)?.query?.id) ||
		Number(req.query.id) ||
		undefined;
	return svc.resumeDetailsService(id, templateId);
});
