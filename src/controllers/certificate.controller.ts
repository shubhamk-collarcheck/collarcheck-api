import { Request, Response, NextFunction } from "express";
import { CertificateRequest, CertificateUpdateRequest } from "../types/certificate.types";
import { AuthUser } from "../types/express";
import { allCertificateListService, createCertificateService, deleteCertificateService, certificateDetailService, updateCertificateService } from "../services/certificate.service";
import { CommonIdParams } from "../utils/validation";

/** Normalize multer .fields() / .array() output for certificate document uploads. */
function certificateFiles(req: Request): Express.MulterS3.File[] {
	const f = req.files as
		| { [fieldname: string]: Express.MulterS3.File[] }
		| Express.MulterS3.File[]
		| undefined;
	if (!f) return [];
	if (Array.isArray(f)) return f;
	return [
		...(f.document || []),
		...(f["document[]"] || []),
		...(f.file || []),
	];
}

export async function addCertificate(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body } = req.validated as CertificateRequest
		const files = certificateFiles(req)

		const messages = await createCertificateService(user_id, body, files)

		return res.status(201).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

export async function updateCertificate(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body, params } = req.validated as CertificateUpdateRequest
		const files = certificateFiles(req)

		const messages = await updateCertificateService(user_id, params.id, body, files)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}

export async function allCertificateList(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser

		const data = await allCertificateListService(user_id)

		return res.status(200).json({
			status: true,
			messages: "certificate History",
			data,
		})
	} catch (error) {
		next(error)
	}
}

export async function certificateDetail(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams

		const data = await certificateDetailService(user_id, params.id)

		return res.status(200).json({
			status: true,
			messages: "certificate Detail",
			data,
		})
	} catch (error) {
		next(error)
	}
}

export async function deleteCertificate(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams

		const messages = await deleteCertificateService(user_id, params.id)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (error) {
		next(error)
	}
}
