import { Router } from "express";
import multer from "multer";
import { Authorization } from "../middlewares/Authorization";
import { hired } from "../controllers/misc.controller";

const hiredRouter = Router();

// multipart/form-data field parser (no files). JSON still works via express.json.
const formData = multer().none();

hiredRouter.post("/", Authorization, formData, hired);

export default hiredRouter;
