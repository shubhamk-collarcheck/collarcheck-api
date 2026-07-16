import { Router } from "express";
import { Authorization } from "../middlewares/Authorization";
import { hired } from "../controllers/misc.controller";

const hiredRouter = Router();

hiredRouter.post("/", Authorization, hired);

export default hiredRouter;
