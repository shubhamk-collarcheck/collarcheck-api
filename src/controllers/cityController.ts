import { Request, Response, NextFunction } from 'express';
import { eq, ne } from 'drizzle-orm';
import db from '../db';
import { cybCities } from '../db/schema';

export const getAllCities = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const citiesData = (await db.select().from(cybCities).where(eq(cybCities.status, 1)));
		return res.status(200).json({
			"status": true,
			"message": "",
			"data": citiesData
		});
	} catch (error) {
		next(error);
	}
};

