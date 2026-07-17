import { and, eq, ne } from 'drizzle-orm';
import db from '../db';
import { cybUser } from '../db/schema';
import { ConflictError, BadRequestError, NotFoundError } from '../middlewares/errorHandler';

export const updatePhoneService = async (userId: number, phone: string, countryCode?: string) => {
	const fullPhone = countryCode ? `${countryCode}${phone}` : phone;

	const existingUser = await db.select()
		.from(cybUser)
		.where(and(
			eq(cybUser.phone, fullPhone),
			ne(cybUser.id, userId),
			eq(cybUser.isDeleted, 0),
		))
		.limit(1);

	if (existingUser.length > 0) {
		throw new ConflictError("Phone number already in use");
	}

	const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
	await db.update(cybUser)
		.set({ phone: fullPhone, phoneVerified: 0, modifyDate: now })
		.where(eq(cybUser.id, userId));

	return {
		message: "Phone number updated successfully",
		phone: fullPhone,
		verification_required: true,
	};
};

export const updateEmailService = async (userId: number, email: string) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		throw new BadRequestError("Invalid email format");
	}

	const existingUser = await db.select()
		.from(cybUser)
		.where(and(
			eq(cybUser.email, email),
			ne(cybUser.id, userId),
			eq(cybUser.isDeleted, 0),
		))
		.limit(1);

	if (existingUser.length > 0) {
		throw new ConflictError("Email already in use");
	}

	const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
	await db.update(cybUser)
		.set({ email, emailVerified: 0, modifyDate: now })
		.where(eq(cybUser.id, userId));

	return {
		message: "Email updated successfully",
		email,
		verification_required: true,
	};
};
