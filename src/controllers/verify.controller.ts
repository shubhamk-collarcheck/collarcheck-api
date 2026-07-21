import { Request, Response, NextFunction } from "express";
import { AuthUser } from "../types/express";
import { clientIp, isThrottled } from "../utils/throttle";
import {
	verifyDocumentService,
	verifyAadharService,
	verifyGstService,
	verifyDigilockerService,
	sendEmailOtpService,
	verifyEmailOtpService,
} from "../services/verify.service";
import type {
	VerifyDocumentBody,
	VerifyAadharBody,
	VerifyGstBody,
	VerifyDigilockerBody,
	SendEmailOtpBody,
	VerifyEmailOtpBody,
} from "../types/verify.types";

/** POST /wapi/general/verifyDocument  &  GET /wapi/general/verify-document */
export async function verifyDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const body =
			(req.validated as { body?: VerifyDocumentBody; query?: VerifyDocumentBody })?.body ||
			(req.validated as { query?: VerifyDocumentBody })?.query ||
			(req.body as VerifyDocumentBody);

		// GET may only have query
		const payload: VerifyDocumentBody =
			body && (body as any).type
				? (body as VerifyDocumentBody)
				: ({
						type: String(req.query.type || "").toLowerCase(),
						id_number: String(req.query.id_number || "").toUpperCase(),
						ismobile: req.query.ismobile,
					} as VerifyDocumentBody);

		const result = await verifyDocumentService(id, payload);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

/** POST /wapi/general/verifyAadhar */
export async function verifyAadhar(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: VerifyAadharBody };
		const result = await verifyAadharService(id, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

/** POST /wapi/general/verifyGst */
export async function verifyGst(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: VerifyGstBody };
		const result = await verifyGstService(id, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

/** POST /wapi/general/verifyDigilocker */
export async function verifyDigilocker(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { body } = req.validated as { body: VerifyDigilockerBody };
		const result = await verifyDigilockerService(id, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

/** POST /wapi/user/sendEmailOtp */
export async function sendEmailOtp(req: Request, res: Response, next: NextFunction) {
	try {
		const ip = clientIp(req);
		if (isThrottled(`user:sendEmailOtp:${ip}`, 3, 60_000)) {
			return res.status(200).json({
				status: false,
				messages: "Otp Send limit is reach !",
			});
		}
		const auth = req.auth as AuthUser;
		const { body } = req.validated as { body: SendEmailOtpBody };
		const result = await sendEmailOtpService(auth.user_id, auth.id, auth.user_type, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

/** POST /wapi/user/verifyEmailOtp */
export async function verifyEmailOtp(req: Request, res: Response, next: NextFunction) {
	try {
		const auth = req.auth as AuthUser;
		const { body } = req.validated as { body: VerifyEmailOtpBody };
		const result = await verifyEmailOtpService(auth.user_id, auth.id, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}
