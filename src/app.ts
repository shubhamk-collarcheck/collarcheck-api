import express from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./middlewares/errorHandler";
import generalRoute from "./routes/general.route";
import dashboardRoute from "./routes/dashboard.route";
import employRouter from "./routes/employee.route";
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

app.use(errorHandler);

export default app;
