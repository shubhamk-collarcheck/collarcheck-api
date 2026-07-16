import { Router } from "express";
import { Authorization } from "../middlewares/Authorization";
import { getSetting, saveSetting } from "../controllers/common-auth.controller";

const userRouter = Router();

userRouter.get("/getSetting", Authorization, getSetting);
userRouter.post("/saveSetting", Authorization, saveSetting);

export default userRouter;
