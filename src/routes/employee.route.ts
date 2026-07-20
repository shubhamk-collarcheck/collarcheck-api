
import { Router } from "express";
import { Authorization } from "../middlewares/Authorization"
import { addExperience, allExperience, allEmployementNew, deleteExperience, detailExperience, updateExperience } from "../controllers/employee.controller";
import { validateData } from "../middlewares/validation.middleware";
import { employmentRequestSchema } from "../types/employee.types";
import { uploadToS3 } from "../utils/uploadToS3";
import { commonIdParamsSchema } from "../utils/validation";
import { addEducation, allEducationList, deleteEducation, educationDetail, updateEducation } from "../controllers/education.controller";
import { educationParamsSchema, educationRequestSchema } from "../types/education.types";
import { educationUpload } from "../utils/educationUpload";
import { addSkill, allSkill, deleteSkill } from "../controllers/skill.controller";
import { skillRequestSchema } from "../types/skill.types";
import { portfolioRequestSchema, portfolioUpdateRequestSchema } from "../types/portfolio.types";
import { addPortfolio, allPortfolioList, deletePortfolio, portfolioDetail, updatePortfolio } from "../controllers/portfolio.controller";
import { certificateRequestSchema, certificateUpdateRequestSchema } from "../types/certificate.types";
import { addCertificate, allCertificateList, certificateDetail, deleteCertificate, updateCertificate } from "../controllers/certificate.controller";
import { documentRequestSchema, documentDeleteRequestSchema } from "../types/document.types";
import { addDocument, allDocumentList, deleteDocument, documentDetail } from "../controllers/document.controller";
import { languageRequestSchema, languageDeleteRequestSchema } from "../types/language.types";
import { addLanguage, allLanguageList, deleteLanguage, languageDetail } from "../controllers/language.controller";
import { reviewRequestSchema, reviewUpdateRequestSchema, reviewRemoveDocumentQuerySchema, showHomeReviewRequestSchema, changeEmploymentBasicRequestSchema, editUserRequestSchema } from "../types/profile-review.types";
import { currentCompany, addReview, updateReview, deleteReview, reviewRemoveDocument, showHomeReview, editUser, changeEmploymentBasic } from "../controllers/profile-review.controller";
import { companyInviteRequestSchema } from "../types/company-invite.types";
import { sendCompanyInvite } from "../controllers/company-invite.controller";
import { applyJobSchema, approvedEmploymentSchema, approvedViewRequestSchema, viewRequestIdSchema, paginationQuerySchema, checkCurrentCompanySchema } from "../types/job-dashboard.types";
import { applyJob, applyJobList, profilePercentage, approvedEmployment, allViewRequest, approvedVeiwRequest, rejectVeiwRequest, deleteViewRequest, checkCurrentCompany, dashboard, appliedjob, removeResume } from "../controllers/job-dashboard.controller";
import { saveExploringSchema, allCompanyQuerySchema, editProfileSchema } from "../types/misc.types";
import { sidebarCount, leaveReminderExperience, saveExploring, cvDetails, editProfile, allCompany, userDetail } from "../controllers/misc.controller";
import { removeNotificationBodySchema, allUserQuerySchema } from "../types/general.types";
import { removeNotificationByBody } from "../controllers/general.controller";
import { allUser } from "../controllers/misc.controller";
import {
	employeeRegisterSchema,
	employeeSignupSchema,
	finalSignupSchema,
	uploadResumeSchema,
} from "../types/login.types";
import {
	employeeRegister,
	employeeSignup,
	finalSignup,
	uploadResume,
} from "../controllers/login.controller";
import { resumeUpload } from "../utils/resumeUpload";
import multer from "multer";


const employRouter = Router()

// multipart/form-data field parser (no files) for form-based auth endpoints
const formData = multer().none();

// Login / registration (public; final-signup + upload-resume use body user_id)
employRouter.post("/register", formData, validateData(employeeRegisterSchema), employeeRegister);
employRouter.post("/signup", formData, validateData(employeeSignupSchema), employeeSignup);
employRouter.post("/final-signup",
	educationUpload.fields([
		{ name: "resume", maxCount: 1 },
		{ name: "profile", maxCount: 1 },
		{ name: "document", maxCount: 5 },
	]),
	validateData(finalSignupSchema),
	finalSignup
);
employRouter.post("/upload-resume", resumeUpload.single("resume"), validateData(uploadResumeSchema), uploadResume);

employRouter.post("/add-employement", Authorization, uploadToS3.array("file"), validateData(employmentRequestSchema), addExperience)
employRouter.post("/add-employement/:employment_id", Authorization, uploadToS3.array("file"), validateData(employmentRequestSchema), updateExperience)
employRouter.get("/all-employement", Authorization, allExperience)
employRouter.get("/allEmployementNew", Authorization, allEmployementNew)
employRouter.get("/employement-detail/:id", Authorization, validateData(commonIdParamsSchema), detailExperience)
employRouter.delete("/delete-employement/:id", Authorization, validateData(commonIdParamsSchema), deleteExperience)


employRouter.get("/all-education", Authorization, allEducationList)
employRouter.get("/education-detail/:id", Authorization, validateData(commonIdParamsSchema), educationDetail)
employRouter.post("/add-education", Authorization, educationUpload.array("document"), validateData(educationRequestSchema), addEducation)
employRouter.post("/add-education/:id", Authorization, educationUpload.array("document"), validateData(educationRequestSchema), updateEducation)
employRouter.delete("/delete-education/:id", Authorization, validateData(commonIdParamsSchema), deleteEducation)

