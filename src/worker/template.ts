import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

/** Template id → { subject, file under worker/templates/ } */
export const FILE_TEMPLATES: Record<number, { subject: string; file: string }> = {
	1: {
		subject: "One-Time Password (OTP) For User",
		file: "otp.html",
	},
};

const sourceCache = new Map<string, string>();
const compiledCache = new Map<string, Handlebars.TemplateDelegate>();

const templatesDir = path.join(__dirname, "templates");

function loadSource(filename: string): string {
	const cached = sourceCache.get(filename);
	if (cached) return cached;

	const filePath = path.join(templatesDir, filename);
	if (!fs.existsSync(filePath)) {
		throw new Error(`Email template not found: ${filename}`);
	}

	const content = fs.readFileSync(filePath, "utf8");
	sourceCache.set(filename, content);
	return content;
}

function getCompiled(filename: string): Handlebars.TemplateDelegate {
	const cached = compiledCache.get(filename);
	if (cached) return cached;

	const source = loadSource(filename);
	const compiled = Handlebars.compile(source, { noEscape: false, strict: false, });
	compiledCache.set(filename, compiled);
	return compiled;
}

export function renderFileTemplate(filename: string, vars: Record<string, unknown> = {},): string {
	const template = getCompiled(filename);
	return template(vars);
}

export function renderStringTemplate(source: string, vars: Record<string, unknown> = {},): string {
	const cacheKey = `inline:${source}`;
	let compiled = compiledCache.get(cacheKey);
	if (!compiled) {
		compiled = Handlebars.compile(source, { noEscape: false, strict: false });
		compiledCache.set(cacheKey, compiled);
	}
	return compiled(vars);
}

export function getFileTemplateMeta(templateId: number,): { subject: string; file: string } | null {
	return FILE_TEMPLATES[templateId] ?? null;
}

/** Clear caches (useful in tests or hot-reload). */
export function clearTemplateCache(): void {
	sourceCache.clear();
	compiledCache.clear();
}
