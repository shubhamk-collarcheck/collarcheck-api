import type { SchedulerPayload, HandlerResult } from "../types";

// Scheduler API configuration
interface SchedulerConfig {
	apiUrl: string;
	apiKey?: string;
}

const schedulerConfig: SchedulerConfig = {
	apiUrl: process.env.SCHEDULER_API_URL || process.env.APP_URL || "http://localhost:3000",
	apiKey: process.env.SCHEDULER_API_KEY,
};

export async function handleSchedular(data: SchedulerPayload): Promise<HandlerResult> {
	try {
		console.log("[SCHEDULER] Creating scheduler...");

		if (!data || Object.keys(data).length === 0) {
			console.warn("[SCHEDULER] Empty data payload — skipping");
			return { success: false, message: "Empty data payload" };
		}

		console.log("[SCHEDULER] Type:", data.TYPE);

		// Create scheduler via API
		const result = await createScheduler(data);

		if (result) {
			console.log("[SCHEDULER] Scheduler create OK");
			return { success: true, message: "Scheduler created successfully" };
		} else {
			throw new Error("Scheduler creation failed");
		}
	} catch (error) {
		console.error("[SCHEDULER] Error:", error);
		throw error;
	}
}

async function createScheduler(data: SchedulerPayload): Promise<boolean> {
	try {
		const url = `${schedulerConfig.apiUrl}/wapi/create_push_scheduler`;

		console.log("[SCHEDULER] Calling API:", url);

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		if (schedulerConfig.apiKey) {
			headers["Authorization"] = `Bearer ${schedulerConfig.apiKey}`;
		}

		const response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(data),
			signal: AbortSignal.timeout(10000), // 10 second timeout
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMsg = (errorData as any).error?.message || "Unknown error";
			console.error(`[SCHEDULER] API failed (HTTP ${response.status}): ${errorMsg}`);
			return false;
		}

		const responseData = await response.json();
		console.log("[SCHEDULER] API response:", responseData);

		return true;
	} catch (error) {
		if (error instanceof Error) {
			if (error.name === "AbortError") {
				console.error("[SCHEDULER] Request timeout");
			} else {
				console.error("[SCHEDULER] Fetch error:", error.message);
			}
		}
		return false;
	}
}
