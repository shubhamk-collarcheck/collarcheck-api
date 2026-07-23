import { Request, Response, NextFunction } from 'express';
import { and, eq, like } from 'drizzle-orm';
import db from '../db';
import { cybCompanyJob, cybSkill } from '../db/schema';
import { AuthUser } from '../types/express';
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
	verifyAuthTokenService, docListService, allMessageListGeneralService,
	allNotificationService, verificationStatusGeneralService, followDataListGeneralService,
	saveDocumentService, allReadNotificationService, chatMessageReadGeneralService,
	removeNotificationService, clearAllNotificationService, logoutService, unfollowService,
	removeFollowerService, multiUnfollowService, multiRemoveFollowerService,
	followUserService, acceptFollowService, rejectFollowService,
	multiAcceptFollowService, multiRejectFollowService,
	deleteMessageService, skillByCategoryService,
} from '../services/general.service';
import { get_job_detail_service, get_search_job_list, get_jobs_detail_by_ids, allJobService } from '../services/job.service';
import { get_company_detail } from '../services/users.service';
import { publicUserProfileService } from '../services/common-auth.service';
import { companyProfileService } from '../services/misc.service';
import {
	AllJobQuery, JobFilterDataListQuery, GlobalSearchQuery, SearchSuggestionParams,
	RatingFilterQuery, StarRatingParams, InviteDetailParams, AddSuggestionBody, UserProfileParams,
	CityQuery, CityByIdParams, StateQuery, PeriodListQuery, JobDetailQuery,
	DocListParams, SaveDocumentBody, ChatMessageReadIdParams, RemoveNotificationBody,
	RemoveNotificationParams, UnfollowParams, RemoveFollowerParams,
	MultiUnfollowBody, MultiRemoveFollowerBody,
	FollowBody, AcceptFollowParams, RejectFollowParams, MultiFollowIdsBody,
	CompanyProfileParams, SkillByCategoryParams,
} from '../types/general.types';





export const getAllCities = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query } = req.validated as CityQuery;
		const data = await getCitiesService(query.state);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

export const getCityById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req.validated as CityByIdParams;
		const data = await getCitiesByIdService(params.stateId);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

export const getAllStates = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query } = req.validated as StateQuery;
		const data = await getStatesService(query.country);
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
		const { query } = req.validated as PeriodListQuery;
		const data = await getNoticePeriodService(query.type || '');
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
		return res.status(200).json({ status: true, messages: 'language list', data });
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
		// Locked PHP contract: messages plural + exact "skill list"
		return res.status(200).json({ status: true, messages: 'skill list', data });
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
		const { params, query } = req.validated as JobDetailQuery;
		const userId = query.userId ? query.userId : false;
		const status = query.status ? query.status : false;
		const companyview = query.companyview === "true" || query.companyview === "1" || query.companyview === true;
		const jobDetailData = await get_job_detail_service(params.slug, userId, status, companyview);
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


// ====== Verify Auth Token (Endpoint #1) ======

