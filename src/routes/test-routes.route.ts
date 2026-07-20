import { Router } from "express";
import multer from "multer";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { educationUpload } from "../utils/educationUpload";
import {
	resumeDownloadSchema,
	updateNoticeSchema,
	resumeDetailsQuerySchema,
} from "../types/test-routes.types";
import * as c from "../controllers/test-routes.controller";

/**
 * Test / utility + a few product endpoints that lived next to the PHP test group.
 * Dangerous ops routes require `X-Ops-Key: $OPS_KEY` (or ALLOW_PUBLIC_OPS=1 / non-prod).
 */
const testRoutesRouter = Router();
const formData = multer().none();
const csvUpload = multer({ storage: multer.memoryStorage() }).single("csv");

// Multi-field upload for CV popup (documents / profile / resume)
const saveEpfoUpload = educationUpload.fields([
	{ name: "document", maxCount: 10 },
	{ name: "document[]", maxCount: 10 },
	{ name: "profile", maxCount: 1 },
	{ name: "resume", maxCount: 1 },
	{ name: "file", maxCount: 10 },
]);

// ---- Ops / public (guarded where dangerous) ----
testRoutesRouter.post("/get-slug", csvUpload, c.getSlug);
testRoutesRouter.get("/mailtest", c.mailtest);
testRoutesRouter.get("/update-ccid", c.updateCcid);
testRoutesRouter.get("/digilocker", c.digilocker);

// ---- Product (JWT) ----
testRoutesRouter.post(
	"/resume-download",
	Authorization,
	formData,
	validateData(resumeDownloadSchema),
	c.resumeDownload
);
testRoutesRouter.post(
	"/update-notice",
	Authorization,
	formData,
	validateData(updateNoticeSchema),
	c.updateNotice
);
testRoutesRouter.post(
	"/save-epfo",
	Authorization,
	saveEpfoUpload,
	c.saveEpfo
);
testRoutesRouter.get("/resume-template", Authorization, c.resumeTemplate);
testRoutesRouter.get(
	"/resume-details",
	Authorization,
	validateData(resumeDetailsQuerySchema),
	c.resumeDetails
);

export default testRoutesRouter;
