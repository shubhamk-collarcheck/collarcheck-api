import { Router } from "express";
import multer from "multer";
import { saveCareerEnquiry } from "../controllers/frontend.controller";

const careerRouter = Router();
const formData = multer().none();

// POST /wapi/career/save-enquiry (JSON, urlencoded, or multipart fields)
careerRouter.post("/save-enquiry", formData, saveCareerEnquiry);

export default careerRouter;
