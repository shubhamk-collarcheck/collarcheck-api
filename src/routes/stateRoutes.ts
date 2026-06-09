import { Router } from 'express';
import { getAllStates, getStateById, createState, updateState, deleteState } from '../controllers/stateController';

const stateRouter = Router();

stateRouter.get('/', getAllStates);
stateRouter.get('/:id', getStateById);
stateRouter.post('/', createState);
stateRouter.put('/:id', updateState);
stateRouter.delete('/:id', deleteState);

export default stateRouter;
