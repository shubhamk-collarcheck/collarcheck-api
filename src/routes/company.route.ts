import { Router } from "express";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { sendUserProfileViewRequestSchema } from "../types/common-auth.types";
import { sendUserProfileViewRequest } from "../controllers/common-auth.controller";
import {
	editCompanySchema, allConnectionQuerySchema, updateEmploymentParamsSchema,
	addConnectionSchema, addWishlistSchema, deleteWishlistParamsSchema, addCompanyDocumentSchema,
} from "../types/company.types";
import {
	getCompanySetting, saveCompanySetting, editCompany, allConnection, allEmployment, updateEmployment, allWishlist,
	addConnection, addWishlist, deleteWishlist, addCompanyDocument,
} from "../controllers/company.controller";
import { addJobSchema, jobIdParamsSchema, allJobQuerySchema, multiCancelJobSchema, multiJobStatusChangeSchema, addJobUpdateSchema } from "../types/company-job.types";
import {
	allJob, addJob, addJobUpdate, jobStatusChange, deleteJob, cancelJob,
	jobDetail, jobTemplateDetail, jobTemplate,
	multiCancelJob, multiJobStatusChange,
} from "../controllers/company-job.controller";
import { educationUpload } from "../utils/educationUpload";
import { allReviewQuerySchema, addReviewSchema, reviewIdParamsSchema, viewReviewParamsSchema, addHelpSchema, allApplicationQuerySchema, updateBasicExperienceParamsSchema } from "../types/company-review.types";
import {
	allReview, addReview, addReviewUpdate, rejectReview, viewReviewDetail,
	addHelp, allApplication, updateBasicExperience,
} from "../controllers/company-review.controller";
import { addBenefitSchema, benefitIdParamsSchema, addGallerySchema, galleryIdParamsSchema } from "../types/company-benefit-gallery.types";
import {
	getBenefit, addBenefit, addBenefitUpdate, deleteBenefit,
	getGallery, addGallery, addGalleryUpdate, deleteGallery,
} from "../controllers/company-benefit-gallery.controller";
import { uploadToS3 } from "../utils/uploadToS3";
import {
	addEmployeeSchema, employeeDetailParamsSchema, rejectEmploymentParamsSchema, rejectPromotionParamsSchema, leaveExperienceSchema,
	reviewUniqueUserQuerySchema, validToReviewParamsSchema, followRequestListQuerySchema, companyDashboardQuerySchema,
	companyListQuerySchema, inviteCompanySchema, employmentRequestQuerySchema, revokeDeleteAccountSchema,
	rejectEmploymentCombinedSchema, rejectPromotionCombinedSchema, addEmployeeUpdateCombinedSchema,
} from "../types/company-employee-request.types";
import {
	companyDetail, addEmployee, addEmployeeUpdate, employeeDetail, rejectEmployment, rejectPromotion, leaveExperience,
	reviewUniqueUsers, validToReview, followRequestList, dashboard, sidebarCount, companyList,
	inviteCompany, employmentRequest, revokeDeleteAccount,
} from "../controllers/company-employee-request.controller";

import { companyRegisterSchema } from "../types/login.types";
import { companyRegister } from "../controllers/login.controller";
import multer from "multer";

const companyRouter = Router();

// multipart/form-data field parser (no files) for form-based register
const formData = multer().none();

// Company form register (JWT required)
companyRouter.post("/register", Authorization, formData, validateData(companyRegisterSchema), companyRegister);

companyRouter.post("/sendUserProfileViewRequest", Authorization, validateData(sendUserProfileViewRequestSchema), sendUserProfileViewRequest);

companyRouter.get("/getSetting", Authorization, getCompanySetting);
companyRouter.post("/saveSetting", Authorization, saveCompanySetting);
companyRouter.post("/edit-user", Authorization, educationUpload.array("profile"), validateData(editCompanySchema), editCompany);
companyRouter.get("/all-connection", Authorization, validateData(allConnectionQuerySchema), allConnection);
companyRouter.post("/add-connection", Authorization, validateData(addConnectionSchema), addConnection);
companyRouter.get("/all-employement", Authorization, allEmployment);
companyRouter.put("/update-employement/:id", Authorization, validateData(updateEmploymentParamsSchema), updateEmployment);
companyRouter.get("/all-wishlist", Authorization, allWishlist);
companyRouter.post("/add-wishlist", Authorization, validateData(addWishlistSchema), addWishlist);
companyRouter.delete("/delete-wishlist/:id", Authorization, validateData(deleteWishlistParamsSchema), deleteWishlist);
companyRouter.post("/add-document", Authorization, uploadToS3.array("document"), validateData(addCompanyDocumentSchema), addCompanyDocument);

