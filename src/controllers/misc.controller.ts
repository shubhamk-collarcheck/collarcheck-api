import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import {
	MarkViewedParams, SaveExploringBody, AllCompanyQuery, EditProfileBody,
} from "../types/misc.types";
import {
	markViewedService, sidebarCountService, leaveReminderExperienceService,
	hiredService, saveExploringService, cvDetailsService,
	editProfileService, allCompanyService, userDetailService,
	companyProfileService, allUserService,
} from "../services/misc.service";
import { AllUserQuery } from "../types/general.types";

export async function markViewed(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as { params: MarkViewedParams };
		const result = await markViewedService(user_id, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function sidebarCount(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await sidebarCountService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function leaveReminderExperience(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await leaveReminderExperienceService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function hired(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await hiredService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function saveExploring(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as { body: SaveExploringBody };
		const result = await saveExploringService(user_id, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function cvDetails(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await cvDetailsService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function editProfile(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as { body: EditProfileBody };
		const result = await editProfileService(user_id, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function allCompany(req: Request, res: Response, next: NextFunction) {
	try {
		const { query } = req.validated as { query: AllCompanyQuery };
		const keyword = query.search || '';
		const limit = query.limit || 10;
		const offset = query.page !== undefined
			? query.page * limit
			: (query.offset || 0);
		const total = query.total || 0;
		const result = await allCompanyService(keyword, limit, offset, total);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function userDetail(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id, token } = req.auth as AuthUser;
		const result = await userDetailService(user_id, token);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function companyProfile(req: Request, res: Response, next: NextFunction) {
	try {
		const slug = req.params.slug as string;
		const viewerId = (req.auth as AuthUser | undefined)?.id;
		const result = await companyProfileService(slug, { viewerId, isPublic: !viewerId });
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function authCompanyProfile(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: viewerId } = req.auth as AuthUser;
		const slug = req.params.slug as string;
		const result = await companyProfileService(slug, { viewerId, isPublic: false });
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function allUser(req: Request, res: Response, next: NextFunction) {
	try {
		const { query } = (req.validated as { query: AllUserQuery }) || { query: req.query as any };
		const result = await allUserService(query.keyword, query.limit ?? 10, query.offset ?? 0);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}
