import { Request, Response, NextFunction } from 'express';
import {
	getCitiesService, getCitiesByIdService, getStatesService, getCountriesService,
	getTurnoverService, getNoticePeriodService, getCompanySizeService, getIndustriesService,
	getSalaryService, getBenefitsService, getRoleTypesService, getJobExperienceService,
	getAccomodationService, getTagsService, getLanguagesService, getCoursesService,
	getCourseTypesService, getInstitutionsService, getEducationDataService, getAllDesignationService,
	allSkillService, jobTypeService, allDepartmentService, allCourseTypeService,
	allEmploymentTypeService,
	allWorkTypeService, employeeFilterDataListService

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
		return res.status(200).json({ status: true, message: 'Lists', data });
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
		return res.status(200).json({ status: true, message: 'industries list', data });
	} catch (error) {
		next(error);
	}
};

export const salaryList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getSalaryService();
		return res.status(200).json({ status: true, message: 'salary list', data });
	} catch (error) {
		next(error);
	}
};

export const benefitList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getBenefitsService();
		return res.status(200).json({ status: true, message: 'benefit list', data });
	} catch (error) {
		next(error);
	}
};

export const roleTypeList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getRoleTypesService();
		return res.status(200).json({ status: true, message: 'Role type list', data });
	} catch (error) {
		next(error);
	}
};

export const jobExperienceList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getJobExperienceService();
		return res.status(200).json({ status: true, message: 'job experiences list', data });
	} catch (error) {
		next(error);
	}
};

export const accomodationList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getAccomodationService();
		return res.status(200).json({ status: true, message: 'accomodation list', data });
	} catch (error) {
		next(error);
	}
};

export const tagList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getTagsService();
		return res.status(200).json({ status: true, message: 'tag list', data });
	} catch (error) {
		next(error);
	}
};

export const languageList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getLanguagesService();
		return res.status(200).json({ status: true, message: 'language list', data });
	} catch (error) {
		next(error);
	}
};

export const courseList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getCoursesService();
		return res.status(200).json({ status: true, message: 'Course List', data });
	} catch (error) {
		next(error);
	}
};

export const courseTypeList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getCourseTypesService();
		return res.status(200).json({ status: true, message: 'course type list', data });
	} catch (error) {
		next(error);
	}
};


export const educationDataList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getEducationDataService();
		return res.status(200).json({ status: true, message: 'Data List', data });
	} catch (error) {
		next(error);
	}
};



export const alldesignation = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await getAllDesignationService();
		return res.status(200).json({ status: true, message: 'Designation List', data });
	} catch (error) {
		next(error);
	}
}



export const allSkill = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await allSkillService();
		return res.status(200).json({ status: true, message: 'Skill List', data });
	}
	catch (error) {
		next(error);
	}
}


export const jobTypeList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await jobTypeService();
		return res.status(200).json({ status: true, message: "job type list", data: data })
	} catch (error) {
		next(error)
	}
}


export const allDepartment = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await allDepartmentService();
		return res.status(200).json({ status: true, message: "all department", data: data })
	} catch (error) {
		next(error)
	}
}


export const allCourseType = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await allCourseTypeService()
		return res.status(200).json({ status: true, message: "all course type", data: data })
	} catch (error) {
		next(error)
	}
}


export const allEmploymentType = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await allEmploymentTypeService()
		return res.status(200).json({ status: true, message: "all employment type", data: data })
	} catch (error) {
		next(error)
	}
}



export const allWorkType = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await allWorkTypeService()
		return res.status(200).json({ status: true, message: "all work type", data: data })
	} catch (error) {
		next(error)
	}
}


export const employeeFilterDataList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await employeeFilterDataListService()
		return res.status(200).json({ status: true, message: "employee filter", data: data })
	} catch (error) {
		next(error)
	}
}


