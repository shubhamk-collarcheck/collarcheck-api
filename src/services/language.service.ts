import languageRepositery from "../repositery/language.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import type { LanguageRequestBody } from "../types/language.types";
import { cybLanguages } from "../db/schema";
import { and, eq } from "drizzle-orm";
import db from "../db";

type ResolveResult = {
	id: number | null
	data: { name: string; userDefined: number; userId: number; status: number } | null
}

async function resolveLanguage(value: string | number, userId: number): Promise<ResolveResult> {
	if (typeof value === "number") {
		return { id: value, data: null };
	}
	const name = value.trim();
	const [existing] = await db.select().from(cybLanguages).where(
		and(eq(cybLanguages.name, name), eq(cybLanguages.status, 1))
	);
	if (existing) {
		return { id: existing.id, data: null };
	}
	return {
		id: null,
		data: {
			name,
			userDefined: 1,
			userId,
			status: 1,
		},
	};
}

async function languageTransaction(userId: number, data: LanguageRequestBody) {
	const language = await resolveLanguage(data.language, userId);

	const result = await db.transaction(async (tx) => {
		let languageId = language.id;
		if (!languageId && language.data) {
			const [inserted] = await tx.insert(cybLanguages).values(language.data).$returningId();
			languageId = inserted.id;
		}

		return { languageId };
	});

	return result;
}

export async function upsertLanguageService(
	userId: number,
	data: LanguageRequestBody,
) {
	const { languageId } = await languageTransaction(userId, data);

	const existing = await languageRepositery.findByUserAndLanguage(userId, languageId!);

	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	if (existing) {
		const save = {
			verbal: data.verbal,
			written: data.written,
			modifyDate: now,
		};
		await languageRepositery.update(existing.id, save);
		return "Successfully updated";
	} else {
		const save = {
			user: userId,
			language: languageId,
			verbal: data.verbal,
			written: data.written,
			status: 1,
			isDeleted: 0,
		};
		const result = await languageRepositery.create(save);
		if (!result) {
			throw new BadRequestError("Something Went Wrong");
		}
		return "Successfully added";
	}
}

export async function allLanguageListService(userId: number) {
	const items = await languageRepositery.getAllByUserId(userId);
	return items.map(item => ({
		id: item.id,
		language: item.languageName || "",
		languageId: item.language,
		verbal: item.verbal || "",
		written: item.written || "",
		create_date: item.createDate || "",
	}));
}

export async function languageDetailService(userId: number, id: number) {
	const item = await languageRepositery.findByIdAndUser(id, userId);
	if (!item) {
		throw new BadRequestError("No record found!");
	}
	return {
		id: item.id,
		language: item.languageName || "",
		languageId: item.language,
		verbal: item.verbal || "",
		written: item.written || "",
		create_date: item.createDate || "",
	};
}

export async function deleteLanguageService(userId: number, id: number) {
	const deleted = await languageRepositery.hardDelete(userId, id);
	if (!deleted) {
		throw new BadRequestError("Try again something went wrong");
	}
	return "language deleted ";
}
