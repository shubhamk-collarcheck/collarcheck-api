import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import type {
	CreateUserGroupBody,
	AssignPermissionBody,
	SendOtpMergeBody,
	VerifyOtpMergeBody,
	MergeUserRegisterBody,
	AiGenerateRowBody,
} from "../types/account-migration.types";
import * as svc from "../services/account-migration.service";

export const createUserGroup = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId, user_id: loginUserId, user_type: userType } = req.auth as AuthUser;
		const { body } = req.validated as { body: CreateUserGroupBody };
		const id = req.params.id ? Number(req.params.id) : undefined;
		const result = await svc.createUserGroupService(companyId, loginUserId, userType, body, id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const assignUserPermission = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId, user_id: loginUserId, user_type: userType } = req.auth as AuthUser;
		const { body } = req.validated as { body: AssignPermissionBody };
		const id = req.params.id ? Number(req.params.id) : undefined;
		const result = await svc.assignUserPermissionService(companyId, loginUserId, userType, body, id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const menuEventList = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.menuEventListService();
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const userGroupList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const result = await svc.userGroupListService(companyId);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const groupUserList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const limit = Number(req.query.limit) || 50;
		const offset = Number(req.query.offset) || 0;
		const result = await svc.groupUserListService(companyId, limit, offset);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const userPermissionList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const company = req.query.company != null ? Number(req.query.company) : undefined;
		const result = await svc.userPermissionListService(companyId, company);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const editUserPermission = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.editUserPermissionService(Number(req.params.id));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const removePermission = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId, user_id: loginUserId } = req.auth as AuthUser;
		const body = (req.validated as { body?: { permission_id?: number[] } } | undefined)?.body || req.body;
		const ids = body.permission_id || [];
		const result = await svc.removePermissionService(companyId, loginUserId, ids);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const allRoleGroup = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const limit = Number(req.query.limit) || 10;
		const offset = Number(req.query.offset) || 0;
		const result = await svc.allRoleGroupService(companyId, limit, offset);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const editGroupRole = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.editGroupRoleService(Number(req.params.id));
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const removeGroupRole = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const body = (req.validated as { body?: { user_group_id?: number[] } } | undefined)?.body || req.body;
		const result = await svc.removeGroupRoleService(companyId, body.user_group_id || []);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const checkip = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const ip =
			(req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
			req.socket.remoteAddress ||
			"";
		const result = await svc.checkIpService(ip);
		if (typeof result === "string") {
			return res.status(200).send(result);
		}
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const doctypeList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_type: userType } = req.auth as AuthUser;
		const result = await svc.doctypeListService(userType);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const sendOtpAccountMerge = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId, user_type: userType } = req.auth as AuthUser;
		const { body } = req.validated as { body: SendOtpMergeBody };
		const result = await svc.sendOtpAccountMergeService(companyId, userType, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const otpVerifyAccountMerge = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId, user_type: userType, token } = req.auth as AuthUser;
		const { body } = req.validated as { body: VerifyOtpMergeBody };
		const result = await svc.otpVerifyAccountMergeService(companyId, userType, body, token);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const mergeUserRegister = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id: companyId, user_type: userType, token } = req.auth as AuthUser;
		const { body } = req.validated as { body: MergeUserRegisterBody };
		const result = await svc.mergeUserRegisterService(companyId, userType, body, token);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const aiGenerateRow = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const body =
			(req.validated as { body: AiGenerateRowBody } | undefined)?.body ||
			(req.body as AiGenerateRowBody);
		const result = await svc.aiGenerateRowService(body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const revokeDeleteAccount = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id: loginUserId } = req.auth as AuthUser;
		const result = await svc.revokeDeleteAccountService(loginUserId);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const digilocker = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.digilockerService();
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const nonclaimCompany = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.nonclaimCompanyService();
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const defaultUserList = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await svc.defaultUserListService();
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const switchAccount = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		return res.status(200).json({ status: false, messages: "Not implemented" });
	} catch (error) {
		next(error);
	}
};

export const reminderVerificationPending = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		return res.status(200).json({ status: false, messages: "Not implemented" });
	} catch (error) {
		next(error);
	}
};
