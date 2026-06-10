import { Request, Response, NextFunction } from 'express';
import { eq, and, asc } from 'drizzle-orm';
import db from '../db';
import { cybState } from '../db/schema';



export const getAllStates = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const country = Number(req.query.country);

		const conditions = [eq(cybState.status, 1)];

		if (country) {
			conditions.push(eq(cybState.country, country));
		}

		const states = await db.select().from(cybState).where(and(...conditions)).orderBy(asc(cybState.name));

		return res.status(200).json({
			status: true,
			message: "States fetched successfully",
			data: states,
		});
	} catch (error) {
		next(error);
	}
}
