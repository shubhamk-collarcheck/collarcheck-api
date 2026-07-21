import profileReviewRepositery from "../repositery/profile-review.repositery";
import cityRepositery from "../repositery/city.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import type {
	ReviewRequestBody, ChangeEmploymentBasicBody, EditUserBasic, EditUserAddress, EditUserEmployment,
	EditUserSocial, EditUserBody, EditUserTypeCode,
} from "../types/profile-review.types";
import { EditUserType } from "../types/profile-review.types";
import { cybDesignation, cybWorkType, cybUser } from "../db/schema";
import { and, eq } from "drizzle-orm";
import db from "../db";

function nowSql() {
	return new Date().toISOString().replace("T", " ").split(".")[0];
}

/** Resolve id-or-free-text: number → use as-is; string → find/create lookup row. */
async function resolveIdOrCreate(
	value: number | string | undefined | null,
	opts: {
		findByName: (name: string) => Promise<number | null>;
		create: (name: string) => Promise<number>;
		emptyAs?: number | null | "";
	},
): Promise<number | null | ""> {
	if (value === undefined || value === null || value === "") {
		return opts.emptyAs !== undefined ? opts.emptyAs : null;
	}
	if (typeof value === "number") {
		return value;
	}
	const asNum = Number(value);
	if (!Number.isNaN(asNum) && String(asNum) === String(value).trim()) {
		return asNum;
	}
	const name = String(value).trim();
	const existing = await opts.findByName(name);
	if (existing != null) return existing;
	return opts.create(name);
}

// Current Company service
export async function currentCompanyService(userId: number) {
	const companies = await profileReviewRepositery.getCurrentCompanies(userId);

	const result = [];
	for (const company of companies) {
		if (company.company === null) continue;
		const designations = await profileReviewRepositery.getDesignationsByCompany(userId, company.company);
		result.push({
			id: company.company,
			name: company.companyName || "",
			list: designations.map(d => ({
				id: d.id,
				name: d.name || "",
			})),
		});
	}

	return result;
}

// Review ownership check
async function verifyReviewOwnership(ratingId: number, userId: number) {
	const rating = await profileReviewRepositery.getRatingById(ratingId);
	if (!rating) {
		throw new BadRequestError("Review not found!!");
	}

	const experience = await profileReviewRepositery.getExperienceById(rating.experience!);
	if (!experience || experience.user !== userId) {
		throw new BadRequestError("Review not found!!");
	}

	return { rating, experience };
}

// Add/Update Review service
export async function upsertReviewService(
	userId: number,
	data: ReviewRequestBody,
	files?: Express.MulterS3.File[],
) {
	const experience = await profileReviewRepositery.getExperienceById(data.experience);
	if (!experience || experience.user !== userId) {
		throw new BadRequestError("Experience not found");
	}

	let docArr: string[] = [];
	if (files && files.length > 0) {
		for (const f of files) {
			docArr.push(f.key);
		}
	}

	const docJson = docArr.length > 0 ? JSON.stringify(docArr) : null;
	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	// Check if updating existing review
	const existingRating = await profileReviewRepositery.getRatingById(experience.id);
	if (existingRating && existingRating.approved === 1) {
		throw new BadRequestError("Company have approved your rating can't change review");
	}

	if (existingRating) {
		// Update existing
		let existingDoc: string[] = [];
		if (existingRating.doc) {
			try {
				const parsed = JSON.parse(existingRating.doc);
				if (Array.isArray(parsed)) {
					existingDoc = parsed;
				}
			} catch {
				// ignore
			}
		}

		const mergedDoc = [...existingDoc, ...docArr];
		const mergedDocJson = mergedDoc.length > 0 ? JSON.stringify(mergedDoc) : null;

		await profileReviewRepositery.updateRating(existingRating.id, {
			experience: data.experience,
			company: experience.company,
			rating: data.rating,
			review: data.review,
			link: data.link || null,
			doc: mergedDocJson,
			modifyDate: now,
		});

		return "Update review successfully!";
	} else {
		// Create new
		const result = await profileReviewRepositery.createRating({
			experience: data.experience,
			company: experience.company,
			rating: data.rating,
			review: data.review,
			link: data.link || null,
			doc: docJson,
			addedBy: 0,
			status: 1,
			approved: 0,
			showHome: 0,
			createDate: now,
			modifyDate: now,
		});

		if (!result) {
			throw new BadRequestError("Something Went Wrong");
		}

		return "Review submit successfully!";
	}
}

