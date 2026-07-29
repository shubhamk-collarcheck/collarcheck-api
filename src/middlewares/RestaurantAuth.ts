import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import restaurantRepositery from "../repositery/restaurant.repositery";

const JwtPayloadSchema = z.object({
	uid: z.coerce.number(),
});

/**
 * Restaurant partner JWT auth (separate from platform Authorization).
 * Payload `uid` is restaurants.id — never mix with platform user tokens.
 */
export async function RestaurantAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const authHeader = req.headers["authorization"];
		if (!authHeader) {
			return res.status(401).json({ status: false, message: "Token Missing!" });
		}

		const tokenMatch = String(authHeader).match(/Bearer\s(\S+)/i);
		const token = tokenMatch ? tokenMatch[1] : String(authHeader).trim();
		if (!token) {
			return res.status(401).json({ status: false, message: "Invalid Token!" });
		}

		const JWT_SECRET = process.env.JWT_SECRET;
		if (!JWT_SECRET) {
			return res.status(500).json({ status: false, message: "JWT secret is not defined" });
		}

		let decodedRaw: string | jwt.JwtPayload;
		try {
			decodedRaw = jwt.verify(token, JWT_SECRET);
		} catch (err) {
			if (err instanceof jwt.TokenExpiredError) {
				return res.status(401).json({ status: false, message: "Token Expired!" });
			}
			return res.status(401).json({ status: false, message: "Invalid Token!" });
		}

		const parsedPayload = JwtPayloadSchema.safeParse(decodedRaw);
		if (!parsedPayload.success) {
			return res.status(401).json({ status: false, message: "Invalid Token Payload!" });
		}

		const restaurant = await restaurantRepositery.findActiveById(parsedPayload.data.uid);
		if (!restaurant) {
			return res.status(401).json({ status: false, message: "Unauthorized User!" });
		}

		req.restaurant = {
			id: restaurant.id,
			token,
		};

		next();
	} catch (err) {
		next(err);
	}
}
