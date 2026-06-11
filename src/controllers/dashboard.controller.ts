import { Request, Response, NextFunction } from 'express';


export const dataList = async (req: Request, res: Response, next: NextFunction) => {
	res.status(200).json({ status: true, message: 'Data List', data: [] });
}
