import express from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./middlewares/errorHandler";
import generalRoute from "./routes/general.route";
import dashboardRoute from "./routes/dashboard.route";
import employRouter from "./routes/employee.route";
import hiredRouter from "./routes/hired.route";
import userRouter from "./routes/user.route";
import authRouter from "./routes/auth.route";
import companyRouter from "./routes/company.route";
import rootRouter from "./routes/root.route";
import bodyParser from "body-parser";
import swaggerSpec from "./swagger";

const app = express();

app.use(morgan(":method :url :status :response-time ms - :res[content-length]"));
app.use(express.json());
app.use(bodyParser.json());

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/wapi/general", generalRoute);
app.use("/wapi/dashboard", dashboardRoute);
app.use("/wapi/employee", employRouter);
app.use("/wapi/hired", hiredRouter);
app.use("/wapi/user", userRouter);
app.use("/wapi/auth", authRouter);
app.use("/wapi/company", companyRouter);
app.use("/wapi", rootRouter);

app.use(errorHandler);

export default app;
