import companyRepositery from '../repositery/company.repositery';
import { getSettingService, saveSettingService } from './common-auth.service';

const s3Prefix = process.env.S3_PREFIX || '';

// ====== 1. Get Setting (Reuses common-auth) ======

export async function getCompanySettingService(userId: number) {
	return getSettingService(userId);
}

// ====== 2. Save Setting (Reuses common-auth) ======

export async function saveCompanySettingService(userId: number, body: Record<string, any>) {
	return saveSettingService(userId, body);
}

// ====== 3. Edit Company ======

function extractDomain(url: string): string | null {
	try {
		let hostname = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
		hostname = hostname.replace(/^www\./, '');
		return hostname || null;
	} catch {
		return null;
	}
}

export async function editCompanyService(userId: number, type: number, data: Record<string, any>, profilePath?: string) {
	const user = await companyRepositery.findUserById(userId);
	if (!user) {
		return { status: false, messages: "Access denied" };
	}

	const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

	if (type === 1) {
		if (!data.company_name || !data.contact_person) {
			return { status: false, messages: "company_name,contact_person are required." };
		}

		if (data.website) {
			let websiteUrl = data.website;
			if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
				websiteUrl = `https://${websiteUrl}`;
			}

			const isUnique = await companyRepositery.checkWebsiteUnique(websiteUrl, userId);
			if (!isUnique) {
				return { status: false, messages: "This website is already associated with another company." };
			}

			data.website = websiteUrl;
			const domain = extractDomain(websiteUrl);
			if (domain) {
				await companyRepositery.insertUserDomain(userId, domain);
			}
		}

		if (data.industry && isNaN(Number(data.industry))) {
			const existingIndustry = await companyRepositery.findIndustryByName(data.industry);
			if (existingIndustry) {
				data.industry = existingIndustry.id;
			} else {
				const newIndustryId = await companyRepositery.createIndustry(data.industry);
				data.industry = newIndustryId;
			}
		}

		if (profilePath) {
			data.profile = profilePath;
		}

		await companyRepositery.updateCompanyProfile(userId, data);

		if (data.company_name && data.company_name !== user.fname) {
			await companyRepositery.updateVerifyDocument(userId);
		}
	} else if (type === 2) {
		if (data.city && isNaN(Number(data.city))) {
			const stateId = data.state || user.state;
			const countryId = data.country || user.country;
			const existingCity = await companyRepositery.findCityByName(data.city);
			if (existingCity) {
				data.city = existingCity.id;
			} else {
				const newCityId = await companyRepositery.createCity(data.city, stateId);
				data.city = newCityId;
			}
		} else if (data.city) {
			data.city = Number(data.city);
		}

		await companyRepositery.updateCompanyAddress(userId, data);
	} else if (type === 3) {
		await companyRepositery.updateCompanySocial(userId, data);
	} else {
		return { status: false, messages: "Invalid Param" };
	}

	return { status: true, messages: "Successfully Updated" };
}

// ====== 4. All Connection ======

export async function allConnectionService(companyId: number, keyword: string, sortBy: number, limit: number, offset: number) {
	const [currentEmployees, pastEmployees, currentCount, pastCount] = await Promise.all([
		companyRepositery.getCurrentEmployees(companyId, keyword, sortBy, limit, offset),
		companyRepositery.getPastEmployees(companyId, keyword, sortBy, limit, offset),
		companyRepositery.countCurrentEmployees(companyId),
		companyRepositery.countPastEmployees(companyId),
	]);

	const currentWithRatings = await Promise.all(
		currentEmployees.map(async (emp) => {
			const [rating, inWishlist] = await Promise.all([
				companyRepositery.getUserRating(emp.user),
				companyRepositery.checkInWishlist(companyId, emp.user),
			]);
			return {
				user: emp.user,
				profile: emp.profile ? `${s3Prefix}${emp.profile}` : (emp.socialImage || ''),
				username: `${emp.fname ?? ''} ${emp.lname ?? ''}`.trim(),
				contact_person: emp.phone,
				email: emp.email,
				designation: emp.designationName,
				employee_status: "Current",
				connectiondate: emp.createDate,
				approved: emp.approved,
				experience_id: emp.experienceId,
				linkdin: emp.linkdin,
				individual_id: emp.individualId,
				is_verified: emp.emailVerified === 1 || emp.phoneVerified === 1,
				slug: emp.slug,
				profile_description: emp.profileDescription,
				dob: emp.dob,
				present_address: emp.presentAddress,
				joining_date: emp.joiningDate,
				last_modify_date: emp.createDate,
				account_create_date: emp.createDate,
				totalRating: rating,
				userRating: rating.avgRating,
				in_wishlist: inWishlist,
				on_explore: emp.onExplore,
				on_immediate: emp.onImmediate,
				on_notice: emp.onNotice,
			};
		})
	);

	const pastWithRatings = await Promise.all(
		pastEmployees.map(async (emp) => {
			const [rating, inWishlist] = await Promise.all([
				companyRepositery.getUserRating(emp.user),
				companyRepositery.checkInWishlist(companyId, emp.user),
			]);
			return {
				user: emp.user,
				profile: emp.profile ? `${s3Prefix}${emp.profile}` : (emp.socialImage || ''),
				username: `${emp.fname ?? ''} ${emp.lname ?? ''}`.trim(),
				contact_person: emp.phone,
				email: emp.email,
				designation: emp.designationName,
				employee_status: "Past",
				connectiondate: emp.createDate,
				approved: emp.approved,
				experience_id: emp.experienceId,
				linkdin: emp.linkdin,
				individual_id: emp.individualId,
				is_verified: emp.emailVerified === 1 || emp.phoneVerified === 1,
				slug: emp.slug,
				profile_description: emp.profileDescription,
				dob: emp.dob,
				present_address: emp.presentAddress,
				joining_date: emp.joiningDate,
				worked_till_date: emp.workedTillDate,
				last_modify_date: emp.createDate,
				account_create_date: emp.createDate,
				totalRating: rating,
				userRating: rating.avgRating,
				in_wishlist: inWishlist,
				on_explore: emp.onExplore,
				on_immediate: emp.onImmediate,
				on_notice: emp.onNotice,
			};
		})
	);

	return {
		status: true,
		messages: "Company Connection",
		data: {
			current_count: currentCount,
			current: currentWithRatings,
			past_count: pastCount,
			past: pastWithRatings,
			currentEmployeeCount: currentCount,
			pastEmployeeCount: pastCount,
		},
	};
}

