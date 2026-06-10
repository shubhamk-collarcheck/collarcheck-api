import { Request, Response, NextFunction } from "express";
import db from "../db";
import { eq } from "drizzle-orm";
import { cybCountry } from "../../drizzle/schema";


export const countryListController = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const countryData = await db.select().from(cybCountry).where(eq(cybCountry.status, 1));

		const sortedCountries = [...countryData.filter(c => c.id === 101), ...countryData.filter(c => c.id !== 101),];

		res.status(200).json({ status: true, message: "", data: sortedCountries });
	} catch (error) {
		next(error);
	}
}
