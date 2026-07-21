import { Router } from 'express';
import {
	getAllCities, getCityById, getAllStates, countryListController, allturnover, allcompanysize, noticePeriodList, languageList, industryList, salaryList, benefitList, roleTypeList,
	jobExperienceList, accomodationList, courseList, courseTypeList, educationDataList, tagList,
	alldesignation, allSkill, jobTypeList, allDepartment, allCourseType, allEmploymentType,
	allWorkType, employeeFilterDataList, jobDataList, job_detail, allJob, searchSuggestion,
	globalSearch, ratingFilter, starRatingEmployees, inviteDetail, addSuggestion, userProfile,
	verifyAuthToken, allDocList, allMessageListGeneral, allNotification, verificationStatusGeneral,
	followDataListGeneral, saveDocument, allReadNotification, chatMessageReadGeneral,
	unfollow, removeFollower, multiRemoveFollower,
	follow, acceptFollow, rejectFollow, deleteMessage, skillByCategory, generalCompanyProfile,
} from '../controllers/general.controller';
import { validateData } from '../middlewares/validation.middleware';
import { Authorization } from '../middlewares/Authorization';
import { markViewedParamsSchema } from '../types/misc.types';
import { markViewed } from '../controllers/misc.controller';
import {
	allMessageListQuerySchema, addMessageSchema, chatMessageReadParamsSchema, followDataListQuerySchema,
} from '../types/company-employee-request.types';
import {
	allMessageList, addMessage, chatMessageRead, followDataList,
	verificationStatus,
} from '../controllers/company-employee-request.controller';
import { uploadToS3 } from '../utils/uploadToS3';
import {
	allJobQuerySchema, jobFilterDataListQuerySchema, globalSearchQuerySchema, searchSuggestionParamsSchema,
	ratingFilterQuerySchema, starRatingParamsSchema, inviteDetailParamsSchema, addSuggestionSchema,
	userProfileParamsSchema, cityQuerySchema, cityByIdParamsSchema, stateQuerySchema,
	periodListQuerySchema, jobDetailQuerySchema,
	docListParamsSchema, saveDocumentSchema, chatMessageReadIdParamsSchema,
	unfollowParamsSchema, removeFollowerParamsSchema,
	multiRemoveFollowerSchema,
	followSchema, acceptFollowParamsSchema, rejectFollowParamsSchema,
	deleteMessageParamsSchema, skillByCategoryParamsSchema, companyProfileParamsSchema,
} from '../types/general.types';
import { sitemapQuerySchema } from '../types/frontend.types';
import { sitemap } from '../controllers/frontend.controller';
import {
	verifyDocumentSchema,
	verifyDocumentGetSchema,
	verifyAadharSchema,
	verifyGstSchema,
	verifyDigilockerSchema,
} from '../types/verify.types';
import {
	verifyDocument,
	verifyAadhar,
	verifyGst,
	verifyDigilocker,
} from '../controllers/verify.controller';
import multer from 'multer';

const formData = multer().none();

const generalRoute = Router();

generalRoute.get("/employeeFilterDataList", employeeFilterDataList)
generalRoute.get("/work-status", allWorkType)
generalRoute.get("/employement-type", allEmploymentType)
generalRoute.get("/course-type", allCourseType)
generalRoute.get("/department", allDepartment)
generalRoute.get("/jobType", jobTypeList)
generalRoute.get("/all-skill", allSkill)
generalRoute.get("/city", validateData(cityQuerySchema), getAllCities);
generalRoute.get("/allcity/:stateId", validateData(cityByIdParamsSchema), getCityById);
generalRoute.get("/state", validateData(stateQuerySchema), getAllStates);
generalRoute.get("/countryList", countryListController);
generalRoute.get("/turnover", allturnover);
generalRoute.get("/companysize", allcompanysize)
generalRoute.get("/period_list", validateData(periodListQuerySchema), noticePeriodList)
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
generalRoute.get("/job-detail/:slug", validateData(jobDetailQuerySchema), job_detail)

