import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { peopleList, peopleListSignup } from "../controllers/common-auth.controller";
import {
	multiUnfollowSchema,
	removeNotificationParamsSchema,
	multiFollowIdsSchema,
	companyListRootQuerySchema,
} from "../types/general.types";
import { claimCompanySchema } from "../types/company-employee-request.types";
import { claimCompany, companyList } from "../controllers/company-employee-request.controller";
import {
	clearAllNotification,
	multiUnfollow,
	removeNotificationByParams,
	multiAcceptFollow,
	multiRejectFollow,
} from "../controllers/general.controller";
import {
	multiDeleteViewRequest,
	multiApprovedVeiwRequest,
} from "../controllers/job-dashboard.controller";
import {
	multiDeleteViewRequestSchema,
	multiApprovedViewRequestSchema,
} from "../types/job-dashboard.types";
import db from "../db";
import { cybUser, cybUserLoginHistory } from "../db/schema";
import { eq } from "drizzle-orm";

const rootRouter = Router();

rootRouter.get("/people-list", Authorization, peopleList);
rootRouter.get("/people-list-signup", peopleListSignup);

// GET company-list
rootRouter.get(
	"/company-list",
	Authorization,
	validateData(companyListRootQuerySchema),
	companyList
);

// PHP: POST claim-company (under wapi root, not general)
rootRouter.post("/claim-company", validateData(claimCompanySchema), claimCompany);

// PHP: GET logout
rootRouter.get("/logout", Authorization, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as { user_id: number };

		const now = new Date().toISOString().slice(0, 19).replace("T", " ");
		await db.update(cybUser)
			.set({ token: null, modifyDate: now })
			.where(eq(cybUser.id, user_id));

		await db.insert(cybUserLoginHistory).values({
			userId: user_id,
			ipAddress: req.ip,
			userAgent: req.headers["user-agent"] || "",
			logoutAt: now,
		});

		return res.status(200).json({
			status: true,
			message: "Logged out successfully",
		});
	} catch (error) {
		next(error);
	}
});

// PHP: DELETE notifications/clear-all-notification
rootRouter.delete(
	"/notifications/clear-all-notification",
	Authorization,
	clearAllNotification
);

// PHP: DELETE removeNotification/:id (wapi root)
rootRouter.delete(
	"/removeNotification/:id",
	Authorization,
	validateData(removeNotificationParamsSchema),
	removeNotificationByParams
);

// PHP: POST multi-unfollow (wapi root)
rootRouter.post(
	"/multi-unfollow",
	Authorization,
	validateData(multiUnfollowSchema),
	multiUnfollow
);

// Multi follow accept/reject
rootRouter.post(
	"/multi-acceptfollow",
	Authorization,
	validateData(multiFollowIdsSchema),
	multiAcceptFollow
);
rootRouter.post(
	"/multi-rejectfollow",
	Authorization,
	validateData(multiFollowIdsSchema),
	multiRejectFollow
);

// Multi view request
rootRouter.post(
	"/multi-deleteViewRequest",
	Authorization,
	validateData(multiDeleteViewRequestSchema),
	multiDeleteViewRequest
);
rootRouter.post(
	"/multi-approvedVeiwRequest",
	Authorization,
	validateData(multiApprovedViewRequestSchema),
	multiApprovedVeiwRequest
);

export default rootRouter;