// Delete Review service
export async function deleteReviewService(userId: number, id: number) {
	if (!id) {
		throw new BadRequestError("id is required!");
	}

	await verifyReviewOwnership(id, userId);
	await profileReviewRepositery.hardDeleteRating(id);

	return "Review delete successfully!";
}

// Remove document from review service
export async function removeReviewDocumentService(userId: number, ratingId: number, link: string) {
	const { rating } = await verifyReviewOwnership(ratingId, userId);

	let docArr: string[] = [];
	if (rating.doc) {
		try {
			const parsed = JSON.parse(rating.doc);
			if (Array.isArray(parsed)) {
				docArr = parsed;
			}
		} catch {
			// ignore
		}
	}

	const filteredDoc = docArr.filter(doc => doc !== link);
	const filteredDocJson = filteredDoc.length > 0 ? JSON.stringify(filteredDoc) : null;

	await profileReviewRepositery.removeDocumentFromRating(ratingId, filteredDocJson);

	return "Review document detele successfully!";
}

// Show home review toggle service
export async function toggleShowHomeReviewService(userId: number, id: number) {
	if (!id) {
		throw new BadRequestError("ID is required!");
	}

	const { rating } = await verifyReviewOwnership(id, userId);

	const newShowHome = rating.showHome === 1 ? 0 : 1;
	await profileReviewRepositery.updateRating(id, { showHome: newShowHome });

	return newShowHome === 1 ? "Review show successfully!" : "Review hide successfully!";
}

// ---------------------------------------------------------------------------
// Edit user profile — single endpoint POST /edit-user
// Internally split by EditUserType enum (BASIC=1, ADDRESS=2, EMPLOYMENT=3, SOCIAL=4)
// ---------------------------------------------------------------------------

type UploadedFiles =
	| Express.MulterS3.File[]
	| { [fieldname: string]: Express.MulterS3.File[] }
	| undefined;

function flattenFiles(files: UploadedFiles): Express.MulterS3.File[] {
	if (!files) return [];
	if (Array.isArray(files)) return files;
	return Object.values(files).flat();
}

/** Section: basic — name, DOB, gender, profile image, resume */
export async function editUserBasicService(userId: number, data: EditUserBasic, files?: UploadedFiles,) {
	const now = nowSql();
	const uploaded = flattenFiles(files);

	const updateData: Record<string, unknown> = {
		fname: data.fname,
		lname: data.lname || null,
		dob: data.dob,
		gender: data.gender,
		displayType: data.display_type || null,
		profileDescription: data.profile_description || null,
		modifyDate: now,
	};

	const profileFile = uploaded.find((f) => f.fieldname === "profile");
	if (profileFile) {
		updateData.profile = profileFile.key;
	}

	const resumeFile = uploaded.find((f) => f.fieldname === "resume");
	if (resumeFile) {
		updateData.resume = resumeFile.key;
		updateData.resumeName = resumeFile.originalname;
		updateData.cvPop = 1; // PHP: resume upload sets cvPop
	}

	await profileReviewRepositery.updateUser(userId, updateData as any);

	// Keep verify_document in sync with full name
	const verifyDoc = await profileReviewRepositery.getVerifyDocument(userId);
	if (verifyDoc?.docName) {
		const fullName = `${data.fname} ${data.lname || ""}`.trim();
		const isMatch = fullName.toLowerCase() === verifyDoc.docName.toLowerCase();
		await profileReviewRepositery.updateVerifyDocument(userId, isMatch ? 1 : 0);
	}

	return "Successfully Updated";
}

