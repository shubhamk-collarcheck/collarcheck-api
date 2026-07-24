import { NextFunction, Request, Response } from "express";
import * as aiService from "../services/ai.service";

export const suggestSkills = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.suggestSkillsService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const suggestDesignations = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.suggestDesignationsService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const suggestDepartments = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.suggestDepartmentsService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const suggestParameters = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.suggestParametersService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const suggestRoles = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.suggestRolesService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const chatHealth = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.chatHealthService(req.aiApiKey || "");
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const simpleChat = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.simpleChatService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const chatConversation = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.chatConversationService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const refreshFaqs = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.refreshFaqsService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const endSession = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.endSessionService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const resetTopic = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.resetTopicService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const getAllFaqs = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.getAllFaqsService(req.aiApiKey || "");
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const getFaqById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.getFaqByIdService(req.aiApiKey || "", String(req.params.id ?? ""));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const domainRegister = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.domainRegisterService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const domainVerify = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.domainVerifyService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const domainReset = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.domainResetService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const rankCandidates = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.rankCandidatesService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const scrape = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await aiService.scrapeService(req.aiApiKey || "", req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};
