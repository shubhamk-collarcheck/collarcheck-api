import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, } from "@aws-sdk/client-sqs";
import { handleEmail } from "./handlers/email.handler";
import { handlePush } from "./handlers/push.handler";
import { handleWhatsapp } from "./handlers/whatsapp.handler";
import { handleSchedular } from "./handlers/scheduler.handler";
import type { MessageType, WorkerConfig, SQSBaseMessage } from "./types";
import { DEFAULT_WORKER_CONFIG } from "./types";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

class SqsWorker {
	private sqsClient: SQSClient;
	private config: WorkerConfig;
	private isRunning: boolean = false;
	private messageCount: number = 0;
	private errorCount: number = 0;

	constructor(config: Partial<WorkerConfig> = {}) {
		this.config = { ...DEFAULT_WORKER_CONFIG, ...config };

		this.sqsClient = new SQSClient({
			region: process.env.AWS_REGION || "ap-south-1",
			credentials: {
				accessKeyId: process.env.AWS_KEY!,
				secretAccessKey: process.env.AWS_SECRET!,
			},
		});

		this.validateConfig();
	}

	private validateConfig(): void {
		if (!this.config.queueUrl) {
			throw new Error("AWS_SQS_URL environment variable is not set");
		}
		if (!process.env.AWS_KEY || !process.env.AWS_SECRET) {
			throw new Error("AWS credentials not configured");
		}
	}

	async start(): Promise<void> {
		if (this.isRunning) {
			console.log("[WORKER] Worker is already running");
			return;
		}

		this.isRunning = true;
		console.log("[WORKER] Worker started");
		console.log(`[WORKER] Queue URL: ${this.config.queueUrl}`);
		console.log(`[WORKER] Max messages: ${this.config.maxMessages}`);
		console.log(`[WORKER] Wait time: ${this.config.waitTimeSeconds}s`);

		while (this.isRunning) {
			try {
				await this.processMessages();
			} catch (error) {
				console.error("[WORKER] Worker error:", error);
				this.errorCount++;
				await this.sleep(this.config.sleepInterval * 1000);
			}
		}
	}

	stop(): void {
		console.log("[WORKER] Stopping worker...");
		this.isRunning = false;
		console.log(`[WORKER] Stats - Messages processed: ${this.messageCount}, Errors: ${this.errorCount}`);
	}

	private async processMessages(): Promise<void> {
		const command = new ReceiveMessageCommand({
			QueueUrl: this.config.queueUrl,
			MaxNumberOfMessages: this.config.maxMessages,
			WaitTimeSeconds: this.config.waitTimeSeconds,
			VisibilityTimeout: this.config.visibilityTimeout,
		});

		const response = await this.sqsClient.send(command);
		const messages = response.Messages || [];

		if (messages.length === 0) {
			await this.sleep(this.config.sleepInterval * 1000);
			return;
		}

		console.log(`[WORKER] Received ${messages.length} message(s)`);

		for (const message of messages) {
			await this.processMessage(message);
		}
	}

	private async processMessage(message: { MessageId?: string; Body?: string; ReceiptHandle?: string }): Promise<void> {
		const messageId = message.MessageId || "unknown";
		const receiptHandle = message.ReceiptHandle;

		if (!message.Body || !receiptHandle) {
			console.warn(`[WORKER] Invalid message ${messageId} - skipping`);
			return;
		}

		try {
			const job = JSON.parse(message.Body) as SQSBaseMessage;
			const type = job.type;
			const payload = job.payload;

			console.log(`[WORKER] Processing message ${messageId}: type=${type}`);

			// Route to appropriate handler
			await this.handleMessage(type, payload);

			// Delete message only after successful processing
			await this.deleteMessage(receiptHandle);
			this.messageCount++;

			console.log(`[WORKER] Message ${messageId} processed successfully`);
		} catch (error) {
			console.error(`[WORKER] Error processing message ${messageId}:`, error);
			// Don't delete - SQS will retry
		}
	}

	private async handleMessage(type: MessageType, payload: Record<string, any>): Promise<void> {
		switch (type) {
			case "SEND_EMAIL":
				await handleEmail(payload as any);
				break;

			case "SEND_PUSH":
				await handlePush(payload as any);
				break;

			case "SEND_WHATSAPP":
				await handleWhatsapp(payload as any);
				break;

			case "SEND_SCHEDULAR":
				await handleSchedular(payload as any);
				break;

			default:
				console.warn(`[WORKER] Unknown message type: ${type}`);
		}
	}

	private async deleteMessage(receiptHandle: string): Promise<void> {
		const command = new DeleteMessageCommand({
			QueueUrl: this.config.queueUrl,
			ReceiptHandle: receiptHandle,
		});

		await this.sqsClient.send(command);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Create and start worker
const worker = new SqsWorker();

// Handle graceful shutdown
process.on("SIGINT", () => {
	console.log("\n[WORKER] Received SIGINT signal");
	worker.stop();
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("\n[WORKER] Received SIGTERM signal");
	worker.stop();
	process.exit(0);
});

// Start the worker
worker.start().catch((error) => {
	console.error("[WORKER] Failed to start worker:", error);
	process.exit(1);
});
