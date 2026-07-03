import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validateData<T extends z.ZodTypeAny>(schema: T) {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			req.validated = schema.parse({
				params: req.params,
				query: req.query,
				body: req.body,
			});

			next();
		} catch (error) {
			if (error instanceof ZodError) {
				const errorMessages = error.issues.map((issue: any) => ({
					message: `${issue.path.join('.')} is ${issue.message}`,
				}))
				res.status(400).json({ error: 'Invalid data', details: errorMessages });
			} else {
				res.status(500).json({ error: 'Internal Server Error' });
			}
		}
	};
}

