import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import type { PaginationQuery, ViewImpressionsBody } from "../types/widget.types";
import * as svc from "../services/widget.service";

function pageQuery(req: Request, defaultLimit = 10): PaginationQuery {
	const q = (req.validated as { query?: PaginationQuery } | undefined)?.query;
	return {
		limit: q?.limit ?? (Number(req.query.limit) || defaultLimit),
		offset: q?.offset ?? (Number(req.query.offset) || 0),
	};
}

export const randomWidget = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.randomWidgetService(id, false);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const widgetDetail = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const slug =
			(req.validated as { params?: { slug?: string } } | undefined)?.params?.slug ??
			String(req.params.slug || "");
		const result = await svc.widgetDetailService(id, slug, pageQuery(req, 20));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const nearbyCompany = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.nearbyCompanyService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const nearbyEmployee = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.nearbyEmployeeService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const similarcompany = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.similarCompanyService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const peopleSimilarUniversity = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.peopleSimilarUniversityService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const userPastCompany = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.userPastCompanyService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const userCurrentCompany = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.userCurrentCompanyService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const similaremployee = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.similarEmployeeService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const featuredEmployee = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.featuredEmployeeService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const peopleMightKnow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.peopleMightKnowService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const similarJob = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.similarJobService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const immediateJoiner = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.immediateJoinerService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const noticePeriod = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.noticePeriodService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const similarCompaniesCurrent = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.similarCompaniesCurrentService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const recommendedEmployeeGeneral = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.recommendedEmployeeGeneralService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const peopleRecentlyJoin = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.peopleRecentlyJoinService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const currentlyUnemployed = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.currentlyUnemployedService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const freshers = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.freshersService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const authAllJob = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.authAllJobService(id, pageQuery(req), false);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const viewImpressions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const body =
			(req.validated as { body: ViewImpressionsBody } | undefined)?.body ??
			(req.body as ViewImpressionsBody);
		const result = await svc.viewImpressionsService(id, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const jobsImpressions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.jobsImpressionsService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const peopleViewedProfile = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.peopleViewedProfileService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const companyViewedProfile = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const result = await svc.companyViewedProfileService(id, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const detailsJobsImpressions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.auth as AuthUser;
		const jobId =
			Number((req.validated as { query?: { job_id?: number } } | undefined)?.query?.job_id) ||
			Number(req.query.job_id) ||
			undefined;
		const result = await svc.detailsJobsImpressionsService(id, jobId, pageQuery(req));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};
