import express, { Request } from "express";
import cors from "cors";
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
import homeRouter from "./routes/home.route";
import contactRouter from "./routes/contact.route";
import careerRouter from "./routes/career.route";
import aiRouter from "./routes/ai.route";
import newRoutesRouter from "./routes/new-routes.route";
import widgetRouter from "./routes/widget.route";
import bodyParser from "body-parser";
import swaggerSpec from "./swagger";

const app = express();

const allowedOrigins = [
	"http://localhost:3000",
	"https://localhost:3000",
	"http://admin.collarcheck.com",
	"https://admin.collarcheck.com",
];

app.use(
	cors({
		origin(origin, callback) {
			// Allow non-browser clients (Postman, curl, mobile) with no Origin header
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
				return;
			}
			callback(null, false);
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
	})
);

// JSON + form-urlencoded so clients can post either Content-Type
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Log POST request bodies (after body parsing so req.body is available).
// multipart/form-data is filled later by multer on the route; morgan logs on
// response finish so those fields are included too.
morgan.token("body", (req) => {
	if (req.method !== "POST") return "";
	const body = (req as Request).body;
	if (!body || (typeof body === "object" && Object.keys(body).length === 0)) {
		return "";
	}
	try {
		return JSON.stringify(body);
	} catch {
		return "[unserializable body]";
	}
});

app.use(
	morgan(":method :url :status :response-time ms - :res[content-length] :body")
);

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
app.use("/wapi/home", homeRouter);
app.use("/wapi/contact", contactRouter);
app.use("/wapi/career", careerRouter);
app.use("/wapi", rootRouter);
app.use("/wapi", newRoutesRouter);
app.use("/wapi", widgetRouter);
app.use("/wapi", aiRouter);

app.use(errorHandler);

export default app;
