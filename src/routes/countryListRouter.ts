import { NextFunction, Request, Response, Router } from "express";
import db from "../db";
import { cybCountry } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const countryListRouter = Router();

countryListRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
	try {
		const countryData = await db.select().from(cybCountry).where(eq(cybCountry.status, 1));
		res.status(200).json({ status: true, message: "", data: countryData });

	} catch (error) {
		next(error);
	}
});




export default countryListRouter;
