import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import { EditCompanyBody, AllConnectionQuery, UpdateEmploymentParams } from "../types/company.types";
import {
	getCompanySettingService, saveCompanySettingService, editCompanyService,
	allConnectionService, allEmploymentService, updateEmploymentService,
	allWishlistService, addConnectionService, addWishlistService,
	deleteWishlistService, addCompanyDocumentService,
} from "../services/company.service";
import {
	AddConnectionBody, AddWishlistBody, DeleteWishlistParams,
} from "../types/company.types";

export async function getCompanySetting(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await getCompanySettingService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function saveCompanySetting(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await saveCompanySettingService(user_id, req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function editCompany(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		// type comes from ?type= (preferred) or body — schema merges both onto body.type
		const { body, query } = req.validated as {
			body: EditCompanyBody;
			query?: { type?: number };
		};
		const type = query?.type ?? body.type;
		if (type == null) {
			return res.status(200).json({ status: false, messages: "Invalid Param" });
		}
		const files = req.files as any[] | undefined;
		// Multer may set .location (S3) or .key; prefer uploaded file over body.profile URL
		const uploaded = files?.[0] as { location?: string; key?: string } | undefined;
		const profilePath = uploaded?.location || uploaded?.key || undefined;
		const result = await editCompanyService(user_id, type, body, profilePath);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function allConnection(req: Request, res: Response, next: NextFunction) {
	try {
		// Acting company = req.auth.id (X-Company); human = user_id for menu check
		const { id: companyId, user_id: loginUserId, user_type: userType } = req.auth as AuthUser;
		const { query } = req.validated as { query: AllConnectionQuery };
		const keyword = query.keyword || '';
		// sort_by empty → PHP uses ue.id DESC (service treats null/0 as that)
		const sortBy = query.sort_by;
		const limit = query.limit ?? 10;
		// offset is page number (0 and 1 both first page)
		const pageOffset = query.offset ?? 0;
		const result = await allConnectionService(
			companyId,
			loginUserId,
			userType,
			keyword,
			sortBy,
			limit,
			pageOffset,
		);
		if ('httpStatus' in result && result.httpStatus === 403) {
			return res.status(403).json({ status: false, message: result.message });
		}
		return res.status(200).json(result);
	} catch (error) {
		const messages = error instanceof Error ? error.message : 'Access denied';
		return res.status(200).json({ status: false, messages });
	}
}

export async function allEmployment(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId, user_id: loginUserId, user_type: userType } = req.auth as AuthUser;
		const result = await allEmploymentService(companyId, loginUserId, userType);
		if ('httpStatus' in result && result.httpStatus === 403) {
			return res.status(403).json({ status: false, message: result.message });
		}
		return res.status(200).json(result);
	} catch (error) {
		const messages = error instanceof Error ? error.message : 'Access denied';
		return res.status(200).json({ status: false, messages });
	}
}

export async function updateEmployment(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { params } = req.validated as { params: UpdateEmploymentParams };
		const result = await updateEmploymentService(user_id, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function allWishlist(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await allWishlistService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function addConnection(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { body } = req.validated as { body: AddConnectionBody };
		const result = await addConnectionService(companyId, body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function addWishlist(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { body } = req.validated as { body: AddWishlistBody };
		const result = await addWishlistService(companyId, body.user);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function deleteWishlist(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const { params } = req.validated as { params: DeleteWishlistParams };
		const result = await deleteWishlistService(companyId, params.id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function addCompanyDocument(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: companyId } = req.auth as AuthUser;
		const validated = req.validated as { body?: { doctype?: unknown } } | undefined;
		const doctype = req.body?.doctype ?? validated?.body?.doctype;
		const files = (req.files as Express.MulterS3.File[] | undefined) || [];
		const result = await addCompanyDocumentService(companyId, doctype, files);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}
