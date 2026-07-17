import { Router } from "express";
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

/**
 * Mounted at /wapi/login
 * POST /wapi/login
 * POST /wapi/login/sendOtp
 * POST /wapi/login/verifyOtp
 * POST /wapi/login/googlelogin
 * POST /wapi/login/social-login
 * POST /wapi/login/verify-otp
 */
const loginRouter = Router();

loginRouter.post("/", validateData(loginCommonSchema), loginCommon);
loginRouter.post("/sendOtp", validateData(sendOtpSchema), sendOtp);
loginRouter.post("/verifyOtp", validateData(verifyOtpSchema), verifyOtp);
loginRouter.post("/googlelogin", validateData(socialLoginSchema), socialLogin);
loginRouter.post("/social-login", validateData(socialLoginSchema), socialLogin);
loginRouter.post("/verify-otp", validateData(verifyCommonOtpSchema), verifyCommonOtp);

export default loginRouter;
