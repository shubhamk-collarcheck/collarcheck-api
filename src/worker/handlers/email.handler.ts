import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import db from "../../db";
import { cybTriggerEmail } from "../../db/schema";
import type { EmailPayload, HandlerResult } from "../types";
import {
	getFileTemplateMeta,
	renderFileTemplate,
	renderStringTemplate,
} from "../template";

function env(key: string, fallback = ""): string {
	return (process.env[key] ?? fallback).trim().replace(/^['"]|['"]$/g, "");
}

function createMailTransporter() {
	const host = process.env.SMTP_HOST;
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

		const emailContent = buildEmailContent(data.mail);

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
			throw new Error(`Email FAILED for: ${data.mail.email || "unknown"}`);
		}
	} catch (error) {
		console.error("[EMAIL] Error:", error);
		throw error;
	}
}

function buildTemplateVars(raw: Record<string, unknown> = {}): Record<string, unknown> {
	const nameVal = raw.name ?? raw.username;
	const displayName = typeof nameVal === "string" && nameVal.trim() ? nameVal : "User";
	const otpVal = raw.otp;
	return {
		year: String(new Date().getFullYear()),
		...raw,
		name: displayName,
		username: displayName,
		otp: otpVal != null ? String(otpVal) : "",
	};
}

function buildEmailContent(mail: EmailPayload["mail"]): { subject: string; html: string } {
	let subject = mail.subject || "CollarCheck Notification";
	let html = mail.body || "";

	if (mail.template) {
		const meta = getFileTemplateMeta(mail.template);
		if (!meta) {
			throw new Error(`Unknown email template id: ${mail.template}`);
		}

		const vars = buildTemplateVars(mail.vars);
		subject = renderStringTemplate(meta.subject, vars);
		html = renderFileTemplate(meta.file, vars);
	} else if (html && mail.vars) {
		// Allow {{placeholders}} in raw body as well
		html = renderStringTemplate(html, buildTemplateVars(mail.vars));
		if (mail.subject) {
			subject = renderStringTemplate(mail.subject, buildTemplateVars(mail.vars));
		}
	}

	return { subject, html };
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
			email: "",
			template: trigger.template_id || 0,
			status: trigger.status,
			createDate: new Date().toISOString(),
			modifyDate: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[EMAIL] Failed to log trigger:", error);
	}
}
