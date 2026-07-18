/**
 * MSG91 SMS OTP helpers — parity with PHP otpSend() / MainController::send_otp_new().
 *
 * Login verifies OTP against the local `otp` table only; MSG91 only delivers the SMS.
 *
 * Env:
 *   AUTH_KEY_MSG            (required) MSG91 auth key
 *   MSG91_TEMPLATE_ID       (optional) default 64edcc1ad6fc051e7c079f72
 *   MSG91_OTP_LENGTH        (optional) default 6
 *   MSG91_SEND_URL          (optional) default https://control.msg91.com/api/v5/otp
 *   MSG91_VERIFY_URL        (optional) default https://api.msg91.com/api/v5/otp/verify
 *   MSG91_TIMEOUT_SECONDS   (optional) default 15
 *   MSG91_DEFAULT_COUNTRY   (optional) e.g. "91" — prefix when mobile is 10 digits
 */

const DEFAULT_TEMPLATE_ID = "64edcc1ad6fc051e7c079f72";
const DEFAULT_OTP_LENGTH = "6";
const DEFAULT_SEND_URL = "https://control.msg91.com/api/v5/otp";
const DEFAULT_VERIFY_URL = "https://api.msg91.com/api/v5/otp/verify";
const DEFAULT_TIMEOUT_MS = 15_000;

function getAuthKey(): string | undefined {
	return process.env.AUTH_KEY_MSG?.trim() || undefined;
}

function getTimeoutMs(): number {
	const sec = Number(process.env.MSG91_TIMEOUT_SECONDS);
	if (Number.isFinite(sec) && sec > 0) return sec * 1000;
	return DEFAULT_TIMEOUT_MS;
}

/** Mask mobile for logs: keep last 4 digits. */
export function maskMobile(mobile: string): string {
	const digits = String(mobile).replace(/\D/g, "");
	if (digits.length <= 4) return "****";
	return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

/**
 * Strip `+` and trim. Optionally prefix country code for bare 10-digit numbers
 * when MSG91_DEFAULT_COUNTRY is set (e.g. "91").
 */
export function normalizeMsg91Mobile(mobile: string): string {
	let clean = String(mobile).replace(/\+/g, "").replace(/\s/g, "").trim();
	const country = (process.env.MSG91_DEFAULT_COUNTRY || "").replace(/\D/g, "");
	if (country && /^\d{10}$/.test(clean) && !clean.startsWith(country)) {
		clean = `${country}${clean}`;
	}
	return clean;
}

/**
 * Send app-generated OTP via MSG91 OTP v5 API.
 * Success only when response JSON has `type === "success"`.
 */
export async function otpSend(mobile: string, otp: string | number): Promise<boolean> {
	const clean = normalizeMsg91Mobile(mobile);
	const otpStr = otp === undefined || otp === null ? "" : String(otp).trim();
	const masked = maskMobile(clean);

	if (!clean || !otpStr) {
		console.warn("[MSG91] Empty mobile or otp — skip send");
		return false;
	}

	const authkey = getAuthKey();
	if (!authkey) {
		console.error("[MSG91] AUTH_KEY_MSG is not set — cannot send OTP to", masked);
		return false;
	}

	const url = new URL(process.env.MSG91_SEND_URL || DEFAULT_SEND_URL);
	url.searchParams.set(
		"template_id",
		process.env.MSG91_TEMPLATE_ID || DEFAULT_TEMPLATE_ID
	);
	url.searchParams.set("mobile", clean);
	url.searchParams.set("otp", otpStr);
	url.searchParams.set(
		"otp_length",
		process.env.MSG91_OTP_LENGTH || DEFAULT_OTP_LENGTH
	);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), getTimeoutMs());

	try {
		console.log("[MSG91] Sending OTP to", masked, "len=", otpStr.length);

		const res = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				authkey,
			},
			signal: controller.signal,
		});

		const rawText = await res.text();
		type Msg91OtpResponse = { type?: string; message?: string; request_id?: string };
		let detail: Msg91OtpResponse | null = null;
		try {
			detail = rawText ? (JSON.parse(rawText) as Msg91OtpResponse) : null;
		} catch {
			detail = null;
		}

		const ok = detail?.type === "success";
		if (!ok) {
			console.error(
				"[MSG91] OTP send failed for",
				masked,
				"HTTP",
				res.status,
				"body:",
				rawText.slice(0, 500)
			);
		} else {
			const requestId = detail?.request_id ? `request_id=${detail.request_id}` : "";
			console.log("[MSG91] OTP sent OK to", masked, requestId);
		}
		return ok;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("OTP CURL Error:", message, "mobile=", masked);
		return false;
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Legacy MSG91-side verify (not used by /wapi/login/verify-otp).
 * Note: this always prefixes 91 like the PHP helper — prefer local DB verify.
 */
export async function verifyOtpMobile(
	mobile: string,
	otp: string | number
): Promise<Record<string, unknown> | false> {
	const clean = normalizeMsg91Mobile(mobile);
	const otpStr = otp === undefined || otp === null ? "" : String(otp).trim();
	const authkey = getAuthKey();

	if (!clean || !otpStr || !authkey) {
		return false;
	}

	const withCountry = clean.startsWith("91") ? clean : `91${clean}`;

	const url = new URL(process.env.MSG91_VERIFY_URL || DEFAULT_VERIFY_URL);
	url.searchParams.set("authkey", authkey);
	url.searchParams.set("mobile", withCountry);
	url.searchParams.set("otp", otpStr);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), getTimeoutMs());

	try {
		const res = await fetch(url, {
			method: "GET",
			signal: controller.signal,
		});
		const detail = await res.json().catch(() => null);
		if (!detail || typeof detail !== "object") return false;
		return detail as Record<string, unknown>;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[MSG91] Verify error:", message);
		return false;
	} finally {
		clearTimeout(timer);
	}
}
