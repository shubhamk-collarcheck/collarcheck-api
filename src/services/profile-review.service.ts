import profileReviewRepositery from "../repositery/profile-review.repositery";
import designationRepositery from "../repositery/designation.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import type { ReviewRequestBody, ChangeEmploymentBasicBody, EditUserBasic, EditUserAddress, EditUserWorkStatus, EditUserSocialLinks } from "../types/profile-review.types";
import { cybDesignation } from "../db/schema";
import { and, eq } from "drizzle-orm";
import db from "../db";

const s3Prefix = process.env.S3_PREFIX || '';

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

// Edit user profile service
export async function editUserProfileService(
	userId: number,
	data: EditUserBasic | EditUserAddress | EditUserWorkStatus | EditUserSocialLinks,
	files?: Express.MulterS3.File[],
) {
	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	switch (data.type) {
		case 1: {
			// Basic info
			const updateData: any = {
				fname: data.fname,
				lname: data.lname || null,
				dob: data.dob,
				gender: data.gender,
				displayType: data.display_type || null,
				profileDescription: data.profile_description || null,
				modifyDate: now,
			};

			// Handle profile image upload
			if (files && files.length > 0) {
				const profileFile = files.find(f => f.fieldname === 'profile');
				if (profileFile) {
					updateData.profile = profileFile.key;
				}
				const resumeFile = files.find(f => f.fieldname === 'resume');
				if (resumeFile) {
					updateData.resume = resumeFile.key;
					updateData.resumeName = resumeFile.originalname;
				}
			}

			await profileReviewRepositery.updateUser(userId, updateData);

			// Name verification
			const verifyDoc = await profileReviewRepositery.getVerifyDocument(userId);
			if (verifyDoc && verifyDoc.docName) {
				const fullName = `${data.fname} ${data.lname || ''}`.trim();
				const isMatch = fullName.toLowerCase() === verifyDoc.docName.toLowerCase();
				await profileReviewRepositery.updateVerifyDocument(userId, isMatch ? 1 : 0);
			}

			break;
		}

		case 2: {
			// Address
			let cityId: number | null = null;
			if (typeof data.city === 'number') {
				cityId = data.city;
			} else if (typeof data.city === 'string') {
				// Auto-create city if needed
				cityId = parseInt(data.city) || null;
			}

			const updateData: any = {
				city: cityId,
				state: data.state,
				accomodation: data.accomodation || null,
				presentAddress: data.present_address || null,
				sameAddress: data.same_address ? 1 : 0,
				permanentAddress: data.same_address ? data.present_address : (data.permanent_address || null),
				country: data.country || null,
				modifyDate: now,
			};

			await profileReviewRepositery.updateUser(userId, updateData);

			// Geocoding would go here if needed
			break;
		}

		case 3: {
			// Work status
			const updateData: any = {
				workStatus: typeof data.work_status === 'number' ? data.work_status : null,
				currentPossition: typeof data.current_position === 'number' ? data.current_position : null,
				currentCompany: typeof data.current_company === 'number' ? data.current_company : null,
				expectedSalary: data.expected_salary || null,
				expectedMode: data.expected_mode || null,
				expectedInhand: data.expected_inhand || null,
				onImmediate: data.on_immediate ? 1 : 0,
				noticePeriod: data.notice_period || null,
				onNotice: data.on_notice ? 1 : 0,
				noticeDate: data.notice_date || null,
				onExplore: data.on_explore ? 1 : 0,
				modifyDate: now,
			};

			await profileReviewRepositery.updateUser(userId, updateData);

			// Update user details
			const detailsData: any = {};
			if (data.exploring_option) {
				detailsData.exploringOption = JSON.stringify(data.exploring_option);
			}
			if (data.noticeEmployments) {
				detailsData.noticeEmployments = JSON.stringify(data.noticeEmployments.split(','));
			}

			if (Object.keys(detailsData).length > 0) {
				await profileReviewRepositery.upsertUserDetails(userId, detailsData);
			}

			break;
		}

		case 4: {
			// Social links
			const updateData: any = {
				linkdin: data.linkdin || null,
				youtube: data.youtube || null,
				instagram: data.instagram || null,
				facebook: data.facebook || null,
				twitter: data.twitter || null,
				modifyDate: now,
			};

			await profileReviewRepositery.updateUser(userId, updateData);
			break;
		}

		default:
			throw new BadRequestError("Invalid type");
	}

	return "Successfully Updated";
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
