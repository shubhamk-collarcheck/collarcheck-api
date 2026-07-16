import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import {
	SendUserProfileViewRequestBody, AuthUserProfileParams, PeopleListQuery,
} from "../types/common-auth.types";
import {
	getSettingService, saveSettingService, authUserProfileService,
	sendUserProfileViewRequestService, peopleListService,
} from "../services/common-auth.service";

export async function getSetting(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await getSettingService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function saveSetting(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await saveSettingService(user_id, req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function authUserProfile(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id, user_type } = req.auth as AuthUser;
		const { params } = req.validated as { params: AuthUserProfileParams };
		const result = await authUserProfileService(params.slug, user_id, user_type || 0);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function sendUserProfileViewRequest(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id, user_type } = req.auth as AuthUser;
		const { body } = req.validated as { body: SendUserProfileViewRequestBody };
		const result = await sendUserProfileViewRequestService(user_id, user_type || 0, body.userid);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function peopleList(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await peopleListService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}
