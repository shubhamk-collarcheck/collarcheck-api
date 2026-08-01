import companyRepositery from '../repositery/company.repositery';
import generalRepositery from '../repositery/general.repositery';
import reviewRepositery from '../repositery/review.repositery';
import skillRepositery from '../repositery/skill.repositery';
import employmentRepositery from '../repositery/employee.repositery';
import { user_verified } from './users.service';
import { getSettingService, saveSettingService } from './common-auth.service';
import { decodeCertificateURLs } from '../utils/decoders';
import { getS3Url } from '../utils/helpers';

const s3Prefix = process.env.S3_PREFIX || '';

function profileUrl(profile?: string | null, social?: string | null) {
	if (profile) return `${s3Prefix}${profile}`;
	return social || '';
}

function parseJsonArray(raw: string | null | undefined): number[] {
	if (!raw) return [];
	try {
		const v = JSON.parse(raw);
		if (Array.isArray(v)) return v.map(Number).filter((n) => Number.isFinite(n));
	} catch { /* ignore */ }
	return [];
}

/** PHP ExploringTrait::show_exploring (simplified). */
async function showExploring(employeeId: number, companyId: number): Promise<boolean> {
	const privacy = await generalRepositery.getUserExploringPrivacy(employeeId);
	const options = parseJsonArray(privacy?.exploringOption ?? null);
	if (options.length === 0) return true;
	const hideIds = new Set(parseJsonArray(privacy?.exploringDetails ?? null));
	const has3 = options.includes(3);
	const has4 = options.includes(4);
	if ((has3 || has4) && hideIds.has(companyId)) return false;
	return true;
}

async function exploringFlags(
	employeeId: number,
	companyId: number,
	onExploreUser: number | null | undefined,
	onImmediateUser: number | null | undefined,
	onNoticeUser: number | null | undefined,
) {
	const on_explore_user_flag = onExploreUser ? 1 : 0;
	let on_explore = 0;
	if (on_explore_user_flag === 1) {
		on_explore = (await showExploring(employeeId, companyId)) ? 1 : 0;
	}
	const on_immediate = on_explore === 1 ? (onImmediateUser ? 1 : 0) : 0;
	const on_notice = on_explore === 1 ? (onNoticeUser ? 1 : 0) : 0;
	return { on_explore, on_immediate, on_notice };
}

/** Page query → SQL offset (0 and 1 both first page). */
function pageToSqlOffset(page: number, limit: number) {
	const p = page || 0;
	return p <= 1 ? 0 : p * limit - limit;
}

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

		// New multipart upload wins; otherwise body may carry existing profile URL
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
// Contract: src/debug/company-all-employement-and-all-connection-endpoints.md

