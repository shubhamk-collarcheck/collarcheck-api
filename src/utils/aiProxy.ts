/**
 * HTTP client helpers for the CollarCheck AI microservice proxy (BFF).
 *
 * Env:
 * - AI_DOMAIN — base URL (e.g. https://ai.collarcheck.com)
 * - AI_REGISTER_DOMAIN — optional override for domain/register hard-coded host
 */

const DEFAULT_TIMEOUT_MS = 10_000;

export function getAiDomain(): string {
	const base = (process.env.AI_DOMAIN || "https://ai.collarcheck.com").replace(/\/+$/, "");
	return base;
}

/** Host used by legacy domain/register (was hard-coded in PHP). */
export function getAiRegisterDomain(): string {
	const base = (
		process.env.AI_REGISTER_DOMAIN ||
		process.env.AI_DOMAIN ||
		"https://ai.collarcheck.com"
	).replace(/\/+$/, "");
	return base;
}

export type ProxyResult =
	| { ok: true; status: number; data: unknown }
	| { ok: false; status: number; message: string; data?: unknown; curlError?: boolean };

export async function callAiService(opts: {
	method: "GET" | "POST" | "PUT" | "DELETE";
	/** Path starting with /, relative to baseUrl */
	path: string;
	apiKey: string;
	body?: unknown;
	/** Default 10s; use 0 for no timeout (chat health). */
	timeoutMs?: number;
	baseUrl?: string;
}): Promise<ProxyResult> {
	const baseUrl = (opts.baseUrl || getAiDomain()).replace(/\/+$/, "");
	const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
	const url = `${baseUrl}${path}`;
	const timeoutMs = opts.timeoutMs === 0 ? 0 : opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	const headers: Record<string, string> = {
		"X-API-KEY": opts.apiKey,
	};
	if (opts.body !== undefined) {
		headers["Content-Type"] = "application/json";
	}

	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	if (timeoutMs > 0) {
		timer = setTimeout(() => controller.abort(), timeoutMs);
	}

	try {
		const res = await fetch(url, {
			method: opts.method,
			headers,
			body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
			signal: controller.signal,
		});

		const text = await res.text();
		let data: unknown = null;
		if (text) {
			try {
				data = JSON.parse(text);
			} catch {
				data = text;
			}
		}

		if (!res.ok) {
			const errMsg =
				(data as any)?.error?.message ||
				(data as any)?.message ||
				"Unknown error";
			return {
				ok: false,
				status: res.status,
				message: String(errMsg),
				data,
			};
		}

		return { ok: true, status: res.status, data };
	} catch (error: any) {
		const message =
			error?.name === "AbortError"
				? "Request timeout"
				: error?.message || String(error);
		return {
			ok: false,
			status: 0,
			message,
			curlError: true,
		};
	} finally {
		if (timer) clearTimeout(timer);
	}
}

/** Semantic + chat envelope: check upstream HTTP status. */
export function semanticChatEnvelope(result: ProxyResult) {
	if (result.ok) {
		return { status: true as const, data: result.data };
	}
	if (result.curlError) {
		return { status: false as const, message: result.message };
	}
	return {
		status: false as const,
		code: result.status,
		message: result.message,
		data: result.data ?? {},
	};
}

/** Domain / rank / scrape envelope: always status true unless thrown. */
export function alwaysSuccessEnvelope(result: ProxyResult) {
	// Even on upstream failure, wrap as success-shaped with data (legacy)
	return { status: true as const, data: result.ok ? result.data : result.data ?? null };
}

/** Normalize domain host before register/verify. */
export function normalizeDomain(input: string): string {
	let d = String(input || "").trim();
	d = d.replace(/^https?:\/\//i, "");
	d = d.replace(/^www\./i, "");
	d = d.split("/")[0] || "";
	return d.toLowerCase();
}