/** Section: address — city/state/country + present/permanent */
export async function editUserAddressService(userId: number, data: EditUserAddress) {
	const now = nowSql();

	let cityId: number | null = null;
	if (data.city !== undefined && data.city !== null && data.city !== "") {
		cityId = (await resolveIdOrCreate(data.city, {
			findByName: async (name) => {
				const row = await cityRepositery.findByName(name);
				return row?.id ?? null;
			},
			create: async (name) => {
				const result = await cityRepositery.create({
					name,
					userDifined: 1, // schema column typo: user_difined
					userId,
					status: 1,
					state: data.state ? Number(data.state) || null : null,
					createDate: now,
					modifyDate: now,
				} as any);
				return result.id;
			},
			emptyAs: null,
		})) as number | null;
	}

	const updateData = {
		city: cityId,
		state: data.state ?? null,
		accomodation: data.accomodation || null,
		presentAddress: data.present_address || null,
		sameAddress: data.same_address ? 1 : 0,
		permanentAddress: data.same_address
			? (data.present_address || null)
			: (data.permanent_address || null),
		country: data.country || null,
		modifyDate: now,
	};

	await profileReviewRepositery.updateUser(userId, updateData as any);

	return "Successfully Updated";
}

/** Section: employment — work status, position, company, notice, exploring */
export async function editUserEmploymentService(userId: number, data: EditUserEmployment) {
	const now = nowSql();

	const workStatus = await resolveIdOrCreate(data.work_status, {
		findByName: async (name) => {
			const [row] = await db
				.select({ id: cybWorkType.id })
				.from(cybWorkType)
				.where(and(eq(cybWorkType.name, name), eq(cybWorkType.status, 1)));
			return row?.id ?? null;
		},
		create: async (name) => {
			const [inserted] = await db
				.insert(cybWorkType)
				.values({
					name,
					userDefined: 1,
					userId,
					status: 1,
					createDate: now,
					modifyDate: now,
				} as any)
				.$returningId();
			return inserted.id;
		},
	});

	const currentPosition = await resolveIdOrCreate(data.current_position, {
		findByName: async (name) => {
			const [row] = await db
				.select({ id: cybDesignation.id })
				.from(cybDesignation)
				.where(and(eq(cybDesignation.name, name), eq(cybDesignation.status, 1)));
			return row?.id ?? null;
		},
		create: async (name) => {
			const [inserted] = await db
				.insert(cybDesignation)
				.values({
					name,
					userDefined: 1,
					userId,
					status: 1,
					createDate: now,
					modifyDate: now,
				} as any)
				.$returningId();
			return inserted.id;
		},
		emptyAs: "",
	});

	const currentCompany = await resolveIdOrCreate(data.current_company, {
		findByName: async (name) => {
			const [row] = await db
				.select({ id: cybUser.id })
				.from(cybUser)
				.where(and(eq(cybUser.fname, name), eq(cybUser.userType, 2), eq(cybUser.status, 1)));
			return row?.id ?? null;
		},
		create: async (name) => {
			const [inserted] = await db
				.insert(cybUser)
				.values({
					fname: name,
					userType: 2,
					userDefinedCompany: 1,
					status: 1,
					createDate: now,
					modifyDate: now,
				} as any)
				.$returningId();
			return inserted.id;
		},
		emptyAs: "",
	});

	const onImmediate = Boolean(data.on_immediate);
	const onNotice = Boolean(data.on_notice);
	const onExplore = Boolean(data.on_explore);

	const updateData = {
		workStatus: workStatus === "" ? null : workStatus,
		currentPossition: currentPosition === "" ? null : currentPosition,
		currentCompany: currentCompany === "" ? null : currentCompany,
		expectedSalary: data.expected_salary || null,
		expectedMode: data.expected_mode || null,
		expectedInhand: data.expected_inhand || null,
		onImmediate: onImmediate ? 1 : 0,
		noticePeriod: onImmediate ? (data.notice_period || null) : null,
		onNotice: onNotice ? 1 : 0,
		noticeDate:
			onNotice && data.notice_date && data.notice_date !== "null"
				? data.notice_date
				: null,
		onExplore: onExplore ? 1 : 0,
		modifyDate: now,
	};

	await profileReviewRepositery.updateUser(userId, updateData as any);

	const detailsData: Record<string, unknown> = {};
	if (data.exploring_option) {
		detailsData.exploringOption = JSON.stringify(data.exploring_option);
	}
	if (data.noticeEmployments) {
		const arr = data.noticeEmployments.split(",").map((s) => s.trim()).filter(Boolean);
		detailsData.noticeEmployments = arr.length ? JSON.stringify(arr) : null;
	}
	if (Object.keys(detailsData).length > 0) {
		await profileReviewRepositery.upsertUserDetails(userId, detailsData as any);
	}

	return "Successfully Updated";
}

