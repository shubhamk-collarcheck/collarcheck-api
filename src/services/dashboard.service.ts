import { and, asc, eq, sql } from 'drizzle-orm';
import db from '../db';
import { cybWorkType, cybDesignation, cybAccomodation, cybCountry, cybUser } from '../db/schema';
import { allWorkTypeService, getAllDesignationService, getAccomodationService, getCountriesService } from './general.service';

const s3Prefix = process.env.S3_PREFIX || '';

export const dataListService = async () => {
	const [employementList, designationList, accomodationList, countryList, companyRows] = await Promise.all([
		allWorkTypeService(),
		getAllDesignationService(),
		getAccomodationService(),
		getCountriesService(),
		db.select({
			id: cybUser.id,
			company_logo: cybUser.profile,
			social_image: cybUser.socialImage,
			company: cybUser.fname,
			contact_person: cybUser.contactPerson,
		})
			.from(cybUser)
			.where(and(eq(cybUser.userType, 2), eq(cybUser.status, 1), eq(cybUser.isDeleted, 0)))
			.orderBy(sql`RAND()`)
			.limit(20),
	]);

	const companyList = companyRows.map(c => ({
		id: c.id,
		company_logo: c.company_logo ? `${s3Prefix}${c.company_logo}` : (c.social_image || ''),
		company: c.company,
		contact_person: c.contact_person,
	}));

	return {
		employementList,
		companyList,
		designationList,
		accomodationList,
		countryList,
	};
}