generalRoute.get("/all-job", validateData(allJobQuerySchema), allJob)
generalRoute.get("/globalSearch", validateData(globalSearchQuerySchema), globalSearch)
generalRoute.get("/suggestion/:usertype/:keyword", validateData(searchSuggestionParamsSchema), searchSuggestion)
generalRoute.get("/ratingFilter", validateData(ratingFilterQuerySchema), ratingFilter)
generalRoute.get("/starRatingEmployies/:star", validateData(starRatingParamsSchema), starRatingEmployees)
generalRoute.get("/inviteDetail/:token", validateData(inviteDetailParamsSchema), inviteDetail)
generalRoute.get("/user-profile/:slug", validateData(userProfileParamsSchema), userProfile)
generalRoute.post("/add-suggestion", validateData(addSuggestionSchema), addSuggestion)

generalRoute.put("/markViewed/:id", Authorization, validateData(markViewedParamsSchema), markViewed)

generalRoute.get("/all-message-company", Authorization, validateData(allMessageListQuerySchema), allMessageList)
generalRoute.post("/send-message-company", Authorization, uploadToS3.single("doc"), validateData(addMessageSchema), addMessage)
generalRoute.put("/chatMessageReadCompany/:id", Authorization, validateData(chatMessageReadParamsSchema), chatMessageRead)
generalRoute.get("/company-followDataList", Authorization, validateData(followDataListQuerySchema), followDataList)
generalRoute.get("/company-verificationStatus", Authorization, verificationStatus)

// ====== New API Endpoints from Documentation ======

// Endpoint #1: Verify Auth Token
generalRoute.get("/verify-authtoken", Authorization, verifyAuthToken)
generalRoute.get("/doc-list/:id", Authorization, validateData(docListParamsSchema), allDocList)
generalRoute.get("/all-message", Authorization, allMessageListGeneral)
generalRoute.get("/all-notification", Authorization, allNotification)
generalRoute.get("/verificationStatus", Authorization, verificationStatusGeneral)
generalRoute.get("/followDataList", Authorization, followDataListGeneral)
generalRoute.post("/saveDocument", Authorization, validateData(saveDocumentSchema), saveDocument)
generalRoute.put("/allReadNotification", Authorization, allReadNotification)
generalRoute.put("/chatMessageRead/:id", Authorization, validateData(chatMessageReadIdParamsSchema), chatMessageReadGeneral)
generalRoute.delete("/unfollow/:id", Authorization, validateData(unfollowParamsSchema), unfollow)
generalRoute.delete("/removeFollower/:id", Authorization, validateData(removeFollowerParamsSchema), removeFollower)
generalRoute.post("/multi-remove-follower", Authorization, validateData(multiRemoveFollowerSchema), multiRemoveFollower)

// Remaining misc CRUD
generalRoute.post("/send-message", Authorization, uploadToS3.single("doc"), validateData(addMessageSchema), addMessage)
generalRoute.delete("/delete-message/:id", Authorization, validateData(deleteMessageParamsSchema), deleteMessage)
generalRoute.post("/follow", Authorization, validateData(followSchema), follow)
generalRoute.put("/acceptfollow/:id", Authorization, validateData(acceptFollowParamsSchema), acceptFollow)
generalRoute.delete("/rejectfollow/:id", Authorization, validateData(rejectFollowParamsSchema), rejectFollow)
generalRoute.get("/skill/:id", validateData(skillByCategoryParamsSchema), skillByCategory)
generalRoute.get("/company-profile/:slug", validateData(companyProfileParamsSchema), generalCompanyProfile)

// Frontend public: sitemap
generalRoute.get("/sitemap", validateData(sitemapQuerySchema), sitemap)

// ── KYC / document verify (JWT) — see verify.md ──
// GET + POST share verifyDocumentService
generalRoute.get("/verify-document", Authorization, validateData(verifyDocumentGetSchema), verifyDocument)
generalRoute.post("/verifyDocument", Authorization, formData, validateData(verifyDocumentSchema), verifyDocument)
generalRoute.post("/verifyAadhar", Authorization, formData, validateData(verifyAadharSchema), verifyAadhar)
generalRoute.post("/verifyGst", Authorization, formData, validateData(verifyGstSchema), verifyGst)
generalRoute.post("/verifyDigilocker", Authorization, formData, validateData(verifyDigilockerSchema), verifyDigilocker)

export default generalRoute;
