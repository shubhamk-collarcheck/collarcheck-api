import { and, asc, eq } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybInstitutions } from '../db/schema';

type Institution = InferSelectModel<typeof cybInstitutions>
type NewInstitution = InferInsertModel<typeof cybInstitutions>

class institutionRepositery {
	async findByName(name: string): Promise<Institution | undefined> {
		const [inst] = await db.select()
			.from(cybInstitutions)
			.where(and(
				eq(cybInstitutions.name, name),
				eq(cybInstitutions.status, 1),
			));
		return inst;
	}

	async create(data: NewInstitution) {
		const [result] = await db.insert(cybInstitutions).values(data).$returningId();
		return result;
	}

	/** PHP institutionList: status=1 ORDER BY id ASC LIMIT 30 */
	async getActiveList(limit = 30) {
		return db.select({
			id: cybInstitutions.id,
			name: cybInstitutions.name,
			image: cybInstitutions.image,
		})
			.from(cybInstitutions)
			.where(eq(cybInstitutions.status, 1))
			.orderBy(asc(cybInstitutions.id))
			.limit(limit);
	}
}

export default new institutionRepositery()
