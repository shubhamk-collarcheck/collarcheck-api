import { Router } from "express";
import multer from "multer";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import {
	alternateEmptySchema, collaboratorRequestSchema, idParamsSchema,
	listQuerySchema, addSkillRatingSchema, updateShowProfileRatingSchema, clarityQuerySchema,
} from "../types/swipe-collaborator-rating.types";
import * as c from "../controllers/swipe-collaborator-rating.controller";

const router = Router();
const formData = multer().none();

// Public
router.get("/clarity", validateData(clarityQuerySchema), c.clarity);
router.get("/get_question", c.getQuestion);
router.get("/user-highest-level", c.userHighestLevel);

// Swipe / alternate
router.patch("/swipe-number", Authorization, c.swipeNumber);
router.patch("/alternate-empty", Authorization, formData, validateData(alternateEmptySchema), c.alternateEmpty);

// Collaborators
router.post("/collaborator-request", Authorization, formData, validateData(collaboratorRequestSchema), c.collaboratorRequest);
router.patch("/accept-colloborator/:id", Authorization, validateData(idParamsSchema), c.acceptCollaborator);
router.get("/collaborator-list", Authorization, validateData(listQuerySchema), c.collaboratorList);
router.get("/job-collaborator-list", Authorization, validateData(listQuerySchema), c.jobCollaboratorList);

// Domains
router.delete("/delete-email-domains/:id", Authorization, validateData(idParamsSchema), c.deleteEmailDomains);
// Employee skill ratings
router.post("/employee/add-skill-rating", Authorization, formData, validateData(addSkillRatingSchema), c.addSkillRating);
router.post("/employee/add-skill-rating/:id", Authorization, formData, validateData(addSkillRatingSchema), c.addSkillRating);

// Rating reads / show profile
router.get("/edit-rating-list/:id", Authorization, validateData(idParamsSchema), c.editRatingList);
router.get("/show-rating", Authorization, c.showRating);
router.post("/update-show-profile-rating", Authorization, formData, validateData(updateShowProfileRatingSchema), c.updateShowProfileRating);

// Company skill ratings
router.post("/company/add-skill-rating", Authorization, formData, validateData(addSkillRatingSchema), c.addCompanySkillRating);
router.post("/company/add-skill-rating/:id", Authorization, formData, validateData(addSkillRatingSchema), c.addCompanySkillRating);

// Designation score
router.get("/rating-average", Authorization, c.ratingAverage);

export default router;
