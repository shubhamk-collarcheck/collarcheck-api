
import { Router } from "express";
import { Authorization } from "../middlewares/Authorization"
import { addExperience, allExperience, deleteExperience, detailExperience, updateExperience } from "../controllers/employee.controller";
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


const employRouter = Router()

employRouter.post("/add-employment", Authorization, uploadToS3.array("file"), validateData(employmentRequestSchema), addExperience)
employRouter.post("/add-employment/:employment_id", Authorization, uploadToS3.array("file"), validateData(employmentRequestSchema), updateExperience)
employRouter.get("/all-employement", Authorization, allExperience)
employRouter.get("/employement-detail/:id", Authorization, validateData(commonIdParamsSchema), detailExperience)
//todo
// employRouter.get('/allEmployementNew', 'IndividualApi::allEmployementNew');
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

employRouter.post("/add-language", Authorization, validateData(languageRequestSchema), addLanguage)
employRouter.get("/all-language", Authorization, allLanguageList)
employRouter.get("/language-detail/:id", Authorization, validateData(commonIdParamsSchema), languageDetail)
employRouter.delete("/delete-language/:id", Authorization, validateData(commonIdParamsSchema), deleteLanguage)

employRouter.get("/currentCompany", Authorization, currentCompany)
employRouter.post("/sendCompanyInvite", Authorization, validateData(companyInviteRequestSchema), sendCompanyInvite)
employRouter.post("/add-review", Authorization, educationUpload.array("document"), validateData(reviewRequestSchema), addReview)
employRouter.post("/add-review/:id", Authorization, educationUpload.array("document"), validateData(reviewUpdateRequestSchema), updateReview)
employRouter.delete("/deleteReview/:id", Authorization, validateData(commonIdParamsSchema), deleteReview)
employRouter.get("/reviewRemoveDocument", Authorization, validateData(reviewRemoveDocumentQuerySchema), reviewRemoveDocument)
employRouter.put("/show-home-review/:id", Authorization, validateData(showHomeReviewRequestSchema), showHomeReview)
employRouter.post("/edit-user", Authorization, educationUpload.array("document"), validateData(editUserRequestSchema), editUser)
employRouter.post("/changeEmploymentBasic", Authorization, validateData(changeEmploymentBasicRequestSchema), changeEmploymentBasic)





export default employRouter;