// ====== 5. All Employment ======

export async function allEmploymentService(companyId: number) {
	const [experienceList, updateList] = await Promise.all([
		companyRepositery.getCompanyExperienceList(companyId),
		companyRepositery.getBasicExperienceUpdateList(companyId),
	]);

	const employmentData = await Promise.all(
		experienceList.map(async (exp) => {
			const [rating, updateExists] = await Promise.all([
				companyRepositery.getEmploymentRating(exp.id),
				companyRepositery.getBasicExperienceUpdateList(companyId),
			]);

			const hasUpdate = updateExists.some((u) => u.experienceId === exp.id);
			const requestType = hasUpdate ? 3 : 1;

			return {
				id: exp.id,
				profile: exp.userProfile ? `${s3Prefix}${exp.userProfile}` : (exp.userSocialImage || ''),
				userName: `${exp.userFname ?? ''} ${exp.userLname ?? ''}`.trim(),
				salary: exp.salary,
				employment_type: exp.employmentTypeName,
				designation: exp.designationName,
				joining_date: exp.joiningDate,
				worked_till_date: exp.workedTillDate,
				still_working: exp.stillWorking,
				approved: exp.approved,
				skill: exp.skill,
				description: exp.description,
				document: null,
				salary_inhand: exp.salaryInhand,
				salary_mode: exp.salaryMode,
				department: exp.departmentName,
				claim_status: 1,
				rating: rating,
				employment_status: { verified: exp.approved === 1 },
				employement_id: exp.id,
				slug: exp.userSlug,
				individual_id: exp.userIndividualId,
				status: exp.status,
				is_verified: exp.userEmailVerified === 1 || exp.userPhoneVerified === 1,
				user_slug: exp.userSlug,
				lastReview: rating.noofrecord,
				updateHistory: [],
				on_explore: exp.userOnExplore,
				on_immediate: exp.userOnImmediate,
				on_notice: exp.userOnNotice,
				request_type: requestType,
			};
		})
	);

	const newUpdateList = updateList.map((u) => ({
		id: u.id,
		experience_id: u.experienceId,
		user: u.user,
		salary: u.salary,
		salary_inhand: u.salaryInhand,
		salary_mode: u.salaryMode,
		designation: u.designation,
		worked_till_date: u.workedTillDate,
		status: u.status,
		type: u.type,
		create_date: u.createDate,
		old_designation: null,
		old_salary: null,
		is_verified: u.userEmailVerified === 1 || u.userPhoneVerified === 1,
		individual_id: u.userIndividualId,
		slug: u.userSlug,
	}));

	return {
		status: true,
		messages: "Employement History",
		data: employmentData,
		newUpdateList,
	};
}

// ====== 6. Update Employment ======

export async function updateEmploymentService(companyId: number, experienceId: number) {
	const company = await companyRepositery.findUserById(companyId);
	if (!company || company.status !== 1) {
		return { status: false, messages: "Access denied" };
	}

	const result = await companyRepositery.approveEmployment(companyId, experienceId);
	if (!result[0]?.affectedRows) {
		return { status: false, messages: "Try again something went wrong " };
	}

	const experience = await companyRepositery.getExperienceById(experienceId);
	if (!experience || !experience.user) {
		return { status: false, messages: "Try again something went wrong " };
	}

	const expUserId = experience.user;
	const expCompanyId = experience.company;
	const expDesignation = experience.designation;

	const userDetail = await companyRepositery.getUserCurrentCompany(expUserId);
	if (userDetail && !userDetail.currentCompany && expCompanyId && expDesignation) {
		await companyRepositery.updateUserCurrentPosition(
			expUserId,
			expCompanyId,
			expDesignation
		);
	}

	await companyRepositery.createNotification(
		companyId,
		expUserId,
		`Your employment at ${experience.companyName} has been verified!`,
		`/employment/${experienceId}`,
		'employment',
		'1'
	);

	return { status: true, messages: " update Sucessfully" };
}

// ====== 7. All Wishlist ======

export async function allWishlistService(companyId: number) {
	const wishlist = await companyRepositery.getWishlist(companyId);

	const data = await Promise.all(
		wishlist.map(async (item) => {
			let companyName = null;
			if (item.currentCompany) {
				const company = await companyRepositery.getCompanyName(item.currentCompany);
				companyName = company?.fname || null;
			}

			return {
				id: item.id,
				profile: item.profile ? `${s3Prefix}${item.profile}` : (item.socialImage || ''),
				username: `${item.fname ?? ''} ${item.lname ?? ''}`.trim(),
				designation: item.designationName,
				company: companyName,
			};
		})
	);

	return {
		status: true,
		messages: "Company Connection",
		data,
	};
}
