import { Router } from "express";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { authUserProfileParamsSchema } from "../types/common-auth.types";
import { authUserProfile } from "../controllers/common-auth.controller";

const authRouter = Router();

authRouter.get("/user-profile/:slug", Authorization, validateData(authUserProfileParamsSchema), authUserProfile);

export default authRouter;
