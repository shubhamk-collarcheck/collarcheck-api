import { and, eq } from 'drizzle-orm';
import db from '../db';
import type { InferInsertModel } from 'drizzle-orm';
import { cybCompanyInvite } from '../db/schema';

type NewCompanyInvite = InferInsertModel<typeof cybCompanyInvite>

class companyInviteRepositery {
	async findByUserAndCompany(userId: number, companyId: number) {
		const [record] = await db.select().from(cybCompanyInvite)
			.where(and(
				eq(cybCompanyInvite.addedBy, userId),
				eq(cybCompanyInvite.company, companyId),
				eq(cybCompanyInvite.status, 1),
				eq(cybCompanyInvite.isDeleted, 0),
			));
		return record;
	}

	async create(data: NewCompanyInvite) {
		const [result] = await db.insert(cybCompanyInvite).values(data).$returningId();
		return result;
	}

	async update(id: number, data: Partial<NewCompanyInvite>) {
		await db.update(cybCompanyInvite).set(data).where(eq(cybCompanyInvite.id, id));
	}
}

export default new companyInviteRepositery()
