import jwt from "jsonwebtoken";
import loginRepositery from "../repositery/login.repositery";
import usersRepositery, { USER_PREFIX, USER_TYPE } from "../repositery/users.repositery";
import { get_user_detail, user_verified, get_all_connection } from "./users.service";
import { profilePercentageService } from "./job-dashboard.service";
import { createEducationService } from "./education.service";
import { addJobService } from "./company-job.service";
import { sendEmailViaSQS, sendSQSMessage } from "../utils/sqs";
import { otpSend, maskMobile } from "../utils/msg91";
import { randomInt, isEmpty } from "../utils/helpers";
import type {
	SendOtpBody,
	VerifyOtpBody,
	SocialLoginBody,
	LoginCommonBody,
	VerifyCommonOtpBody,
	EmployeeRegisterBody,
	CompanyRegisterBody,
	EmployeeSignupBody,
	FinalSignupBody,
} from "../types/login.types";

const s3Prefix = process.env.S3_PREFIX || "";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nowStr() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function isTruthy(v: unknown): boolean {
	if (v === undefined || v === null || v === "" || v === false) return false;
	if (v === true || v === 1 || v === "1") return true;
	return Boolean(v);
}

function isEmail(value: string): boolean {
	return EMAIL_REGEX.test(value.trim());
}

/** QA / bypass helpers — skip real OTP delivery & match */
export function isBypass(phoneOrEmail?: string | null): boolean {
	if (!phoneOrEmail) return false;
	const list = (process.env.OTP_BYPASS || "")
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
	const key = phoneOrEmail.trim().toLowerCase();
	if (list.includes(key)) return true;
	// Common QA markers
	if (key.endsWith("@qa.test") || key.endsWith("@collarcheck.qa")) return true;
	return false;
}

function generateOtpCode(): string {
	return String(randomInt(100000, 999999));
}

function otpExpiryUnix(): string {
	return String(Math.floor(Date.now() / 1000) + 10 * 60);
}

function isOtpExpired(expiry: string | null | undefined): boolean {
	if (!expiry) return true;
	const exp = Number(expiry);
	if (Number.isNaN(exp)) return true;
	return Math.floor(Date.now() / 1000) > exp;
}

export async function generateToken(userId: number): Promise<string> {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error("JWT secret is not defined");
	const token = jwt.sign({ uid: userId }, secret, { expiresIn: "30d" });
	await loginRepositery.setToken(userId, token);
	return token;
}

