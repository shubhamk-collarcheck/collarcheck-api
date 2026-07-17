import { Router } from "express";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";

import loginRouter from "./login.route";

import { peopleList, peopleListSignup } from "../controllers/common-auth.controller";
import { claimCompany, companyList } from "../controllers/company-employee-request.controller";
import { multiDeleteViewRequest, multiApprovedVeiwRequest, } from "../controllers/job-dashboard.controller";
import { multiDeleteViewRequestSchema, multiApprovedViewRequestSchema, } from "../types/job-dashboard.types";
import { claimCompanySchema } from "../types/company-employee-request.types";

import {
	logout, clearAllNotification, removeNotificationByParams, multiUnfollow, multiAcceptFollow, multiRejectFollow,
} from "../controllers/general.controller";

import {
	multiUnfollowSchema, removeNotificationParamsSchema, multiFollowIdsSchema, companyListRootQuerySchema,
} from "../types/general.types";

const rootRouter = Router();

rootRouter.use("/login", loginRouter);
rootRouter.get("/people-list-signup", peopleListSignup);
rootRouter.post("/claim-company", validateData(claimCompanySchema), claimCompany);
rootRouter.get("/logout", Authorization, logout);
rootRouter.get("/people-list", Authorization, peopleList);
rootRouter.get("/company-list", Authorization, validateData(companyListRootQuerySchema), companyList);
rootRouter.delete("/notifications/clear-all-notification", Authorization, clearAllNotification);
rootRouter.delete("/removeNotification/:id", Authorization, validateData(removeNotificationParamsSchema), removeNotificationByParams);
rootRouter.post("/multi-unfollow", Authorization, validateData(multiUnfollowSchema), multiUnfollow);
rootRouter.post("/multi-acceptfollow", Authorization, validateData(multiFollowIdsSchema), multiAcceptFollow);
rootRouter.post("/multi-rejectfollow", Authorization, validateData(multiFollowIdsSchema), multiRejectFollow);
rootRouter.post("/multi-deleteViewRequest", Authorization, validateData(multiDeleteViewRequestSchema), multiDeleteViewRequest);
rootRouter.post("/multi-approvedVeiwRequest", Authorization, validateData(multiApprovedViewRequestSchema), multiApprovedVeiwRequest);

export default rootRouter;
