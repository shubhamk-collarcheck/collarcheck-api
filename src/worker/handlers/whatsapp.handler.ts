import type { WhatsAppPayload, HandlerResult } from "../types";

// WhatsApp API configuration
interface WhatsAppConfig {
	apiUrl: string;
	apiKey: string;
	senderPhone: string;
}

const whatsappConfig: WhatsAppConfig = {
	apiUrl: process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v17.0",
	apiKey: process.env.WHATSAPP_API_KEY || "",
	senderPhone: process.env.WHATSAPP_SENDER_PHONE || "",
};

export async function handleWhatsapp(data: WhatsAppPayload): Promise<HandlerResult> {
	try {
		console.log("[WHATSAPP] Sending WhatsApp message...");

		if (!data.phone) {
			console.warn("[WHATSAPP] No phone number provided");
			return { success: false, message: "No phone number" };
		}

		if (!data.message && !data.template) {
			console.warn("[WHATSAPP] No message or template provided");
			return { success: false, message: "No message content" };
		}

		// Send WhatsApp message
		const result = await sendWhatsAppMessage({
			to: data.phone,
			message: data.message,
			template: data.template,
			vars: data.vars,
			mediaUrl: data.media_url,
		});

		if (result) {
			console.log("[WHATSAPP] Message sent OK");
			return { success: true, message: "WhatsApp message sent" };
		} else {
			throw new Error(`WhatsApp FAILED for: ${data.phone}`);
		}
	} catch (error) {
		console.error("[WHATSAPP] Error:", error);
		throw error;
	}
}

interface SendMessageOptions {
	to: string;
	message?: string;
	template?: string;
	vars?: Record<string, string>;
	mediaUrl?: string;
}

async function sendWhatsAppMessage(options: SendMessageOptions): Promise<boolean> {
	try {
		// Option 1: WhatsApp Business API
		// Option 2: Twilio WhatsApp
		// Option 3: MessageBird
		// Option 4: WATI

		console.log("[WHATSAPP] Sending to:", options.to);

		// TODO: Implement actual WhatsApp sending
		// Example with WhatsApp Business API:
		/*
		const response = await fetch(`${whatsappConfig.apiUrl}/${whatsappConfig.senderPhone}/messages`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${whatsappConfig.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				messaging_product: 'whatsapp',
				to: options.to,
				type: options.template ? 'template' : 'text',
				...(options.template ? {
					template: {
						name: options.template,
						language: { code: 'en' },
						components: options.vars ? Object.entries(options.vars).map(([key, value], index) => ({
							type: 'body',
							parameters: [{ type: 'text', text: value }],
						})) : [],
					},
				} : {
					text: { body: options.message },
				}),
			}),
		});

		return response.ok;
		*/

		// Simulate successful send
		return true;
	} catch (error) {
		console.error("[WHATSAPP] Send error:", error);
		return false;
	}
}
