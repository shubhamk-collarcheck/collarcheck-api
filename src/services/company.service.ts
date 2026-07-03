import { and, eq, like } from 'drizzle-orm';
import db from '../db';
import { cybUser, cybUserDetails, cybIndustries, cybCompanySize, cybTurnover } from '../db/schema';



export async function company_add_service(data: {
	fname: string;
	email?: string;
	phone?: string;
	industry?: number;
	companySize?: number;
	turnover?: number;
	contactPerson?: string;
	website?: string;
}) {
	const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

	const [result] = await db.insert(cybUser).values({
		fname: data.fname,
		email: data.email,
		phone: data.phone,
		industry: data.industry,
		companySize: data.companySize,
		turnover: data.turnover,
		contactPerson: data.contactPerson,
		website: data.website,
		userType: 2,
		status: 1,
		isDeleted: 0,
		createDate: now,
		modifyDate: now,
	});

	return result.insertId;
};

export async function company_find_by_name_service(name: string) {
	const rows = await db
		.select({
			id: cybUser.id,
			fname: cybUser.fname,
			email: cybUser.email,
			phone: cybUser.phone,
			slug: cybUser.slug,
			profile: cybUser.profile,
			industry: cybUser.industry,
			industryName: cybIndustries.name,
			companySize: cybUser.companySize,
			companySizeName: cybCompanySize.name,
			turnover: cybUser.turnover,
			turnoverName: cybTurnover.name,
			contactPerson: cybUser.contactPerson,
			website: cybUser.website,
			claimStatus: cybUser.claimStatus,
			status: cybUser.status,
		})
		.from(cybUser)
		.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
		.leftJoin(cybCompanySize, eq(cybUser.companySize, cybCompanySize.id))
		.leftJoin(cybTurnover, eq(cybUser.turnover, cybTurnover.id))
		.where(
			and(
				like(cybUser.fname, `%${name}%`),
				eq(cybUser.userType, 2),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0)
			)
		)
		.orderBy(cybUser.fname);

	return rows;
}

export async function company_find_by_id_service(id: number) {
	const [row] = await db
		.select({
			id: cybUser.id,
			individualId: cybUser.individualId,
			fname: cybUser.fname,
			email: cybUser.email,
			phone: cybUser.phone,
			slug: cybUser.slug,
			profile: cybUser.profile,
			socialImage: cybUser.socialImage,
			industry: cybUser.industry,
			industryName: cybIndustries.name,
			companySize: cybUser.companySize,
			companySizeName: cybCompanySize.name,
			turnover: cybUser.turnover,
			turnoverName: cybTurnover.name,
			contactPerson: cybUser.contactPerson,
			website: cybUser.website,
			claimStatus: cybUser.claimStatus,
			presentAddress: cybUser.presentAddress,
			profileDescription: cybUser.profileDescription,
			linkdin: cybUser.linkdin,
			youtube: cybUser.youtube,
			instagram: cybUser.instagram,
			facebook: cybUser.facebook,
			twitter: cybUser.twitter,
			incorporateDate: cybUser.incorporateDate,
			status: cybUser.status,
			createDate: cybUser.createDate,
			latitude: cybUserDetails.latitude,
			longitude: cybUserDetails.longitude,
			isVerified: cybUserDetails.isVerified,
		})
		.from(cybUser)
		.leftJoin(cybIndustries, eq(cybUser.industry, cybIndustries.id))
		.leftJoin(cybCompanySize, eq(cybUser.companySize, cybCompanySize.id))
		.leftJoin(cybTurnover, eq(cybUser.turnover, cybTurnover.id))
		.leftJoin(cybUserDetails, eq(cybUserDetails.userId, cybUser.id))
		.where(
			and(
				eq(cybUser.id, id),
				eq(cybUser.userType, 2),
				eq(cybUser.status, 1),
				eq(cybUser.isDeleted, 0)
			)
		)
		.limit(1);

	return row || null;
}




