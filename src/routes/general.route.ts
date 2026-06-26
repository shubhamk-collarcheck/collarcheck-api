import { Router } from 'express';
import {
	getAllCities, getCityById, getAllStates, countryListController, allturnover, allcompanysize, noticePeriodList, languageList, industryList, salaryList, benefitList, roleTypeList,
	jobExperienceList, accomodationList, courseList, courseTypeList, educationDataList, tagList,
	alldesignation, allSkill, jobTypeList, allDepartment, allCourseType, allEmploymentType,
	allWorkType, employeeFilterDataList, jobDataList, job_detail
} from '../controllers/general.controller';
import { validateData } from '../middlewares/validation.middleware';
import { jobDetailSchema } from '../validators/job.validator';

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
// generalRoute.get("/all-job",)
generalRoute.get("/job-detail/:slug", validateData(jobDetailSchema), job_detail)



export default generalRoute;
