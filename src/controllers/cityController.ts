import { Request, Response, NextFunction } from 'express';
import { and, asc, eq, ne } from 'drizzle-orm';
import db from '../db';
import { cybCities } from '../db/schema';

export const getAllCities = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const state = Number(req.query.state)
		const conditions = [eq(cybCities.status, 1)];
		if (state) {
			conditions.push(eq(cybCities.state, state));
		}
		const citiesData = await db.select().from(cybCities).where(and(...conditions)).orderBy(asc(cybCities.name));
		return res.status(200).json({
			"status": true,
			"message": "",
			"data": citiesData
		});
	} catch (error) {
		next(error);
	}
};

