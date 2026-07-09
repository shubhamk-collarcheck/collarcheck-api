import certificateRepositery from "../repositery/certificate.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import { type CertificateRequestBody } from "../types/certificate.types";
import { cybCourses, cybInstitutions } from "../db/schema";
import type { InferInsertModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import db from "../db";

const s3Prefix = process.env.S3_PREFIX || '';

type NewInstitution = InferInsertModel<typeof cybInstitutions>
type NewCourse = InferInsertModel<typeof cybCourses>

type ResolveResult<T> = {
	id: number | null
	data: T | null
}

async function resolveInstitution(value: string | number, userId: number): Promise<ResolveResult<NewInstitution>> {
	if (typeof value === "number") {
		return { id: value, data: null };
	}
	const name = value.trim();
	const [existing] = await db.select().from(cybInstitutions).where(
		and(eq(cybInstitutions.name, name), eq(cybInstitutions.status, 1))
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
		} as NewInstitution,
	};
}

async function resolveCourse(value: string | number, userId: number): Promise<ResolveResult<NewCourse>> {
	if (typeof value === "number") {
		return { id: value, data: null };
	}
	const name = value.trim();
	const [existing] = await db.select().from(cybCourses).where(
		and(eq(cybCourses.name, name), eq(cybCourses.status, 1))
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
		} as NewCourse,
	};
}

async function certificateTransaction(userId: number, data: CertificateRequestBody) {
	const [institution, course] = await Promise.all([
		resolveInstitution(data.university, userId),
		resolveCourse(data.course, userId),
	]);

	const result = await db.transaction(async (tx) => {
		let institutionId = institution.id;
		if (!institutionId && institution.data) {
			const [inserted] = await tx.insert(cybInstitutions).values(institution.data).$returningId();
			institutionId = inserted.id;
		}

		let courseId = course.id;
		if (!courseId && course.data) {
			const [inserted] = await tx.insert(cybCourses).values(course.data).$returningId();
			courseId = inserted.id;
		}

		return { institutionId, courseId };
	});

	return result;
}

function decodeCertificateURLs(value: string | null): string[] {
	if (!value) return [];
	return value.split(",").map(key => key.trim()).filter(Boolean).map(key => `${s3Prefix}${key}`);
}

export { decodeCertificateURLs };

function formatDate(dateStr: string | undefined): string | null {
	if (!dateStr) return null;
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return null;
	return d.toISOString().split("T")[0];
}

export async function createCertificateService(
	userId: number,
	data: CertificateRequestBody,
	files?: Express.MulterS3.File[],
) {
	const { institutionId, courseId } = await certificateTransaction(userId, data);

	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	let certificateArr: string[] = [];
	if (files && files.length > 0) {
		for (const f of files) {
			certificateArr.push(f.key);
		}
	}

	const certificate = certificateArr.length > 0 ? certificateArr.join(",") + "," : null;

	const save = {
		user: userId,
		university: institutionId,
		course: courseId,
		startDate: formatDate(data.start_date),
		endDate: formatDate(data.end_date),
		certificateId: data.certificate_id || null,
		url: data.url || null,
		ongoing: data.ongoing ? 1 : 0,
		certificate,
		createDate: now,
		modifyDate: now,
		status: 1,
		isDeleted: 0,
	};

	const result = await certificateRepositery.create(save);
	if (!result) {
		throw new BadRequestError("Something Went Wrong");
	}
	return "Successfully Added !";
}

export async function updateCertificateService(
	userId: number,
	certificateId: number,
	data: CertificateRequestBody,
	files?: Express.MulterS3.File[],
) {
	const existing = await certificateRepositery.findById(certificateId);
	if (!existing || existing.user !== userId) {
		throw new BadRequestError("Certificate not found");
	}

	const { institutionId, courseId } = await certificateTransaction(userId, data);

	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	let certificateArr: string[] = [];
	if (existing.certificate) {
		certificateArr = existing.certificate.split(",").filter(Boolean);
	}

	if (files && files.length > 0) {
		for (const f of files) {
			certificateArr.push(f.key);
		}
	}

	const certificate = certificateArr.length > 0 ? certificateArr.join(",") + "," : null;

	const save = {
		university: institutionId,
		course: courseId,
		startDate: formatDate(data.start_date),
		endDate: formatDate(data.end_date),
		certificateId: data.certificate_id || null,
		url: data.url || null,
		ongoing: data.ongoing ? 1 : 0,
		certificate,
		modifyDate: now,
	};

	await certificateRepositery.update(certificateId, save);
	return "Successfully updated !";
}

export async function allCertificateListService(userId: number) {
	const items = await certificateRepositery.getAllByUserId(userId);
	return items.map(item => ({
		id: item.id,
		university: item.universityName || "",
		course: item.courseName || "",
		start_date: item.startDate || "",
		end_date: item.endDate || "",
		certificate_id: item.certificateId || "",
		url: item.url || "",
		ongoing: item.ongoing === 1,
		document: decodeCertificateURLs(item.certificate),
	}));
}

export async function certificateDetailService(userId: number, id: number) {
	const item = await certificateRepositery.findByIdAndUser(id, userId);
	if (!item) {
		throw new BadRequestError("No record found!");
	}
	return {
		id: item.id,
		university: item.universityName || "",
		course: item.courseName || "",
		courseId: item.course,
		universityId: item.university,
		start_date: item.startDate || "",
		end_date: item.endDate || "",
		certificate_id: item.certificateId || "",
		url: item.url || "",
		ongoing: item.ongoing === 1,
		document: decodeCertificateURLs(item.certificate),
	};
}

export async function deleteCertificateService(userId: number, id: number) {
	const deleted = await certificateRepositery.deleteByUserAndId(userId, id);
	if (!deleted) {
		throw new BadRequestError("Try again something went wrong");
	}
	return " Deleted Sucessfully";
}
