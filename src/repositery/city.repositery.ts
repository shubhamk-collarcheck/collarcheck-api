import { and, eq } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybCities } from '../db/schema';

type City = InferSelectModel<typeof cybCities>
type NewCity = InferInsertModel<typeof cybCities>

class cityRepositery {
	async findByName(name: string): Promise<City | undefined> {
		const [city] = await db.select()
			.from(cybCities)
			.where(and(
				eq(cybCities.name, name),
				eq(cybCities.status, 1),
			));
		return city;
	}

	async create(data: NewCity) {
		const [result] = await db.insert(cybCities).values(data).$returningId();
		return result;
	}
}

export default new cityRepositery()
