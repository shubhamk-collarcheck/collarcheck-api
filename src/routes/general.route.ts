import { Router } from 'express';
import {
	getAllCities, getCityById, getAllStates, countryListController, allturnover, allcompanysize, noticePeriodList, languageList, industryList, salaryList, benefitList, roleTypeList,
	jobExperienceList, accomodationList, courseList, courseTypeList, educationDataList, tagList,
	alldesignation, allSkill, jobTypeList, allDepartment, allCourseType, allEmploymentType,
	allWorkType, employeeFilterDataList, jobDataList, job_detail
} from '../controllers/general.controller';
import { validateData } from '../middlewares/validation.middleware';
import { jobDetailSchema } from '../validators/job.validator';
import { Authorization } from '../middlewares/Authorization';
import { markViewedParamsSchema } from '../types/misc.types';
import { markViewed } from '../controllers/misc.controller';
import {
	allMessageListQuerySchema, addMessageSchema, chatMessageReadParamsSchema, followDataListQuerySchema,
	claimCompanySchema,
} from '../types/company-employee-request.types';
import {
	allMessageList, addMessage, chatMessageRead, followDataList,
	verificationStatus, claimCompany,
} from '../controllers/company-employee-request.controller';
import { uploadToS3 } from '../utils/uploadToS3';

const generalRoute = Router();

generalRoute.get("/employeeFilterDataList", employeeFilterDataList)
generalRoute.get("/work-status", allWorkType)
generalRoute.get("/employement-type", allEmploymentType)
generalRoute.get("/course-type", allCourseType)
generalRoute.get("/department", allDepartment)
generalRoute.get("/jobType", jobTypeList)
generalRoute.get("/all-skill", allSkill)
generalRoute.get("/city", getAllCities);
generalRoute.get("/allcity/:stateId", getCityById);
generalRoute.get("/state", getAllStates);
generalRoute.get("/countryList", countryListController);
generalRoute.get("/turnover", allturnover);
generalRoute.get("/companysize", allcompanysize)
generalRoute.get("/period_list", noticePeriodList)
generalRoute.get("/languageList", languageList)
generalRoute.get("/industryList", industryList)
generalRoute.get("/salaryList", salaryList)
generalRoute.get("/benefitList", benefitList)
generalRoute.get("/roleTypeList", roleTypeList)
generalRoute.get("/jobExperienceList", jobExperienceList)
generalRoute.get("/accomodationList", accomodationList)
generalRoute.get("/courseList", courseList)
generalRoute.get("/courseTypeList", courseTypeList)
generalRoute.get("/educationDataList", educationDataList)
generalRoute.get("/all-designation", alldesignation)
generalRoute.get("/job-detail/:slug", validateData(jobDetailSchema), job_detail)

generalRoute.put("/markViewed/:id", Authorization, validateData(markViewedParamsSchema), markViewed)

generalRoute.get("/all-message-company", Authorization, validateData(allMessageListQuerySchema), allMessageList)
generalRoute.post("/send-message-company", Authorization, uploadToS3.single("doc"), validateData(addMessageSchema), addMessage)
generalRoute.put("/chatMessageReadCompany/:id", Authorization, validateData(chatMessageReadParamsSchema), chatMessageRead)
generalRoute.get("/company-followDataList", Authorization, validateData(followDataListQuerySchema), followDataList)
generalRoute.get("/company-verificationStatus", Authorization, verificationStatus)
generalRoute.post("/claim-company", validateData(claimCompanySchema), claimCompany)

export default generalRoute;
