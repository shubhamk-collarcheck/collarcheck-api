import { Request, Response, NextFunction } from "express";
import multer from 'multer';
import { Http2ServerResponse } from "node:http2";

export class HttpError extends Error {
	constructor(
		public status: number,
		message: string,
		public code?: string,
		public details?: unknown,
	) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace?.(this, this.constructor);
	}
}

export class NotFoundError extends HttpError {
	constructor(message = "Resource not found") {
		super(404, message);
	}
}

export class BadRequestError extends HttpError {
	constructor(message = "Bad request") {
		super(400, message);
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message = "Unauthorized") {
		super(401, message);
	}
}

export class ForbiddenError extends HttpError {
	constructor(message = "Forbidden") {
		super(403, message);
	}
}

export class ConflictError extends HttpError {
	constructor(message = "Conflict") {
		super(409, message);
	}
}
export const errorHandler = (
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction
) => {
	console.error(err);

	if (err instanceof HttpError) {
		return res.status(err.status).json({
			status: false,
			code: err.code,
			message: err.message,
			details: err.details,
		});
	}
	if (err instanceof multer.MulterError) {
		return res.status(400).json({ error: `Multer error: ${err.message}` });
	} else if (err) {
		return res.status(400).json({ error: err.message });
	}

	return res.status(500).json({
		status: false,
		code: "INTERNAL_SERVER_ERROR",
		message: "Internal server error",
	});
}
