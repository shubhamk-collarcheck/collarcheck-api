
import { Router } from "express";
import { Authorization } from "../middlewares/Authorization"
import { addExperience, allExperience, deleteExperience, detailExperience, updateExperience } from "../controllers/employee.controller";
import { validateData } from "../middlewares/validation.middleware";
import { employmentRequestSchema } from "../types/employee.types";
import { uploadToS3 } from "../utils/uploadToS3";
import { commonIdParamsSchema } from "../utils/validation";
import { allEducationList } from "../controllers/education.controller";


const employRouter = Router()

employRouter.post("/add-employment", Authorization, uploadToS3.array("file"), validateData(employmentRequestSchema), addExperience)
employRouter.post("/add-employment/:employment_id", Authorization, uploadToS3.array("file"), validateData(employmentRequestSchema), updateExperience)
employRouter.get("/all-employement", Authorization, allExperience)
employRouter.get("/employement-detail/:id", Authorization, validateData(commonIdParamsSchema), detailExperience)
//todo
// employRouter.get('/allEmployementNew', 'IndividualApi::allEmployementNew');
employRouter.delete("/delete-employement/:id", Authorization, validateData(commonIdParamsSchema), deleteExperience)

employRouter.get("/all-education", Authorization, allEducationList)



export default employRouter;
