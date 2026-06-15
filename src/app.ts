import express from "express";
import morgan from "morgan";
import { errorHandler } from "./middlewares/errorHandler";
import generalRoute from "./routes/general.route";
import dashboardRoute from "./routes/dashboard.route";

const app = express();

app.use(morgan(":method :url :status :response-time ms - :res[content-length]"));
app.use(express.json())

app.use("/wapi/general", generalRoute);
app.use("/wapi/dashboard", dashboardRoute)

app.use(errorHandler)

export default app;
