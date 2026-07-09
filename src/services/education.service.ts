import educationRepositery from "../repositery/education.repositery";
import institutionRepositery from "../repositery/institution.repositery";
import courseRepositery from "../repositery/course.repositery";
import cityRepositery from "../repositery/city.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import db from "../db";
import { cybCities, cybCourses, cybInstitutions } from "../db/schema";
import type { EducationBody } from "../types/education.types";
import type { InferInsertModel } from "drizzle-orm";

type NewInstitution = InferInsertModel<typeof cybInstitutions>
type NewCourse = InferInsertModel<typeof cybCourses>
type NewCity = InferInsertModel<typeof cybCities>

type ResolveResult<T> = {
	id: number | null
	data: T | null
}

async function resolveInstitution(value: string | number, userId: number): Promise<ResolveResult<NewInstitution>> {
	if (typeof value === "number") {
		return { id: value, data: null };
	}
	const name = value.trim();
	const existing = await institutionRepositery.findByName(name);
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
	const existing = await courseRepositery.findByName(name);
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

async function resolveCity(value: string | number | undefined, userId: number, stateId?: number): Promise<ResolveResult<NewCity>> {
	if (!value) {
		return { id: null, data: null };
	}
	if (typeof value === "number") {
		return { id: value, data: null };
	}
	const trimmed = value.trim();
	const existing = await cityRepositery.findByName(trimmed);
	if (existing) {
		return { id: existing.id, data: null };
	}
	const data: Record<string, unknown> = {
		name: trimmed,
		userDifined: 1,
		userId,
		status: 1,
	};
	if (stateId) data.state = stateId;
	return { id: null, data: data as NewCity };
}

async function educationTransaction(userId: number, data: EducationBody) {
	const [institution, course, city] = await Promise.all([
		resolveInstitution(data.university, userId),
		resolveCourse(data.course, userId),
		resolveCity(data.city, userId, data.state),
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

		let cityId = city.id;
		if (!cityId && city.data) {
			const [inserted] = await tx.insert(cybCities).values(city.data).$returningId();
			cityId = inserted.id;
		}

		return { institutionId, courseId, cityId };
	});

	return result;
}

function formatDate(dateStr: string | undefined): string | null {
	if (!dateStr) return null;
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return null;
	return d.toISOString().split("T")[0];
}

export async function createEducationService(
	userId: number,
	data: EducationBody,
	files?: Express.MulterS3.File[],
) {
	const { institutionId, courseId, cityId } = await educationTransaction(userId, data);

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
		courseType: data.course_type,
		state: data.state ?? null,
		city: cityId,
		country: data.country ?? null,
		startingDate: formatDate(data.starting_date),
		endingDate: formatDate(data.ending_date),
		ishighest: data.ishighest ? 1 : 0,
		ongoing: data.ongoing ? 1 : 0,
		certificate,
		createDate: now,
		modifyDate: now,
		status: 1,
		isDeleted: 0,
	};

	if (data.ishighest) {
		await educationRepositery.clearIshighest(userId);
	}

	await educationRepositery.create(save);
	return "Successfully added !";
}

export async function updateEducationService(
	userId: number,
	educationId: number,
	data: EducationBody,
	files?: Express.MulterS3.File[],
) {
	const existing = await educationRepositery.findById(educationId);
	if (!existing) {
		throw new BadRequestError("Education record not found");
	}

	const { institutionId, courseId, cityId } = await educationTransaction(userId, data);

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
		user: userId,
		university: institutionId,
		course: courseId,
		courseType: data.course_type,
		state: data.state ?? null,
		city: cityId,
		country: data.country ?? null,
		startingDate: formatDate(data.starting_date),
		endingDate: formatDate(data.ending_date),
		ishighest: data.ishighest ? 1 : 0,
		ongoing: data.ongoing ? 1 : 0,
		certificate,
		modifyDate: now,
	};

	if (data.ishighest) {
		await educationRepositery.clearIshighest(userId, educationId);
	}

	await educationRepositery.update(educationId, save);
	return "Successfully Updated !";
}

export async function allEducationListService(id: number) {
	return await educationRepositery.getEducationList(id);
}

export async function educationDetailService(userId: number, id: number) {
	return await educationRepositery.getEducationDetail(id, userId);
}

export async function deleteEducationService(userId: number, educationId: number) {
	const deleted = await educationRepositery.deleteEducation(educationId, userId);
	if (!deleted) {
		throw new BadRequestError("Education not found");
	}
	return "Deleted Sucessfully";
}