companyRouter.get("/all-job", Authorization, validateData(allJobQuerySchema), allJob);
companyRouter.post("/add-job", Authorization, educationUpload.array("document"), validateData(addJobSchema), addJob);
companyRouter.post("/add-job/:id", Authorization, educationUpload.array("document"), validateData(addJobUpdateSchema), addJobUpdate);
companyRouter.put("/jobStatusChange/:id", Authorization, validateData(jobIdParamsSchema), jobStatusChange);
companyRouter.delete("/delete-job/:id", Authorization, validateData(jobIdParamsSchema), deleteJob);
companyRouter.delete("/cancel-job/:id", Authorization, validateData(jobIdParamsSchema), cancelJob);
companyRouter.get("/job-detail/:id", Authorization, validateData(jobIdParamsSchema), jobDetail);
companyRouter.get("/job-template-detail/:id", Authorization, validateData(jobIdParamsSchema), jobTemplateDetail);
companyRouter.get("/job-template", Authorization, jobTemplate);
companyRouter.post("/multi-cancel-job", Authorization, validateData(multiCancelJobSchema), multiCancelJob);
companyRouter.post("/multi-jobStatusChange", Authorization, validateData(multiJobStatusChangeSchema), multiJobStatusChange);

companyRouter.get("/all-review", Authorization, validateData(allReviewQuerySchema), allReview);
companyRouter.post("/add-review", Authorization, educationUpload.array("document"), validateData(addReviewSchema), addReview);
companyRouter.post("/add-review/:id", Authorization, educationUpload.array("document"), validateData(addReviewSchema), addReviewUpdate);
companyRouter.put("/rejectReview/:id", Authorization, validateData(reviewIdParamsSchema), rejectReview);
companyRouter.get("/view-review/:id", Authorization, validateData(viewReviewParamsSchema), viewReviewDetail);
companyRouter.post("/add-help", Authorization, validateData(addHelpSchema), addHelp);
companyRouter.get("/allapplication", Authorization, validateData(allApplicationQuerySchema), allApplication);
companyRouter.put("/updateBasicExperience/:id", Authorization, validateData(updateBasicExperienceParamsSchema), updateBasicExperience);

companyRouter.get("/benefit", Authorization, getBenefit);
companyRouter.post("/addBenafit", Authorization, validateData(addBenefitSchema), addBenefit);
companyRouter.post("/addBenafit/:id", Authorization, validateData(addBenefitSchema), addBenefitUpdate);
companyRouter.delete("/deleteBenafit/:id", Authorization, validateData(benefitIdParamsSchema), deleteBenefit);

companyRouter.get("/gallery", Authorization, getGallery);
companyRouter.post("/addGallery", Authorization, uploadToS3.array("file"), addGallery);
companyRouter.post("/addGallery/:id", Authorization, uploadToS3.array("file"), addGalleryUpdate);
companyRouter.delete("/deleteGallery/:id", Authorization, validateData(galleryIdParamsSchema), deleteGallery);

companyRouter.post("/addEmployee", Authorization, validateData(addEmployeeSchema), addEmployee);
companyRouter.post("/addEmployee/:id", Authorization, validateData(addEmployeeUpdateCombinedSchema), addEmployeeUpdate);
companyRouter.get("/employeeDetail/:id", Authorization, validateData(employeeDetailParamsSchema), employeeDetail);
companyRouter.put("/rejectEmployement/:id", Authorization, validateData(rejectEmploymentCombinedSchema), rejectEmployment);
companyRouter.delete("/rejectPromotion/:id", Authorization, validateData(rejectPromotionCombinedSchema), rejectPromotion);
companyRouter.post("/leaveExperience", Authorization, validateData(leaveExperienceSchema), leaveExperience);
companyRouter.get("/reviewUniqueUsers", Authorization, validateData(reviewUniqueUserQuerySchema), reviewUniqueUsers);
companyRouter.get("/validToReview/:id", Authorization, validateData(validToReviewParamsSchema), validToReview);
companyRouter.get("/followRequestList", Authorization, validateData(followRequestListQuerySchema), followRequestList);
companyRouter.get("/dashboard", Authorization, validateData(companyDashboardQuerySchema), dashboard);
companyRouter.get("/sidebar-count", Authorization, sidebarCount);
companyRouter.get("/employement-request", Authorization, validateData(employmentRequestQuerySchema), employmentRequest);
companyRouter.post("/add-company", Authorization, educationUpload.single("profile"), validateData(inviteCompanySchema), inviteCompany);
companyRouter.post("/add-company/:id", Authorization, educationUpload.single("profile"), validateData(inviteCompanySchema), inviteCompany);
companyRouter.get("/user-detail", Authorization, companyDetail);
companyRouter.post("/invite-company", Authorization, educationUpload.single("profile"), validateData(inviteCompanySchema), inviteCompany);
companyRouter.post("/revoke-delete-account", Authorization, validateData(revokeDeleteAccountSchema), revokeDeleteAccount);

export default companyRouter;
