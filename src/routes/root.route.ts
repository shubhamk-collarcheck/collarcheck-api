import { Router } from "express";
import multer from "multer";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";


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
import { dataDeletion } from "../controllers/frontend.controller";

const rootRouter = Router();

// multipart/form-data field parser (no files). JSON still works via express.json.
const formData = multer().none();


// Meta data-deletion callback (public stub)
rootRouter.get("/data-deletion", dataDeletion);
rootRouter.post("/data-deletion", formData, dataDeletion);
rootRouter.get("/people-list-signup", peopleListSignup);
rootRouter.post("/claim-company", formData, validateData(claimCompanySchema), claimCompany);
rootRouter.get("/logout", Authorization, logout);
rootRouter.get("/people-list", Authorization, peopleList);
rootRouter.get("/company-list", Authorization, validateData(companyListRootQuerySchema), companyList);
rootRouter.delete("/notifications/clear-all-notification", Authorization, clearAllNotification);
// Primary + FE aliases (some clients use GET; some prefix "response/")
rootRouter.delete("/removeNotification/:id", Authorization, validateData(removeNotificationParamsSchema), removeNotificationByParams);
rootRouter.get("/removeNotification/:id", Authorization, validateData(removeNotificationParamsSchema), removeNotificationByParams);
rootRouter.delete("/response/removeNotification/:id", Authorization, validateData(removeNotificationParamsSchema), removeNotificationByParams);
rootRouter.get("/response/removeNotification/:id", Authorization, validateData(removeNotificationParamsSchema), removeNotificationByParams);
rootRouter.post("/multi-unfollow", Authorization, formData, validateData(multiUnfollowSchema), multiUnfollow);
rootRouter.post("/multi-acceptfollow", Authorization, formData, validateData(multiFollowIdsSchema), multiAcceptFollow);
rootRouter.post("/multi-rejectfollow", Authorization, formData, validateData(multiFollowIdsSchema), multiRejectFollow);
rootRouter.post("/multi-deleteViewRequest", Authorization, formData, validateData(multiDeleteViewRequestSchema), multiDeleteViewRequest);
rootRouter.post("/multi-approvedVeiwRequest", Authorization, formData, validateData(multiApprovedViewRequestSchema), multiApprovedVeiwRequest);

export default rootRouter;
