import { NextFunction, Request, Response } from "express";
import type { AuthUser, RestaurantAuthUser } from "../types/express";
import { clientIp, isThrottled } from "../utils/throttle";
import {
	restaurantAddCustomerVisitService,
	restaurantCustomerDiscountService,
	restaurantCustomerSearchService,
	restaurantGetCustomerVisitsService,
	restaurantListService,
	restaurantProfileDetailsService,
	restaurantSendOtpService,
	restaurantUpdateProfileService,
	restaurantVerifyOtpService,
} from "../services/restaurant.service";
import type {
	RestaurantAddVisitRequest,
	RestaurantCustomerDiscountRequest,
	RestaurantCustomerSearchRequest,
	RestaurantSendOtpRequest,
	RestaurantUpdateProfileRequest,
	RestaurantVerifyOtpRequest,
} from "../types/restaurant.types";

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
		if (single && single.fieldname === field) return single;
		return undefined;
	}
	if (Array.isArray(files)) {
		return files.find((f) => f.fieldname === field);
	}
	return files[field]?.[0];
}

// 1. GET /wapi/restaurant-list
export async function getRestaurantList(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser;
		const result = await restaurantListService(id);
		return res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

// 2. POST /wapi/restaurant/send-otp
export async function restaurantSendOtp(req: Request, res: Response, next: NextFunction) {
	try {
		const ip = clientIp(req);
		if (isThrottled(`restaurant:sendOtp:${ip}`, 3, 60_000)) {
			return res.status(200).json({
				status: false,
				messages: "limit is reach please retry after some time !",
			});
		}
		const { body } = req.validated as RestaurantSendOtpRequest;
		const result = await restaurantSendOtpService(body);
		return res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

// 3. POST /wapi/restaurant/verify-otp
export async function restaurantVerifyOtp(req: Request, res: Response, next: NextFunction) {
	try {
		const { body } = req.validated as RestaurantVerifyOtpRequest;
		const result = await restaurantVerifyOtpService(body);
		return res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

// 4. GET /wapi/testauth
export async function restaurantTestAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.restaurant as RestaurantAuthUser;
		return res.status(200).type("text/plain").send(`hello auth${id}`);
	} catch (err) {
		next(err);
	}
}

// 5. GET /wapi/restaurant/profile-details
export async function restaurantProfileDetails(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.restaurant as RestaurantAuthUser;
		const result = await restaurantProfileDetailsService(id);
		return res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

// 6. POST /wapi/restaurant/update-profile
export async function restaurantUpdateProfile(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.restaurant as RestaurantAuthUser;
		const { body } = req.validated as RestaurantUpdateProfileRequest;
		const result = await restaurantUpdateProfileService(id, body, {
			profile: multerFile(req, "profile"),
			banner: multerFile(req, "banner"),
		});
		return res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

// 7. POST /wapi/restaurant/add-customer-visits
export async function restaurantAddCustomerVisit(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.restaurant as RestaurantAuthUser;
		const { body } = req.validated as RestaurantAddVisitRequest;
		const result = await restaurantAddCustomerVisitService(id, body);
		return res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

// 8. GET /wapi/restaurant/customer-visits
export async function restaurantGetCustomerVisits(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.restaurant as RestaurantAuthUser;
		const result = await restaurantGetCustomerVisitsService(id);
		return res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

// 9. GET /wapi/restaurant/customer-search
export async function restaurantCustomerSearch(req: Request, res: Response, next: NextFunction) {
	try {
		const { query } = req.validated as RestaurantCustomerSearchRequest;
		const result = await restaurantCustomerSearchService(query);
		return res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}

// 10. GET /wapi/restaurant/customer-discount/:id
export async function restaurantCustomerDiscount(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: restaurantId } = req.restaurant as RestaurantAuthUser;
		const { params } = req.validated as RestaurantCustomerDiscountRequest;
		const result = await restaurantCustomerDiscountService(restaurantId, params.id);
		return res.status(200).json(result);
	} catch (err) {
		next(err);
	}
}
