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
		const { body } = req.validated as { body: EditCompanyBody };
		const files = req.files as any[] | undefined;
		const profilePath = files?.[0]?.location;
		const result = await editCompanyService(user_id, body.type, body, profilePath);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function allConnection(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const { query } = req.validated as { query: AllConnectionQuery };
		const keyword = query.keyword || '';
		const sortBy = query.sort_by || 4;
		const limit = query.limit || 10;
		const offset = query.offset || 0;
		const result = await allConnectionService(user_id, keyword, sortBy, limit, offset);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function allEmployment(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser;
		const result = await allEmploymentService(user_id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
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
