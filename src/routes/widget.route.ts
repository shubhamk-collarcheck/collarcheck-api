import { Router } from "express";
import multer from "multer";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import {
	paginationQuerySchema,
	widgetDetailParamsSchema,
	viewImpressionsSchema,
	detailsJobsImpressionsQuerySchema,
} from "../types/widget.types";
import * as c from "../controllers/widget.controller";

const widgetRouter = Router();
const formData = multer().none();

widgetRouter.use(Authorization);

// Orchestration
widgetRouter.get("/random-widget", c.randomWidget);
widgetRouter.get("/widget-detail/:slug", validateData(widgetDetailParamsSchema), c.widgetDetail);

// Discovery lists
widgetRouter.get("/nearby-company", validateData(paginationQuerySchema), c.nearbyCompany);
widgetRouter.get("/nearby-employee", validateData(paginationQuerySchema), c.nearbyEmployee);
widgetRouter.get("/similarcompany", validateData(paginationQuerySchema), c.similarcompany);
widgetRouter.get("/people-similar-university", validateData(paginationQuerySchema), c.peopleSimilarUniversity);
widgetRouter.get("/user-past-company", validateData(paginationQuerySchema), c.userPastCompany);
widgetRouter.get("/user-current-company", validateData(paginationQuerySchema), c.userCurrentCompany);
widgetRouter.get("/similaremployee", validateData(paginationQuerySchema), c.similaremployee);
widgetRouter.get("/featured-employee", validateData(paginationQuerySchema), c.featuredEmployee);
widgetRouter.get("/people-might-know", validateData(paginationQuerySchema), c.peopleMightKnow);
widgetRouter.get("/similar-job", validateData(paginationQuerySchema), c.similarJob);
widgetRouter.get("/immediate-joiner", validateData(paginationQuerySchema), c.immediateJoiner);
widgetRouter.get("/notice-period", validateData(paginationQuerySchema), c.noticePeriod);
widgetRouter.get("/similar-companies-current", validateData(paginationQuerySchema), c.similarCompaniesCurrent);
widgetRouter.get("/recommended-employee-general", validateData(paginationQuerySchema), c.recommendedEmployeeGeneral);
widgetRouter.get("/people-recentaly-join", validateData(paginationQuerySchema), c.peopleRecentlyJoin);
widgetRouter.get("/currentaly-unemployed", validateData(paginationQuerySchema), c.currentlyUnemployed);
widgetRouter.get("/freshers", validateData(paginationQuerySchema), c.freshers);
widgetRouter.get("/auth-all-job", validateData(paginationQuerySchema), c.authAllJob);

// Impressions
widgetRouter.post("/view-impressions", formData, validateData(viewImpressionsSchema), c.viewImpressions);
widgetRouter.get("/jobs-impressions", validateData(paginationQuerySchema), c.jobsImpressions);
widgetRouter.get("/people-viewed-profile", validateData(paginationQuerySchema), c.peopleViewedProfile);
widgetRouter.get("/company-viewed-profile", validateData(paginationQuerySchema), c.companyViewedProfile);
widgetRouter.get("/details-jobs-impressions", validateData(detailsJobsImpressionsQuerySchema), c.detailsJobsImpressions);

export default widgetRouter;
