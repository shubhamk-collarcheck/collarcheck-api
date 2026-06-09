//app.ts

import express from "express";
import itemRouter from "./routes/itemRoutes";
import userRouter from "./routes/userRoutes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(express.json())

app.use("/api/items", itemRouter)
app.use("/api", userRouter)

app.use(errorHandler)

export default app;
