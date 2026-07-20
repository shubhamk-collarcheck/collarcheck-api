import { Router } from "express";
import multer from "multer";
import { AiAuth } from "../middlewares/aiAuth";
import {
	suggestSkills, suggestDesignations, suggestDepartments, suggestParameters, suggestRoles,
	chatHealth, simpleChat, chatConversation, refreshFaqs, endSession, resetTopic, getAllFaqs,
	getFaqById, domainRegister, domainVerify, domainReset, rankCandidates, scrape,
} from "../controllers/ai.controller";

const aiRouter = Router();
const formData = multer().none();

aiRouter.use(AiAuth);

// ---- Semantic ----
aiRouter.post("/semantic/suggest_skills", formData, suggestSkills);
aiRouter.post("/semantic/suggest_designations", formData, suggestDesignations);
aiRouter.post("/semantic/suggest_departments", formData, suggestDepartments);
aiRouter.post("/semantic/suggest_parameters", formData, suggestParameters);
aiRouter.post("/semantic/suggest_roles", formData, suggestRoles);

// ---- Chat ----
aiRouter.get("/chat/health", chatHealth);
aiRouter.post("/chat", formData, simpleChat);
aiRouter.post("/chat/conversation", formData, chatConversation);
aiRouter.post("/chat/refresh-faqs", formData, refreshFaqs);
aiRouter.post("/chat/end-session", formData, endSession);
aiRouter.post("/chat/reset-topic", formData, resetTopic);
aiRouter.get("/chat/faqs", getAllFaqs);
aiRouter.get("/chat/faq/:id", getFaqById);

// ---- Domain ----
aiRouter.post("/domain/register", formData, domainRegister);
aiRouter.post("/domain/verify", formData, domainVerify);
aiRouter.post("/domain/reset", formData, domainReset);

// ---- Rank + scrape ----
aiRouter.post("/rec_candidates/rank", formData, rankCandidates);
aiRouter.post("/scrape", formData, scrape);

export default aiRouter;