function parseExploringOption(raw: unknown): unknown[] {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw;
	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

/** Shared session payload for login / register / social */
export async function getStatistics(userId: number, loginauth?: string) {
	const userDetail = await get_user_detail(userId);
	if (!userDetail) return null;

	const token = loginauth || userDetail.token || "";
	const followCount = await loginRepositery.getFollowCounts(userId);
	const accountDeletion = await loginRepositery.getAccountDeletion(userId);
	const isVerified = await user_verified(userId);

	let percentage: { total: number; complete: any; uncomplete: any; incomplete: any } = {
		total: 0,
		complete: [],
		uncomplete: [],
		incomplete: [],
	};
	try {
		const pct = await profilePercentageService(userId);
		if (pct?.data) {
			percentage = {
				total: pct.data.total ?? 0,
				complete: pct.data.complete ?? [],
				uncomplete: pct.data.uncomplete ?? [],
				incomplete: pct.data.incomplete ?? [],
			};
		}
	} catch {
		// non-fatal
	}

	const profileUrl = userDetail.profile
		? userDetail.profile.startsWith("http")
			? userDetail.profile
			: `${s3Prefix}${userDetail.profile}`
		: userDetail.socialImage || "";

	if (userDetail.userType === 2) {
		const [totalConnection, exploreTalent, relation] = await Promise.all([
			get_all_connection(userId),
			loginRepositery.hasActiveJobs(userId),
			loginRepositery.getUserRelationByCompany(userId),
		]);

		const full = await loginRepositery.findById(userId);

		return {
			id: userDetail.id,
			loginauth: token,
			individual_id: userDetail.individualId,
			company_name: userDetail.fname,
			contact_person: full?.contactPerson || "",
			email: userDetail.email || "",
			email_alternate: userDetail.emailAlternate || "",
			phone: userDetail.phone || "",
			landline: userDetail.landline || "",
			profile: profileUrl,
			social_image: userDetail.socialImage || "",
			website: full?.website || "",
			description: full?.profileDescription || "",
			second_phone: userDetail.secondPhone || "",
			location: userDetail.cityName || "",
			phone_verified: userDetail.phoneVerified ?? "",
			email_verified: userDetail.emailVerified ?? "",
			followCount,
			is_verified: isVerified,
			user_type: "company",
			second_phone_verify: userDetail.secondPhoneVerify || 0,
			email_alternate_verify: userDetail.emailAlternateVerify || 0,
			profile_description: full?.profileDescription || "",
			present_address: full?.presentAddress || "",
			permanent_address: full?.permanentAddress || "",
			same_address: !!full?.sameAddress,
			country: userDetail.country,
			city: userDetail.city,
			state: userDetail.state,
			slug: userDetail.slug,
			country_name: userDetail.countryName,
			city_name: userDetail.cityName,
			state_name: userDetail.stateName,
			linkdin: full?.linkdin || "",
			youtube: full?.youtube || "",
			instagram: full?.instagram || "",
			facebook: full?.facebook || "",
			twitter: full?.twitter || "",
			incorporate_date: full?.incorporateDate ?? null,
			turnover: full?.turnover ?? null,
			turnover_name: userDetail.turnoverName ?? null,
			company_size: full?.companySize ?? null,
			company_size_name: userDetail.companySizeName ?? null,
			industry: full?.industry ?? null,
			industry_name: userDetail.industryName ?? null,
			totalConnection,
			profile_percentage: percentage.total,
			uncomplete: percentage.uncomplete,
			complete: percentage.complete,
			incomplete: percentage.incomplete,
			manual_verify: false,
			socialLogin: full?.registerType === "social" || full?.registerType === "google",
			exploreTalent: exploreTalent ? 1 : 0,
			is_user_relation: relation ? 1 : 0,
			event_permission: null,
			account_deletion: accountDeletion,
		};
	}

	// Employee
	const stillWorking = await loginRepositery.getStillWorkingExperience(userId);
	const full = await loginRepositery.findById(userId);
	const userDetailsRow = userDetail as any;

	return {
		loginauth: token,
		id: userDetail.id,
		individual_id: userDetail.individualId,
		profile: profileUrl,
		profile_type: null,
		profile_percentage: percentage.total,
		uncomplete: percentage.uncomplete,
		complete: percentage.complete,
		incomplete: percentage.incomplete,
		fname: userDetail.fname,
		lname: userDetail.lname,
		email: userDetail.email || "",
		email_alternate: userDetail.emailAlternate || "",
		second_phone_verify: userDetail.secondPhoneVerify || 0,
		email_alternate_verify: userDetail.emailAlternateVerify || 0,
		phone: userDetail.phone || "",
		second_phone: userDetail.secondPhone || "",
		location: userDetail.city,
		work_status: userDetail.workStatus,
		work_status_name: userDetail.workType,
		current_position: userDetail.currentPossition,
		current_company: userDetail.currentCompany,
		profile_description: full?.profileDescription || "",
		linkdin: full?.linkdin || "",
		youtube: full?.youtube || "",
		instagram: full?.instagram || "",
		facebook: full?.facebook || "",
		twitter: full?.twitter || "",
		is_verified: isVerified,
		user_type: "user",
		phone_verified: userDetail.phoneVerified || 0,
		email_verified: userDetail.emailVerified || 0,
		still_working_position: stillWorking?.designation ?? userDetail.currentPossition,
		still_working_company: stillWorking?.company ?? userDetail.currentCompany,
		still_working: stillWorking ? 1 : 0,
		still_working_company_name: userDetail.companyName || null,
		still_working_position_name: userDetail.designationName || null,
		accomodation: userDetail.accomodation ?? null,
		accomodation_name: userDetail.accomodationName ?? null,
		present_address: full?.presentAddress || "",
		permanent_address: full?.permanentAddress || "",
		same_address: !!full?.sameAddress,
		country: userDetail.country,
		dob: full?.dob || null,
		city: userDetail.city,
		state: userDetail.state,
		industry: full?.industry ?? null,
		country_name: userDetail.countryName,
		city_name: userDetail.cityName,
		state_name: userDetail.stateName,
		industry_name: userDetail.industryName,
		notice_period: full?.noticePeriod ?? null,
		notice_period_name: userDetail.noticePeriodName ?? null,
		notice_date: full?.noticeDate ?? null,
		on_immediate: full?.onImmediate || 0,
		on_notice: full?.onNotice || 0,
		on_explore: full?.onExplore || 0,
		exploring_option: parseExploringOption(userDetailsRow.exploringOption),
		expected_salary: full?.expectedSalary ?? null,
		expected_inhand: full?.expectedInhand ?? null,
		expected_mode: full?.expectedMode ?? null,
		notice_type: userDetail.noticeType ?? null,
		gender_name: userDetail.genderName,
		gender: userDetail.gender,
		followCount,
		noticeEmployments: parseExploringOption(userDetailsRow.noticeEmployments),
		slug: userDetail.slug,
		resume: full?.resume
			? full.resume.startsWith("http")
				? full.resume
				: `${s3Prefix}${full.resume}`
			: "",
		resumeName: full?.resumeName || "",
		reminderExperience: false,
		reminderExperienceList: [],
		manual_verify: false,
		cvPop: full?.cvPop === 1,
		account_deletion: accountDeletion,
	};
}

/**
 * Persist OTP, then deliver (fail-soft for client parity with PHP).
 * Phone: MSG91 direct (sync) — same as PHP otpSend. Optional SQS only if MSG91_USE_SQS=1.
 * Email: SQS SEND_EMAIL template.
 */
async function sendOtpQuietly(params: {
	phone?: string; email?: string; name?: string; otp: string;
}): Promise<{ smsSent: boolean; emailQueued: boolean }> {
	await loginRepositery.upsertOtp({
		phone: params.phone,
		email: params.email,
		otp: params.otp,
		expiry: otpExpiryUnix(),
	});

	let smsSent = false;
	let emailQueued = false;

	try {
		if (params.email) {
			await sendEmailViaSQS(params.email, 1, {
				otp: params.otp,
				name: params.name || "",
			});
			emailQueued = true;
			console.log("[OTP] Email OTP queued for", params.email);
		}

		if (params.phone) {
			const masked = maskMobile(params.phone);
			console.log("[OTP] Sending SMS OTP via MSG91 to", masked);

			// PHP parity: send SMS in-request via MSG91 (do not depend on worker)
			smsSent = await otpSend(params.phone, params.otp);

			if (smsSent) {
				console.log("[OTP] SMS delivered to", masked);
			} else {
				console.error(
					"[OTP] SMS delivery FAILED for",
					masked,
					"— OTP is stored in DB but message was not sent"
				);

				// Optional async retry only when explicitly enabled (worker must be running)
				if (process.env.MSG91_USE_SQS === "true") {
					try {
						await sendSQSMessage({
							type: "SEND_SMS",
							payload: {
								phone: params.phone,
								otp: params.otp,
							},
						});
						console.log("[OTP] Queued SEND_SMS fallback for", masked);
					} catch (sqsErr) {
						console.error("[OTP] SEND_SMS queue failed for", masked, sqsErr);
					}
				}
			}
		}
	} catch (err) {
		console.error("[OTP] Delivery error (non-fatal):", err);
	}

	return { smsSent, emailQueued };
}

function checkUnifiedCompanyLogin(user: { userType: number | null; createDate: string | null; registerType?: string | null }) {
	if (user.userType !== 2) return null;
	const unifiedDate = process.env.UNIFIED_DATE;
	if (!unifiedDate || !user.createDate) return null;
	if (new Date(user.createDate) >= new Date(unifiedDate)) {
		return {
			status: false as const,
			message:
				"Newly registered company cannot log in. Please create a user account and link it to this company",
		};
	}
	return null;
}

// ============================================================================
// 1. POST /wapi/login/sendOtp
// ============================================================================

export async function sendOtpService(body: SendOtpBody) {
	const phone = body.phone?.trim();
	const email = body.email?.trim()?.toLowerCase();
	const international = isTruthy(body.international);
	const checkUnique = isTruthy(body.checkUnique);

	if (international && !email) {
		return { status: false, messages: "Kindly enter your email address." };
	}

	if (!phone && !email) {
		return { status: false, message: "validation errors..." };
	}

	if (phone && (phone.length < 10 || phone.length > 13)) {
		return { status: false, message: "validation errors..." };
	}
	if (email && !isEmail(email)) {
		return { status: false, message: "validation errors..." };
	}

	if (body.referral_code) {
		const ref = await loginRepositery.findByIndividualId(body.referral_code);
		if (!ref) {
			return { status: false, messages: "Invalid refferal code!" };
		}
	}

	if (checkUnique) {
		// Signup mode: must NOT already exist on employee
		if (phone) {
			const existing = await loginRepositery.findEmployeeByPhone(phone);
			if (existing) {
				return { status: false, messages: "This phone number is already associated with an account." };
			}
		}
		if (email) {
			const existing = await loginRepositery.findEmployeeByEmail(email);
			if (existing) {
				return { status: false, messages: "This Email address is already associated with an account." };
			}
		}
	} else {
		// Login mode: phone must exist as employee
		if (phone && !email) {
			const existing = await loginRepositery.findEmployeeByPhone(phone);
			if (!existing) {
				return { status: false, messages: "phone not registered with us !" };
			}
		}
	}

	const target = international ? email! : phone || email!;
	if (isBypass(target) || isBypass(phone) || isBypass(email)) {
		const otp = process.env.OTP_BYPASS_CODE || "123456";
		await loginRepositery.upsertOtp({
			phone: phone || "",
			email: email || undefined,
			otp,
			expiry: otpExpiryUnix(),
		});
		if (international || (!phone && email)) {
			return {
				status: true,
				message: "The OTP has been successfully delivered to your registered email address.",
			};
		}
		if (phone && (email || isTruthy(body.send_email))) {
			return {
				status: true,
				message:
					"The OTP has been successfully delivered to your registered phone number or email address.",
			};
		}
		return {
			status: true,
			message: "The OTP has been successfully delivered to your registered phone number.",
		};
	}

	const otp = generateOtpCode();

	if (international) {
		await sendOtpQuietly({ email: email!, name: body.name, otp });
		return {
			status: true,
			message: "The OTP has been successfully delivered to your registered email address.",
		};
	}

	if (phone && (isTruthy(body.send_email) || email)) {
		await sendOtpQuietly({ phone, email, name: body.name, otp });
		return {
			status: true,
			message:
				"The OTP has been successfully delivered to your registered phone number or email address.",
		};
	}

	if (phone) {
		await sendOtpQuietly({ phone, name: body.name, otp });
		return {
			status: true,
			message: "The OTP has been successfully delivered to your registered phone number.",
		};
	}

	if (email) {
		await sendOtpQuietly({ email, name: body.name, otp });
		return {
			status: true,
			message: "The OTP has been successfully delivered to your registered email address.",
		};
	}

	return { status: false, message: "Something Went wrong try again" };
}

// ============================================================================
// 2. POST /wapi/login/verifyOtp
// ============================================================================

export async function verifyOtpService(body: VerifyOtpBody) {
	const phone = body.phone?.trim();
	const email = body.email?.trim()?.toLowerCase();
	const isEmailOtp = !isEmpty(body.emailotp);
	const otpCode = isEmailOtp ? String(body.emailotp) : body.otp;

	if (!otpCode || String(otpCode).length < 4) {
		return { status: false, message: "validation..." };
	}
	if (!phone && !email) {
		return { status: false, message: "validation..." };
	}
	if (phone && !/^\d{8,15}$/.test(phone)) {
		return { status: false, messages: "invalid phone no." };
	}
	if (email && !isEmail(email)) {
		return { status: false, messages: "invalid email address." };
	}

	const bypass = isBypass(phone) || isBypass(email);
	if (!bypass) {
		const row = await loginRepositery.findValidOtp({
			phone: phone || undefined,
			email: email || undefined,
		});
		if (!row) {
			return {
				status: false,
				messages: isEmailOtp ? "Invalid email OTP!" : "Invalid phone OTP!",
			};
		}
		if (isOtpExpired(row.expiry)) {
			return { status: false, messages: "Otp Expired !" };
		}
		if (String(row.otp) !== String(otpCode)) {
			return {
				status: false,
				messages: isEmailOtp ? "Invalid email OTP!" : "Invalid phone OTP!",
			};
		}
	}

	if (!isTruthy(body.login)) {
		return { status: true, messages: "Otp verify successfully !" };
	}

	// login == 1: mark verified + token + stats
	let user =
		(phone && (await loginRepositery.findEmployeeByPhone(phone))) ||
		(email && (await loginRepositery.findEmployeeByEmail(email))) ||
		null;

	if (!user && phone) user = await loginRepositery.findAnyByPhone(phone);
	if (!user && email) user = await loginRepositery.findAnyByEmail(email);

	if (!user) {
		return { status: false, messages: "invalid phone no." };
	}

	const updates: Record<string, unknown> = { modifyDate: nowStr() };
	if (phone) updates.phoneVerified = 1;
	if (email) {
		if (user.email?.toLowerCase() === email) updates.emailVerified = 1;
		else if (user.emailAlternate?.toLowerCase() === email) updates.emailAlternateVerify = 1;
		else updates.emailVerified = 1;
	}
	await loginRepositery.updateUser(user.id, updates);

	const token = await generateToken(user.id);
	const data = await getStatistics(user.id, token);

	return {
		status: true,
		messages: "Otp verify successfully !",
		data,
	};
}

// ============================================================================
// 3–4. Social / Google login
// ============================================================================

export async function socialLoginService(body: SocialLoginBody) {
	const email = body.email.trim().toLowerCase();
	if (!email) {
		return { status: false, messages: "The email field is required." };
	}

	const pageType = body.pageType || "";
	let user = await loginRepositery.findByEmailOrApple(email, body.apple_id);

	if (user) {
		if (!user.status) {
			return {
				status: false,
				message: "Your account is deactivated please contact web administrator !",
			};
		}

		// Alternate email primary account guard
		if (user.emailAlternate?.toLowerCase() === email && user.email?.toLowerCase() !== email) {
			// allow if alternate is the match for existing user — mark alternate verified
		}

		const unifiedBlock = checkUnifiedCompanyLogin(user);
		if (unifiedBlock) {
			// company-only after UNIFIED_DATE
			const relation = await loginRepositery.getUserRelationByCompany(user.id);
			if (user.userType === 2 && !relation) {
				return unifiedBlock;
			}
			if (user.userType === 2 && relation) {
				return {
					status: false,
					message: "Please use your main account Email Address",
				};
			}
		}

		const updates: Record<string, unknown> = { modifyDate: nowStr() };
		if (user.email?.toLowerCase() === email) updates.emailVerified = 1;
		else if (user.emailAlternate?.toLowerCase() === email) updates.emailAlternateVerify = 1;
		else updates.emailVerified = 1;
		if (body.apple_id) updates.appleId = body.apple_id;
		await loginRepositery.updateUser(user.id, updates);
	} else {
		// Auto-register employee
		const nameParts = (body.name || "").trim().split(/\s+/);
		const fname = nameParts[0] || email.split("@")[0];
		const lname = nameParts.slice(1).join(" ") || "";
		const individualId = await usersRepositery.generateUniqueId(USER_PREFIX.EMPLOYEE);
		const slug = await usersRepositery.generateSlug(`${fname}-${lname}-${individualId}`.toLowerCase());
		const profile =
			body.profile && body.profile !== "undefined" ? body.profile : null;

		user = await loginRepositery.createUser({
			userType: USER_TYPE.EMPLOYEE,
			fname,
			lname,
			email,
			emailVerified: 1,
			phoneVerified: 0,
			individualId,
			slug,
			socialImage: profile,
			registerType: body.type || "social",
			methodType: body.method_type || "Website",
			appleId: body.apple_id || null,
			status: 1,
			isDeleted: 0,
			acceptTerm: 1,
			cvPop: 1,
			createDate: nowStr(),
			modifyDate: nowStr(),
		});

		if (!user) {
			return { status: false, message: "Something Went wrong try again" };
		}

		await loginRepositery.createDefaultSettings(user.id);
		await loginRepositery.createDefaultUserGroups(user.id);
		await loginRepositery.createEmptyUserDetails(user.id);

		// Welcome emails (fail soft)
		try {
			await sendEmailViaSQS(email, 48, { name: fname }, { user_id: user.id, type: "welcome", status: 1 });
			await sendEmailViaSQS(email, 46, { name: fname }, { user_id: user.id, type: "welcome", status: 1 });
		} catch (err) {
			console.error("Social welcome email error:", err);
		}
	}

	const token = await generateToken(user.id);
	const data = await getStatistics(user.id, token);

	return {
		status: true,
		message: `${pageType} Successfully!`,
		socialLogin: true,
		data,
	};
}


export async function loginCommonService(body: LoginCommonBody) {
	const uniqueId = body.uniqueId.trim();
	const checkUnique = isTruthy(body.checkUnique);
	const emailPath = isEmail(uniqueId);
	const phone = emailPath ? undefined : uniqueId;
	const email = emailPath ? uniqueId.toLowerCase() : undefined;

	if (emailPath && !email) {
		return { status: false, message: "The Email field is required" };
	}
	if (!emailPath) {
		if (!phone || phone.length < 10 || phone.length > 15) {
			return { status: false, message: "The Phone field is required." };
		}
	}

	if (checkUnique) {
		if (phone) {
			const existing = await loginRepositery.findAnyByPhone(phone);
			if (existing) {
				return { status: false, message: "This phone number is already associated with an account." };
			}
		}
		if (email) {
			const existing = await loginRepositery.findAnyByEmail(email);
			if (existing) {
				return { status: false, message: "This Email address is already associated with an account." };
			}
		}
	} else {
		const user = phone ? await loginRepositery.findAnyByPhone(phone) : await loginRepositery.findAnyByEmail(email!);

		if (!user) {
			return {
				status: false,
				message: phone ? "Phone not registered with us!" : "Email not registered with us !",
			};
		}

		if (user.userType === USER_TYPE.COMPANY) {
			const relation = await loginRepositery.getUserRelationByCompany(user.id);
			if (relation) {
				return {
					status: false,
					message: phone
						? "Kindly use the phone number associated with your primary account"
						: "Please use your main account Email Address",
				};
			}
			const block = checkUnifiedCompanyLogin(user);
			if (block) return block;
		}

		if (user.registerType === "qa" || isBypass(uniqueId)) {
			return {
				status: true,
				message: emailPath
					? "OTP Successfully sent to your registered email"
					: "OTP Successfully sent to your registered phone",
			};
		}
	}

	if (isBypass(uniqueId)) {
		const otp = process.env.OTP_BYPASS_CODE || "123456";
		await loginRepositery.upsertOtp({
			phone: phone || "",
			email,
			otp,
			expiry: otpExpiryUnix(),
		});
		return {
			status: true,
			message: emailPath
				? "OTP Successfully sent to your registered email"
				: "OTP Successfully sent to your registered phone",
		};
	}

	const otp = generateOtpCode();
	await sendOtpQuietly({ phone, email, otp });

	return {
		status: true,
		message: emailPath
			? "OTP Successfully sent to your registered email"
			: "OTP Successfully sent to your registered phone",
	};
}


export async function verifyCommonOtpService(
	body: VerifyCommonOtpBody,
	meta?: { ip?: string; userAgent?: string }
) {
	const uniqueId = body.uniqueId.trim();
	const otpCode = body.otp?.trim();
	if (!otpCode) {
		return { status: false, message: "OTP field is required." };
	}

	const emailPath = isEmail(uniqueId);
	const phone = emailPath ? undefined : uniqueId;
	const email = emailPath ? uniqueId.toLowerCase() : undefined;

	if (!emailPath && phone && !/^\d{8,15}$/.test(phone)) {
		return { status: false, message: "invalid phone no." };
	}
	if (emailPath && email && !isEmail(email)) {
		return { status: false, message: "Invalid Email" };
	}

	const bypass = isBypass(uniqueId);

	// Resolve user first for QA register_type
	let user =
		(phone && (await loginRepositery.findEmployeeByPhone(phone))) ||
		(email && (await loginRepositery.findEmployeeByEmail(email))) ||
		null;
	if (!user && phone) user = await loginRepositery.findAnyByPhone(phone);
	if (!user && email) user = await loginRepositery.findAnyByEmail(email);

	// Prefer employee over company
	if (user?.userType === 2) {
		const emp = phone
			? await loginRepositery.findEmployeeByPhone(phone)
			: email
				? await loginRepositery.findEmployeeByEmail(email)
				: null;
		if (emp) user = emp;
	}

	if (!bypass && user?.registerType !== "qa") {
		const row = await loginRepositery.findValidOtp({
			phone: phone || undefined,
			email: email || undefined,
		});
		if (!row) {
			return { status: false, message: "Invalid OTP!" };
		}
		if (isOtpExpired(row.expiry)) {
			return { status: false, message: "Otp Expired !" };
		}
		if (String(row.otp) !== String(otpCode)) {
			return { status: false, message: "Invalid OTP!" };
		}
	}

	if (!user) {
		return { status: false, message: emailPath ? "Invalid Email" : "invalid phone no." };
	}

	const updates: Record<string, unknown> = { modifyDate: nowStr() };
	if (phone) {
		if (user.phone === phone) updates.phoneVerified = 1;
		else if (user.secondPhone === phone) updates.secondPhoneVerify = 1;
		else updates.phoneVerified = 1;
	}
	if (email) {
		if (user.email?.toLowerCase() === email) updates.emailVerified = 1;
		else if (user.emailAlternate?.toLowerCase() === email) updates.emailAlternateVerify = 1;
		else updates.emailVerified = 1;
	}
	await loginRepositery.updateUser(user.id, updates);

	if (user.userType === 1) {
		await loginRepositery.createDefaultUserGroups(user.id);
	}

	const token = await generateToken(user.id);
	const data = await getStatistics(user.id, token);

	try {
		await loginRepositery.saveLoginHistory({
			userId: user.id,
			deviceId: body.device_id,
			ipAddress: meta?.ip,
			userAgent: meta?.userAgent,
		});
	} catch (err) {
		console.error("saveLoginHistory error:", err);
	}

	await loginRepositery.deleteOtps({ phone, email });

	return {
		status: true,
		message: "Otp verify successfully !",
		data,
	};
}

// ============================================================================
// 7. POST /wapi/employee/register
// ============================================================================

export async function employeeRegisterService(body: EmployeeRegisterBody) {
	const email = body.email.trim().toLowerCase();
	const phone = body.phone.trim();

	if (body.referral_code) {
		const ref = await loginRepositery.findByIndividualId(body.referral_code);
		if (!ref) return { status: false, messages: "Invalid refferal code!" };
	}

	const existingPhone = await loginRepositery.findAnyByPhone(phone);
	if (existingPhone) {
		return { status: false, messages: "This phone number is already associated with an account." };
	}
	const existingEmail = await loginRepositery.findAnyByEmail(email);
	if (existingEmail) {
		return { status: false, messages: "This Email address is already associated with an account." };
	}

	const individualId = await usersRepositery.generateUniqueId(USER_PREFIX.EMPLOYEE);
	const slug = await usersRepositery.generateSlug(
		`${body.fname}-${body.lname || ""}-${individualId}`.toLowerCase()
	);

	const registerType =
		isBypass(phone) || isBypass(email) ? "qa" : body.register_type || "form";

	const user = await loginRepositery.createUser({
		userType: USER_TYPE.EMPLOYEE,
		fname: body.fname,
		lname: body.lname || "",
		email,
		phone,
		gender: body.gender ? Number(body.gender) : null,
		country: body.country ? Number(body.country) : null,
		workStatus: body.work_status ? Number(body.work_status) : null,
		methodType: body.method_type || "Website",
		referralCode: body.referral_code || null,
		registerType,
		phoneVerified: 1,
		emailVerified: 0,
		cvPop: 1,
		acceptTerm: 1,
		individualId,
		slug,
		status: 1,
		isDeleted: 0,
		createDate: nowStr(),
		modifyDate: nowStr(),
	});

	if (!user) {
		return { status: false, messages: "Something went wrong!" };
	}

	await loginRepositery.createDefaultSettings(user.id);
	await loginRepositery.createDefaultUserGroups(user.id);
	await loginRepositery.createEmptyUserDetails(user.id);

	if (body.pan) {
		await loginRepositery.insertPanDocument(user.id, body.pan);
	}

	try {
		await sendEmailViaSQS(email, 48, { name: body.fname }, { user_id: user.id, type: "welcome", status: 1 });
		await sendEmailViaSQS(email, 46, { name: body.fname }, { user_id: user.id, type: "welcome", status: 1 });
	} catch (err) {
		console.error("register email error:", err);
	}

	const token = await generateToken(user.id);
	const data = await getStatistics(user.id, token);

	return {
		status: true,
		messages: "Successfully Registered",
		data,
	};
}

// ============================================================================
// 8. POST /wapi/company/register (JWT)
// ============================================================================

export async function companyRegisterService(body: CompanyRegisterBody, authUserId: number) {
	if (body.referral_code) {
		const ref = await loginRepositery.findByIndividualId(body.referral_code);
		if (!ref) return { status: false, messages: "Invalid refferal code!" };
	}

	const email = body.email.trim().toLowerCase();
	const phone = body.phone.trim();
	let companyId: number | null = null;

	// Invite id (base64 encrypted company_invite.id)
	if (body.invite) {
		let inviteId = 0;
		try {
			const decoded = Buffer.from(body.invite, "base64").toString("utf8");
			inviteId = Number(decoded) || Number(body.invite) || 0;
		} catch {
			inviteId = Number(body.invite) || 0;
		}
		if (inviteId) {
			const invite = await loginRepositery.findInviteById(inviteId);
			if (invite?.company) {
				companyId = invite.company;
				await loginRepositery.updateUser(companyId, {
					fname: body.company_name,
					email,
					phone,
					contactPerson: body.contact_person || null,
					companySize: body.company_size ? Number(body.company_size) : null,
					country: body.country ? Number(body.country) : null,
					phoneVerified: 1,
					claimStatus: 1,
					registerType: "form",
					acceptTerm: 1,
					methodType: body.method_type || "Website",
					modifyDate: nowStr(),
				});
				await loginRepositery.markInviteDeleted(invite.id);
			}
		}
	}

	if (!companyId) {
		const inviteByEmail = await loginRepositery.findInviteByEmail(email);
		if (inviteByEmail?.company) {
			companyId = inviteByEmail.company;
			await loginRepositery.updateUser(companyId, {
				fname: body.company_name,
				email,
				phone,
				contactPerson: body.contact_person || null,
				companySize: body.company_size ? Number(body.company_size) : null,
				country: body.country ? Number(body.country) : null,
				phoneVerified: 1,
				claimStatus: 1,
				registerType: "form",
				acceptTerm: 1,
				methodType: body.method_type || "Website",
				modifyDate: nowStr(),
			});
			await loginRepositery.markInviteDeleted(inviteByEmail.id);
		}
	}

	if (!companyId) {
		const existingPhone = await loginRepositery.findAnyByPhone(phone);
		if (existingPhone) {
			return { status: false, messages: "This phone number is already associated with an account." };
		}
		const existingEmail = await loginRepositery.findAnyByEmail(email);
		if (existingEmail) {
			return { status: false, messages: "This Email address is already associated with an account." };
		}

		const individualId = await usersRepositery.generateUniqueId(USER_PREFIX.COMPANY);
		const slug = await usersRepositery.generateSlug(`${body.company_name}-${individualId}`.toLowerCase());

		const company = await loginRepositery.createUser({
			userType: USER_TYPE.COMPANY,
			fname: body.company_name,
			email,
			phone,
			contactPerson: body.contact_person || null,
			companySize: body.company_size ? Number(body.company_size) : null,
			country: body.country ? Number(body.country) : null,
			methodType: body.method_type || "Website",
			referralCode: body.referral_code || null,
			registerType: "form",
			claimStatus: 1,
			acceptTerm: 1,
			phoneVerified: 1,
			individualId,
			slug,
			status: 1,
			isDeleted: 0,
			createdBy: authUserId,
			createDate: nowStr(),
			modifyDate: nowStr(),
		});

		if (!company) {
			return { status: false, messages: "Something went wrong!" };
		}
		companyId = company.id;
		await loginRepositery.createDefaultSettings(companyId);
	}

	// Ensure individual_id + slug
	const company = await loginRepositery.findById(companyId!);
	if (!company) {
		return { status: false, messages: "Something went wrong!" };
	}

	if (!company.individualId) {
		const individualId = await usersRepositery.generateUniqueId(USER_PREFIX.COMPANY);
		const slug = await usersRepositery.generateSlug(`${body.company_name}-${individualId}`.toLowerCase());
		await loginRepositery.updateUser(company.id, { individualId, slug });
	}

	// Link registering user as super-admin of company
	if (authUserId && authUserId !== company.id) {
		await loginRepositery.createUserRelation(authUserId, company.id, 1);
	}

	try {
		if (email) {
			await sendEmailViaSQS(
				email,
				49,
				{ company_name: body.company_name },
				{ user_id: company.id, type: "company_onboarding", status: 1 }
			);
		}
	} catch (err) {
		console.error("company register email error:", err);
	}

	const token = await generateToken(company.id);
	const data = await getStatistics(company.id, token);

	return {
		status: true,
		messages: "Successfully Registered",
		data,
	};
}

// ============================================================================
// 9. POST /wapi/employee/signup
// ============================================================================

export async function employeeSignupService(body: EmployeeSignupBody) {
	const email = body.email.trim().toLowerCase();
	const phone = body.phone.trim();

	if (body.referral_code) {
		const ref = await loginRepositery.findByIndividualId(body.referral_code);
		if (!ref) return { status: false, messages: "Invalid refferal code!" };
	}

	const existingPhone = await loginRepositery.findEmployeeByPhone(phone);
	if (existingPhone) {
		return { status: false, messages: "This phone number is already associated with an account." };
	}
	const existingEmail = await loginRepositery.findEmployeeByEmail(email);
	if (existingEmail) {
		return { status: false, messages: "This Email address is already associated with an account." };
	}

	let cityId: number | null = null;
	if (body.city) {
		const asNum = Number(body.city);
		if (!Number.isNaN(asNum) && String(asNum) === String(body.city).trim()) {
			cityId = asNum;
		} else {
			const existingCity = await loginRepositery.findCityByName(body.city);
			if (existingCity) {
				cityId = existingCity.id;
			} else {
				cityId = await loginRepositery.createCity(
					body.city,
					body.state ? Number(body.state) : undefined
				);
			}
		}
	}

	const individualId = await usersRepositery.generateUniqueId(USER_PREFIX.EMPLOYEE);
	const slug = await usersRepositery.generateSlug(
		`${body.fname}-${body.lname || ""}-${individualId}`.toLowerCase()
	);

	const registerType = isBypass(phone) || isBypass(email) ? "qa" : "form";

	const user = await loginRepositery.createUser({
		userType: USER_TYPE.EMPLOYEE,
		fname: body.fname,
		lname: body.lname || "",
		email,
		phone,
		country: body.country ? Number(body.country) : null,
		state: body.state ? Number(body.state) : null,
		city: cityId,
		dob: body.dob || null,
		gender: body.gender ? Number(body.gender) : null,
		workStatus: body.work_status ? Number(body.work_status) : null,
		methodType: body.method_type || "Website",
		referralCode: body.referral_code || null,
		registerType,
		phoneVerified: isTruthy(body.phone_verified) ? 1 : 0,
		emailVerified: isTruthy(body.email_verified) ? 1 : 0,
		cvPop: 1,
		acceptTerm: 1,
		individualId,
		slug,
		status: 1,
		isDeleted: 0,
		createDate: nowStr(),
		modifyDate: nowStr(),
	});

	if (!user) {
		return { status: false, messages: "Something went wrong!" };
	}

	await loginRepositery.createEmptyUserDetails(user.id);
	await loginRepositery.createDefaultSettings(user.id);
	await loginRepositery.createDefaultUserGroups(user.id);

	// Auto-link company by phone (company without relation) or explicit company_id
	let companyToLink: number | null = body.company_id ? Number(body.company_id) : null;
	if (!companyToLink) {
		const company = await loginRepositery.findCompanyByPhoneWithoutRelation(phone);
		if (company) companyToLink = company.id;
	}
	if (companyToLink) {
		await loginRepositery.createUserRelation(user.id, companyToLink, 1);
	}

	try {
		await sendEmailViaSQS(email, 48, { name: body.fname }, { user_id: user.id, type: "welcome", status: 1 });
		await sendSQSMessage({
			type: "SEND_WHATSAPP",
			payload: { phone, template: 162, vars: { name: body.fname } },
		});
	} catch (err) {
		console.error("signup side-effect error:", err);
	}

	const token = await generateToken(user.id);
	const data = await getStatistics(user.id, token);

	return {
		status: true,
		messages: "Successfully Registered",
		data,
	};
}

// ============================================================================
// 10. POST /wapi/employee/final-signup
// ============================================================================

export async function finalSignupService(
	body: FinalSignupBody,
	files?: { resume?: Express.MulterS3.File; profile?: Express.MulterS3.File; document?: Express.MulterS3.File[] }
) {
	const userId = body.user_id;
	if (!userId) {
		return { status: false, messages: "user id is missing!" };
	}

	const user = await loginRepositery.findById(userId);
	if (!user) {
		return { status: false, messages: "Something went wrong!" };
	}

	let companyId = 0;
	let jobId = 0;

	// Branch B — company onboarding
	if (body.company_name) {
		try {
			const individualId = await usersRepositery.generateUniqueId(USER_PREFIX.COMPANY);
			const slug = await usersRepositery.generateSlug(
				`${body.company_name}-${individualId}`.toLowerCase()
			);
			let website = body.website || "";
			if (website && !website.startsWith("http://") && !website.startsWith("https://")) {
				website = `https://${website}`;
			}

			const company = await loginRepositery.createUser({
				userType: USER_TYPE.COMPANY,
				fname: body.company_name,
				email: body.company_email?.toLowerCase() || null,
				phone: body.company_phone || null,
				contactPerson: body.contact_person || null,
				incorporateDate: body.incorporate_date || null,
				website: website || null,
				industry: body.industry ? Number(body.industry) : null,
				profile: files?.profile?.key || null,
				claimStatus: 1,
				registerType: "form",
				acceptTerm: 1,
				individualId,
				slug,
				status: 1,
				isDeleted: 0,
				createdBy: userId,
				createDate: nowStr(),
				modifyDate: nowStr(),
			});

			if (!company) {
				return { status: false, messages: "Company not added!" };
			}
			companyId = company.id;
			await loginRepositery.createDefaultSettings(companyId);
			await loginRepositery.createUserRelation(userId, companyId, 1);

			if (body.job_title) {
				const jobResult = await addJobService(companyId, {
					job_title: body.job_title,
					job_description: body.job_description,
					roles_responsibility: body.roles_responsibility,
					department: body.department,
					role_type: body.role_type,
					city: body.city,
					state: body.state,
					country: body.country,
					salary: body.salary,
					vacancy: body.vacancy,
					industry: body.industry,
					urgent: body.urgent,
					experience: body.experience,
					designation: body.designation,
					status: body.status || 0,
					job_mode: body.job_mode,
					skill: body.skill,
					slug: body.slug,
				});
				if (jobResult.status && jobResult.jobId) {
					jobId = Number(jobResult.jobId);
				} else if (!jobResult.status) {
					return { status: false, messages: "Job not added!" };
				}
			}
		} catch (err) {
			console.error("final-signup company branch error:", err);
			return { status: false, messages: "Company not added!" };
		}
	}

	// Branch A — employee profile
	if (body.user_register_type) {
		const regType = Number(body.user_register_type);
		const updates: Record<string, unknown> = {
			userRegisterType: regType,
			onExplore: isTruthy(body.on_explore) ? 1 : 0,
			onImmediate: isTruthy(body.on_immediate) ? 1 : 0,
			onNotice: isTruthy(body.on_notice) ? 1 : 0,
			modifyDate: nowStr(),
		};
		if (body.notice_period) updates.noticePeriod = Number(body.notice_period);
		if (body.notice_date) updates.noticeDate = body.notice_date;

		if (files?.resume) {
			updates.resume = files.resume.key;
			updates.resumeName = files.resume.originalname;
			updates.cvPop = 1;
		}

		if (body.exploring_option !== undefined) {
			try {
				const exploring =
					typeof body.exploring_option === "string"
						? body.exploring_option
						: JSON.stringify(body.exploring_option);
				await loginRepositery.updateUserDetails(userId, { exploringOption: exploring });
			} catch {
				return { status: false, messages: "Exploring not save" };
			}
		}

		// Type 2 or 3 — employment
		if (regType === 2 || regType === 3) {
			let positionId: number | null = null;
			let companyExpId: number | null = null;

			if (body.current_position) {
				const asNum = Number(body.current_position);
				if (!Number.isNaN(asNum) && String(asNum) === String(body.current_position).trim()) {
					positionId = asNum;
				} else {
					const designationRepositery = (await import("../repositery/designation.repositery")).default;
					const existing = await designationRepositery.findByName(String(body.current_position).trim());
					if (existing.length > 0) {
						positionId = existing[0].id;
					} else {
						const slug = await designationRepositery.generateSlug(String(body.current_position).trim());
						const created = await designationRepositery.create({
							name: String(body.current_position).trim(),
							userDefined: 1,
							userId,
							status: 1,
							slug,
						});
						positionId = created.id;
					}
				}
			}

			if (body.current_company) {
				const asNum = Number(body.current_company);
				if (!Number.isNaN(asNum) && String(asNum) === String(body.current_company).trim()) {
					companyExpId = asNum;
				} else {
					const name = String(body.current_company).trim();
					const existing = await usersRepositery.findByName(name, USER_TYPE.COMPANY);
					if (existing.length > 0) {
						companyExpId = existing[0].id;
					} else {
						const individualId = await usersRepositery.generateUniqueId(USER_PREFIX.COMPANY);
						const slug = await usersRepositery.generateSlug(`${name}-${individualId}`);
						const created = await usersRepositery.create({
							fname: name,
							userType: USER_TYPE.COMPANY,
							userDefinedCompany: 1,
							claimStatus: 0,
							createdBy: userId,
							status: 1,
							individualId,
							slug,
							createDate: nowStr(),
							modifyDate: nowStr(),
						});
						companyExpId = created.id;
					}
				}
			}

			if (regType === 3 && body.joining_date && body.worked_till_date) {
				if (new Date(body.worked_till_date) <= new Date(body.joining_date)) {
					return {
						status: false,
						messages: "work till date not less then or equal to joining date",
					};
				}
			}

			try {
				await loginRepositery.createExperience({
					user: userId,
					company: companyExpId,
					designation: positionId,
					joiningDate: body.joining_date || null,
					workedTillDate: regType === 3 ? body.worked_till_date || null : null,
					stillWorking: regType === 2 ? 1 : 0,
					status: 1,
					isDeleted: 0,
					approved: 0,
					createDate: nowStr(),
					modifyDate: nowStr(),
				});

				updates.currentPossition = positionId;
				updates.currentCompany = companyExpId;
			} catch (err) {
				console.error("final-signup experience error:", err);
				return { status: false, messages: "Experience not added!" };
			}
		}

		// Type 1 — education (fresher)
		if (regType === 1 && body.university && body.course) {
			try {
				await createEducationService(
					userId,
					{
						university: isNaN(Number(body.university))
							? body.university
							: Number(body.university),
						course: isNaN(Number(body.course)) ? body.course : Number(body.course),
						course_type: body.course_type ? Number(body.course_type) : 0,
						starting_date: body.starting_date || "",
						ending_date: body.ending_date,
						state: body.state ? Number(body.state) : undefined,
						city: body.city
							? isNaN(Number(body.city))
								? body.city
								: Number(body.city)
							: undefined,
						country: body.country ? Number(body.country) : undefined,
						ishighest: isTruthy(body.ishighest),
						ongoing: isTruthy(body.ongoing),
					} as any,
					files?.document
				);
			} catch (err) {
				console.error("final-signup education error:", err);
				return { status: false, messages: "Education not added!" };
			}
		}

		await loginRepositery.updateUser(userId, updates);
	}

	const token = body.user_token || (await generateToken(userId));
	if (!body.user_token) {
		// already generated
	} else {
		// keep existing token
	}

	const stats = await getStatistics(userId, token);
	if (!stats) {
		return { status: false, messages: "Something went wrong!" };
	}

	return {
		status: true,
		messages: "Successfully Registered",
		data: {
			...stats,
			companyId,
			jobId,
		},
	};
}

// ============================================================================
// 11. POST /wapi/employee/upload-resume
// ============================================================================

export async function uploadResumeService(
	userId: number,
	file?: Express.MulterS3.File
) {
	if (!userId) {
		return { status: false, messages: "User ID is required" };
	}
	if (!file) {
		return { status: false, messages: "You must upload a file (Word, PDF)." };
	}

	const user = await loginRepositery.findById(userId);
	if (!user) {
		return { status: false, messages: "Resume not upload" };
	}

	try {
		await loginRepositery.updateUser(userId, {
			resume: file.key,
			resumeName: file.originalname,
			cvPop: 1,
			modifyDate: nowStr(),
		});
		return { status: true, messages: "Resume upload successfully" };
	} catch (err) {
		console.error("upload resume error:", err);
		return { status: false, messages: "Resume not upload" };
	}
}
