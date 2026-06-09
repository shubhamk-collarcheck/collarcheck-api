import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import db from '../db';
import { cybCities } from '../db/schema';

export const getAllCities = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const citiesData = await db.select().from(cybCities).where(eq(cybCities.status, 1));
		return res.status(200).json({
			"status": true,
			"message": "",
			"data": citiesData
		});
	} catch (error) {
		next(error);
	}
};

export const getCityById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const city = await db.select().from(cybCities).where(eq(cybCities.id, Number(id)));

		if (!city.length) {
			return res.status(404).json({ message: 'City not found' });
		}

		return res.status(200).json(city[0]);
	} catch (error) {
		next(error);
	}
};

export const createCity = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { name, state, status } = req.body;

		if (!name) {
			return res.status(400).json({ message: 'Name is required' });
		}

		const newCity = await db.insert(cybCities).values({ name, state, status }).$returningId();
		return res.status(201).json({ message: 'City created successfully', city: newCity[0] });
	} catch (error) {
		next(error);
	}
};

export const updateCity = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const { name, state, status } = req.body;

		const existingCity = await db.select().from(cybCities).where(eq(cybCities.id, Number(id)));

		if (!existingCity.length) {
			return res.status(404).json({ message: 'City not found' });
		}

		await db.update(cybCities).set({ name, state, status }).where(eq(cybCities.id, Number(id)));

		return res.status(200).json({ message: 'City updated successfully' });
	} catch (error) {
		next(error);
	}
};

export const deleteCity = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;

		const existingCity = await db.select().from(cybCities).where(eq(cybCities.id, Number(id)));

		if (!existingCity.length) {
			return res.status(404).json({ message: 'City not found' });
		}

		await db.delete(cybCities).where(eq(cybCities.id, Number(id)));

		return res.status(200).json({ message: 'City deleted successfully' });
	} catch (error) {
		next(error);
	}
};
