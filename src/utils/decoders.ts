
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import {
	cybSkill, cybGalleries
} from '../db/schema';
import { boolean } from 'drizzle-orm/gel-core';
import { isEmpty } from './helpers';


const s3Prefix = process.env.S3_PREFIX || '';

export const decodeSkill = async (skill: string | null) => {
	if (!skill) return [];
	try {
		const decoded = JSON.parse(skill as string);
		if (Array.isArray(decoded)) {
			const ids = decoded.map(Number).filter(Boolean);
			if (ids.length === 0) return [];
			const skills = await db.select({ id: cybSkill.id, name: cybSkill.name })
				.from(cybSkill)
				.where(and(eq(cybSkill.status, 1), inArray(cybSkill.id, ids)))
				.orderBy(asc(cybSkill.name));
			return skills;
		}
	} catch { }
	return [];
};

export const decodeGallery = async (companyId: number | null) => {
	if (!companyId) return [];
	const rows = await db.select()
		.from(cybGalleries)
		.where(and(eq(cybGalleries.companyId, companyId), eq(cybGalleries.status, 1), eq(cybGalleries.isDeleted, 0)));
	return rows.map(gal => gal.image ? `${s3Prefix}${gal.image}` : '');
};



export const decodeS3URL = (key: string | null): string => {
	if (isEmpty(key)) {
		return ""
	}
	return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

}




