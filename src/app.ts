import express from "express";
import morgan from "morgan";
import { errorHandler } from "./middlewares/errorHandler";
import generalRoute from "./routes/general.route";

const app = express();

app.use(morgan("dev"));
app.use(express.json())

app.use("/wapi/general", generalRoute);

app.use(errorHandler)

export default app;
