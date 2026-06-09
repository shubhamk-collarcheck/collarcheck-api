//server.ts

import app from "./app";

import { config } from "./config/config";

app.listen(config.PORT, () => {
	console.log(`Server is running on port ${"http://localhost:" + config.PORT}`);
})