export async function allConnectionService(
	companyId: number,
	loginUserId: number,
	userType: number | null,
	keyword: string,
	sortBy: number | null | undefined,
	limit: number,
	pageOffset: number,
) {
	try {
		if (userType === 2) {
			const perm = await companyRepositery.checkMenuAccess(loginUserId, companyId, 5);
			if (!perm.ok) {
				return { status: false as const, message: perm.message || "You don't have permission to access this.", httpStatus: 403 as const };
			}
		}

		const sqlOffset = pageToSqlOffset(pageOffset, limit);
		const kw = keyword || '';

		const [currentRes, pastRes, currentEmployeeCount, pastEmployeeCount] = await Promise.all([
			companyRepositery.getAllCollections(companyId, {
				keyword: kw,
				sortBy,
				type: 1,
				limit,
				sqlOffset,
			}),
			companyRepositery.getAllCollections(companyId, {
				keyword: kw,
				sortBy,
				type: null,
				limit,
				sqlOffset,
			}),
			companyRepositery.countCurrentEmployees(companyId, kw),
			companyRepositery.countPastEmployees(companyId, kw),
		]);

		const currentRows = currentRes.rows;
		const currentIds = new Set(currentRows.map((r) => r.user as number));
		// Dedupe past against current by user id
		const pastRows = pastRes.rows.filter((r) => !currentIds.has(r.user as number));

		const allUserIds = [
			...currentRows.map((r) => r.user as number),
			...pastRows.map((r) => r.user as number),
		];

		const [ratingsMap, wishlistSet, verifiedMap, userRatingMap] = await Promise.all([
			companyRepositery.batchUserRatings(allUserIds),
			companyRepositery.batchInWishlist(companyId, pastRows.map((r) => r.user as number)),
			// user_verified in parallel
			Promise.all(allUserIds.map(async (id) => [id, await user_verified(id)] as const)).then(
				(pairs) => new Map(pairs),
			),
			Promise.all(
				allUserIds.map(async (id) => [id, await employmentRepositery.getOverallProfileRating(id)] as const),
			).then((pairs) => new Map(pairs)),
		]);

		async function mapCard(emp: (typeof currentRows)[number], isPast: boolean) {
			const uid = emp.user as number;
			const flags = await exploringFlags(
				uid,
				companyId,
				emp.onExplore,
				emp.onImmediate,
				emp.onNotice,
			);
			const card: Record<string, unknown> = {
				user: uid,
				profile: profileUrl(emp.profile, emp.socialImage),
				username: `${emp.fname ?? ''} ${emp.lname ?? ''}`.trim(),
				contact_person: emp.phone || '',
				email: emp.email || '',
				designation: emp.designationName || '',
				employee_status: isPast ? 'Past' : 'Current',
				connectiondate: emp.connectiondate,
				approved: emp.approved,
				experience_id: emp.experienceId,
				linkdin: emp.linkdin || '',
				youtube: emp.youtube || '',
				instagram: emp.instagram || '',
				facebook: emp.facebook || '',
				individual_id: emp.individualId,
				is_verified: verifiedMap.get(uid) ?? false,
				slug: emp.slug || '',
				profile_description: emp.profileDescription || '',
				dob: emp.dob || '',
				present_address: emp.presentAddress || '',
				joining_date: emp.joiningDate,
				last_modify_date: emp.modifyDate,
				account_create_date: emp.accountCreateDate,
				totalRating: ratingsMap.get(uid) ?? { rating: 0, noofrecord: 0 },
				userRating: userRatingMap.get(uid) ?? 0,
				// current: always false (PHP hard-disables wishlist for current)
				in_wishlist: isPast ? wishlistSet.has(uid) : false,
				...flags,
			};
			if (isPast) {
				card.worked_till_date = emp.workedTillDate;
			}
			return card;
		}

		const [current, past] = await Promise.all([
			Promise.all(currentRows.map((r) => mapCard(r, false))),
			Promise.all(pastRows.map((r) => mapCard(r, true))),
		]);

		return {
			status: true as const,
			messages: 'Company Connection',
			data: {
				current_count: current.length,
				current,
				past_count: past.length,
				past,
				currentEmployeeCount,
				pastEmployeeCount,
			},
		};
	} catch (e: any) {
		return { status: false as const, messages: e?.message || 'Access denied' };
	}
}

// ====== 5. All Employment ======

function skillNamesFromJson(skillJson: string | null | undefined, nameMap: Map<number, string>): string[] {
	if (!skillJson) return [];
	try {
		const decoded = JSON.parse(skillJson);
		if (!Array.isArray(decoded)) return [];
		return decoded
			.map(Number)
			.filter(Boolean)
			.map((id: number) => nameMap.get(id) || '')
			.filter(Boolean);
	} catch {
		return [];
	}
}

