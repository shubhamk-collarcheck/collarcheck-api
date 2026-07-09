
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



export default employRouter;
