import { and, asc, eq, sql } from 'drizzle-orm';
import db from '../db';
import { cybWorkType } from '../db/schema';



export const allWorkTypeService = async () => {
	const conditions = [eq(cybWorkType.status, 1)];
	return db.select({ id: cybWorkType.id, name: cybWorkType.name }).from(cybWorkType).where(and(...conditions)).orderBy(asc(cybWorkType.name)).limit(30);
}

export const dataListService = async () => {

}



