import { Router } from "express";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { authUserProfileParamsSchema } from "../types/common-auth.types";
import { authUserProfile } from "../controllers/common-auth.controller";
import { companyProfileParamsSchema } from "../types/general.types";
import { authCompanyProfile } from "../controllers/misc.controller";

const authRouter = Router();

authRouter.get("/user-profile/:slug", Authorization, validateData(authUserProfileParamsSchema), authUserProfile);
authRouter.get("/company-profile/:slug", Authorization, validateData(companyProfileParamsSchema), authCompanyProfile);

export default authRouter;
