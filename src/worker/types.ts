// SQS Worker Types and Interfaces

export type MessageType = "SEND_EMAIL" | "SEND_PUSH" | "SEND_WHATSAPP" | "SEND_SCHEDULAR";

// Base message interface
export interface SQSBaseMessage {
	type: MessageType;
	payload: Record<string, any>;
}

// Email specific types
export interface EmailMailData {
	email: string;
	subject?: string;
	body?: string;
	template?: number;
	vars?: Record<string, string>;
	from?: string;
	cc?: string[];
	bcc?: string[];
	attachments?: Array<{
		filename: string;
		path: string;
	}>;
}

export interface EmailTriggerData {
	user_id: number;
	type: string;
	status: number;
	companies?: number[];
	template_id?: number;
}

export interface EmailPayload {
	mail: EmailMailData;
	trigger?: EmailTriggerData;
	action?: string;
}

// Push notification types
export interface PushPayload {
	user_id: number | number[];
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

// WhatsApp types
export interface WhatsAppPayload {
	phone: string;
	message: string;
	template?: string;
	vars?: Record<string, string>;
	media_url?: string;
}

// Scheduler types
export interface SchedulerPayload {
	TYPE: string;
	user_id: number;
	company_id?: number;
	schedule_date: string;
	schedule_time: string;
	title?: string;
	description?: string;
	[key: string]: any;
}

// Handler result
export interface HandlerResult {
	success: boolean;
	message: string;
	error?: Error;
}

// Worker configuration
export interface WorkerConfig {
	queueUrl: string;
	maxMessages: number;
	waitTimeSeconds: number;
	visibilityTimeout: number;
	sleepInterval: number;
	maxRetries: number;
}

// Default configuration
export const DEFAULT_WORKER_CONFIG: WorkerConfig = {
	queueUrl: process.env.AWS_SQS_URL || '',
	maxMessages: 5,
	waitTimeSeconds: 20,
	visibilityTimeout: 60,
	sleepInterval: 5,
	maxRetries: 3,
};
