import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import db from "../../db";
import { cybTriggerEmail } from "../../db/schema";
import type { EmailPayload, HandlerResult } from "../types";

/** Template id → { subject, html file under worker/templates/ } */
const FILE_TEMPLATES: Record<number, { subject: string; file: string }> = {
	1: {
		subject: "One-Time Password (OTP) For User",
		file: "otp.html",
	},
};

const templateCache = new Map<string, string>();

function loadHtmlTemplate(filename: string): string {
	const cached = templateCache.get(filename);
	if (cached) return cached;

	const filePath = path.join(__dirname, "..", "templates", filename);
	const content = fs.readFileSync(filePath, "utf8");
	templateCache.set(filename, content);
	return content;
}

function env(key: string, fallback = ""): string {
	return (process.env[key] ?? fallback).trim().replace(/^['"]|['"]$/g, "");
}

function createMailTransporter() {
	const host = process.env.SMTP_HOST
	const port = parseInt(env("SMTP_PORT", "587"), 10) || 587;
	const crypto = env("SMTP_CRYPTO", "tls").toLowerCase();
	const user = env("SMTP_USER", "techsupport@collarcheck.com");
	const pass = env("SMTP_PASS");

	// 465 = implicit TLS (secure); 587 + tls = STARTTLS
	const secure = port === 465 || crypto === "ssl";
	const requireTLS = !secure && (crypto === "tls" || port === 587);

	const options: SMTPTransport.Options = {
		host,
		port,
		secure,
		requireTLS,
		auth: user && pass ? { user, pass } : undefined,
	};

	return nodemailer.createTransport(options);
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
	if (!transporter) {
		transporter = createMailTransporter();
	}
	return transporter;
}

export async function handleEmail(data: EmailPayload): Promise<HandlerResult> {
	try {
		console.log("[EMAIL] Sending email...");

		if (!data.mail) {
			console.warn("[EMAIL] No mail data — skipping");
			return { success: false, message: "No mail data" };
		}

		if (!data.mail.body && !data.mail.template) {
			console.warn("[EMAIL] Email body/template is empty — skipping");
			return { success: false, message: "Email body is empty" };
		}

		// Build email content
		const emailContent = await buildEmailContent(data.mail);

		// Send email via SMTP/API
		const emailSent = await sendEmail({
			to: data.mail.email,
			subject: emailContent.subject,
			html: emailContent.html,
			from: data.mail.from || env("SMTP_FROM", env("SMTP_USER", "techsupport@collarcheck.com")),
			cc: data.mail.cc,
			bcc: data.mail.bcc,
			attachments: data.mail.attachments,
		});

		if (emailSent) {
			if (data.trigger) {
				await logTriggerEmail(data.trigger);
			}
			console.log("[EMAIL] Email sent OK");
			return { success: true, message: "Email sent successfully" };
		} else {
			throw new Error(`Email FAILED for: ${data.mail.email || 'unknown'}`);
		}
	} catch (error) {
		console.error("[EMAIL] Error:", error);
		throw error;
	}
}

async function buildEmailContent(mail: EmailPayload["mail"]): Promise<{ subject: string; html: string }> {
	let subject = mail.subject || "CollarCheck Notification";
	let html = mail.body || "";

	// If template is provided, fetch and render template
	if (mail.template) {
		const templateContent = await getTemplateContent(mail.template);
		if (templateContent) {
			subject = templateContent.subject || subject;
			const raw = mail.vars || {};
			const displayName = raw.name || raw.username || "User";
			const vars = {
				year: String(new Date().getFullYear()),
				...raw,
				name: displayName,
				username: displayName,
				otp: raw.otp || "",
			};
			html = renderTemplate(templateContent.body, vars);
		}
	}

	return { subject, html };
}

async function getTemplateContent(templateId: number): Promise<{ subject: string; body: string } | null> {
	const fileTpl = FILE_TEMPLATES[templateId];
	if (!fileTpl) return null;

	return {
		subject: fileTpl.subject,
		body: loadHtmlTemplate(fileTpl.file),
	};
}

function renderTemplate(template: string, vars: Record<string, string>): string {
	let rendered = template;
	for (const [key, value] of Object.entries(vars)) {
		rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), value ?? "");
	}
	return rendered;
}


interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	from: string;
	cc?: string[];
	bcc?: string[];
	attachments?: Array<{ filename: string; path: string }>;
}

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
	const user = env("SMTP_USER", "techsupport@collarcheck.com");
	const from = options.from || env("SMTP_FROM", user);

	console.log("[EMAIL] Sending to:", options.to);
	console.log("[EMAIL] Subject:", options.subject);
	console.log("[EMAIL] SMTP:", env("SMTP_HOST", "smtp.gmail.com"), env("SMTP_PORT", "587"));

	const info = await getTransporter().sendMail({
		from,
		to: options.to,
		subject: options.subject,
		html: options.html,
		cc: options.cc?.length ? options.cc.join(",") : undefined,
		bcc: options.bcc?.length ? options.bcc.join(",") : undefined,
		attachments: options.attachments,
	});

	console.log("[EMAIL] MessageId:", info.messageId);
	return !!info.messageId;
}

async function logTriggerEmail(trigger: EmailPayload["trigger"]): Promise<void> {
	if (!trigger) return;

	try {
		await db.insert(cybTriggerEmail).values({
			user: trigger.user_id,
			email: "", // Will be filled by the caller if needed
			template: trigger.template_id || 0,
			status: trigger.status,
			createDate: new Date().toISOString(),
			modifyDate: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[EMAIL] Failed to log trigger:", error);
		// Don't throw - logging is optional
	}
}
