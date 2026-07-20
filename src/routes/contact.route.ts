import { Router } from "express";
import multer from "multer";
import { saveEnquiry } from "../controllers/frontend.controller";

const contactRouter = Router();
const formData = multer().none();

// POST /wapi/contact/save-enquiry (JSON, urlencoded, or multipart fields)
contactRouter.post("/save-enquiry", formData, saveEnquiry);

export default contactRouter;
