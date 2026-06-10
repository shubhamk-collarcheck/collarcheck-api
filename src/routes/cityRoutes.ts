import { Router } from 'express';
import { getAllCities } from '../controllers/cityController';

const cityRouter = Router();

cityRouter.get('/city', getAllCities);
cityRouter.get('/allcity', getAllCities)

export default cityRouter;
