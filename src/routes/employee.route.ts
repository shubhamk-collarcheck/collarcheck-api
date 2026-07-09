
import { Router } from "express";
import { Authorization } from "../middlewares/Authorization"
import { addExperience, allExperience, deleteExperience, detailExperience, updateExperience } from "../controllers/employee.controller";
import { validateData } from "../middlewares/validation.middleware";
import { employmentRequestSchema } from "../types/employee.types";
import { uploadToS3 } from "../utils/uploadToS3";
import { commonIdParamsSchema } from "../utils/validation";
import { addEducation, allEducationList, deleteEducation, educationDetail, updateEducation } from "../controllers/education.controller";
import { educationParamsSchema, educationRequestSchema } from "../types/education.types";
import { educationUpload } from "../utils/educationUpload";
import { addSkill, allSkill, deleteSkill } from "../controllers/skill.controller";
import { skillRequestSchema } from "../types/skill.types";
import { portfolioRequestSchema, portfolioUpdateRequestSchema } from "../types/portfolio.types";
import { addPortfolio, allPortfolioList, deletePortfolio, portfolioDetail, updatePortfolio } from "../controllers/portfolio.controller";


const employRouter = Router()

employRouter.post("/add-employment", Authorization, uploadToS3.array("file"), validateData(employmentRequestSchema), addExperience)
employRouter.post("/add-employment/:employment_id", Authorization, uploadToS3.array("file"), validateData(employmentRequestSchema), updateExperience)
employRouter.get("/all-employement", Authorization, allExperience)
employRouter.get("/employement-detail/:id", Authorization, validateData(commonIdParamsSchema), detailExperience)
//todo
// employRouter.get('/allEmployementNew', 'IndividualApi::allEmployementNew');
employRouter.delete("/delete-employement/:id", Authorization, validateData(commonIdParamsSchema), deleteExperience)


employRouter.get("/all-education", Authorization, allEducationList)
employRouter.get("/education-detail/:id", Authorization, validateData(commonIdParamsSchema), educationDetail)
employRouter.post("/add-education", Authorization, educationUpload.array("document"), validateData(educationRequestSchema), addEducation)
employRouter.post("/add-education/:id", Authorization, educationUpload.array("document"), validateData(educationRequestSchema), updateEducation)
employRouter.delete("/delete-education/:id", Authorization, validateData(commonIdParamsSchema), deleteEducation)

employRouter.get("/all-skill", Authorization, allSkill)
employRouter.delete("/delete-skill/:id", Authorization, validateData(commonIdParamsSchema), deleteSkill)
employRouter.post("/add-skill", Authorization, validateData(skillRequestSchema), addSkill)

employRouter.post("/add-portfolio", Authorization, uploadToS3.single("file"), validateData(portfolioRequestSchema), addPortfolio)
employRouter.post("/add-portfolio/:id", Authorization, uploadToS3.single("file"), validateData(portfolioUpdateRequestSchema), updatePortfolio)
employRouter.get("/all-portfolio", Authorization, allPortfolioList)
employRouter.get("/portfolio-detail/:id", Authorization, validateData(commonIdParamsSchema), portfolioDetail)
employRouter.delete("/delete-portfolio/:id", Authorization, validateData(commonIdParamsSchema), deletePortfolio)





export default employRouter;
