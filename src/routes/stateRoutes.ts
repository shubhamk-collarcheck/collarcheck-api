import { Router } from 'express';
import { getAllStates } from '../controllers/stateController';

const stateRouter = Router();

stateRouter.get('/state', getAllStates);

export default stateRouter;
