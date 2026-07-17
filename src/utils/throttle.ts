/** Simple in-memory IP throttle: max N requests per windowMs per key. */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function isThrottled(key: string, max = 3, windowMs = 60_000): boolean {
	const now = Date.now();
	const existing = buckets.get(key);

	if (!existing || existing.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return false;
	}

	if (existing.count >= max) {
		return true;
	}

	existing.count += 1;
	return false;
}

export function clientIp(req: { ip?: string; headers: Record<string, unknown>; socket?: { remoteAddress?: string } }): string {
	const forwarded = req.headers["x-forwarded-for"];
	if (typeof forwarded === "string" && forwarded.trim()) {
		return forwarded.split(",")[0].trim();
	}
	return req.ip || req.socket?.remoteAddress || "unknown";
}
