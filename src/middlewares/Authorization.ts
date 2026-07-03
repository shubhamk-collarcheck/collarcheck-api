import { Request, Response, NextFunction } from "express";
import type { AuthUser } from "../types/express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { get_user_detail, get_company_detail } from "../services/users.service";

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

		const JWT_SECRET = process.env.JWT_SECRET ?? "";
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

		const validatedPayload = JwtPayloadSchema.parse(decodedRaw);


		const user = await get_user_detail(validatedPayload.uid);
		if (!user) {
			return res.status(401).json({ message: "Unauthorized User!" });
		}

		const xCompanyId = req.headers["x-company"];
		const company = await get_company_detail(Number(xCompanyId));
		const auth: AuthUser = xCompanyId && company
			? {
				user_id: user.id,
				id: company.id,
				user_type: company.user_type,
				token,
			}
			: {
				user_id: user.id,
				id: user.id,
				user_type: user.userType,
				token,
			};

		req.auth = auth;
		next();
	} catch (err) {
		next(err);
	}
}
