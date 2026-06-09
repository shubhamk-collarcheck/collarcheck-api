import dotenv from "dotenv";

dotenv.config();

interface Config {
	PORT: number;
	nodeEnv: string;
}

export const config: Config = {
	PORT: Number(process.env.PORT) || 3000,
	nodeEnv: process.env.NODE_ENV || "development",
};

export const PORT = process.env.PORT || 3000;

export default config;
