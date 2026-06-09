import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import db from '../db';
import { usersTable } from '../db/schema';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const users = await db.select().from(usersTable);
		return res.status(200).json(users);
	} catch (error) {
		next(error);
	}
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const user = await db.select().from(usersTable).where(eq(usersTable.id, Number(id)));

		if (!user.length) {
			return res.status(404).json({ message: 'User not found' });
		}

		return res.status(200).json(user[0]);
	} catch (error) {
		next(error);
	}
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { name, age, email } = req.body;

		if (!name || !age || !email) {
			return res.status(400).json({ message: 'Please provide all the required fields' });
		}

		const newUser = await db.insert(usersTable).values({ name, age, email }).$returningId();
		return res.status(201).json({ message: 'User created successfully', user: newUser[0] });
	} catch (error) {
		next(error);
	}
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const { name, age, email } = req.body;

		const existingUser = await db.select().from(usersTable).where(eq(usersTable.id, Number(id)));

		if (!existingUser.length) {
			return res.status(404).json({ message: 'User not found' });
		}

		await db.update(usersTable).set({ name, age, email }).where(eq(usersTable.id, Number(id)));

		return res.status(200).json({ message: 'User updated successfully' });
	} catch (error) {
		next(error);
	}
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;

		const existingUser = await db.select().from(usersTable).where(eq(usersTable.id, Number(id)));

		if (!existingUser.length) {
			return res.status(404).json({ message: 'User not found' });
		}

		await db.delete(usersTable).where(eq(usersTable.id, Number(id)));

		return res.status(200).json({ message: 'User deleted successfully' });
	} catch (error) {
		next(error);
	}
};
