import { Router } from 'express';
import { getAllCities } from '../controllers/cityController';

const cityRouter = Router();

cityRouter.get('/', getAllCities);

export default cityRouter;
