
import { Router } from "express";
import { Authorization } from "../middlewares/Authorization"
import { addExperience, allExperience, updateExperience } from "../controllers/employee.controller";
import { validateData } from "../middlewares/validation.middleware";
import { employmentRequestSchema } from "../types/employee.types";
import { uploadToS3 } from "../utils/uploadToS3";


const employRouter = Router()

employRouter.post("/add-employment", Authorization, uploadToS3.single("file"), validateData(employmentRequestSchema), addExperience)
employRouter.post("/add-employment/:employment_id", Authorization, uploadToS3.single("file"), validateData(employmentRequestSchema), updateExperience)
employRouter.get("/all-employement", Authorization, allExperience)



export default employRouter;
