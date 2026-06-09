import { Router } from 'express';
import { getAllStates } from '../controllers/stateController';

const stateRouter = Router();

stateRouter.get('/', getAllStates);

export default stateRouter;
