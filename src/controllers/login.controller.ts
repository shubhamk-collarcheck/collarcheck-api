import { Request, Response, NextFunction } from "express";
import { AuthUser } from "../types/express";
import { clientIp, isThrottled } from "../utils/throttle";
import {
	sendOtpService,
	verifyOtpService,
	socialLoginService,
	loginCommonService,
	verifyCommonOtpService,
	employeeRegisterService,
	companyRegisterService,
	employeeSignupService,
	finalSignupService,
	uploadResumeService,
} from "../services/login.service";
import type {
	SendOtpBody,
	VerifyOtpBody,
	SocialLoginBody,
	LoginCommonBody,
	VerifyCommonOtpBody,
	EmployeeRegisterBody,
	CompanyRegisterBody,
	EmployeeSignupBody,
	FinalSignupBody,
	UploadResumeBody,
} from "../types/login.types";

function multerFile(
	req: Request,
	field: string
): Express.MulterS3.File | undefined {
	const files = req.files as
		| { [fieldname: string]: Express.MulterS3.File[] }
		| Express.MulterS3.File[]
		| undefined;
	if (!files) {
		const single = req.file as Express.MulterS3.File | undefined;
		if (single && (single.fieldname === field || field === "resume")) return single;
		return undefined;
	}
	if (Array.isArray(files)) {
		return files.find((f) => f.fieldname === field) || files[0];
	}
	const list = files[field];
	return list?.[0];
}

function multerFiles(req: Request, field: string): Express.MulterS3.File[] {
	const files = req.files as
		| { [fieldname: string]: Express.MulterS3.File[] }
		| Express.MulterS3.File[]
		| undefined;
	if (!files) return [];
	if (Array.isArray(files)) return files.filter((f) => f.fieldname === field);
	return files[field] || [];
}

// 1. POST /wapi/login/sendOtp
export async function sendOtp(req: Request, res: Response, next: NextFunction) {
	try {
		const ip = clientIp(req);
		if (isThrottled(`login:sendOtp:${ip}`, 3, 60_000)) {
			return res.status(200).json({
				status: false,
				message: "Otp Send limit is reach retry after some time !",
			});
		}
		const { body } = req.validated as { body: SendOtpBody };
		const result = await sendOtpService(body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// 2. POST /wapi/login/verifyOtp
export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req.validated as { body: VerifyOtpBody };
		const result = await verifyOtpService(body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// 3–4. POST /wapi/login/googlelogin & social-login
export async function socialLogin(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req.validated as { body: SocialLoginBody };
		const result = await socialLoginService(body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// 5. POST /wapi/login
export async function loginCommon(req: Request, res: Response, next: NextFunction) {
	try {
		const ip = clientIp(req);
		if (isThrottled(`login:common:${ip}`, 3, 60_000)) {
			return res.status(200).json({
				status: false,
				messages: "limit is reach please retry after some time !",
			});
		}
		const { body } = req.validated as { body: LoginCommonBody };
		const result = await loginCommonService(body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// 6. POST /wapi/login/verify-otp
export async function verifyCommonOtp(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req.validated as { body: VerifyCommonOtpBody };
		const result = await verifyCommonOtpService(body, {
			ip: clientIp(req),
			userAgent: req.headers["user-agent"],
		});
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// 7. POST /wapi/employee/register
export async function employeeRegister(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req.validated as { body: EmployeeRegisterBody };
		const result = await employeeRegisterService(body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// 8. POST /wapi/company/register
export async function companyRegister(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as { body: CompanyRegisterBody };
		const result = await companyRegisterService(body, user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// 9. POST /wapi/employee/signup
export async function employeeSignup(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req.validated as { body: EmployeeSignupBody };
		const result = await employeeSignupService(body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// 10. POST /wapi/employee/final-signup
export async function finalSignup(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req.validated as { body: FinalSignupBody };
		const result = await finalSignupService(body, {
			resume: multerFile(req, "resume"),
			profile: multerFile(req, "profile"),
			document: multerFiles(req, "document"),
		});
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// 11. POST /wapi/employee/upload-resume
export async function uploadResume(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req.validated as { body: UploadResumeBody };
		const file = multerFile(req, "resume") || (req.file as Express.MulterS3.File | undefined);

		if (file && (file as any).size > 5 * 1024 * 1024) {
			return res.status(200).json({
				status: false,
				messages: "The file size must not exceed 5MB.",
			});
		}

		const result = await uploadResumeService(body.user_id, file);
		return res.status(200).json(result);
	} catch (error) {
		const msg = (error as Error)?.message || "";
		if (msg.includes("Allowed file types")) {
			return res.status(200).json({
				status: false,
				messages: "Allowed file types: PDF, DOC, DOCX.",
			});
		}
		if (msg.includes("File too large") || msg.includes("LIMIT_FILE_SIZE")) {
			return res.status(200).json({
				status: false,
				messages: "The file size must not exceed 5MB.",
			});
		}
		next(error);
	}
}
