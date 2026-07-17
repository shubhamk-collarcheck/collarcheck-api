import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import {
	ApplyJobBody, ApprovedEmploymentParams, ApprovedViewRequestBody,
	PaginationQuery, CheckCurrentCompanyQuery,
} from "../types/job-dashboard.types";
import {
	applyJobService, applyJobListService, profilePercentageService,
	approvedEmploymentService, allViewRequestService, approvedVeiwRequestService,
	rejectVeiwRequestService, deleteViewRequestService, checkCurrentCompanyService,
	dashboardService, appliedjobService, removeResumeService,
	multiDeleteViewRequestService, multiApprovedVeiwRequestService,
} from "../services/job-dashboard.service";

export async function applyJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as { body: ApplyJobBody };
		const result = await applyJobService(user_id, body.job);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function applyJobList(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await applyJobListService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function profilePercentage(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await profilePercentageService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function approvedEmployment(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as { params: ApprovedEmploymentParams };
		const result = await approvedEmploymentService(user_id, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function allViewRequest(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { query } = req.validated as { query: PaginationQuery };
		const limit = query.limit || 15;
		const offset = ((query.offset || 1) - 1) * limit;
		const result = await allViewRequestService(user_id, limit, offset);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function approvedVeiwRequest(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as { body: ApprovedViewRequestBody };
		const result = await approvedVeiwRequestService(user_id, body.id, body.access, body.day);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function rejectVeiwRequest(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as { params: { id: number } };
		const result = await rejectVeiwRequestService(user_id, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function deleteViewRequest(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as { params: { id: number } };
		const result = await deleteViewRequestService(user_id, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function multiDeleteViewRequest(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as { body: { id: number[] } };
		const result = await multiDeleteViewRequestService(user_id, body.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function multiApprovedVeiwRequest(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as {
			body: { id: number; access?: string | string[] | Record<string, number>; day?: number }
		};
		const result = await multiApprovedVeiwRequestService(user_id, body.id, body.access, body.day);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function checkCurrentCompany(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { query } = req.validated as { query: CheckCurrentCompanyQuery };
		const result = await checkCurrentCompanyService(user_id, query.employment_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function dashboard(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await dashboardService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function appliedjob(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { query } = req.validated as { query: PaginationQuery };
		const limit = query.limit || 16;
		const offset = ((query.offset || 1) - 1) * limit;
		const result = await appliedjobService(user_id, limit, offset);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function removeResume(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await removeResumeService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}
