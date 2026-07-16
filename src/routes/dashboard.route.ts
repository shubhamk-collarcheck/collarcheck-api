import { Router } from 'express';
import { dataList, employmentList } from '../controllers/dashboard.controller';
import { jobDataList, jobFilterDataList } from '../controllers/general.controller';
import { validateData } from '../middlewares/validation.middleware';
import { jobFilterDataListQuerySchema } from '../types/general.types';

const dashboardRoute = Router();


dashboardRoute.get("/dataList", dataList)
dashboardRoute.get('/employmentList', employmentList);
dashboardRoute.get("/jobDataList", jobDataList)
dashboardRoute.get('/jobFilterDataList', validateData(jobFilterDataListQuerySchema), jobFilterDataList);


export default dashboardRoute;
