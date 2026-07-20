import { Router } from "express";
import { Authorization } from "../middlewares/Authorization";
import { validateData } from "../middlewares/validation.middleware";
import { topCompanyQuerySchema } from "../types/frontend.types";
import { getTopCompany } from "../controllers/frontend.controller";

const homeRouter = Router();

// GET /wapi/home/top-company
homeRouter.get(
	"/top-company",
	Authorization,
	validateData(topCompanyQuerySchema),
	getTopCompany
);

export default homeRouter;
