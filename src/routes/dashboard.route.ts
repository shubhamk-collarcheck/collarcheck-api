import { Router } from 'express';
import { dataList } from '../controllers/dashboard.controller';

const dashboardRoute = Router();


dashboardRoute.get("dataList", dataList)

