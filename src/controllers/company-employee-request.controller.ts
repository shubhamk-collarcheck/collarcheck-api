import { Request, Response } from "express";
import { AuthUser } from "../types/express";
import companyEmployeeRequestService from "../services/company-employee-request.service";
import {
	AddEmployeeBody, EmployeeDetailParams, RejectEmploymentParams, RejectEmploymentBody,
	RejectPromotionParams, RejectPromotionBody, LeaveExperienceBody, ReviewUniqueUserQuery,
	ValidToReviewParams, FollowRequestListQuery, CompanyDashboardQuery, CompanyListQuery,
	InviteCompanyBody, EmploymentRequestQuery, AllMessageListQuery, AddMessageBody,
	ChatMessageReadParams, FollowDataListQuery, ClaimCompanyBody, RevokeDeleteAccountBody,
} from "../types/company-employee-request.types";

export const companyDetail = async (req: Request, res: Response) => {
	try {
		const { user_id: userId } = req.auth as AuthUser;

		const companyId = req.headers['x-company'] ? parseInt(req.headers['x-company'] as string) : undefined;

		const result = await companyEmployeeRequestService.getCompanyDetailService(userId, companyId);

		return res.status(result.success ? 200 : 404).json({
			status: result.success,
			message: result.message,
			data: result.data,
		});
	} catch (error) {
		console.error("companyDetail error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

/** Normalize multer .fields() output for employment document uploads. */
function addEmployeeFiles(req: Request): Express.MulterS3.File[] {
	const f = req.files as
		| { [fieldname: string]: Express.MulterS3.File[] }
		| Express.MulterS3.File[]
		| undefined;
	if (!f) return [];
	if (Array.isArray(f)) return f;
	return [
		...(f.document || []),
		...(f["document[]"] || []),
		...(f.file || []),
	];
}

export const addEmployee = async (req: Request, res: Response) => {
	try {
		// Acting company (honours X-Company); matches PHP $this->request->id
		const { id: companyId } = req.auth as AuthUser;
		const { body } = req.validated as { body: AddEmployeeBody };

		const result = await companyEmployeeRequestService.addEmployeeService(
			companyId,
			body,
			addEmployeeFiles(req),
		);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("addEmployee error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const addEmployeeUpdate = async (req: Request, res: Response) => {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params, body } = req.validated as { params: EmployeeDetailParams; body: AddEmployeeBody };

		const result = await companyEmployeeRequestService.addEmployeeService(
			companyId,
			body,
			addEmployeeFiles(req),
			params.id,
		);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("addEmployeeUpdate error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const employeeDetail = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params } = req.validated as { params: EmployeeDetailParams };

		const result = await companyEmployeeRequestService.getEmployeeDetailService(companyId, params.id);

		return res.status(result.success ? 200 : 404).json({
			status: result.success,
			messages: result.message,
			data: result.data,
		});
	} catch (error) {
		console.error("employeeDetail error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const rejectEmployment = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params, body } = req.validated as { params: RejectEmploymentParams; body: RejectEmploymentBody };

		const result = await companyEmployeeRequestService.rejectEmploymentService(companyId, params.id, body.reason);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("rejectEmployment error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const rejectPromotion = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params, body } = req.validated as { params: RejectPromotionParams; body: RejectPromotionBody };

		const result = await companyEmployeeRequestService.rejectPromotionService(companyId, params.id, body.type);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("rejectPromotion error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const leaveExperience = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { body } = req.validated as { body: LeaveExperienceBody };

		const result = await companyEmployeeRequestService.leaveExperienceService(companyId, body);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.message,
		});
	} catch (error) {
		console.error("leaveExperience error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const reviewUniqueUsers = async (req: Request, res: Response) => {
	try {
		// Acting company = req.auth.id (X-Company); human = user_id for menu 8
		const { id: companyId, user_id: loginUserId, user_type: userType } = req.auth as AuthUser;
		const { query } = req.validated as { query: ReviewUniqueUserQuery };

		const result = await companyEmployeeRequestService.reviewUniqueUsersService(
			companyId,
			loginUserId,
			userType,
			query.keyword,
		);

		if ('httpStatus' in result && result.httpStatus === 403) {
			return res.status(403).json({ status: false, message: result.message });
		}
		return res.status(200).json(result);
	} catch (error) {
		const messages = error instanceof Error ? error.message : "Access denied";
		return res.status(200).json({ status: false, messages });
	}
};

export const validToReview = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { params } = req.validated as { params: ValidToReviewParams };

		const result = await companyEmployeeRequestService.validToReviewService(companyId, params.id);

		return res.status(200).json({
			status: true,
			data: result.data,
		});
	} catch (error) {
		console.error("validToReview error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const followRequestList = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { query } = req.validated as { query: FollowRequestListQuery };

		const result = await companyEmployeeRequestService.followRequestListService(
			companyId,
			query.limit,
			query.offset,
		);

		return res.status(200).json({
			status: true,
			messages: result.messages,
			data: result.data,
		});
	} catch (error) {
		console.error("followRequestList error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const dashboard = async (req: Request, res: Response) => {
	try {
		// Acting company (honours X-Company)
		const { id: companyId } = req.auth as AuthUser;
		const { query } = req.validated as CompanyDashboardQuery;
		const result = await companyEmployeeRequestService.dashboardService(
			companyId,
			query.limit,
			query.offset,
		);

		// Success: no messages key. Failure: messages present (PHP contract)
		if (!result.status) {
			return res.status(200).json(result);
		}
		return res.status(200).json({ status: true, data: result.data });
	} catch (error) {
		console.error("dashboard error:", error);
		const msg = error instanceof Error ? error.message : "Access denied";
		return res.status(200).json({ status: false, messages: msg });
	}
};

export const sidebarCount = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const result = await companyEmployeeRequestService.sidebarCountService(companyId);

		return res.status(200).json({
			status: true,
			data: result.data,
		});
	} catch (error) {
		console.error("sidebarCount error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const companyList = async (req: Request, res: Response) => {
	try {
		// acting id (honours X-Company) — PHP request.id
		const { id: userId } = req.auth as AuthUser;

		const query = (req.validated as { query?: CompanyListQuery })?.query
			|| (req.query as unknown as CompanyListQuery)
			|| { limit: 16, offset: 0 };

		const result = await companyEmployeeRequestService.companyListService(
			userId,
			query.limit ?? 16,
			query.offset ?? 0,
		);

		return res.status(200).json(result);
	} catch (error) {
		// PHP exception → HTTP 200 + messages: exception text
		const messages = error instanceof Error ? error.message : String(error);
		return res.status(200).json({ status: false, messages });
	}
};

export const inviteCompany = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { body } = req.validated as { body: InviteCompanyBody };

		// .single("profile") puts the file on req.file (not req.files)
		const profileFile = req.file as Express.MulterS3.File | undefined;
		const profileUrl = profileFile?.location || profileFile?.key || "";

		// TODO: Implement full invite logic (persist profileUrl, create company, relation, invite email)
		void companyId;
		void profileUrl;
		return res.status(200).json({
			status: true,
			messages: "Successfully Registered",
			lastCreateId: 0,
			email: body.email,
			phone: body.phone,
		});
	} catch (error) {
		console.error("inviteCompany error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const employmentRequest = async (req: Request, res: Response) => {
	try {
		const { user_id: companyId } = req.auth as AuthUser;

		const { query } = req.validated as { query: EmploymentRequestQuery };

		// TODO: Implement full employment request list
		return res.status(200).json({
			status: true,
			messages: "Employement Requests",
			data: {
				pendingList: [],
				approvedList: [],
				rejectList: [],
				newUpdateList: [],
				pendingCount: [],
				approvedCount: [],
				rejectCount: [],
				updateList: [],
			},
		});
	} catch (error) {
		console.error("employmentRequest error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const allMessageList = async (req: Request, res: Response) => {
	try {
		const { user_id: userId } = req.auth as AuthUser;

		const { query } = req.validated as { query: AllMessageListQuery };

		const result = await companyEmployeeRequestService.allMessageListService(
			userId,
			query.slug,
			query.limit,
			query.offset,
		);

		return res.status(200).json({
			status: true,
			messages: result.messages,
			data: result.data,
		});
	} catch (error) {
		console.error("allMessageList error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const addMessage = async (req: Request, res: Response) => {
	try {
		const { user_id: userId } = req.auth as AuthUser;

		const { body } = req.validated as { body: AddMessageBody };

		// Handle file upload
		let docUrl = '';
		if (req.files && Array.isArray(req.files) && req.files.length > 0) {
			const files = req.files as Express.MulterS3.File[];
			docUrl = files[0].location;
		}

		const result = await companyEmployeeRequestService.addMessageService(
			userId,
			body.send_to,
			body.message,
			docUrl ? JSON.stringify([docUrl]) : undefined,
		);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.messages,
		});
	} catch (error) {
		console.error("addMessage error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const chatMessageRead = async (req: Request, res: Response) => {
	try {
		const { user_id: userId } = req.auth as AuthUser;

		const { params } = req.validated as { params: ChatMessageReadParams };

		const result = await companyEmployeeRequestService.chatMessageReadService(userId, params.id);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.messages,
		});
	} catch (error) {
		console.error("chatMessageRead error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const followDataList = async (req: Request, res: Response) => {
	try {
		const { user_id: userId } = req.auth as AuthUser;

		const { query } = req.validated as { query: FollowDataListQuery };

		const result = await companyEmployeeRequestService.followDataListService(
			userId,
			query.limit,
			query.offset,
		);

		return res.status(200).json({
			status: true,
			messages: result.messages,
			data: result.data,
		});
	} catch (error) {
		console.error("followDataList error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

/**
 * GET company-verificationStatus — same PHP handler as general/verificationStatus.
 * Prefer `verificationStatus` from general.controller (wired on general.route).
 * Kept as thin re-export path if other imports still use this module.
 */
export { verificationStatus } from "./general.controller";

export const claimCompany = async (req: Request, res: Response) => {
	try {
		const { body } = req.validated as { body: ClaimCompanyBody };

		const result = await companyEmployeeRequestService.claimCompanyService(body);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			msg: result.msg,
		});
	} catch (error) {
		console.error("claimCompany error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};

export const revokeDeleteAccount = async (req: Request, res: Response) => {
	try {
		const { user_id: userId } = req.auth as AuthUser;

		const { body } = req.validated as { body: RevokeDeleteAccountBody };

		const result = await companyEmployeeRequestService.revokeDeleteAccountService(userId, body.company_id);

		return res.status(result.success ? 200 : 400).json({
			status: result.success,
			messages: result.messages,
		});
	} catch (error) {
		console.error("revokeDeleteAccount error:", error);
		return res.status(500).json({ status: false, messages: "Internal server error" });
	}
};
