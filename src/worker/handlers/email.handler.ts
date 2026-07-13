import db from "../../db";
import { cybTriggerEmail } from "../../db/schema";
import type { EmailPayload, HandlerResult } from "../types";

// Email template placeholders mapping
const TEMPLATE_VARS: Record<number, string[]> = {
	50: ["invite_url", "employee_name", "company_name"],
};

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
			from: data.mail.from || process.env.SMTP_FROM || 'noreply@collarcheck.com',
			cc: data.mail.cc,
			bcc: data.mail.bcc,
			attachments: data.mail.attachments,
		});

		if (emailSent) {
			// Log trigger if provided
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
	if (mail.template && mail.vars) {
		const templateContent = await getTemplateContent(mail.template);
		if (templateContent) {
			subject = templateContent.subject || subject;
			html = renderTemplate(templateContent.body, mail.vars);
		}
	}

	return { subject, html };
}

async function getTemplateContent(templateId: number): Promise<{ subject: string; body: string } | null> {
	// This would fetch from email_templates table
	// For now, return default templates
	const templates: Record<number, { subject: string; body: string }> = {
		50: {
			subject: "You've been invited to join CollarCheck",
			body: `
				<h1>Welcome to CollarCheck!</h1>
				<p>Hello,</p>
				<p>{{employee_name}} has invited you to join CollarCheck.</p>
				<p>Click the link below to sign up:</p>
				<a href="{{invite_url}}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Sign Up Now</a>
				<p>If you have any questions, please contact us.</p>
				<p>Best regards,<br/>The CollarCheck Team</p>
			`,
		},
	};

	return templates[templateId] || null;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
	let rendered = template;
	for (const [key, value] of Object.entries(vars)) {
		rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), value);
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
	// Option 1: Use AWS SES
	// Option 2: Use SMTP (nodemailer)
	// Option 3: Use SendGrid/Mailgun

	// For now, we'll use a placeholder that logs the email
	// In production, integrate with your email provider

	console.log("[EMAIL] Sending to:", options.to);
	console.log("[EMAIL] Subject:", options.subject);

	// TODO: Implement actual email sending
	// Example with nodemailer:
	/*
	const nodemailer = require('nodemailer');
	const transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: parseInt(process.env.SMTP_PORT || '587'),
		secure: false,
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});

	const info = await transporter.sendMail({
		from: options.from,
		to: options.to,
		subject: options.subject,
		html: options.html,
		cc: options.cc?.join(','),
		bcc: options.bcc?.join(','),
		attachments: options.attachments,
	});

	return !!info.messageId;
	*/

	// Simulate successful send
	return true;
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
