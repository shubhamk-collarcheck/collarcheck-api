import documentRepositery from "../repositery/document.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import type { DocumentRequestBody } from "../types/document.types";

const s3Prefix = process.env.S3_PREFIX || '';

function decodeDocumentURL(value: string | null): string | null {
	if (!value) return null;
	return `${s3Prefix}${value}`;
}

export async function createDocumentService(
	userId: number,
	data: DocumentRequestBody,
	files?: Express.MulterS3.File[],
) {
	let docKey: string | null = null;

	if (files && files.length > 0) {
		docKey = files[0].key;
	}

	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	const save = {
		user: userId,
		doctype: data.doctype,
		doc: docKey,
		docnumber: null,
		status: 1,
		isDeleted: 0,
		createDate: now,
		modifyDate: now,
	};

	const result = await documentRepositery.create(save);
	if (!result) {
		throw new BadRequestError("Something Went Wrong");
	}
	return "Successfully Added !";
}

export async function allDocumentListService(userId: number) {
	const items = await documentRepositery.getAllByUserId(userId);
	return items.map(item => ({
		id: item.id,
		doctype: item.doctypeName || "",
		doc: decodeDocumentURL(item.doc),
		docnumber: item.docnumber || "",
		create_date: item.createDate || "",
	}));
}

export async function documentDetailService(userId: number, id: number) {
	const item = await documentRepositery.findByIdAndUser(id, userId);
	if (!item) {
		throw new BadRequestError("No record found!");
	}
	return {
		id: item.id,
		doctype: item.doctypeName || "",
		doctypeId: item.doctype,
		doc: decodeDocumentURL(item.doc),
		docnumber: item.docnumber || "",
		create_date: item.createDate || "",
	};
}

export async function deleteDocumentService(userId: number, id: number) {
	const deleted = await documentRepositery.deleteByUserAndId(userId, id);
	if (!deleted) {
		throw new BadRequestError("Try again something went wrong");
	}
	return " Deleted Successfully";
}
