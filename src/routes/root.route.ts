import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { peopleList } from "../controllers/common-auth.controller";
import { logoutSchema } from "../types/general.types";
import db from "../db";
import { cybUser, cybUserLoginHistory } from "../db/schema";
import { eq } from "drizzle-orm";

const rootRouter = Router();

rootRouter.get("/people-list", Authorization, peopleList);

// Endpoint #7: Logout
rootRouter.post("/logout", Authorization, validateData(logoutSchema), async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as { user_id: number };

		// Invalidate refresh token
		const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
		await db.update(cybUser)
			.set({ token: null, modifyDate: now })
			.where(eq(cybUser.id, user_id));

		// Record login history
		await db.insert(cybUserLoginHistory).values({
			userId: user_id,
			ipAddress: req.ip,
			userAgent: req.headers['user-agent'] || '',
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

export default rootRouter;
