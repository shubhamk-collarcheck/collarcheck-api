import { Router } from "express";
import multer from "multer";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { educationUpload } from "../utils/educationUpload";
import { resumeUpload } from "../utils/resumeUpload";
import {
	reportReviewSchema, requestDeleteAccountSchema, aiGenerateSchema, messageSearchQuerySchema, fieldSuggestionQuerySchema,
	checkCcidSchema, followRevokeSchema, manualDocumentSchema, hiredIdsSchema,
} from "../types/new-routes.types";
import {
	splace, reportReview, allDeleteOption, requestDeleteAccount, aiGenerate, messageSearch, fieldSuggestion, checkCcid,
	followRevoke, manualDocumentSubmit, faqs, hiredThrow, updateHiredStatus, declineHiredStatus, downloadCv, autoFetch,
	resumeFetch, resume, resumeParse,
} from "../controllers/new-routes.controller";

const newRoutesRouter = Router();
const formData = multer().none();

// Manual KYC docs: document / document[] / file (up to 5, uses educationUpload limits)
const manualDocUpload = educationUpload.fields([
	{ name: "document", maxCount: 5 },
	{ name: "document[]", maxCount: 5 },
	{ name: "file", maxCount: 5 },
]);

newRoutesRouter.get("/splace", splace);
newRoutesRouter.get("/all-delete-option", allDeleteOption);
newRoutesRouter.get("/field-suggestion", validateData(fieldSuggestionQuerySchema), fieldSuggestion);
newRoutesRouter.post("/check-ccid", formData, validateData(checkCcidSchema), checkCcid);
newRoutesRouter.get("/faqs", faqs);

newRoutesRouter.post("/report-review", Authorization, formData, validateData(reportReviewSchema), reportReview);
newRoutesRouter.post("/request-delete-account", Authorization, formData, validateData(requestDeleteAccountSchema), requestDeleteAccount);
newRoutesRouter.post("/ai-generate", Authorization, formData, validateData(aiGenerateSchema), aiGenerate);
newRoutesRouter.get("/message-search", Authorization, validateData(messageSearchQuerySchema), messageSearch);
newRoutesRouter.post("/follow-revoke", Authorization, formData, validateData(followRevokeSchema), followRevoke);
newRoutesRouter.post("/manual-document-submit", Authorization, manualDocUpload, validateData(manualDocumentSchema), manualDocumentSubmit);
newRoutesRouter.get("/hired-throw", Authorization, hiredThrow);
newRoutesRouter.post("/update-hired-status", Authorization, formData, validateData(hiredIdsSchema), updateHiredStatus);
newRoutesRouter.post("/decline-hired-status", Authorization, formData, validateData(hiredIdsSchema), declineHiredStatus);
newRoutesRouter.get("/download-cv", Authorization, downloadCv);
newRoutesRouter.post("/auto-fetch", Authorization, resumeUpload.single("resume"), autoFetch);
newRoutesRouter.get("/resume-fetch", Authorization, resumeFetch);
newRoutesRouter.get("/resume", Authorization, resume);
newRoutesRouter.get("/resume-parse", Authorization, resumeParse);

export default newRoutesRouter;
