import { Request, Response, NextFunction } from "express";
import { AuthUser } from "../types/express";
import companyBenefitGalleryService from "../services/company-benefit-gallery.service";
import {
	AddBenefitBody, BenefitIdParams, AddBenefitUpdateCombined,
	AddGalleryBody, GalleryIdParams,
} from "../types/company-benefit-gallery.types";

export const getBenefit = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const data = await companyBenefitGalleryService.getBenefitService(companyId);
		return res.status(200).json({
			status: true,
			messages: "benefit list",
			data,
		});
	} catch (error) {
		const messages = error instanceof Error ? error.message : "Access denied";
		return res.status(200).json({ status: false, messages });
	}
};

export const addBenefit = async (req: Request, res: Response, _next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { body } = req.validated as { body: AddBenefitBody };
		const result = await companyBenefitGalleryService.addBenefitService(companyId, body);
		// PHP always HTTP 200
		return res.status(200).json(result);
	} catch (error) {
		const messages = error instanceof Error ? error.message : "Access denied";
		return res.status(200).json({ status: false, messages });
	}
};

export const addBenefitUpdate = async (req: Request, res: Response, _next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params, body } = req.validated as AddBenefitUpdateCombined;
		const result = await companyBenefitGalleryService.addBenefitService(
			companyId,
			body,
			params.id,
		);
		return res.status(200).json(result);
	} catch (error) {
		const messages = error instanceof Error ? error.message : "Access denied";
		return res.status(200).json({ status: false, messages });
	}
};

export const deleteBenefit = async (req: Request, res: Response, _next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params } = req.validated as { params: BenefitIdParams };
		const result = await companyBenefitGalleryService.deleteBenefitService(companyId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		const messages = error instanceof Error ? error.message : "Access denied";
		return res.status(200).json({ status: false, messages });
	}
};

export const getGallery = async (req: Request, res: Response, _next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const data = await companyBenefitGalleryService.getGalleryService(companyId);
		return res.status(200).json({
			status: true,
			messages: "gallery list",
			data,
		});
	} catch (error) {
		const messages = error instanceof Error ? error.message : "Access denied";
		return res.status(200).json({ status: false, messages });
	}
};

/** Collect files from .array() or .fields() (file / file[] / image / …). */
function galleryFilesFromRequest(req: Request): Express.MulterS3.File[] {
	const files = req.files;
	if (!files) return [];
	if (Array.isArray(files)) return files as Express.MulterS3.File[];
	const out: Express.MulterS3.File[] = [];
	for (const list of Object.values(files)) {
		if (Array.isArray(list)) out.push(...(list as Express.MulterS3.File[]));
	}
	return out;
}

export const addGallery = async (req: Request, res: Response, _next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const files = galleryFilesFromRequest(req);
		const { body } = req.validated as { body: AddGalleryBody };
		// Empty upload → status true + "Nothing Modified !" (not 400)
		const result = await companyBenefitGalleryService.addGalleryService(
			companyId,
			files,
			body?.title,
		);
		return res.status(200).json(result);
	} catch (error) {
		const messages = error instanceof Error ? error.message : "Access denied";
		return res.status(200).json({ status: false, messages });
	}
};

/** Same handler as addGallery — :id ignored (always insert). */
export const addGalleryUpdate = async (req: Request, res: Response, _next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const files = galleryFilesFromRequest(req);
		const { body } = req.validated as { body: AddGalleryBody };
		const result = await companyBenefitGalleryService.addGalleryService(
			companyId,
			files,
			body?.title,
		);
		return res.status(200).json(result);
	} catch (error) {
		const messages = error instanceof Error ? error.message : "Access denied";
		return res.status(200).json({ status: false, messages });
	}
};

export const deleteGallery = async (req: Request, res: Response, _next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params } = req.validated as { params: GalleryIdParams };
		const result = await companyBenefitGalleryService.deleteGalleryService(companyId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		const messages = error instanceof Error ? error.message : "Access denied";
		return res.status(200).json({ status: false, messages });
	}
};
