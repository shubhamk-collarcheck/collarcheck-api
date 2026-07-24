import languageRepositery from "../repositery/language.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import type { LanguageRequestBody } from "../types/language.types";

type ResolveResult = {
	id: number | null
	data: { name: string; userDefined: number; userId: number; status: number } | null
}

async function resolveLanguage(value: string | number, userId: number): Promise<ResolveResult> {
	if (typeof value === "number") {
		return { id: value, data: null };
	}
	const name = value.trim();
	const existing = await languageRepositery.findMasterByName(name);
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

export async function upsertLanguageService(
	userId: number,
	data: LanguageRequestBody,
) {
	const resolved = await resolveLanguage(data.language, userId);

	let languageId = resolved.id;
	if (!languageId && resolved.data) {
		languageId = await languageRepositery.createMasterLanguage(resolved.data);
	}

	if (!languageId) {
		throw new BadRequestError("Something Went Wrong");
	}

	const existing = await languageRepositery.findByUserAndLanguage(userId, languageId);
	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	if (existing) {
		await languageRepositery.update(existing.id, {
			verbal: data.verbal,
			written: data.written,
			modifyDate: now,
		});
		// PHP upsert always returns "Successfully added"
		return "Successfully added";
	}

	const result = await languageRepositery.create({
		user: userId,
		language: languageId,
		verbal: data.verbal,
		written: data.written,
		status: 1,
		isDeleted: 0,
		createDate: now,
		modifyDate: now,
	});
	if (!result) {
		throw new BadRequestError("Something Went Wrong");
	}
	return "Successfully added";
}

function mapUserLanguageRow(item: {
	id: number;
	user: number | null;
	language: number | null;
	verbal: number | null;
	written: number | null;
	status: number | null;
	createDate: string | null;
	modifyDate: string | null;
	languageName: string | null;
}) {
	return {
		id: item.id,
		user: item.user,
		language: item.language,
		verbal: item.verbal,
		written: item.written,
		status: item.status,
		create_date: item.createDate ?? null,
		modify_date: item.modifyDate ?? null,
		language_name: item.languageName ?? null,
	};
}

export async function allLanguageListService(userId: number) {
	const items = await languageRepositery.getAllByUserId(userId);
	return items.map(mapUserLanguageRow);
}

export async function languageDetailService(userId: number, id: number) {
	const item = await languageRepositery.findByIdAndUser(id, userId);
	if (!item) {
		throw new BadRequestError("No record found!");
	}
	return mapUserLanguageRow(item);
}

export async function deleteLanguageService(userId: number, id: number) {
	const deleted = await languageRepositery.hardDelete(userId, id);
	if (!deleted) {
		throw new BadRequestError("Try again something went wrong");
	}
	return "language deleted ";
}