/** Section: social — LinkedIn, YouTube, Instagram, Facebook, Twitter */
export async function editUserSocialService(userId: number, data: EditUserSocial) {
	const now = nowSql();

	await profileReviewRepositery.updateUser(userId, {
		linkdin: data.linkdin || null,
		youtube: data.youtube || null,
		instagram: data.instagram || null,
		facebook: data.facebook || null,
		twitter: data.twitter || null,
		modifyDate: now,
	} as any);

	return "Successfully Updated";
}

/**
 * POST /edit-user?type=N
 * @param type  from req.query only (1=basic, 2=address, 3=employment, 4=social)
 * @param body  form fields only — no type field
 */
export async function editUserProfileService(userId: number, type: EditUserTypeCode, body: EditUserBody, files?: UploadedFiles,) {
	switch (type) {
		case EditUserType.BASIC:
			return editUserBasicService(userId, body as EditUserBasic, files);
		case EditUserType.ADDRESS:
			return editUserAddressService(userId, body as EditUserAddress);
		case EditUserType.EMPLOYMENT:
			return editUserEmploymentService(userId, body as EditUserEmployment);
		case EditUserType.SOCIAL:
			return editUserSocialService(userId, body as EditUserSocial);
		default:
			throw new BadRequestError("Invalid type");
	}
}



// Change employment basic service
export async function changeEmploymentBasicService(
	userId: number,
	data: ChangeEmploymentBasicBody,
) {
	const experience = await profileReviewRepositery.getExperienceById(data.experience_id);
	if (!experience || experience.user !== userId) {
		throw new BadRequestError("Experience not found");
	}

	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	// Check for existing update request
	const existingUpdate = await profileReviewRepositery.getUpdateExperience(data.experience_id, data.type);

	let designationId: number | null = null;
	if (data.designation) {
		if (typeof data.designation === 'number') {
			designationId = data.designation;
		} else {
			// Auto-create designation if needed
			const name = data.designation.trim();
			const [existing] = await db.select().from(cybDesignation).where(
				and(eq(cybDesignation.name, name), eq(cybDesignation.status, 1))
			);
			if (existing) {
				designationId = existing.id;
			} else {
				const [inserted] = await db.insert(cybDesignation).values({
					name,
					userDefined: 1,
					status: 1,
				}).$returningId();
				designationId = inserted.id;
			}
		}
	}

	const updateData = {
		experienceId: data.experience_id,
		user: userId,
		salary: data.salary || null,
		salaryInhand: data.salary_inhand || null,
		salaryMode: data.salary_mode || null,
		designation: designationId,
		workedTillDate: data.worked_till_date || null,
		type: data.type,
		status: 1,
		isDeleted: 0,
		createDate: now,
		modifyDate: now,
	};

	if (existingUpdate) {
		// Update existing
		await profileReviewRepositery.updateUpdateExperience(existingUpdate.id, updateData);
		await profileReviewRepositery.updateUpdateExperienceHistory(existingUpdate.id, updateData);
	} else {
		// Create new
		const newUpdate = await profileReviewRepositery.createUpdateExperience(updateData);
		if (newUpdate) {
			await profileReviewRepositery.createUpdateExperienceHistory({
				...updateData,
				updateId: newUpdate.id,
				parent: 0,
			});
		}
	}

	// Handle leave type specific logic
	if (data.type === 1 && data.worked_till_date) {
		const today = new Date().toISOString().split('T')[0];
		if (data.worked_till_date <= today) {
			await profileReviewRepositery.updateExperienceStillWorking(data.experience_id, 0);
			await profileReviewRepositery.clearUserCurrentPosition(userId);
		}
	}

	return "Request Submit Successfully!";
}
