import { Router } from "express";
import multer from "multer";
import { Authorization } from "../middlewares/Authorization";
import { RestaurantAuth } from "../middlewares/RestaurantAuth";
import { validateData } from "../middlewares/validation.middleware";
import { restaurantUpload } from "../utils/restaurantUpload";
import {
	restaurantAddVisitSchema,
	restaurantCustomerDiscountSchema,
	restaurantCustomerSearchSchema,
	restaurantSendOtpSchema,
	restaurantUpdateProfileSchema,
	restaurantVerifyOtpSchema,
} from "../types/restaurant.types";
import {
	getRestaurantList,
	restaurantAddCustomerVisit,
	restaurantCustomerDiscount,
	restaurantCustomerSearch,
	restaurantGetCustomerVisits,
	restaurantProfileDetails,
	restaurantSendOtp,
	restaurantTestAuth,
	restaurantUpdateProfile,
	restaurantVerifyOtp,
} from "../controllers/restaurant.controller";

const restaurantRouter = Router();
const formData = multer().none();

const profileUpload = restaurantUpload.fields([
	{ name: "profile", maxCount: 1 },
	{ name: "banner", maxCount: 1 },
]);

// 1. Employee app — platform JWT
restaurantRouter.get("/restaurant-list", Authorization, getRestaurantList);

// 2–3. Public restaurant partner OTP
restaurantRouter.post(
	"/restaurant/send-otp",
	formData,
	validateData(restaurantSendOtpSchema),
	restaurantSendOtp
);
restaurantRouter.post(
	"/restaurant/verify-otp",
	formData,
	validateData(restaurantVerifyOtpSchema),
	restaurantVerifyOtp
);

// 4–10. Restaurant partner JWT
restaurantRouter.get("/testauth", RestaurantAuth, restaurantTestAuth);
restaurantRouter.get(
	"/restaurant/profile-details",
	RestaurantAuth,
	restaurantProfileDetails
);
restaurantRouter.post(
	"/restaurant/update-profile",
	RestaurantAuth,
	profileUpload,
	validateData(restaurantUpdateProfileSchema),
	restaurantUpdateProfile
);
restaurantRouter.post(
	"/restaurant/add-customer-visits",
	RestaurantAuth,
	formData,
	validateData(restaurantAddVisitSchema),
	restaurantAddCustomerVisit
);
restaurantRouter.get(
	"/restaurant/customer-visits",
	RestaurantAuth,
	restaurantGetCustomerVisits
);
restaurantRouter.get(
	"/restaurant/customer-search",
	RestaurantAuth,
	validateData(restaurantCustomerSearchSchema),
	restaurantCustomerSearch
);
restaurantRouter.get(
	"/restaurant/customer-discount/:id",
	RestaurantAuth,
	validateData(restaurantCustomerDiscountSchema),
	restaurantCustomerDiscount
);

export default restaurantRouter;
