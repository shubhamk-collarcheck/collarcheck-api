import { Request, Response, NextFunction } from "express";
import type { AuthUser } from "../types/express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { get_user_detail, get_company_detail } from "../services/users.service";
import { isEmpty } from "../utils/helpers";

const JwtPayloadSchema = z.object({
	uid: z.coerce.number(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export async function Authorization(req: Request, res: Response, next: NextFunction) {
	try {
		const authHeader = req.headers["authorization"];
		if (!authHeader) {
			return res.status(401).json({ message: "Token Missing!" });
		}

		const tokenMatch = String(authHeader).match(/Bearer\s(\S+)/i);
		const token = tokenMatch ? tokenMatch[1] : String(authHeader).trim();
		if (!token) {
			return res.status(401).json({ message: "Invalid Token!" });
		}

		const JWT_SECRET = process.env.JWT_SECRET;
		if (!JWT_SECRET) {
			return res.status(500).json({ message: "JWT secret is not defined" });
		}

		let decodedRaw: string | jwt.JwtPayload;
		try {
			decodedRaw = jwt.verify(token, JWT_SECRET);
		} catch (err) {
			if (err instanceof jwt.TokenExpiredError) {
				return res.status(401).json({ message: "Token Expired!" });
			}
			return res.status(401).json({ message: "Invalid Token!" });
		}

		const parsedPayload = JwtPayloadSchema.safeParse(decodedRaw);
		if (!parsedPayload.success) {
			return res.status(401).json({ message: "Invalid Token!" });
		}
		const validatedPayload = parsedPayload.data;

		const user = await get_user_detail(validatedPayload.uid);
		if (!user) {
			return res.status(401).json({ message: "Unauthorized User!" });
		}

		const auth: AuthUser = {
			user_id: user.id,
			id: user.id,
			user_type: user.userType,
			token,
		};
		req.auth = auth;

		const xCompanyIdRaw = req.headers["x-company"];
		if (!isEmpty(xCompanyIdRaw)) {
			const xCompanyId = Array.isArray(xCompanyIdRaw) ? xCompanyIdRaw[0] : xCompanyIdRaw;
			const parsedCompanyId = Number(xCompanyId);

			if (!xCompanyId || Number.isNaN(parsedCompanyId)) {
				return res.status(400).json({ message: "Invalid x-company header" });
			}

			const company = await get_company_detail(parsedCompanyId);
			if (isEmpty(company)) {
				return res.status(401).json({ message: "Wrong x-company" });
			}

			Object.assign(req.auth, { id: company!.id, user_type: company!.user_type });
		}

		next();
	} catch (err) {
		next(err);
	}
}
