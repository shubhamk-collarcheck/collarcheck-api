import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { isEmptyArray } from '../utils/helpers';
import { cybUserProtfolio } from '../db/schema';

type Portfolio = InferSelectModel<typeof cybUserProtfolio>
type NewPortfolio = InferInsertModel<typeof cybUserProtfolio>


class portfolioRepoitery {

}
