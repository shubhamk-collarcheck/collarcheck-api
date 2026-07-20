
import { Router } from "express";
import multer from "multer";
import { validateData } from "../middlewares/validation.middleware";
import {
	sendOtpSchema,
	verifyOtpSchema,
	socialLoginSchema,
	loginCommonSchema,
	verifyCommonOtpSchema,
} from "../types/login.types";
import {
	sendOtp,
	verifyOtp,
	socialLogin,
	loginCommon,
	verifyCommonOtp,
} from "../controllers/login.controller";

const loginRouter = Router();

const formData = multer().none();

loginRouter.post("/", formData, validateData(loginCommonSchema), loginCommon);
loginRouter.post("/sendOtp", formData, validateData(sendOtpSchema), sendOtp);
loginRouter.post("/verifyOtp", formData, validateData(verifyOtpSchema), verifyOtp);
loginRouter.post("/googlelogin", formData, validateData(socialLoginSchema), socialLogin);
loginRouter.post("/social-login", formData, validateData(socialLoginSchema), socialLogin);
loginRouter.post("/verify-otp", formData, validateData(verifyCommonOtpSchema), verifyCommonOtp);

export default loginRouter;
