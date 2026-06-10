import { Router } from 'express';
import {
	getAllCities, getCityById, getAllStates, countryListController, allturnover, allcompanysize, noticePeriodList, languageList, industryList, salaryList, benefitList, roleTypeList,
	jobExperienceList, accomodationList, courseList, courseTypeList, educationDataList, tagList,
	alldesignation
} from '../controllers/general.controller';

const generalRoute = Router();

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


export default generalRoute;