export async function allEmploymentService(
	companyId: number,
	loginUserId: number,
	userType: number | null,
) {
	try {
		if (!companyId) {
			return {
				status: true as const,
				messages: 'Employement History',
				data: [],
				newUpdateList: [],
			};
		}

		if (userType === 2) {
			const perm = await companyRepositery.checkMenuAccess(loginUserId, companyId, 6);
			if (!perm.ok) {
				return { status: false as const, message: perm.message || "You don't have permission to access this.", httpStatus: 403 as const };
			}
		}

		const [experienceList, updateList] = await Promise.all([
			companyRepositery.getCompanyExperienceList(companyId),
			companyRepositery.getBasicExperienceUpdateList(companyId),
		]);

		const experienceIds = experienceList.map((e) => e.id);
		const employeeIds = [
			...new Set(
				[
					...experienceList.map((e) => e.user).filter((id): id is number => id != null),
					...updateList.map((u) => u.user).filter((id): id is number => id != null),
				],
			),
		];

		// Skill ids from all experiences
		const allSkillIds = new Set<number>();
		for (const exp of experienceList) {
			if (!exp.skill) continue;
			try {
				const decoded = JSON.parse(exp.skill);
				if (Array.isArray(decoded)) {
					for (const id of decoded.map(Number).filter(Boolean)) allSkillIds.add(id);
				}
			} catch { /* ignore */ }
		}

		const [
			skillNameMap,
			updateCountMap,
			employmentStatusMap,
			allRatings,
			historyMap,
			verifiedMap,
		] = await Promise.all([
			skillRepositery.getSkillNamesByIds([...allSkillIds]),
			companyRepositery.batchCountUpdateExperience(experienceIds),
			reviewRepositery.getEmploymentStatusByExperienceIds(experienceIds),
			reviewRepositery.getRatingsByExperienceIds(experienceIds),
			companyRepositery.getEmploymentHistoryByExperienceIds(experienceIds),
			Promise.all(employeeIds.map(async (id) => [id, await user_verified(id)] as const)).then(
				(pairs) => new Map(pairs),
			),
		]);

		const ratingIds = allRatings.map((r) => r.id);
		const [ratingHistoryMap, skillRatingMap] = await Promise.all([
			ratingIds.length > 0
				? (reviewRepositery.getRatingHistory(ratingIds) as Promise<Record<number, any[]>>)
				: Promise.resolve({} as Record<number, any[]>),
			ratingIds.length > 0
				? skillRepositery.getReviewsWithSkills(ratingIds, 0)
				: Promise.resolve({} as Record<number, any[]>),
		]);

		const ratingsByExperience = new Map<number, typeof allRatings>();
		for (const rating of allRatings) {
			const expId = rating.experience!;
			if (!ratingsByExperience.has(expId)) ratingsByExperience.set(expId, []);
			ratingsByExperience.get(expId)!.push(rating);
		}

		const ratingMap = new Map<number, Record<string, unknown>[]>();
		for (const [expId, ratings] of ratingsByExperience) {
			const enriched = ratings.map((r) => {
				const history = ratingHistoryMap[r.id] ?? [];
				const skills = skillRatingMap[r.id] ?? [];
				let doc: string | string[] | null = null;
				if (r.doc) {
					try {
						const paths = JSON.parse(r.doc);
						if (Array.isArray(paths)) {
							doc = paths.map((path: string) => getS3Url(path));
						}
					} catch {
						doc = r.doc;
					}
				}
				return {
					id: r.id,
					approved: r.approved,
					status: r.approved === 1 ? 'complete' : 'pending',
					doc: doc ?? [],
					date: r.modifyDate || r.createDate,
					link: r.link || '',
					show_home: r.showHome ?? 0,
					show_review: r.showReview ?? 0,
					history,
					skill_rating: skills,
					rating: r.rating,
					review: r.review,
				};
			});
			ratingMap.set(expId, enriched);
		}

		const employmentData = await Promise.all(
			experienceList.map(async (exp) => {
				const uid = exp.user as number;
				const flags = await exploringFlags(
					uid,
					companyId,
					exp.userOnExplore,
					exp.userOnImmediate,
					exp.userOnNotice,
				);
				const updateCount = updateCountMap.get(exp.id) ?? 0;
				return {
					id: exp.id,
					employement_id: exp.id,
					profile: profileUrl(exp.userProfile, exp.userSocialImage),
					userName: `${exp.userFname ?? ''} ${exp.userLname ?? ''}`.trim(),
					salary: exp.salary,
					employment_type: exp.employmentTypeName || '',
					designation: exp.designationName || '',
					joining_date: exp.joiningDate,
					worked_till_date: exp.workedTillDate,
					still_working: exp.stillWorking,
					approved: exp.approved,
					skill: skillNamesFromJson(exp.skill, skillNameMap),
					description: exp.description || '',
					document: decodeCertificateURLs(exp.certificate),
					salary_inhand: exp.salaryInhand,
					salary_mode: exp.salaryMode,
					department: exp.departmentName || '',
					claim_status: exp.userClaimStatus ? 1 : 0,
					rating: ratingMap.get(exp.id) ?? [],
					employment_status: employmentStatusMap.get(exp.id) ?? 'pending',
					slug: exp.userSlug || '',
					user_slug: exp.userSlug || '',
					individual_id: exp.userIndividualId,
					status: exp.status,
					is_verified: verifiedMap.get(uid) ?? false,
					lastReview: exp.lastReview ?? 0,
					updateHistory: historyMap.get(exp.id) ?? [],
					...flags,
					request_type: updateCount > 0 ? 3 : 1,
				};
			}),
		);

		const newUpdateList = await Promise.all(
			updateList.map(async (u) => ({
				id: u.id,
				experience_id: u.experienceId,
				user: u.user,
				salary: u.salary,
				salary_inhand: u.salaryInhand,
				salary_mode: u.salaryMode,
				designation: u.designation || '',
				worked_till_date: u.workedTillDate,
				status: u.status,
				type: u.type,
				create_date: u.createDate,
				modify_date: u.modifyDate,
				profile: profileUrl(u.userProfile, u.userSocialImage),
				fname: u.userFname || '',
				lname: u.userLname || '',
				old_designation: u.oldDesignation || '',
				old_salary: u.oldSalary,
				is_verified: verifiedMap.get(u.user) ?? false,
				individual_id: u.userIndividualId,
				slug: u.userSlug || '',
				lastReview: u.lastReview ?? 0,
				// PHP bug magnet: request_type always 1 on newUpdateList
				request_type: 1,
			})),
		);

		return {
			status: true as const,
			messages: 'Employement History',
			data: employmentData,
			newUpdateList,
		};
	} catch (e: any) {
		return { status: false as const, messages: e?.message || 'Access denied' };
	}
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

// ====== Add Connection ======

export async function addConnectionService(
	companyId: number,
	body: { user: number; designation?: string; joining_date?: string; still_working?: number }
) {
	if (!body.user) {
		return { status: false, messages: "user is required" };
	}

	const existing = await companyRepositery.findConnection(companyId, body.user);
	if (existing) {
		return { status: false, messages: "Already connected" };
	}

	const target = await companyRepositery.findUserById(body.user);
	if (!target) {
		return { status: false, messages: "user is required" };
	}

	await companyRepositery.createConnection({
		company: companyId,
		user: body.user,
		currentEmployee: body.still_working ? 1 : 0,
	});

	return { status: true, messages: "Connection added" };
}

// ====== Add Wishlist ======

export async function addWishlistService(companyId: number, userId: number) {
	if (!userId) {
		return { status: false, messages: "user is required" };
	}

	const inWishlist = await companyRepositery.checkInWishlist(companyId, userId);
	if (inWishlist) {
		return { status: false, messages: "Already in wishlist" };
	}

	const target = await companyRepositery.findUserById(userId);
	if (!target) {
		return { status: false, messages: "user is required" };
	}

	await companyRepositery.createWishlist(companyId, userId);
	return { status: true, messages: "Added to wishlist" };
}

// ====== Delete Wishlist ======

export async function deleteWishlistService(companyId: number, id: number) {
	if (!id || Number.isNaN(id)) {
		return { status: false, messages: "Invalid Id" };
	}

	const row = await companyRepositery.findWishlistById(id, companyId);
	if (!row) {
		return { status: false, messages: "Record not found!" };
	}

	await companyRepositery.softDeleteWishlist(id, companyId);
	return { status: true, messages: "Deleted Successfully" };
}

// ====== Add Company Document ======

export async function addCompanyDocumentService(
	companyId: number,
	doctypeRaw: unknown,
	files: Array<{ location?: string; key?: string; path?: string }> | undefined
) {
	const doctypes = Array.isArray(doctypeRaw)
		? doctypeRaw
		: doctypeRaw !== undefined && doctypeRaw !== null
			? [doctypeRaw]
			: [];

	if (doctypes.length === 0) {
		return { status: false, messages: "Doc Type field is required" };
	}

	if (!files || files.length === 0) {
		return { status: false, messages: "document not uploaded" };
	}

	try {
		const count = Math.min(doctypes.length, files.length);
		for (let i = 0; i < count; i++) {
			const file = files[i];
			const docName = file.location || file.key || file.path || '';
			if (!docName) {
				return { status: false, messages: "document not uploaded" };
			}
			await companyRepositery.createCompanyDocument(companyId, doctypes[i], docName);
		}
		return { status: true, messages: "Successfully added" };
	} catch {
		return { status: false, messages: "Something Went Wrong" };
	}
}
