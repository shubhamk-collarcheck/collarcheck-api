import { NextFunction, Request, Response } from "express";
import * as aiService from "../services/ai.service";

function apiKey(req: Request): string {
	return req.aiApiKey || "";
}

function handle(fn: (req: Request) => Promise<unknown>) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const result = await fn(req);
			return res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	};
}

// Semantic
export const suggestSkills = handle((req) =>
	aiService.suggestSkillsService(apiKey(req), req.body)
);
export const suggestDesignations = handle((req) =>
	aiService.suggestDesignationsService(apiKey(req), req.body)
);
export const suggestDepartments = handle((req) =>
	aiService.suggestDepartmentsService(apiKey(req), req.body)
);
export const suggestParameters = handle((req) =>
	aiService.suggestParametersService(apiKey(req), req.body)
);
export const suggestRoles = handle((req) =>
	aiService.suggestRolesService(apiKey(req), req.body)
);

// Chat
export const chatHealth = handle((req) => aiService.chatHealthService(apiKey(req)));
export const simpleChat = handle((req) =>
	aiService.simpleChatService(apiKey(req), req.body)
);
export const chatConversation = handle((req) =>
	aiService.chatConversationService(apiKey(req), req.body)
);
export const refreshFaqs = handle((req) =>
	aiService.refreshFaqsService(apiKey(req), req.body)
);
export const endSession = handle((req) =>
	aiService.endSessionService(apiKey(req), req.body)
);
export const resetTopic = handle((req) =>
	aiService.resetTopicService(apiKey(req), req.body)
);
export const getAllFaqs = handle((req) => aiService.getAllFaqsService(apiKey(req)));
export const getFaqById = handle((req) =>
	aiService.getFaqByIdService(apiKey(req), String(req.params.id ?? ""))
);

// Domain
export const domainRegister = handle((req) =>
	aiService.domainRegisterService(apiKey(req), req.body)
);
export const domainVerify = handle((req) =>
	aiService.domainVerifyService(apiKey(req), req.body)
);
export const domainReset = handle((req) =>
	aiService.domainResetService(apiKey(req), req.body)
);

// Rank + scrape
export const rankCandidates = handle((req) =>
	aiService.rankCandidatesService(apiKey(req), req.body)
);
export const scrape = handle((req) => aiService.scrapeService(apiKey(req), req.body));
