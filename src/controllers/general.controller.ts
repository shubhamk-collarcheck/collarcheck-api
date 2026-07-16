import { Request, Response, NextFunction } from 'express';
import { and, eq, like } from 'drizzle-orm';
import db from '../db';
import { cybCompanyJob, cybSkill } from '../db/schema';

import { isEmptyObject } from '../utils/helpers';
import {
	getCitiesService, getCitiesByIdService, getStatesService, getCountriesService,
	getTurnoverService, getNoticePeriodService, getCompanySizeService, getIndustriesService,
	getSalaryService, getBenefitsService, getRoleTypesService, getJobExperienceService,
	getAccomodationService, getTagsService, getLanguagesService, getCoursesService,
	getCourseTypesService, getInstitutionsService, getEducationDataService, getAllDesignationService,
	allSkillService, jobTypeService, allDepartmentService, allCourseTypeService,
	allEmploymentTypeService,
	allWorkTypeService, employeeFilterDataListService,
	jobDataListService, jobFilterDataListService, ratingFilterService,
	starRatingEmployeesService, inviteDetailService, globalSearchService,
	addSuggestionService,
} from '../services/general.service';
import { get_job_detail_service, get_search_job_list, get_jobs_detail_by_ids, allJobService } from '../services/job.service';
import { get_company_detail } from '../services/users.service';
import { publicUserProfileService } from '../services/common-auth.service';
import {
	AllJobQuery, JobFilterDataListQuery, GlobalSearchQuery, SearchSuggestionParams,
	RatingFilterQuery, StarRatingParams, InviteDetailParams, AddSuggestionBody, UserProfileParams,
} from '../types/general.types';





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


export const jobDataList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await jobDataListService()
		return res.status(200).json({ status: true, message: "", data: data })
	} catch (error) {
		next(error)
	}
}



export const job_detail = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const slug = req.params.slug as string;
		const userId = req.query.userId ? Number(req.query.userId) : false;
		const status = req.query.status ? String(req.query.status) : false;
		const companyview = req.query.companyview === "true" || req.query.companyview === "1";
		const jobDetailData = await get_job_detail_service(slug, userId, status, companyview);
		if (!jobDetailData) {
			return res.status(400).json({
				status: false, message: 'Job not found', data: []
			})
		}
		const companyData = await get_company_detail(jobDetailData.company!);

		let relatedJob = [];
		const filterLogic = {
			id_not_in: jobDetailData.id,
			status: 1,
			limit: 4,
			offset: 0,
			skillArray: jobDetailData.skill,
		};

		const jobList = await get_search_job_list(filterLogic);
		if (Array.isArray(jobList)) {
			const jobSlug = jobList.map((j: any) => j.slug);
			relatedJob = await get_jobs_detail_by_ids(jobSlug);

			return res.status(200).json({
				status: true,
				message: '',
				data: {
					detail: jobDetailData,
					JobList: relatedJob,
					company: companyData,
				},
			});
		}

		return res.status(200).json({
			status: true,
			message: '',
			data: {
				detail: jobDetailData,
				company: companyData,
			},
		});
	} catch (error) {
		next(error);
	}
}


export const allJob = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query } = req.validated as AllJobQuery;
		const data = await allJobService(query);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
}


export const jobFilterDataList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query } = req.validated as JobFilterDataListQuery;
		const data = await jobFilterDataListService(query.slug, query.type);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
}


export const searchSuggestion = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req.validated as SearchSuggestionParams;
		const data: any[] = [];

		if (params.usertype === 'jobs') {
			const skills = await db.select({ id: cybSkill.id, name: cybSkill.name })
				.from(cybSkill)
				.where(and(eq(cybSkill.status, 1), like(cybSkill.name, '%' + params.keyword + '%')))
				.limit(5);
			for (const s of skills) {
				data.push({ id: s.id, name: s.name, type: 'skill' });
			}
		}

		return res.status(200).json({ status: true, data });
	} catch (error) {
		next(error);
	}
}


export const globalSearch = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query } = req.validated as GlobalSearchQuery;
		const keyword = query.keyword || '';
		const limit = query.limit || 6;
		const offset = query.offset || 0;

		const data = await globalSearchService(keyword, query.type, limit, offset, query);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
}


export const ratingFilter = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query } = req.validated as RatingFilterQuery;
		const data = await ratingFilterService(query.employment, query.order);
		return res.status(200).json({ status: true, data });
	} catch (error) {
		next(error);
	}
}


export const starRatingEmployees = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req.validated as StarRatingParams;
		const data = await starRatingEmployeesService(params.star);
		return res.status(200).json(data);
	} catch (error) {
		next(error);
	}
}


export const inviteDetail = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req.validated as InviteDetailParams;
		const data = await inviteDetailService(params.token);

		if (!data) {
			return res.status(404).json({ status: false, message: 'Invite not found' });
		}

		return res.status(200).json({ status: true, data });
	} catch (error) {
		next(error);
	}
}


export const addSuggestion = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { body } = req.validated as AddSuggestionBody;
		const result = await addSuggestionService(body.name, body.phone, body.description);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}


export const userProfile = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req.validated as UserProfileParams;
		const data = await publicUserProfileService(params.slug);

		if (!data) {
			return res.status(404).json({ status: false, message: 'User not found' });
		}

		return res.status(200).json(data);
	} catch (error) {
		next(error);
	}
}

