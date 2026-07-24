import { Request, Response } from "express";
import { AuthUser } from "../types/express";
import companyReviewService from "../services/company-review.service";
import {
	AllReviewQuery, AddReviewBody, ReviewIdParams, AddReviewUpdateCombined,
	ViewReviewParams, AddHelpBody, AllApplicationQuery, UpdateBasicExperienceParams,
} from "../types/company-review.types";

export const allReview = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { query } = req.validated as { query: AllReviewQuery };

		const result = await companyReviewService.getAllReviewService(companyId, query.keyword, query.user_id);

		return res.status(200).json({
			status: true,
			messages: "review list",
			data: result,
		});
	} catch (error) {
		console.error("allReview error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const addReview = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { body } = req.validated as { body: AddReviewBody };

		// Handle file uploads - files are already uploaded to S3 via multer middleware
		const files = req.files as Express.MulterS3.File[] | undefined;
		const docUrls: string[] = files?.map(f => f.location) || [];

		const result = await companyReviewService.addReviewService(companyId, {
			experience_id: body.experience_id,
			rating: body.rating,
			review: body.review,
			link: body.link,
			show_review: body.show_review,
			doc: docUrls.length > 0 ? JSON.stringify(docUrls) : undefined,
		});

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("addReview error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const addReviewUpdate = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params, body } = req.validated as AddReviewUpdateCombined;

		// Handle file uploads - files are already uploaded to S3 via multer middleware
		const files = req.files as Express.MulterS3.File[] | undefined;
		const docUrls: string[] = files?.map(f => f.location) || [];

		const result = await companyReviewService.addReviewService(companyId, {
			experience_id: body.experience_id,
			rating: body.rating,
			review: body.review,
			link: body.link,
			show_review: body.show_review,
			doc: docUrls.length > 0 ? JSON.stringify(docUrls) : undefined,
		}, params.id);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("addReviewUpdate error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const rejectReview = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params } = req.validated as { params: ReviewIdParams };

		const result = await companyReviewService.rejectReviewService(companyId, params.id);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("rejectReview error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const viewReviewDetail = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params } = req.validated as { params: ViewReviewParams };

		const result = await companyReviewService.viewReviewDetailService(companyId, params.id);

		return res.status(result.success ? 200 : 404).json({
			status: result.success,
			messages: result.message,
			data: result.data,
		});
	} catch (error) {
		console.error("viewReviewDetail error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const addHelp = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { body } = req.validated as { body: AddHelpBody };

		const result = await companyReviewService.addHelpService(companyId, body);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("addHelp error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const allApplication = async (req: Request, res: Response) => {
	try {
		// Acting company / collab identity (honours X-Company)
		const { id: actingUserId } = req.auth as AuthUser;
		const { query } = req.validated as AllApplicationQuery;

		const result = await companyReviewService.getAllApplicationService(
			actingUserId,
			query.job,
			query.keyword,
			query.limit,
			query.offset,
		);

		// Business failures stay HTTP 200 (PHP contract)
		return res.status(200).json(result);
	} catch (error) {
		console.error("allApplication error:", error);
		return res.status(200).json({ status: false, messages: "Access denied" });
	}
};

export const updateBasicExperience = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params } = req.validated as { params: UpdateBasicExperienceParams };

		const result = await companyReviewService.updateBasicExperienceService(companyId, params.id);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("updateBasicExperience error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};
