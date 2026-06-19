import { Router } from 'express';
import { dataList, employmentList } from '../controllers/dashboard.controller';
import { jobDataList } from '../controllers/general.controller';

const dashboardRoute = Router();


dashboardRoute.get("/dataList", dataList)
dashboardRoute.get('/employmentList', employmentList);
dashboardRoute.get("/jobDataList", jobDataList)
// dashboardRoute.get('/jobFilterDataList');


export default dashboardRoute;
