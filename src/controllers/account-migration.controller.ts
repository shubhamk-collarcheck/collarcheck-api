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

function handle(fn: (req: Request) => Promise<unknown>) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const result = await fn(req);
			// checkip may return a raw string
			if (typeof result === "string") {
				return res.status(200).send(result);
			}
			return res.status(200).json(result);
		} catch (e) {
			next(e);
		}
	};
}

function companyId(req: Request) {
	return (req.auth as AuthUser).id;
}
function loginUserId(req: Request) {
	return (req.auth as AuthUser).user_id;
}
function userType(req: Request) {
	return (req.auth as AuthUser).user_type;
}

export const createUserGroup = handle((req) => {
	const { body } = req.validated as { body: CreateUserGroupBody };
	const id = Number(req.params.id) || undefined;
	return svc.createUserGroupService(
		companyId(req),
		loginUserId(req),
		userType(req),
		body,
		id
	);
});

export const assignUserPermission = handle((req) => {
	const { body } = req.validated as { body: AssignPermissionBody };
	const id = Number(req.params.id) || undefined;
	return svc.assignUserPermissionService(
		companyId(req),
		loginUserId(req),
		userType(req),
		body,
		id
	);
});

export const menuEventList = handle(() => svc.menuEventListService());

export const userGroupList = handle((req) =>
	svc.userGroupListService(companyId(req))
);

export const groupUserList = handle((req) => {
	const limit = Number(req.query.limit) || 50;
	const offset = Number(req.query.offset) || 0;
	return svc.groupUserListService(companyId(req), limit, offset);
});

export const userPermissionList = handle((req) => {
	const company = Number(req.query.company) || undefined;
	return svc.userPermissionListService(companyId(req), company);
});

export const editUserPermission = handle((req) =>
	svc.editUserPermissionService(Number(req.params.id))
);

export const removePermission = handle((req) => {
	const body = (req.validated as any)?.body || req.body;
	const ids = body.permission_id || [];
	return svc.removePermissionService(companyId(req), loginUserId(req), ids);
});

export const allRoleGroup = handle((req) => {
	const limit = Number(req.query.limit) || 10;
	const offset = Number(req.query.offset) || 0;
	return svc.allRoleGroupService(companyId(req), limit, offset);
});

export const editGroupRole = handle((req) =>
	svc.editGroupRoleService(Number(req.params.id))
);

export const removeGroupRole = handle((req) => {
	const body = (req.validated as any)?.body || req.body;
	return svc.removeGroupRoleService(companyId(req), body.user_group_id || []);
});

export const checkip = handle((req) => {
	const ip =
		(req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
		req.socket.remoteAddress ||
		"";
	return svc.checkIpService(ip);
});

export const doctypeList = handle((req) =>
	svc.doctypeListService(userType(req))
);

export const sendOtpAccountMerge = handle((req) => {
	const { body } = req.validated as { body: SendOtpMergeBody };
	return svc.sendOtpAccountMergeService(companyId(req), userType(req), body);
});

export const otpVerifyAccountMerge = handle((req) => {
	const { body } = req.validated as { body: VerifyOtpMergeBody };
	const token = (req.auth as AuthUser).token;
	return svc.otpVerifyAccountMergeService(
		companyId(req),
		userType(req),
		body,
		token
	);
});

export const mergeUserRegister = handle((req) => {
	const { body } = req.validated as { body: MergeUserRegisterBody };
	const token = (req.auth as AuthUser).token;
	return svc.mergeUserRegisterService(
		companyId(req),
		userType(req),
		body,
		token
	);
});

export const aiGenerateRow = handle((req) => {
	const body = (req.validated as { body: AiGenerateRowBody } | undefined)?.body ||
		(req.body as AiGenerateRowBody);
	return svc.aiGenerateRowService(body);
});

export const revokeDeleteAccount = handle((req) =>
	svc.revokeDeleteAccountService(loginUserId(req))
);

export const digilocker = handle(() => svc.digilockerService());

export const nonclaimCompany = handle(() => svc.nonclaimCompanyService());

export const defaultUserList = handle(() => svc.defaultUserListService());

/** Missing PHP methods — explicit 404 JSON for clarity */
export const switchAccount = handle(async () => {
	return { status: false, messages: "Not implemented" };
});

export const reminderVerificationPending = handle(async () => {
	return { status: false, messages: "Not implemented" };
});
