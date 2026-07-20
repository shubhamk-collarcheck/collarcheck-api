import { Request, Response, NextFunction } from "express";

/**
 * AI proxy auth — clients send `X-API-KEY` (not JWT Bearer).
 * Key is pass-through to the upstream AI service; no local DB validation.
 */
export function AiAuth(req: Request, res: Response, next: NextFunction) {
	const raw = req.headers["x-api-key"];
	const key = Array.isArray(raw) ? raw[0] : raw;

	if (!key || !String(key).trim()) {
		return res.status(401).json({
			status: false,
			message: "Token Missing!",
		});
	}

	req.aiApiKey = String(key).trim();
	next();
}
