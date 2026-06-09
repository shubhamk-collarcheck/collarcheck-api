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

export const getStateById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const state = await db.select().from(cybState).where(eq(cybState.id, Number(id)));

		if (!state.length) {
			return res.status(404).json({ message: 'State not found' });
		}

		return res.status(200).json(state[0]);
	} catch (error) {
		next(error);
	}
};

export const createState = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { name, country, code, status, slug } = req.body;

		if (!name) {
			return res.status(400).json({ message: 'Name is required' });
		}

		const newState = await db.insert(cybState).values({ name, country, code, status, slug }).$returningId();
		return res.status(201).json({ message: 'State created successfully', state: newState[0] });
	} catch (error) {
		next(error);
	}
};

export const updateState = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const { name, country, code, status, slug } = req.body;

		const existingState = await db.select().from(cybState).where(eq(cybState.id, Number(id)));

		if (!existingState.length) {
			return res.status(404).json({ message: 'State not found' });
		}

		await db.update(cybState).set({ name, country, code, status, slug }).where(eq(cybState.id, Number(id)));

		return res.status(200).json({ message: 'State updated successfully' });
	} catch (error) {
		next(error);
	}
};

export const deleteState = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;

		const existingState = await db.select().from(cybState).where(eq(cybState.id, Number(id)));

		if (!existingState.length) {
			return res.status(404).json({ message: 'State not found' });
		}

		await db.delete(cybState).where(eq(cybState.id, Number(id)));

		return res.status(200).json({ message: 'State deleted successfully' });
	} catch (error) {
		next(error);
	}
};
