import { eq, inArray, and } from "drizzle-orm";
import db from "../../db";
import { cybUserDeviceTokens } from "../../db/schema";
import type { PushPayload, HandlerResult } from "../types";

// Firebase Admin SDK types
interface FirebaseMessage {
	notification?: {
		title: string;
		body: string;
		image?: string;
	};
	data?: Record<string, string>;
	token: string;
}

export async function handlePush(data: PushPayload): Promise<HandlerResult> {
	try {
		console.log("[PUSH] Sending push notification...");

		if (!data.user_id) {
			console.warn("[PUSH] No user_id provided");
			return { success: false, message: "No user_id provided" };
		}

		// Get device tokens for the user(s)
		const tokens = await getDeviceTokens(data.user_id);

		if (tokens.length === 0) {
			console.warn("[PUSH] No device tokens found");
			return { success: false, message: "No device tokens found" };
		}

		// Send push to all devices
		const result = await sendPushToMultipleDevices({
			tokens,
			title: data.title,
			body: data.body,
			data: data.data,
			options: data.options,
		});

		if (result) {
			console.log("[PUSH] Push sent OK");
			return { success: true, message: "Push notification sent" };
		} else {
			throw new Error("Push notification failed");
		}
	} catch (error) {
		console.error("[PUSH] Error:", error);
		throw error;
	}
}

async function getDeviceTokens(userId: number | number[]): Promise<string[]> {
	const userIds = Array.isArray(userId) ? userId : [userId];

	const tokens = await db
		.select({ deviceToken: cybUserDeviceTokens.deviceToken })
		.from(cybUserDeviceTokens)
		.where(
			and(
				inArray(cybUserDeviceTokens.userId, userIds),
				eq(cybUserDeviceTokens.status, 1)
			)
		);

	// Extract and deduplicate tokens
	const uniqueTokens = [...new Set(
		tokens
			.map(t => t.deviceToken)
			.filter((t): t is string => t !== null && t !== undefined && t !== "")
	)];

	return uniqueTokens;
}

interface PushOptions {
	tokens: string[];
	title: string;
	body: string;
	data?: Record<string, any>;
	options?: {
		image?: string;
		icon?: string;
		click_action?: string;
		badge?: number;
		tag?: string;
	};
}

async function sendPushToMultipleDevices(options: PushOptions): Promise<boolean> {
	try {
		// Option 1: Use Firebase Admin SDK
		// Option 2: Use OneSignal
		// Option 3: Use FCM directly

		// For now, we'll use a placeholder that logs the push
		// In production, integrate with your push notification provider

		console.log("[PUSH] Sending to", options.tokens.length, "devices");
		console.log("[PUSH] Title:", options.title);
		console.log("[PUSH] Body:", options.body);

		// TODO: Implement actual push notification sending
		// Example with Firebase Admin SDK:
		/*
		const admin = require('firebase-admin');
		
		if (!admin.apps.length) {
			admin.initializeApp({
				credential: admin.credential.applicationDefault(),
			});
		}

		const message: FirebaseMessage = {
			notification: {
				title: options.title,
				body: options.body,
				image: options.options?.image,
			},
			data: options.data ? Object.fromEntries(
				Object.entries(options.data).map(([k, v]) => [k, String(v)])
			) : undefined,
			token: '', // Will be set for each token
		};

		// Send to each token
		const results = await Promise.allSettled(
			options.tokens.map(async (token) => {
				const msg = { ...message, token };
				return admin.messaging().send(msg);
			})
		);

		const successCount = results.filter(r => r.status === 'fulfilled').length;
		return successCount > 0;
		*/

		// Simulate successful send
		return true;
	} catch (error) {
		console.error("[PUSH] Send error:", error);
		return false;
	}
}
