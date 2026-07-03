
import { Router } from "express";
import { Authorization } from "../middlewares/Authorization"
import { addExperience, updateExperience } from "../controllers/employee.controller";
import { validateData } from "../middlewares/validation.middleware";
import { upload } from "../utils/uploader"
import { employmentRequestSchema } from "../types/employee.types";


const employRouter = Router()


employRouter.post("/add-employment", Authorization, upload.single("file"), validateData(employmentRequestSchema), addExperience)
employRouter.post("/add-employment/:employment_id", Authorization, upload.single("file"), validateData(employmentRequestSchema), updateExperience)


export default employRouter;
