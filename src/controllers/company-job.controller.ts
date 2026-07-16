import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import {
	AddJobBody, JobIdParams, AllJobQuery, AddJobUpdateCombined,
	MultiCancelJobBody, MultiJobStatusChangeBody,
} from "../types/company-job.types";
import {
	allJobService, addJobService, jobStatusChangeService,
	deleteJobService, cancelJobService, jobDetailService,
	jobTemplateDetailService, jobTemplateService,
	multiCancelJobService, multiJobStatusChangeService,
} from "../services/company-job.service";

export async function allJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { query } = req.validated as { query: AllJobQuery };
		const keyword = query.keyword || '';
		const limit = query.limit || 20;
		const offset = query.offset || 0;
		const result = await allJobService(user_id, keyword, limit, offset);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function addJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as { body: AddJobBody };
		const files = req.files as any[] | undefined;
		const jobDocPath = files?.[0]?.location;
		const result = await addJobService(user_id, body, jobDocPath);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function addJobUpdate(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params, body } = req.validated as AddJobUpdateCombined;
		const files = req.files as any[] | undefined;
		const jobDocPath = files?.[0]?.location;
		body.id = params.id;
		const result = await addJobService(user_id, body, jobDocPath);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function jobStatusChange(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as { params: JobIdParams };
		const result = await jobStatusChangeService(user_id, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function deleteJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as { params: JobIdParams };
		const result = await deleteJobService(user_id, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function cancelJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as { params: JobIdParams };
		const result = await cancelJobService(user_id, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function jobDetail(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as { params: JobIdParams };
		const result = await jobDetailService(user_id, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function jobTemplateDetail(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as { params: { id: number } };
		const result = await jobTemplateDetailService(user_id, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function jobTemplate(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await jobTemplateService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function multiCancelJob(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as { body: MultiCancelJobBody };
		const result = await multiCancelJobService(user_id, body.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function multiJobStatusChange(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as { body: MultiJobStatusChangeBody };
		const result = await multiJobStatusChangeService(user_id, body.id, body.status);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}
