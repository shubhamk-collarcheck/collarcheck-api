import generalRepositery from '../repositery/general.repositery';
import { allWorkTypeService, getAllDesignationService, getAccomodationService, getCountriesService } from './general.service';

const s3Prefix = process.env.S3_PREFIX || '';

export const dataListService = async () => {
	const [employementList, designationList, accomodationList, countryList, companyRows] = await Promise.all([
		allWorkTypeService(),
		getAllDesignationService(),
		getAccomodationService(),
		getCountriesService(),
		generalRepositery.getRandomCompanySample(20),
	]);

	const companyList = companyRows.map(c => ({
		id: c.id,
		company_logo: c.profile ? `${s3Prefix}${c.profile}` : (c.socialImage || ''),
		company: c.fname,
		contact_person: c.contactPerson,
	}));

	return {
		employementList,
		companyList,
		designationList,
		accomodationList,
		countryList,
	};
}

