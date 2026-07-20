import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import type { PaginationQuery, ViewImpressionsBody } from "../types/widget.types";
import * as svc from "../services/widget.service";

function page(req: Request, defaultLimit = 10): PaginationQuery {
	const q = (req.validated as { query?: PaginationQuery } | undefined)?.query;
	return {
		limit: q?.limit ?? (Number(req.query.limit) || defaultLimit),
		offset: q?.offset ?? (Number(req.query.offset) || 0),
	};
}

function handle(fn: (req: Request) => Promise<unknown>) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			return res.status(200).json(await fn(req));
		} catch (e) {
			next(e);
		}
	};
}

const id = (req: Request) => (req.auth as AuthUser).id;

export const randomWidget = handle((req) => svc.randomWidgetService(id(req), false));
export const widgetDetail = handle((req) => {
	const slug =
		(req.validated as any)?.params?.slug ?? String(req.params.slug || "");
	return svc.widgetDetailService(id(req), slug, page(req, 20));
});

export const nearbyCompany = handle((req) => svc.nearbyCompanyService(id(req), page(req)));
export const nearbyEmployee = handle((req) => svc.nearbyEmployeeService(id(req), page(req)));
export const similarcompany = handle((req) => svc.similarCompanyService(id(req), page(req)));
export const peopleSimilarUniversity = handle((req) =>
	svc.peopleSimilarUniversityService(id(req), page(req))
);
export const userPastCompany = handle((req) => svc.userPastCompanyService(id(req), page(req)));
export const userCurrentCompany = handle((req) =>
	svc.userCurrentCompanyService(id(req), page(req))
);
export const similaremployee = handle((req) => svc.similarEmployeeService(id(req), page(req)));
export const featuredEmployee = handle((req) =>
	svc.featuredEmployeeService(id(req), page(req))
);
export const peopleMightKnow = handle((req) => svc.peopleMightKnowService(id(req), page(req)));
export const similarJob = handle((req) => svc.similarJobService(id(req), page(req)));
export const immediateJoiner = handle((req) => svc.immediateJoinerService(id(req), page(req)));
export const noticePeriod = handle((req) => svc.noticePeriodService(id(req), page(req)));
export const similarCompaniesCurrent = handle((req) =>
	svc.similarCompaniesCurrentService(id(req), page(req))
);
export const recommendedEmployeeGeneral = handle((req) =>
	svc.recommendedEmployeeGeneralService(id(req), page(req))
);
export const peopleRecentlyJoin = handle((req) =>
	svc.peopleRecentlyJoinService(id(req), page(req))
);
export const currentlyUnemployed = handle((req) =>
	svc.currentlyUnemployedService(id(req), page(req))
);
export const freshers = handle((req) => svc.freshersService(id(req), page(req)));
export const authAllJob = handle((req) => svc.authAllJobService(id(req), page(req), false));

export const viewImpressions = handle((req) => {
	const body =
		(req.validated as { body: ViewImpressionsBody } | undefined)?.body ??
		(req.body as ViewImpressionsBody);
	return svc.viewImpressionsService(id(req), body);
});

export const jobsImpressions = handle((req) => svc.jobsImpressionsService(id(req), page(req)));
export const peopleViewedProfile = handle((req) =>
	svc.peopleViewedProfileService(id(req), page(req))
);
export const companyViewedProfile = handle((req) =>
	svc.companyViewedProfileService(id(req), page(req))
);
export const detailsJobsImpressions = handle((req) => {
	const jobId =
		Number((req.validated as any)?.query?.job_id) ||
		Number(req.query.job_id) ||
		undefined;
	return svc.detailsJobsImpressionsService(id(req), jobId, page(req));
});
