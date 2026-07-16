import { Request, Response, NextFunction } from 'express';
import { employmentListService } from '../services/general.service';
import { dataListService } from '../services/dashboard.service';


export const dataList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = await dataListService();
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
}

export const employmentList = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const id = req.query.id as string | undefined
		const data = await employmentListService(id)
		return res.status(200).json({ status: true, message: '', data })
	} catch (error) {
		next(error)
	}
}

