import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({
	region: process.env.AWS_REGION || "ap-south-1",
	credentials: {
		accessKeyId: process.env.AWS_KEY!,
		secretAccessKey: process.env.AWS_SECRET!,
	},
});

export interface SQSEmailPayload {
	mail: {
		email: string;
		template: number;
		vars?: Record<string, string>;
	};
	trigger?: {
		user_id: number;
		type: string;
		status: number;
	};
}

export interface SQSMessage {
	type: "SEND_EMAIL" | "SEND_PUSH" | "SEND_WHATSAPP" | "SEND_SCHEDULAR";
	payload: SQSEmailPayload | Record<string, any>;
}

export async function sendSQSMessage(message: SQSMessage): Promise<boolean> {
	const queueUrl = process.env.AWS_SQS_URL;
	if (!queueUrl) {
		throw new Error("AWS_SQS_URL environment variable is not set");
	}

	const command = new SendMessageCommand({
		QueueUrl: queueUrl,
		MessageBody: JSON.stringify(message),
		MessageDeduplicationId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
		MessageGroupId: "collarcheck-main",
	});

	try {
		const response = await sqsClient.send(command);
		return response.$metadata.httpStatusCode === 200;
	} catch (error) {
		console.error("SQS send error:", error);
		throw error;
	}
}


export async function sendEmailViaSQS(
	email: string,
	template: number,
	vars: Record<string, string> = {},
	trigger?: { user_id: number; type: string; status: number }
): Promise<boolean> {
	const message: SQSMessage = {
		type: "SEND_EMAIL",
		payload: {
			mail: {
				email,
				template,
				vars,
			},
			...(trigger && { trigger }),
		},
	};

	return sendSQSMessage(message);
}
