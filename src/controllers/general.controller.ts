import { Request, Response, NextFunction } from 'express';
import {
	getCitiesService, getCitiesByIdService, getStatesService, getCountriesService,
	getTurnoverService, getNoticePeriodService, getCompanySizeService, getIndustriesService,
	getSalaryService, getBenefitsService, getRoleTypesService, getJobExperienceService,
	getAccomodationService, getTagsService, getLanguagesService, getCoursesService,
	getCourseTypesService, getInstitutionsService, getEducationDataService,
	getAllDesignationService,
} from '../services/general.service';




export const getAllCities = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const state = Number(req.query.state);
		const data = await getCitiesService(state);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

export const getCityById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const stateId = Number(req.params.stateId);
		const data = await getCitiesByIdService(stateId);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

export const getAllStates = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const country = Number(req.query.country);
		const data = await getStatesService(country);
		return res.status(200).json({ status: true, message: 'States fetched successfully', data });
	} catch (error) {
		next(error);
	}
};

export const countryListController = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getCountriesService();
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

export const allturnover = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getTurnoverService();
		return res.status(200).json({ status: true, message: 'Turnover List', data });
	} catch (error) {
		next(error);
	}
};

export const noticePeriodList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const type = String(req.query.type || '');
		const data = await getNoticePeriodService(type);
		return res.status(200).json({ status: true, messages: 'Lists', data });
	} catch (error) {
		next(error);
	}
};

export const allcompanysize = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getCompanySizeService();
		return res.status(200).json({ status: true, message: 'Company Size fetched successfully', data });
	} catch (error) {
		next(error);
	}
};

export const industryList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getIndustriesService();
		return res.status(200).json({ status: true, messages: 'industries list', data });
	} catch (error) {
		next(error);
	}
};

export const salaryList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getSalaryService();
		return res.status(200).json({ status: true, messages: 'salary list', data });
	} catch (error) {
		next(error);
	}
};

export const benefitList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getBenefitsService();
		return res.status(200).json({ status: true, messages: 'benefit list', data });
	} catch (error) {
		next(error);
	}
};

export const roleTypeList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getRoleTypesService();
		return res.status(200).json({ status: true, messages: 'Role type list', data });
	} catch (error) {
		next(error);
	}
};

export const jobExperienceList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getJobExperienceService();
		return res.status(200).json({ status: true, messages: 'job experiences list', data });
	} catch (error) {
		next(error);
	}
};

export const accomodationList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getAccomodationService();
		return res.status(200).json({ status: true, messages: 'accomodation list', data });
	} catch (error) {
		next(error);
	}
};

export const tagList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getTagsService();
		return res.status(200).json({ status: true, messages: 'tag list', data });
	} catch (error) {
		next(error);
	}
};

export const languageList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getLanguagesService();
		return res.status(200).json({ status: true, messages: 'language list', data });
	} catch (error) {
		next(error);
	}
};

export const courseList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getCoursesService();
		return res.status(200).json({ status: true, messages: 'Course List', data });
	} catch (error) {
		next(error);
	}
};

export const courseTypeList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getCourseTypesService();
		return res.status(200).json({ status: true, messages: 'course type list', data });
	} catch (error) {
		next(error);
	}
};


export const educationDataList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getEducationDataService();
		return res.status(200).json({ status: true, messages: 'Data List', data });
	} catch (error) {
		next(error);
	}
};



export const alldesignation = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getAllDesignationService();
		return res.status(200).json({ status: true, messages: 'Designation List', data });
	} catch (error) {
		next(error);
	}
}
