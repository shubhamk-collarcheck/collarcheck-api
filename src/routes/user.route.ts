import { Router } from "express";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { getSetting, saveSetting } from "../controllers/common-auth.controller";
import { updatePhone, updateEmail } from "../controllers/user.controller";
import { updatePhoneSchema, updateEmailSchema } from "../types/general.types";
import multer from "multer";

const userRouter = Router();

const formData = multer().none();
userRouter.get("/getSetting", Authorization, getSetting);
userRouter.post("/saveSetting", formData, Authorization, saveSetting);

// Endpoint #9: Update Phone
userRouter.post("/updatePhone", Authorization, validateData(updatePhoneSchema), updatePhone);

// Endpoint #10: Update Email
userRouter.post("/updateEmail", Authorization, validateData(updateEmailSchema), updateEmail);

export default userRouter;
