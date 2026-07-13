import companyInviteRepositery from "../repositery/company-invite.repositery";
import usersRepositery from "../repositery/users.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import type { CompanyInviteBody } from "../types/company-invite.types";
import { sendEmailViaSQS } from "../utils/sqs";

function encryptUrl(url: string): string {
	return Buffer.from(url).toString('base64');
}

export async function createCompanyInviteService(userId: number, data: CompanyInviteBody,) {
	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	// Check if invite already exists for this employee + company
	const existing = await companyInviteRepositery.findByUserAndCompany(userId, data.company);

	// Get employee name for email
	const user = await usersRepositery.findById(userId);
	const employeeName = user ? `${user.fname || ''} ${user.lname || ''}`.trim() : 'An employee';

	const inviteData = {
		company: data.company,
		contactPerson: data.contact_person || null,
		email: data.email || null,
		phone: data.phone || null,
		website: data.website || null,
		addedBy: userId,
		status: 1,
		isDeleted: 0,
		createDate: now,
		modifyDate: now,
	};

	let inviteId: number;

	if (existing) {
		// Update existing invite
		await companyInviteRepositery.update(existing.id, {
			contactPerson: inviteData.contactPerson,
			email: inviteData.email,
			phone: inviteData.phone,
			website: inviteData.website,
			modifyDate: now,
		});
		inviteId = existing.id;
	} else {
		// Create new invite
		const result = await companyInviteRepositery.create(inviteData);
		if (!result) {
			throw new BadRequestError("Something went wrong!");
		}
		inviteId = result.id;
	}

	// Send email via SQS if email is provided
	if (data.email) {
		const inviteUrl = `${process.env.REACT_SITE || 'https://app.collarcheck.com/'}signup?invite=${encryptUrl(String(inviteId))}`;

		try {
			await sendEmailViaSQS(
				data.email,
				50, // Template ID for company invite
				{
					invite_url: inviteUrl,
					employee_name: employeeName,
					company_name: employeeName,
				},
				{
					user_id: userId,
					type: "company_invite",
					status: 1,
				}
			);
		} catch (error) {
			// Log error but don't fail the request
			console.error("Failed to send SQS email:", error);
		}
	}

	return "Company invite send!";
}
