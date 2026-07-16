import { Router } from "express";
import { Authorization } from "../middlewares/Authorization";
import { peopleList } from "../controllers/common-auth.controller";

const rootRouter = Router();

rootRouter.get("/people-list", Authorization, peopleList);

export default rootRouter;
