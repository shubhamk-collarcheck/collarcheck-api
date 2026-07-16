import { Request, Response } from "express";
import { AuthUser } from "../types/express";
import companyBenefitGalleryService from "../services/company-benefit-gallery.service";
import {
	AddBenefitBody, BenefitIdParams, AddBenefitUpdateCombined,
	AddGalleryBody, GalleryIdParams,
} from "../types/company-benefit-gallery.types";

export const getBenefit = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const data = await companyBenefitGalleryService.getBenefitService(companyId);

		return res.status(200).json({
			status: true,
			messages: "benefit list",
			data,
		});
	} catch (error) {
		console.error("getBenefit error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const addBenefit = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { body } = req.validated as { body: AddBenefitBody };

		const result = await companyBenefitGalleryService.addBenefitService(companyId, body);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("addBenefit error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const addBenefitUpdate = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params, body } = req.validated as AddBenefitUpdateCombined;

		const result = await companyBenefitGalleryService.addBenefitService(companyId, body, params.id);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("addBenefitUpdate error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const deleteBenefit = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params } = req.validated as { params: BenefitIdParams };

		const result = await companyBenefitGalleryService.deleteBenefitService(companyId, params.id);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("deleteBenefit error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const getGallery = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const data = await companyBenefitGalleryService.getGalleryService(companyId);

		return res.status(200).json({
			status: true,
			messages: "gallery list",
			data,
		});
	} catch (error) {
		console.error("getGallery error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const addGallery = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const files = req.files as Express.MulterS3.File[] | undefined;
		const { body } = req.validated as { body: AddGalleryBody };

		if (!files || files.length === 0) {
			return res.status(400).json({ status: false, messages: "You must upload file as png,jpg," });
		}

		const result = await companyBenefitGalleryService.addGalleryService(companyId, files, body.title);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("addGallery error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const addGalleryUpdate = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const files = req.files as Express.MulterS3.File[] | undefined;
		const { body } = req.validated as { body: AddGalleryBody };

		if (!files || files.length === 0) {
			return res.status(400).json({ status: false, messages: "You must upload file as png,jpg," });
		}

		// Note: Update route exists but handler always creates new records (per spec)
		const result = await companyBenefitGalleryService.addGalleryService(companyId, files, body.title);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("addGalleryUpdate error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const deleteGallery = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params } = req.validated as { params: GalleryIdParams };

		const result = await companyBenefitGalleryService.deleteGalleryService(companyId, params.id);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("deleteGallery error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};
