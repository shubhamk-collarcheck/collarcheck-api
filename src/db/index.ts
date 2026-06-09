import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";


const db = drizzle("mysql://root@localhost:3306/mydatabase");

export default db;
