import express from "express";
import morgan from "morgan";
import cityRouter from "./routes/cityRoutes";
import stateRouter from "./routes/stateRoutes";
import countryListRouter from "./routes/countryListRouter";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();
const generalRouter = express.Router();

app.use(morgan("dev"));
app.use(express.json())

app.use("/wapi/general", generalRouter);

app.use(errorHandler)

export default app;
