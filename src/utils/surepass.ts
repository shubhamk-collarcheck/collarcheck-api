/**
 * SurePass / aadhaarkyc KYC HTTP client.
 * Base: https://kyc-api.aadhaarkyc.io
 * Auth: Authorization: Bearer {SUREPASSTOKEN}
 */

const BASE = process.env.SUREPASS_BASE_URL || "https://kyc-api.aadhaarkyc.io";

export type SurepassResult = {
	ok: boolean;
	success: boolean;
	statusCode: number | string | null;
	message: string;
	data: any;
	raw: any;
};

function authHeader(): string {
	const token = process.env.SUREPASSTOKEN || process.env.SUREPASS_TOKEN || "";
	return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

async function request(
	method: "GET" | "POST",
	path: string,
	body?: Record<string, unknown>,
	timeoutMs = 20_000
): Promise<SurepassResult> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const url = path.startsWith("http") ? path : `${BASE}${path}`;

	try {
		const res = await fetch(url, {
			method,
			headers: {
				"Content-Type": "application/json",
				Authorization: authHeader(),
			},
			body: body ? JSON.stringify(body) : undefined,
			signal: controller.signal,
		});

		let raw: any = null;
		const text = await res.text();
		try {
			raw = text ? JSON.parse(text) : {};
		} catch {
			raw = { message: text || res.statusText };
		}

		const success =
			raw?.success === 1 ||
			raw?.success === true ||
			raw?.success === "1" ||
			(res.ok && raw?.data != null && raw?.status_code !== 422);

		const message =
			raw?.message ||
			raw?.data?.message ||
			raw?.error ||
			(success ? "OK" : "Something went wrong please try again letter!");

		return {
			ok: res.ok,
			success: Boolean(success),
			statusCode: raw?.status_code ?? res.status,
			message: String(message),
			data: raw?.data ?? raw,
			raw,
		};
	} catch (err: any) {
		const aborted = err?.name === "AbortError";
		return {
			ok: false,
			success: false,
			statusCode: aborted ? 408 : 500,
			message: aborted ? "Request timeout" : err?.message || "KYC provider error",
			data: null,
			raw: null,
		};
	} finally {
		clearTimeout(timer);
	}
}

export const surepass = {
	gstInit(idNumber: string) {
		return request(
			"POST",
			"/api/v1/corporate-otp/gstin/init",
			{ id_number: idNumber, hsn_info_get: true },
			20_000
		);
	},
	gstGenerateOtp(clientId: string) {
		return request(
			"POST",
			"/api/v1/corporate-otp/gstin/generate-otp",
			{ client_id: clientId, type: "mobile" },
			20_000
		);
	},
	gstSubmitOtp(clientId: string, otp: string) {
		return request(
			"POST",
			"/api/v1/corporate-otp/gstin/submit-otp",
			{ client_id: clientId, otp },
			20_000
		);
	},
	pan(idNumber: string) {
		return request("POST", "/api/v1/pan/pan", { id_number: idNumber }, 10_000);
	},
	aadhaarGenerateOtp(idNumber: string) {
		return request(
			"POST",
			"/api/v1/aadhaar-v2/generate-otp",
			{ id_number: idNumber },
			20_000
		);
	},
	aadhaarSubmitOtp(clientId: string, otp: string) {
		return request(
			"POST",
			"/api/v1/aadhaar-v2/submit-otp",
			{ client_id: clientId, otp },
			20_000
		);
	},
	digilockerInit(payload: Record<string, unknown>) {
		return request("POST", "/api/v1/digilocker/initialize", payload, 20_000);
	},
	digilockerDownload(clientId: string) {
		return request(
			"GET",
			`/api/v1/digilocker/download-aadhaar/${encodeURIComponent(clientId)}`,
			undefined,
			20_000
		);
	},
};

/** Mask mobile: first 2 + xxxxxx + last 2 */
export function maskMobilePartial(mobile: string): string {
	const d = String(mobile).replace(/\D/g, "");
	if (d.length < 4) return "xx******xx";
	return `${d.slice(0, 2)}xxxxxx${d.slice(-2)}`;
}
