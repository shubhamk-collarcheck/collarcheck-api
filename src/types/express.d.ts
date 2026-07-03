import "express";

export interface AuthUser {
	user_id: number;
	id: number;
	user_type: number | null;
	token: string;
}

declare global {
	namespace Express {
		interface Request {
			auth?: AuthUser;
			validated?: unknown;
		}
	}
}

export { }
