import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../types/express';
import { updatePhoneSchema, updateEmailSchema } from '../types/general.types';
import { updatePhoneService, updateEmailService } from '../services/user.service';

type UpdatePhoneData = { body: { phone: string; country_code?: string } };
type UpdateEmailData = { body: { email: string } };

export const updatePhone = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as UpdatePhoneData;
		const data = await updatePhoneService(user_id, body.phone, body.country_code);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};

export const updateEmail = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { user_id } = req.auth as AuthUser;
		const { body } = req.validated as UpdateEmailData;
		const data = await updateEmailService(user_id, body.email);
		return res.status(200).json({ status: true, message: '', data });
	} catch (error) {
		next(error);
	}
};
