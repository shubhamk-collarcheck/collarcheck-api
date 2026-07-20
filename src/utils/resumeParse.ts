/**
 * Lightweight heuristic resume text parser (legacy parseResume port).
 * Produces the same top-level keys clients expect from auto-fetch / resume-fetch.
 */

export type ParsedResume = {
	name: string | null;
	email: string | null;
	mobile: string | null;
	location: string | null;
	dob: string | null;
	portfolio: string | null;
	linkedin: string | null;
	github: string | null;
	education: Array<Record<string, string>>;
	experience: Array<Record<string, string>>;
	skills: {
		programming_languages: string[];
		web_technologies: string[];
		microsoft_technologies: string[];
		developer_tools: string[];
		soft_skills: string[];
		other: string[];
	};
	projects: Array<Record<string, string>>;
	certifications: Array<Record<string, string>>;
};

const emptySkills = (): ParsedResume["skills"] => ({
	programming_languages: [],
	web_technologies: [],
	microsoft_technologies: [],
	developer_tools: [],
	soft_skills: [],
	other: [],
});

export function emptyParsedResume(): ParsedResume {
	return {
		name: null,
		email: null,
		mobile: null,
		location: null,
		dob: null,
		portfolio: null,
		linkedin: null,
		github: null,
		education: [],
		experience: [],
		skills: emptySkills(),
		projects: [],
		certifications: [],
	};
}

export function parseResume(rawText: string): ParsedResume {
	const text = (rawText || "").replace(/\r/g, "\n");
	const result = emptyParsedResume();

	const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
	if (emailMatch) result.email = emailMatch[0];

	const phoneMatch = text.match(
		/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,6}/
	);
	if (phoneMatch) result.mobile = phoneMatch[0].trim();

	const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i);
	if (linkedin) result.linkedin = linkedin[0];

	const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i);
	if (github) result.github = github[0];

	const lines = text
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

	// First non-email line as name heuristic
	for (const line of lines.slice(0, 8)) {
		if (line.includes("@")) continue;
		if (/\d{5,}/.test(line)) continue;
		if (line.length > 3 && line.length < 60 && /^[A-Za-z .'-]+$/.test(line)) {
			result.name = line;
			break;
		}
	}

	// Skills: lines after a "Skills" heading, or comma-separated tokens
	const skillIdx = lines.findIndex((l) => /^skills?\b/i.test(l));
	if (skillIdx >= 0) {
		const chunk = lines.slice(skillIdx + 1, skillIdx + 6).join(" ");
		const tokens = chunk
			.split(/[,|•·;/]/)
			.map((t) => t.trim())
			.filter((t) => t.length > 1 && t.length < 40);
		result.skills.other = [...new Set(tokens)].slice(0, 40);
	}

	// Education / experience section capture (coarse)
	const eduIdx = lines.findIndex((l) => /education/i.test(l));
	if (eduIdx >= 0) {
		for (const line of lines.slice(eduIdx + 1, eduIdx + 8)) {
			if (/experience|skills|projects|certif/i.test(line)) break;
			if (line.length > 3) result.education.push({ raw: line });
		}
	}

	const expIdx = lines.findIndex((l) => /experience|employment|work history/i.test(l));
	if (expIdx >= 0) {
		for (const line of lines.slice(expIdx + 1, expIdx + 12)) {
			if (/education|skills|projects|certif/i.test(line)) break;
			if (line.length > 3) result.experience.push({ raw: line });
		}
	}

	return result;
}

/** Extract text from a PDF Buffer using pdf-parse. Non-PDF returns empty string. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
		const data = await pdfParse(buffer);
		return data?.text || "";
	} catch (err) {
		console.error("[RESUME] pdf-parse failed:", err);
		return "";
	}
}

/** Fetch remote resume URL (S3) into a Buffer. */
export async function fetchUrlBuffer(url: string): Promise<Buffer | null> {
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const ab = await res.arrayBuffer();
		return Buffer.from(ab);
	} catch (err) {
		console.error("[RESUME] fetch failed:", err);
		return null;
	}
}

export function resumePublicUrl(keyOrUrl: string): string {
	if (!keyOrUrl) return "";
	if (/^https?:\/\//i.test(keyOrUrl)) return keyOrUrl;
	const prefix = process.env.S3_PREFIX || "";
	return `${prefix}${keyOrUrl}`;
}