export const verifyAuthToken = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const data = await verifyAuthTokenService(user_id);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== Doc List (Endpoint #2) ======

export const allDocList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as DocListParams;
		const data = await docListService(user_id, params.id);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== All Message List (Endpoint #3) ======

export const allMessageListGeneral = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const data = await allMessageListGeneralService(user_id);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== All Notification (Endpoint #4) ======

export const allNotification = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const data = await allNotificationService(user_id);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== Verification Status (Endpoint #5) ======

export const verificationStatusGeneral = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const data = await verificationStatusGeneralService(user_id);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== Follow Data List (Endpoint #6) ======

export const followDataListGeneral = async (req: Request, res: Response, next: NextFunction) => {
	try {
		// Acting user: JWT user, or company when X-Company is set
		const { id: actingUserId } = req.auth as AuthUser;
		const query = (req.validated as { query?: { limit?: number; offset?: number } })?.query
			?? (req.query as { limit?: string; offset?: string });
		const limit = query?.limit != null ? Number(query.limit) : 50;
		const offset = query?.offset != null ? Number(query.offset) : 0;
		const result = await followDataListGeneralService(actingUserId, limit, offset);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

// ====== Save Document (Endpoint #8) ======

export const saveDocument = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as SaveDocumentBody;
		const data = await saveDocumentService(user_id, body);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== All Read Notification (Endpoint #11) ======

export const allReadNotification = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const data = await allReadNotificationService(user_id);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== Chat Message Read (Endpoint #12) ======

export const chatMessageReadGeneral = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as ChatMessageReadIdParams;
		const data = await chatMessageReadGeneralService(user_id, params.id);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== Remove Notification by Body (Endpoint #13) ======

export const removeNotificationByBody = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as RemoveNotificationBody;
		const data = await removeNotificationService(user_id, body.id);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== Clear All Notification (Endpoint #14) ======

export const clearAllNotification = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const data = await clearAllNotificationService(user_id);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== Logout (GET /wapi/logout) ======

export const logout = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await logoutService(user_id, {
			ip: req.ip,
			userAgent: req.headers["user-agent"],
		});
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

// ====== Remove Notification by Params (Endpoint #15) ======

export const removeNotificationByParams = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as RemoveNotificationParams;
		const data = await removeNotificationService(user_id, params.id);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

// ====== Unfollow (Endpoint #16) ======

export const unfollow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: actingUserId } = req.auth as AuthUser;
		const { params } = req.validated as UnfollowParams;
		const result = await unfollowService(actingUserId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

// ====== Remove Follower (Endpoint #17) ======

export const removeFollower = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: actingUserId } = req.auth as AuthUser;
		const { params } = req.validated as RemoveFollowerParams;
		const result = await removeFollowerService(actingUserId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

// ====== Multi Unfollow (Endpoint #18) ======

export const multiUnfollow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: actingUserId } = req.auth as AuthUser;
		const { body } = req.validated as MultiUnfollowBody;
		const result = await multiUnfollowService(actingUserId, body.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

// ====== Multi Remove Follower (Endpoint #19) ======

export const multiRemoveFollower = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: actingUserId } = req.auth as AuthUser;
		const { body } = req.validated as MultiRemoveFollowerBody;
		const result = await multiRemoveFollowerService(actingUserId, body.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

// ====== Follow / reject / accept ======

export const follow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: actingUserId } = req.auth as AuthUser;
		const { body } = req.validated as { body: FollowBody };
		const result = await followUserService(actingUserId, body.follower_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const acceptFollow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: actingUserId } = req.auth as AuthUser;
		const { params } = req.validated as { params: AcceptFollowParams };
		const result = await acceptFollowService(actingUserId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const rejectFollow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: actingUserId } = req.auth as AuthUser;
		const { params } = req.validated as { params: RejectFollowParams };
		const result = await rejectFollowService(actingUserId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const multiAcceptFollow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: actingUserId } = req.auth as AuthUser;
		const { body } = req.validated as { body: MultiFollowIdsBody };
		const result = await multiAcceptFollowService(actingUserId, body.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const multiRejectFollow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: actingUserId } = req.auth as AuthUser;
		const { body } = req.validated as { body: MultiFollowIdsBody };
		const result = await multiRejectFollowService(actingUserId, body.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: userId } = req.auth as AuthUser;
		const validated = req.validated as { params: { id: number }; query: { user_type?: string } };
		const result = await deleteMessageService(userId, validated.params.id, validated.query?.user_type);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const skillByCategory = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = req.validated as { params: SkillByCategoryParams };
		const result = await skillByCategoryService(params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const generalCompanyProfile = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { params } = (req.validated as { params: CompanyProfileParams }) || { params: { slug: req.params.slug } };
		const result = await companyProfileService(params.slug, { isPublic: true });
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

