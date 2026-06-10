import { Router } from "express";
import { countryListController } from "../controllers/countryListController";

const countryListRouter = Router();

countryListRouter.get("/countryList", countryListController);

export default countryListRouter;
