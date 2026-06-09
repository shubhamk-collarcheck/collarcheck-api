import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import db from '../db';
import { cybState } from '../db/schema';

export const getAllStates = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const states = await db.select().from(cybState);
		return res.status(200).json(states);
	} catch (error) {
		next(error);
	}
};

