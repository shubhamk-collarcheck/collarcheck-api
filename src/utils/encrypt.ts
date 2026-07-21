import crypto from "crypto";

/**
 * PHP parity helpers for `encrypt_url` / `decrypt_url` (uri_helper).
 * AES-256-CBC · secret_key COLLARCHECK · secret_iv SECRET@COLLAR
 * Output: urlencode(base64_encode(openssl_encrypt(...))) with OpenSSL base64 flag (0).
 */
const SECRET_KEY = process.env.ENCRYPT_SECRET_KEY || "COLLARCHECK";
const SECRET_IV = process.env.ENCRYPT_SECRET_IV || "SECRET@COLLAR";

function deriveKeyIv() {
	// PHP hash() returns hex by default; OpenSSL takes first 32/16 bytes of that string
	const keyHex = crypto.createHash("sha256").update(SECRET_KEY).digest("hex");
	const ivHex = crypto.createHash("sha256").update(SECRET_IV).digest("hex");
	const key = Buffer.from(keyHex.substring(0, 32), "utf8");
	const iv = Buffer.from(ivHex.substring(0, 16), "utf8");
	return { key, iv };
}

/** Encrypt string for storage / ref_id (URL-safe for query params). */
export function encryptUrl(plain: string | number): string {
	const text = String(plain);
	const { key, iv } = deriveKeyIv();
	const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
	let encrypted = cipher.update(text, "utf8", "base64");
	encrypted += cipher.final("base64");
	// PHP: urlencode(base64_encode($output)) where $output is already base64 from openssl
	return encodeURIComponent(Buffer.from(encrypted, "utf8").toString("base64"));
}

/** Decrypt encrypt_url values. Returns null on failure. */
export function decryptUrl(encoded: string): string | null {
	try {
		const raw = decodeURIComponent(String(encoded));
		const opensslB64 = Buffer.from(raw, "base64").toString("utf8");
		const { key, iv } = deriveKeyIv();
		const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
		let decrypted = decipher.update(opensslB64, "base64", "utf8");
		decrypted += decipher.final("utf8");
		return decrypted;
	} catch {
		// Fallback: maybe client sent raw openssl base64 without double-encode
		try {
			const { key, iv } = deriveKeyIv();
			const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
			const input = decodeURIComponent(String(encoded));
			let decrypted = decipher.update(input, "base64", "utf8");
			decrypted += decipher.final("utf8");
			return decrypted;
		} catch {
			return null;
		}
	}
}

/** Decrypt ref_id → numeric verify_document.id */
export function decryptRefId(refId: string): number | null {
	const plain = decryptUrl(refId);
	if (plain == null) return null;
	const n = Number(plain);
	return Number.isFinite(n) && n > 0 ? n : null;
}