employRouter.get("/all-skill", Authorization, allSkill)
employRouter.delete("/delete-skill/:id", Authorization, validateData(commonIdParamsSchema), deleteSkill)
employRouter.post("/add-skill", Authorization, validateData(skillRequestSchema), addSkill)

employRouter.post("/add-portfolio", Authorization, uploadToS3.single("file"), validateData(portfolioRequestSchema), addPortfolio)
employRouter.post("/add-portfolio/:id", Authorization, uploadToS3.single("file"), validateData(portfolioUpdateRequestSchema), updatePortfolio)
employRouter.get("/all-portfolio", Authorization, allPortfolioList)
employRouter.get("/portfolio-detail/:id", Authorization, validateData(commonIdParamsSchema), portfolioDetail)
employRouter.delete("/delete-portfolio/:id", Authorization, validateData(commonIdParamsSchema), deletePortfolio)

employRouter.get("/all-certificate", Authorization, allCertificateList)
employRouter.get("/certificate-detail/:id", Authorization, validateData(commonIdParamsSchema), certificateDetail)
employRouter.post("/add-certificate", Authorization, educationUpload.array("document"), validateData(certificateRequestSchema), addCertificate)
employRouter.post("/add-certificate/:id", Authorization, educationUpload.array("document"), validateData(certificateUpdateRequestSchema), updateCertificate)
employRouter.delete("/delete-certificate/:id", Authorization, validateData(commonIdParamsSchema), deleteCertificate)

employRouter.post("/add-document", Authorization, educationUpload.array("document"), validateData(documentRequestSchema), addDocument)
employRouter.get("/all-document", Authorization, allDocumentList)
employRouter.get("/document-detail/:id", Authorization, validateData(commonIdParamsSchema), documentDetail)
employRouter.delete("/delete-document/:id", Authorization, validateData(commonIdParamsSchema), deleteDocument)

employRouter.post("/add_language", Authorization, validateData(languageRequestSchema), addLanguage)
employRouter.get("/allLanguage", Authorization, allLanguageList)
employRouter.get("/language-detail/:id", Authorization, validateData(commonIdParamsSchema), languageDetail)
employRouter.delete("/language/:id", Authorization, validateData(commonIdParamsSchema), deleteLanguage)

employRouter.get("/currentCompany", Authorization, currentCompany)
employRouter.post("/sendCompanyInvite", Authorization, validateData(companyInviteRequestSchema), sendCompanyInvite)
employRouter.post("/add-review", Authorization, educationUpload.array("document"), validateData(reviewRequestSchema), addReview)
employRouter.post("/add-review/:id", Authorization, educationUpload.array("document"), validateData(reviewUpdateRequestSchema), updateReview)
employRouter.delete("/deleteReview/:id", Authorization, validateData(commonIdParamsSchema), deleteReview)
employRouter.get("/reviewRemoveDocument", Authorization, validateData(reviewRemoveDocumentQuerySchema), reviewRemoveDocument)
employRouter.put("/show-home-review/:id", Authorization, validateData(showHomeReviewRequestSchema), showHomeReview)
employRouter.post("/edit-user", Authorization, educationUpload.array("document"), validateData(editUserRequestSchema), editUser)
employRouter.post("/changeEmploymentBasic", Authorization, validateData(changeEmploymentBasicRequestSchema), changeEmploymentBasic)

employRouter.post("/apply-job", Authorization, validateData(applyJobSchema), applyJob)
employRouter.get("/applyJobList", Authorization, applyJobList)
employRouter.get("/appliedjob", Authorization, validateData(paginationQuerySchema), appliedjob)
employRouter.get("/ProfilePercentage", Authorization, profilePercentage)
employRouter.put("/approvedEmployment/:id", Authorization, validateData(approvedEmploymentSchema), approvedEmployment)
employRouter.get("/AllViewRequest", Authorization, validateData(paginationQuerySchema), allViewRequest)
employRouter.post("/approvedVeiwRequest", Authorization, validateData(approvedViewRequestSchema), approvedVeiwRequest)
employRouter.put("/rejectVeiwRequest/:id", Authorization, validateData(viewRequestIdSchema), rejectVeiwRequest)
employRouter.delete("/deleteViewRequest/:id", Authorization, validateData(viewRequestIdSchema), deleteViewRequest)
employRouter.get("/checkCurrentCompany", Authorization, validateData(checkCurrentCompanySchema), checkCurrentCompany)
employRouter.get("/dashboard", Authorization, dashboard)
employRouter.delete("/remove-resume", Authorization, removeResume)

employRouter.get("/sidebar-count", Authorization, sidebarCount)
employRouter.post("/leave-reminder-experience", Authorization, leaveReminderExperience)
employRouter.post("/save-exploring", Authorization, validateData(saveExploringSchema), saveExploring)
employRouter.get("/cv-details", Authorization, cvDetails)
employRouter.post("/edit-profile", Authorization, validateData(editProfileSchema), editProfile)
employRouter.get("/all-company", Authorization, validateData(allCompanyQuerySchema), allCompany)
employRouter.get("/user-detail", Authorization, userDetail)

// PHP: DELETE employee/removeNotification
employRouter.delete("/removeNotification", Authorization, validateData(removeNotificationBodySchema), removeNotificationByBody)

// GET employee/all-user
employRouter.get("/all-user", Authorization, validateData(allUserQuerySchema), allUser)

export default employRouter;
