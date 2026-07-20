import { NextFunction, Request, Response } from "express";
import { AuthUser } from "../types/express";
import type { TopCompanyQuery, SitemapQuery } from "../types/frontend.types";
import {
	getTopCompanyService,
	saveEnquiryService,
	saveCareerEnquiryService,
	sitemapService,
	dataDeletionService,
} from "../services/frontend.service";

// GET /wapi/home/top-company
export async function getTopCompany(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const { query } = req.validated as { query: TopCompanyQuery };
		const result = await getTopCompanyService(query, id);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// POST /wapi/contact/save-enquiry
export async function saveEnquiry(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await saveEnquiryService(req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// POST /wapi/career/save-enquiry
export async function saveCareerEnquiry(req: Request, res: Response, next: NextFunction) {
	try {
		const result = await saveCareerEnquiryService(req.body);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// GET /wapi/general/sitemap
export async function sitemap(req: Request, res: Response, next: NextFunction) {
	try {
		const { query } = (req.validated as { query: SitemapQuery } | undefined) ?? {
			query: { type: req.query.type as string | undefined },
		};
		const result = await sitemapService(query);
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

// GET|POST /wapi/data-deletion
export async function dataDeletion(_req: Request, res: Response, next: NextFunction) {
	try {
		const result = await dataDeletionService();
		return res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}
