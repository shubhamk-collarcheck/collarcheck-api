import verifyRepositery from "../repositery/verify.repositery";
import { encryptUrl } from "../utils/encrypt";
import { surepass, maskMobilePartial } from "../utils/surepass";
import { sendEmailViaSQS, sendSQSMessage } from "../utils/sqs";
import { randomInt } from "../utils/helpers";
import { isBypass } from "./login.service";
import type {
	VerifyDocumentBody, VerifyAadharBody, VerifyGstBody, VerifyDigilockerBody,
	SendEmailOtpBody, VerifyEmailOtpBody,
} from "../types/verify.types";

const DOCTYPE = { AADHAAR: "1", PAN: "2", GST: "4" } as const;

const PUBLIC_EMAIL_DOMAINS = new Set([
	"gmail.com",
	"yahoo.com",
	"outlook.com",
	"hotmail.com",
	"rediffmail.com",
	"icloud.com",
	"aol.com",
	"mail.com",
	"protonmail.com",
	"zoho.com",
]);

function isTruthy(v: unknown): boolean {
	if (v === undefined || v === null || v === "" || v === false || v === "0" || v === 0) return false;
	if (v === true || v === 1 || v === "1") return true;
	return Boolean(v);
}

function emailDomain(email: string): string {
	const parts = email.toLowerCase().split("@");
	return parts.length === 2 ? parts[1] : "";
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

function generateOtp(): string {
	return String(randomInt(100000, 999999));
}

function displayName(user: { fname?: string | null; lname?: string | null }): string {
	return `${user.fname || ""} ${user.lname || ""}`.trim();
}

async function validateWorkEmailDomain(
	companyId: number,
	email: string,
	excludeExperienceId?: number | null
): Promise<{ ok: true } | { ok: false; messages: string }> {
	const domain = emailDomain(email);
	if (!domain) {
		return { ok: false, messages: "Invalid email address" };
	}

	const dup = await verifyRepositery.findExperienceByWorkEmail(email, excludeExperienceId ?? undefined);
	if (dup) {
		return { ok: false, messages: "This work email is already in use" };
	}

	const domains = await verifyRepositery.findCompanyVerifiedDomains(companyId);
	if (domains.length > 0) {
		const allowed = domains.some((d) => {
			const dd = (d.domain || "").toLowerCase();
			const ee = (d.email || "").toLowerCase();
			if (dd && (dd === domain || domain.endsWith(`.${dd}`))) return true;
			if (ee && emailDomain(ee) === domain) return true;
			return false;
		});
		if (!allowed) {
			return {
				ok: false,
				messages: "Work email domain does not match company verified domains",
			};
		}
	}
	return { ok: true };
}

// ============================================================================
// 1. verifyDocument (GET verify-document + POST verifyDocument)
// ============================================================================

export async function verifyDocumentService(userId: number, body: VerifyDocumentBody) {
	const user = await verifyRepositery.findUserById(userId);
	if (!user) {
		return { status: false, messages: "User invalid" };
	}

	if (!process.env.SUREPASSTOKEN && !process.env.SUREPASS_TOKEN) {
		console.warn("[verify] SUREPASSTOKEN is not set");
	}

	const type = body.type;
	const idNumber = body.id_number;

	try {
		if (type === "gst") {
			return await initGst(userId, idNumber);
		}
		if (type === "pan") {
			return await initPan(userId, user, idNumber);
		}
		if (type === "aadhaar") {
			return await initAadhaar(userId, idNumber);
		}
		if (type === "digilocker") {
			return await initDigilocker(userId, user, idNumber, isTruthy(body.ismobile));
		}
		return { status: false, messages: "Invalid type" };
	} catch (err: any) {
		console.error("verifyDocument error:", err);
		return { status: false, messages: err?.message || "Exception message" };
	}
}

async function initGst(userId: number, gstin: string) {
	const init = await surepass.gstInit(gstin);
	if (!init.success) {
		await verifyRepositery.insertLog({
			userId,
			type: "gst",
			callMethod: "general/verifyDocument",
			logMessage: init.message,
			payload: init.data,
			statusCode: init.statusCode,
		});
		return { status: false, messages: init.message };
	}

	const clientId = init.data?.client_id || init.data?.data?.client_id;
	const mobile =
		init.data?.mobile ||
		init.data?.mobile_number ||
		init.data?.data?.mobile ||
		init.data?.data?.mobile_number ||
		"";

	const legalName =
		init.data?.legal_name ||
		init.data?.business_name ||
		init.data?.data?.legal_name ||
		init.data?.data?.business_name ||
		"";

	const encrypted = encryptUrl(gstin);
	const dup = await verifyRepositery.checkVerifyDocument(userId, DOCTYPE.GST, encrypted);
	if (dup) {
		return { status: false, messages: "This document is already verified with another account!" };
	}

	if (!mobile) {
		// PHP uses singular `message` for this error
		return { status: false, message: "Mobile number not link with this gst detail!" };
	}

	const otpRes = await surepass.gstGenerateOtp(String(clientId));
	if (!otpRes.success) {
		await verifyRepositery.insertLog({
			userId,
			type: "gst",
			callMethod: "general/verifyDocument",
			logMessage: otpRes.message,
			payload: otpRes.data,
			statusCode: otpRes.statusCode,
		});
		return { status: false, messages: otpRes.message };
	}

	// Stash pending GST doc for submit step (client_id keyed)
	await verifyRepositery.upsertByUserDoctype(userId, DOCTYPE.GST, {
		docnumber: encrypted,
		docName: legalName || null,
		clientId: String(clientId),
		verify: 0,
	});

	return {
		status: true,
		messages: "Otp send successfully!",
		data: {
			client_id: String(clientId),
			mobile: maskMobilePartial(String(mobile)),
		},
	};
}

async function initPan(userId: number, user: any, pan: string) {
	const res = await surepass.pan(pan);
	if (!res.success) {
		return {
			status: false,
			message: "Something went wrong please try again letter!",
		};
	}

	const fullName =
		res.data?.full_name ||
		res.data?.full_name_split?.join?.(" ") ||
		res.data?.data?.full_name ||
		"";
	const category = res.data?.category || res.data?.data?.category || "";

	const encrypted = encryptUrl(pan);
	const dup = await verifyRepositery.findDuplicateVerified(DOCTYPE.PAN, encrypted, userId);
	if (dup) {
		return { status: false, messages: "This document is already verified with another account!" };
	}

	const rowId = await verifyRepositery.upsertByUserDoctype(userId, DOCTYPE.PAN, {
		docnumber: encrypted,
		docName: fullName || null,
		verify: 0,
	});

	return {
		status: true,
		data: {
			full_name: fullName,
			category,
			ref_id: encryptUrl(rowId),
			current_name: user.fname || "",
		},
	};
}

async function initAadhaar(userId: number, aadhaar: string) {
	// PHP quirk: only rejects when NOT numeric AND length is 12
	if (!/^\d+$/.test(aadhaar) && aadhaar.length === 12) {
		return {
			status: false,
			message:
				"Kindly ensure that the input contains only numerical characters and 12-character length requirement.",
		};
	}

	const res = await surepass.aadhaarGenerateOtp(aadhaar);
	if (!res.success) {
		await verifyRepositery.insertLog({
			userId,
			type: "adhaar",
			callMethod: "general/verifyDocument",
			logMessage: res.message,
			payload: res.data,
			statusCode: res.statusCode,
		});
		return { status: false, messages: res.message };
	}

	const clientId = res.data?.client_id || res.data?.data?.client_id;
	return {
		status: true,
		data: {
			client_id: clientId,
			messages: "OTP Sent",
		},
	};
}

async function initDigilocker(userId: number, user: any, mobile: string, isMobile: boolean) {
	const reactSite = process.env.REACT_SITE || "https://app.collarcheck.com/";
	const apiBase = process.env.API_BASE_URL || process.env.BASE_URL || "";
	const redirectUrl = isMobile
		? `${apiBase.replace(/\/$/, "")}/wapi/digilocker`
		: `${reactSite.replace(/\/?$/, "/")}verification-page`;

	const payload = {
		data: {
			prefill_options: {
				full_name: displayName(user),
				mobile_number: mobile,
			},
			expiry_minutes: 10,
			send_sms: false,
			send_email: false,
			verify_phone: false,
			verify_email: false,
			signup_flow: false,
			redirect_url: redirectUrl,
			state: "test",
		},
	};

	const res = await surepass.digilockerInit(payload);
	if (!res.success) {
		await verifyRepositery.insertLog({
			userId,
			type: "digilocker",
			callMethod: "general/verifyDocument",
			logMessage: res.message,
			payload: res.data,
			statusCode: res.statusCode,
		});
		return { status: false, messages: res.message };
	}

	const clientId = res.data?.client_id || res.data?.data?.client_id;
	const url = res.data?.url || res.data?.data?.url || res.data?.token || res.data?.data?.token;

	const existing = await verifyRepositery.findAnyByUser(userId);
	if (existing && (existing.verify === 0 || existing.verify == null)) {
		await verifyRepositery.updateVerifyDocument(existing.id, { clientId: String(clientId) });
	} else if (!existing) {
		await verifyRepositery.insertVerifyDocument({
			userId,
			clientId: String(clientId),
			verify: 0,
		});
	} else {
		await verifyRepositery.insertVerifyDocument({
			userId,
			clientId: String(clientId),
			verify: 0,
		});
	}

	return {
		status: true,
		data: {
			url,
			client_id: clientId,
		},
	};
}

// ============================================================================
// 2. verifyAadhar
// ============================================================================

export async function verifyAadharService(userId: number, body: VerifyAadharBody) {
	const user = await verifyRepositery.findUserById(userId);
	if (!user) {
		return { status: false, messages: "User invalid" };
	}

	const res = await surepass.aadhaarSubmitOtp(body.client_id || "", body.otp || "");
	if (!res.success) {
		await verifyRepositery.insertLog({
			userId,
			type: "adhaar",
			callMethod: "general/verifyAadhar",
			logMessage: res.message,
			payload: res.data,
			statusCode: res.statusCode,
		});
		return { status: false, messages: res.message };
	}

	const aadhaarNumber =
		res.data?.aadhaar_number ||
		res.data?.aadhaar_number_full ||
		res.data?.data?.aadhaar_number ||
		"";
	const fullName = res.data?.full_name || res.data?.data?.full_name || "";

	const encrypted = encryptUrl(String(aadhaarNumber || body.client_id || ""));
	const dup = await verifyRepositery.findDuplicateVerified(DOCTYPE.AADHAAR, encrypted, userId);
	if (dup) {
		return { status: false, messages: "This document is already verified with another account!" };
	}

	const rowId = await verifyRepositery.upsertByUserDoctype(userId, DOCTYPE.AADHAAR, {
		docnumber: encrypted,
		docName: fullName || null,
		methodType: "aadhar",
		verify: 0,
		clientId: body.client_id || null,
	});

	return {
		status: true,
		data: {
			full_name: fullName,
			ref_id: encryptUrl(rowId),
			current_name: displayName(user),
		},
	};
}

// ============================================================================
// 3. verifyGst
// ============================================================================

export async function verifyGstService(userId: number, body: VerifyGstBody) {
	const user = await verifyRepositery.findUserById(userId);
	if (!user) {
		return { status: false, messages: "User invalid" };
	}

	const res = await surepass.gstSubmitOtp(body.client_id, body.otp);
	if (!res.success) {
		await verifyRepositery.insertLog({
			userId,
			type: "gst",
			callMethod: "general/verifyGst",
			logMessage: res.message,
			payload: res.data,
			statusCode: res.statusCode,
		});
		return { status: false, messages: res.message };
	}

	const fullName =
		res.data?.legal_name ||
		res.data?.business_name ||
		res.data?.data?.legal_name ||
		res.data?.data?.business_name ||
		"";
	const gstin =
		res.data?.gstin ||
		res.data?.gstin_number ||
		res.data?.data?.gstin ||
		res.data?.data?.gstin_number ||
		"";

	const encrypted = encryptUrl(String(gstin || body.client_id));
	const dup = await verifyRepositery.findDuplicateVerified(DOCTYPE.GST, encrypted, userId);
	if (dup) {
		return { status: false, messages: "This document is already verified with another account!" };
	}

	const rowId = await verifyRepositery.upsertByUserDoctype(userId, DOCTYPE.GST, {
		docnumber: encrypted,
		docName: fullName || null,
		clientId: body.client_id,
		verify: 0,
	});

	return {
		status: true,
		data: {
			full_name: fullName,
			ref_id: encryptUrl(rowId),
			current_name: displayName(user),
		},
	};
}

// ============================================================================
// 4. verifyDigilocker
// ============================================================================

export async function verifyDigilockerService(userId: number, body: VerifyDigilockerBody) {
	const user = await verifyRepositery.findUserById(userId);
	if (!user) {
		return { status: false, messages: "User invalid" };
	}

	const clientId = body.client_id || "";
	const res = await surepass.digilockerDownload(clientId);

	if (String(res.statusCode) === "422") {
		return { status: false, messages: res.message };
	}

	if (!res.success) {
		await verifyRepositery.insertLog({
			userId,
			type: "adhaar",
			callMethod: "general/verifyDigilocker",
			logMessage: res.message,
			payload: res.data,
			statusCode: res.statusCode,
		});
		return { status: false, messages: res.message };
	}

	const xml = res.data?.aadhaar_xml_data || res.data?.data?.aadhaar_xml_data || res.data || {};
	const fullName = xml.full_name || xml.name || "";
	const maskedAadhaar = xml.masked_aadhaar || xml.uid || xml.aadhaar_number || clientId;

	const encrypted = encryptUrl(String(maskedAadhaar));
	const dup = await verifyRepositery.checkVerifyDocument(userId, DOCTYPE.AADHAAR, encrypted);
	if (dup) {
		return { status: false, messages: "This document is already verified with another account!" };
	}

	const rowId = await verifyRepositery.upsertAnyForUser(userId, {
		doctype: DOCTYPE.AADHAAR,
		docnumber: encrypted,
		docName: fullName || null,
		methodType: "digilocker",
		clientId,
		verify: 0,
	});

	return {
		status: true,
		data: {
			full_name: fullName,
			ref_id: encryptUrl(rowId),
			current_name: displayName(user),
		},
	};
}

// ============================================================================
// 5. sendEmailOtp
// ============================================================================

export async function sendEmailOtpService(
	actorUserId: number,
	contextId: number,
	userType: number | null,
	body: SendEmailOtpBody
) {
	const email = body.email;
	const type = (body.type || "").toUpperCase();
	const employmentId = body.employment_id ? Number(body.employment_id) : null;

	const user = await verifyRepositery.findUserById(actorUserId);
	if (!user) {
		return { status: false, messages: "User invalid" };
	}

	// A) Company domain verification
	if (type === "VERIFICATION") {
		const existingEmail = await verifyRepositery.findDomainByEmail(email);
		if (existingEmail) {
			return { status: false, message: "This email is already registered and verified." };
		}
		const domain = emailDomain(email);
		const existingDomain = await verifyRepositery.findDomainByDomain(domain);
		if (existingDomain) {
			return { status: false, message: "This domain is already registered and verified." };
		}
	}

	// B) Public domain block when employment_id or type set
	if (employmentId || type) {
		const domain = emailDomain(email);
		if (PUBLIC_EMAIL_DOMAINS.has(domain)) {
			return {
				status: false,
				messages: "Public email not allowed. Please enter your work email",
			};
		}
	}

	if (employmentId) {
		const exp = await verifyRepositery.findExperienceById(employmentId);
		if (!exp || exp.user !== actorUserId) {
			return { status: false, messages: "Invalid employment" };
		}
		if (exp.company) {
			const check = await validateWorkEmailDomain(exp.company, email, employmentId);
			if (!check.ok) return { status: false, messages: check.messages };
		}
	}

	// C) Account email path
	if (!employmentId && !type) {
		if (userType === 1 || user.userType === 1) {
			const other = await verifyRepositery.findEmployeeByEmail(email);
			if (other && other.id !== actorUserId) {
				return {
					status: false,
					messages: "This email address is already associated with an account.",
				};
			}
			const selfEmail = (user.email || "").toLowerCase();
			const selfAlt = (user.emailAlternate || "").toLowerCase();
			if (selfEmail === email && user.emailVerified === 1) {
				return { status: false, messages: "Email address already verified." };
			}
			if (selfAlt === email && user.emailAlternateVerify === 1) {
				return { status: false, messages: "Alternate Email address already verified." };
			}
		}
	}

	const otp = isBypass(email) ? "123456" : generateOtp();
	const otpType = type === "VERIFICATION" ? "VERIFICATION" : "SIGNUP";

	try {
		await verifyRepositery.upsertEmailOtp(email, otp, otpType, otpExpiryUnix());

		if (!isBypass(email)) {
			await sendEmailViaSQS(
				email,
				1,
				{ otp, name: user.fname || "" },
				{ user_id: actorUserId, type: "email_otp", status: 1 }
			);
		}

		return {
			status: true,
			messages: "OTP Successfully sent to your email address",
		};
	} catch (err) {
		console.error("sendEmailOtp error:", err);
		return {
			status: false,
			messages: "Email could not be delivered. Please check the email address and try again.",
		};
	}
}

// ============================================================================
// 6. verifyEmailOtp
// ============================================================================

export async function verifyEmailOtpService(
	actorUserId: number,
	contextId: number,
	body: VerifyEmailOtpBody
) {
	const email = body.email;
	const otp = body.otp;
	const type = (body.type || "").toUpperCase();
	const employmentId = body.employment_id ? Number(body.employment_id) : null;

	const row = await verifyRepositery.findEmailOtp(email);
	if (!row) {
		return { status: false, messages: "Invalid OTP or OTP has expired. Please try again" };
	}
	if (isOtpExpired(row.expiry)) {
		return { status: false, message: "OTP Expired !" };
	}
	if (String(row.otp) !== String(otp) && !isBypass(email)) {
		return { status: false, messages: "Invalid OTP!" };
	}

	// Branch VERIFICATION — company domain
	if (type === "VERIFICATION") {
		const domain = emailDomain(email);
		const companyId = contextId;
		const emailDomainId = await verifyRepositery.insertDomain({
			userId: companyId,
			addedBy: actorUserId,
			email,
			domain: null,
			isEmailBased: 0,
			isVerified: 1,
		});
		const domainRowId = await verifyRepositery.insertDomain({
			userId: companyId,
			addedBy: actorUserId,
			domain,
			email: null,
			isEmailBased: 1,
			isVerified: 1,
		});

		await verifyRepositery.clearWorkEmailsNotMatchingDomain(companyId, domain);
		await verifyRepositery.deleteEmailOtps(email);

		try {
			await sendSQSMessage({
				type: "SEND_SCHEDULAR",
				payload: { TYPE: "L2VU", domain_id: emailDomainId, user_id: companyId },
			});
			await sendSQSMessage({
				type: "SEND_SCHEDULAR",
				payload: { TYPE: "L2VC", domain_id: domainRowId, user_id: companyId, template: "104" },
			});
		} catch (err) {
			console.error("verifyEmailOtp scheduler error:", err);
		}

		return { status: true, messages: "OTP verify successfully !" };
	}

	// Branch employment work email
	if (employmentId) {
		const exp = await verifyRepositery.findExperienceById(employmentId);
		if (!exp || exp.user !== actorUserId) {
			return { status: false, messages: "Invalid employment" };
		}
		if (exp.company) {
			const check = await validateWorkEmailDomain(exp.company, email, employmentId);
			if (!check.ok) return { status: false, messages: check.messages };
		}

		await verifyRepositery.updateExperienceWorkEmail(employmentId, email);

		if (exp.company) {
			const domains = await verifyRepositery.findCompanyVerifiedDomains(exp.company);
			if (domains.length === 0) {
				await verifyRepositery.insertDomain({
					userId: exp.company,
					addedBy: actorUserId,
					domain: emailDomain(email),
					email,
					isEmailBased: 2,
					isVerified: 0,
				});
			}
		}

		await verifyRepositery.deleteEmailOtps(email);

		try {
			await sendEmailViaSQS(
				email,
				119,
				{ name: "" },
				{ user_id: actorUserId, type: "work_email", status: 1 }
			);
			await sendSQSMessage({
				type: "SEND_WHATSAPP",
				payload: { template: 205, vars: {} },
			});
		} catch (err) {
			console.error("work email side-effect error:", err);
		}

		return {
			status: true,
			messages: "Your given work email domain verified successfully",
		};
	}

	// Account email
	const user = await verifyRepositery.findUserById(actorUserId);
	if (!user) {
		return { status: false, messages: "User invalid" };
	}

	const primary = (user.email || "").toLowerCase();
	const alternate = (user.emailAlternate || "").toLowerCase();

	if (primary === email) {
		await verifyRepositery.updateUserEmailFlags(actorUserId, { emailVerified: 1 });
	} else if (alternate === email) {
		await verifyRepositery.updateUserEmailFlags(actorUserId, { emailAlternateVerify: 1 });
	}

	await verifyRepositery.deleteEmailOtps(email);

	return {
		status: true,
		messages: "OTP verify successfully !",
	};
}
