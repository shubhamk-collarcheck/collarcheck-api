import { z } from "zod";

import { Request } from "express";

export type TypedRequest<T extends z.ZodTypeAny> =
	Request & {
		validated: z.infer<T>;
	};



export const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" &&
	value !== null &&
	!Array.isArray(value);

export const isArray = Array.isArray;

export const isString = (value: unknown): value is string =>
	typeof value === "string";

export const isNumber = (value: unknown): value is number =>
	typeof value === "number" && !Number.isNaN(value);


export const isEmptyArray = (value: unknown): boolean =>
	Array.isArray(value) && value.length === 0;

export const isEmptyObject = (value: unknown): boolean =>
	isObject(value) && Object.keys(value).length === 0;

export const isBlank = (value?: string | null): boolean =>
	value == null || value.trim() === "";

export const isEmpty = (value: unknown): boolean => {
	if (value == null) return true;

	if (isString(value)) return value.trim() === "";

	if (isArray(value)) return value.length === 0;

	if (isObject(value)) return Object.keys(value).length === 0;

	return false;
};


export const sleep = (ms: number) =>
	new Promise(resolve => setTimeout(resolve, ms));

export const randomInt = (min: number, max: number): number =>
	Math.floor(Math.random() * (max - min + 1)) + min;

export const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

export const capitalize = (str: string): string =>
	str.charAt(0).toUpperCase() + str.slice(1);

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
	const copy = { ...obj };

	for (const key of keys) {
		delete copy[key];
	}

	return copy;
}

export const getS3Url = (key: string): string =>
	`https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;



export const isValidPhoneNumber = (phone: string): boolean => {
	return !/^\+?\d{8,15}$/.test(phone)
}
