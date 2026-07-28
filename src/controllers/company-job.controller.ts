import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import {
	AddJobRequest, AddJobUpdateCombined, AllJobQuery,
	JobIdParamsRequest, MultiCancelJobRequest, MultiJobStatusChangeRequest,
} from "../types/company-job.types";
import {
	allJobService, addJobService, jobStatusChangeService,
	deleteJobService, cancelJobService, jobDetailService,
	jobTemplateDetailService, jobTemplateService,
	multiCancelJobService, multiJobStatusChangeService,
} from "../services/company-job.service";

type UploadedFile = { location?: string };

function firstUploadedLocation(files: unknown): string | undefined {
	const list = files as UploadedFile[] | undefined;
	return list?.[0]?.location;
}

export async function allJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { query } = req.validated as AllJobQuery;
		const result = await allJobService(companyId, query);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function addJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { body } = req.validated as AddJobRequest;
		const result = await addJobService(companyId, body, firstUploadedLocation(req.files));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function addJobUpdate(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params, body } = req.validated as AddJobUpdateCombined;
		const result = await addJobService(
			companyId,
			{ ...body, id: params.id },
			firstUploadedLocation(req.files),
		);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function jobStatusChange(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params } = req.validated as JobIdParamsRequest;
		const result = await jobStatusChangeService(companyId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function deleteJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params } = req.validated as JobIdParamsRequest;
		const result = await deleteJobService(companyId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function cancelJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params } = req.validated as JobIdParamsRequest;
		const result = await cancelJobService(companyId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function jobDetail(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params } = req.validated as JobIdParamsRequest;
		const result = await jobDetailService(companyId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function jobTemplateDetail(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params } = req.validated as JobIdParamsRequest;
		const result = await jobTemplateDetailService(companyId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function jobTemplate(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const result = await jobTemplateService(companyId);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function multiCancelJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { body } = req.validated as MultiCancelJobRequest;
		const result = await multiCancelJobService(companyId, body.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function multiJobStatusChange(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { body } = req.validated as MultiJobStatusChangeRequest;
		const result = await multiJobStatusChangeService(companyId, body.id, body.status);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}
