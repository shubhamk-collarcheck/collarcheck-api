//company

import { and, asc, desc, eq, inArray, ne, sql, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybUser, cybUserExperience, cybEmployementType, cybDesignation, cybDepartment, cybCompanyInvite } from '../db/schema';
import { isEmpty, isEmptyArray } from '../utils/helpers';
import { createSlug } from "../utils/generator";


type User = InferSelectModel<typeof cybUser>
type NewUser = InferInsertModel<typeof cybUser>
type Exprience = InferSelectModel<typeof cybUserExperience>


class companyRepositery {
	async checkInvitationSend(companyId: number, userId: number): Promise<boolean> {
		const condition = [eq(cybCompanyInvite.addedBy, userId), eq(cybCompanyInvite.company, companyId)]
		const data = await db.select().from(cybCompanyInvite).where(and(...condition))
		if (!isEmpty(data)) {
			return true
		}
		return false
	}

	async checkInvitationSendByCompanyIds(companyIds: number[], userId: number): Promise<Set<number>> {
		if (isEmptyArray(companyIds)) return new Set();
		const invites = await db.select({ company: cybCompanyInvite.company })
			.from(cybCompanyInvite)
			.where(and(
				inArray(cybCompanyInvite.company, companyIds),
				eq(cybCompanyInvite.addedBy, userId),
			));
		return new Set(invites.map(i => i.company!));
	}
}


export default new companyRepositery()
