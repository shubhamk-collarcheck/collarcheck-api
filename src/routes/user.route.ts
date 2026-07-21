import { Router } from "express";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { getSetting, saveSetting } from "../controllers/common-auth.controller";
import { updatePhone, updateEmail } from "../controllers/user.controller";
import { updatePhoneSchema, updateEmailSchema } from "../types/general.types";
import { sendEmailOtpSchema, verifyEmailOtpSchema } from "../types/verify.types";
import { sendEmailOtp, verifyEmailOtp } from "../controllers/verify.controller";
import multer from "multer";

const userRouter = Router();

const formData = multer().none();
userRouter.get("/getSetting", Authorization, getSetting);
userRouter.post("/saveSetting", formData, Authorization, saveSetting);
userRouter.post("/updatePhone", Authorization, validateData(updatePhoneSchema), updatePhone);
userRouter.post("/updateEmail", Authorization, validateData(updateEmailSchema), updateEmail);

// Email OTP verification (JWT) — see verify.md
userRouter.post("/sendEmailOtp", Authorization, formData, validateData(sendEmailOtpSchema), sendEmailOtp);
userRouter.post("/verifyEmailOtp", Authorization, formData, validateData(verifyEmailOtpSchema), verifyEmailOtp);

export default userRouter;
