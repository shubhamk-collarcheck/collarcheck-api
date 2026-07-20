import accountMigrationRepositery from "../repositery/account-migration.repositery";
import loginRepositery from "../repositery/login.repositery";
import { user_verified } from "./users.service";
import { getStatistics } from "./login.service";
import { sendSQSMessage } from "../utils/sqs";
import { otpSend } from "../utils/msg91";
import db from "../db";
import { cybUser } from "../db/schema";
import type {
	CreateUserGroupBody,
	AssignPermissionBody,
	SendOtpMergeBody,
	VerifyOtpMergeBody,
	MergeUserRegisterBody,
	AiGenerateRowBody,
} from "../types/account-migration.types";

const s3Prefix = process.env.S3_PREFIX || "";
const BLOCKED_GROUP_NAMES = ["super admin", "admin", "hr", "manager"];

function pageToSqlOffset(page: number, limit: number) {
	const p = Number(page) || 0;
	if (p <= 1) return 0;
	return p * limit - limit;
}

function otpExpiryUnix() {
	return String(Math.floor(Date.now() / 1000) + 10 * 60);
}

function randomOtp() {
	return String(Math.floor(100000 + Math.random() * 900000));
}

function parseJsonArray(raw?: string | null): number[] {
	if (!raw) return [];
	try {
		const p = JSON.parse(raw);
		if (Array.isArray(p)) return p.map(Number).filter((n) => Number.isFinite(n));
	} catch {
		/* */
	}
	return String(raw)
		.split(",")
		.map((s) => Number(s.trim()))
		.filter((n) => Number.isFinite(n) && n > 0);
}

function requireCompany(userType: number | null | undefined) {
	if (userType === 1) {
		return { status: false as const, messages: "Company id is requeired!" };
	}
	return null;
}

// ====== create / update user group ======
export async function createUserGroupService(
	companyId: number,
	loginUserId: number,
	userType: number | null,
	body: CreateUserGroupBody,
	groupRowId?: number
) {
	const deny = requireCompany(userType);
	if (deny) return deny;

	let mainGroupId: number;
	if (typeof body.group_name === "number") {
		const main = await accountMigrationRepositery.findMainGroupById(body.group_name);
		if (!main) return { status: false, messages: "Invalid group_name" };
		mainGroupId = main.id;
	} else {
		const name = body.group_name.trim();
		if (BLOCKED_GROUP_NAMES.includes(name.toLowerCase()) && !groupRowId) {
			return {
				status: false,
				messages:
					"Default roles are predefined. You cannot create a custom role with this name.",
			};
		}
		const existing = await accountMigrationRepositery.findMainGroupByName(name, companyId);
		if (existing) {
			mainGroupId = existing.id;
		} else {
			mainGroupId = await accountMigrationRepositery.createMainGroup({
				name,
				companyId,
			});
		}
	}

	const menuIds = await accountMigrationRepositery.getMenuIdsByEventIds(
		body.event_permission || []
	);
	const menuPermission = JSON.stringify(menuIds);
	const eventPermission = JSON.stringify(body.event_permission || []);

	if (groupRowId) {
		const row = await accountMigrationRepositery.findUserGroupById(groupRowId);
		if (!row) return { status: false, messages: "Group not found" };
		await accountMigrationRepositery.updateUserGroup(groupRowId, {
			menuPermission,
			eventPermission,
			groupId: mainGroupId,
		});
		return { status: true, messages: "Group Updated successfully!" };
	}

	const dup = await accountMigrationRepositery.findUserGroup(mainGroupId, companyId);
	if (dup) return { status: false, message: "Group already exists." };

	await accountMigrationRepositery.createUserGroup({
		groupId: mainGroupId,
		menuPermission,
		eventPermission,
		addedBy: loginUserId,
		ownerId: companyId,
	});
	return { status: true, messages: "Group created successfully!" };
}

// ====== assign permission ======
export async function assignUserPermissionService(
	companyId: number,
	loginUserId: number,
	userType: number | null,
	body: AssignPermissionBody,
	permissionId?: number
) {
	const deny = requireCompany(userType);
	if (deny) return deny;

	const groupRow = await accountMigrationRepositery.findUserGroupById(body.group_id);
	if (!groupRow) return { status: false, messages: "Invalid group_id" };

	const superGroup = await accountMigrationRepositery.findSuperAdminUserGroup(companyId);

	if (permissionId) {
		const existing = await accountMigrationRepositery.findPermissionById(permissionId);
		if (!existing) return { status: false, messages: "Permission not found" };

		if (superGroup && existing.groupId === superGroup.id) {
			// non-super acting user cannot change super-admin
			const actorPerm = await accountMigrationRepositery.findActivePermissionForUserCompany(
				loginUserId,
				companyId
			);
			if (!actorPerm || actorPerm.groupId !== superGroup.id) {
				return {
					status: false,
					message: "You do not have permission to change the Super Admin account",
				};
			}
			if (body.group_id !== superGroup.id) {
				const count = await accountMigrationRepositery.countActiveSuperAdmins(
					companyId,
					superGroup.id
				);
				if (count <= 1) {
					return { status: false, message: "At least one Super Admin is required!!" };
				}
			}
		}

		if (existing.groupId === body.group_id) {
			return { status: true, messages: "It has been assigned successfully" };
		}
		await accountMigrationRepositery.updatePermission(permissionId, body.group_id);
		return { status: true, messages: "Permission updated successfully" };
	}

	const already = await accountMigrationRepositery.findActivePermissionForUserCompany(
		body.user_id,
		companyId
	);
	if (already) {
		return {
			status: false,
			message: "User has already assigned so please update the roles",
		};
	}

	const rel = await accountMigrationRepositery.findRelation(body.user_id, companyId);
	if (!rel) {
		await accountMigrationRepositery.createRelation(body.user_id, companyId);
	}
	await accountMigrationRepositery.createPermission({
		userId: body.user_id,
		groupId: body.group_id,
		addedBy: companyId,
		parentId: companyId,
	});

	try {
		await accountMigrationRepositery.insertNotification({
			sender: companyId,
			receiver: body.user_id,
			message: "You have been assigned a company role",
			type: "permission",
		});
		await sendSQSMessage({
			type: "SEND_PUSH",
			payload: {
				user_id: body.user_id,
				title: "Role assigned",
				body: "You have been assigned a company role on CollarCheck",
			},
		});
	} catch (e) {
		console.error("[assign-permission] notify failed", e);
	}

	return { status: true, messages: "Permission assigned successfully" };
}

// ====== lists ======
export async function menuEventListService() {
	const event = await accountMigrationRepositery.listEvents();
	return { status: true, data: { event } };
}

export async function userGroupListService(companyId: number) {
	const data = await accountMigrationRepositery.listUserGroups(companyId);
	return { status: true, data };
}

export async function groupUserListService(
	companyId: number,
	limit = 50,
	offset = 0
) {
	const sqlOffset = pageToSqlOffset(offset, limit);
	const { rows, total } = await accountMigrationRepositery.listGroupUsers(
		companyId,
		limit,
		sqlOffset
	);
	const data = [];
	for (const r of rows) {
		data.push({
			user_permission_id: r.user_permission_id,
			individual_id: r.individual_id,
			user_id: r.user_id,
			full_name: [r.fname, r.lname].filter(Boolean).join(" "),
			profile: r.profile ? `${s3Prefix}${r.profile}` : r.socialImage || "",
			slug: r.slug,
			country_name: r.country_name || "",
			state_name: r.state_name || "",
			city_name: r.city_name || "",
			create_date: r.create_date,
			user_group_id: r.user_group_id,
			group_name: r.group_name || "",
			on_explore: r.on_explore ?? 0,
			on_immediate: r.on_immediate ?? 0,
			on_notice: r.on_notice ?? 0,
			is_verified: await user_verified(r.user_id),
		});
	}
	return { status: true, data, totalCounts: total };
}

export async function userPermissionListService(
	actingId: number,
	companyIdFromQuery?: number
) {
	const companyId = companyIdFromQuery || actingId;
	const rel = await accountMigrationRepositery.findRelation(actingId, companyId);
	// If relation exists, resolve that user's permissions; else full catalog (legacy company view)
	if (rel || companyIdFromQuery) {
		const targetUser = rel ? actingId : actingId;
		const perms = await accountMigrationRepositery.listPermissionsForUser(
			companyIdFromQuery ? actingId : targetUser,
			companyId
		);
		if (perms.length) {
			const data = [];
			for (const p of perms) {
				const menuIds = parseJsonArray(p.menu_permission);
				const eventIds = parseJsonArray(p.event_permission);
				const [menu_permission, event_permission] = await Promise.all([
					accountMigrationRepositery.getMenusByIds(menuIds),
					accountMigrationRepositery.getEventsByIds(eventIds),
				]);
				data.push({
					group_name: p.group_name || "",
					menu_permission,
					event_permission,
				});
			}
			return { status: true, data };
		}
	}

	const [menu_permission, event_permission] = await Promise.all([
		accountMigrationRepositery.getAllMenus(),
		accountMigrationRepositery.listEvents(),
	]);
	return {
		status: true,
		data: [
			{
				group_name: "All",
				menu_permission,
				event_permission,
			},
		],
	};
}

export async function editUserPermissionService(id: number) {
	const row = await accountMigrationRepositery.getEditPermission(id);
	if (!row) return { status: false, messages: "Not found", data: [] };
	return {
		status: true,
		data: [
			{
				user_id: row.user_id,
				full_name: [row.fname, row.lname].filter(Boolean).join(" "),
				user_group_id: row.user_group_id,
				group_name: row.group_name || "",
			},
		],
	};
}

export async function removePermissionService(
	companyId: number,
	loginUserId: number,
	permissionIds: number[]
) {
	if (!permissionIds.length) {
		return { status: false, message: "permission_id is required" };
	}
	const superGroup = await accountMigrationRepositery.findSuperAdminUserGroup(companyId);
	const actorPerm = await accountMigrationRepositery.findActivePermissionForUserCompany(
		loginUserId,
		companyId
	);
	const actorIsSuper = superGroup && actorPerm?.groupId === superGroup.id;

	for (const pid of permissionIds) {
		const perm = await accountMigrationRepositery.findPermissionById(pid);
		if (!perm) continue;
		if (superGroup && perm.groupId === superGroup.id) {
			if (!actorIsSuper) {
				return {
					status: false,
					message: "You do not have permission to change the Super Admin account",
				};
			}
			const count = await accountMigrationRepositery.countActiveSuperAdmins(
				companyId,
				superGroup.id
			);
			if (count <= 1) {
				return { status: false, message: "At least one Super Admin is required!!" };
			}
		}
		await accountMigrationRepositery.softDeletePermissions([pid]);
		if (perm.userId) {
			await accountMigrationRepositery.softDeleteRelation(perm.userId, companyId);
		}
	}
	return { status: true, message: "Permissions removed successfully" };
}

export async function allRoleGroupService(companyId: number, limit = 10, offset = 0) {
	const sqlOffset = pageToSqlOffset(offset, limit);
	const data = await accountMigrationRepositery.listRoleGroupsWithUsers(
		companyId,
		limit,
		sqlOffset
	);
	return { status: true, data };
}

export async function editGroupRoleService(id: number) {
	const g = await accountMigrationRepositery.getEditGroupRole(id);
	if (!g) return { status: false, messages: "No group found", data: [] };
	const eventIds = parseJsonArray(g.event_permission);
	const event = await accountMigrationRepositery.getEventsByIds(eventIds);
	return {
		status: true,
		data: [
			{
				user_group_id: g.user_group_id,
				main_group_id: g.main_group_id,
				group_name: g.group_name || "",
				event,
			},
		],
	};
}

export async function removeGroupRoleService(companyId: number, userGroupIds: number[]) {
	if (!userGroupIds.length) return { status: false, message: "No group found" };
	const rows = await accountMigrationRepositery.softDeletePermissionsByGroup(
		userGroupIds,
		companyId
	);
	for (const r of rows) {
		if (r.userId) {
			await accountMigrationRepositery.softDeleteRelation(r.userId, companyId);
		}
	}
	await accountMigrationRepositery.softDeleteUserGroups(userGroupIds);
	return { status: true, message: "Groups removed successfully" };
}

// ====== checkip / doctype ======
export async function checkIpService(reqIp: string) {
	// Parity: raw string; optionally enrich
	return `${reqIp || "0.0.0.0"}`;
}

export async function doctypeListService(userType: number | null) {
	const ut = userType === 2 ? 2 : 1;
	const data = await accountMigrationRepositery.listDoctypes(ut);
	return { status: true, messages: "Doc list", data };
}

// ====== merge OTP ======
export async function sendOtpAccountMergeService(
	companyId: number,
	userType: number | null,
	body: SendOtpMergeBody
) {
	const deny = requireCompany(userType);
	if (deny) return deny;
	if (!body.phone) {
		return { status: false, messages: "The Phone field is required." };
	}

	const phone = body.phone.trim();
	const user = await loginRepositery.findEmployeeByPhone(phone);

	if (body.skipAssociate) {
		if (user) {
			return {
				status: false,
				messages: "This phone number is already associated with an account.",
			};
		}
		if (body.email) {
			const byEmail = await loginRepositery.findEmployeeByEmail(body.email);
			if (byEmail) {
				return {
					status: false,
					messages: "This Email address is already associated with an account.",
				};
			}
		}
	} else {
		if (!user) {
			return {
				status: false,
				messages:
					"This phone number isn’t associated with any user account, so please create a new signup using this number",
			};
		}
		if (body.email) {
			const byEmail = await loginRepositery.findEmployeeByEmail(body.email);
			if (!byEmail) {
				return {
					status: false,
					messages: "This email isn’t associated with any user account",
				};
			}
		}
		const rel = await accountMigrationRepositery.findRelation(user.id!, companyId);
		if (rel) {
			return {
				status: false,
				messages: "this phone number user is already adding in your company.",
			};
		}
	}

	const otp = randomOtp();
	await loginRepositery.upsertOtp({ phone, email: body.email, otp, expiry: otpExpiryUnix() });
	try {
		await otpSend(phone, otp);
	} catch (e) {
		console.error("[merge-otp] SMS failed", e);
	}

	if (body.skipAssociate) {
		return {
			status: true,
			message: "OTP Successfully sent to your phone",
			data: {},
		};
	}

	return {
		status: true,
		message: "OTP Successfully sent to your phone",
		data: {
			id: user!.id,
			name: [user!.fname, user!.lname].filter(Boolean).join(" "),
			profile: user!.profile ? `${s3Prefix}${user!.profile}` : user!.socialImage || "",
			individual_id: user!.individualId,
		},
	};
}

export async function otpVerifyAccountMergeService(
	companyId: number,
	userType: number | null,
	body: VerifyOtpMergeBody,
	token?: string
) {
	const deny = requireCompany(userType);
	if (deny) return deny;

	const phone = body.phone.trim();
	const otpRow = await loginRepositery.findValidOtp({ phone, otp: body.otp });
	if (!otpRow) {
		// check if any otp exists for wrong code
		const any = await loginRepositery.findValidOtp({ phone });
		if (!any) return { status: false, messages: "invalid phone no." };
		const exp = Number(any.expiry);
		if (exp && exp < Math.floor(Date.now() / 1000)) {
			return { status: false, messages: "Otp Expired !" };
		}
		return { status: false, messages: "Invalid OTP!" };
	}
	const exp = Number(otpRow.expiry);
	if (exp && exp < Math.floor(Date.now() / 1000)) {
		return { status: false, messages: "Otp Expired !" };
	}

	const user = await loginRepositery.findEmployeeByPhone(phone);
	if (!user?.id) return { status: false, messages: "invalid phone no." };

	const existingRel = await accountMigrationRepositery.findRelation(user.id, companyId);
	if (existingRel) {
		await loginRepositery.deleteOtps({ phone });
		const data = await getStatistics(user.id, token);
		return {
			status: true,
			messages: "OTP verify successfully !",
			data,
		};
	}

	if (!body.skipAssociate) {
		await accountMigrationRepositery.createRelation(user.id, companyId);
		const superGroup = await accountMigrationRepositery.findSuperAdminUserGroup(companyId);
		if (superGroup) {
			const hasPerm = await accountMigrationRepositery.findActivePermissionForUserCompany(
				user.id,
				companyId
			);
			if (!hasPerm) {
				await accountMigrationRepositery.createPermission({
					userId: user.id,
					groupId: superGroup.id,
					addedBy: companyId,
					parentId: companyId,
				});
			}
		}
	}

	await loginRepositery.deleteOtps({ phone });
	const data = await getStatistics(user.id, token);
	return {
		status: true,
		messages: "OTP verify successfully !",
		data,
	};
}

export async function mergeUserRegisterService(
	companyId: number,
	userType: number | null,
	body: MergeUserRegisterBody,
	token?: string
) {
	const deny = requireCompany(userType);
	if (deny) return deny;

	const phone = body.phone.trim();
	const existing = await loginRepositery.findEmployeeByPhone(phone);
	if (existing) {
		return {
			status: false,
			messages: "This phone number is already associated with an account.",
		};
	}

	if (body.otp) {
		const otpRow = await loginRepositery.findValidOtp({ phone, otp: body.otp });
		if (!otpRow) return { status: false, messages: "Invalid OTP!" };
	}

	const name = body.fname || body.name || "User";
	const parts = name.trim().split(/\s+/);
	const fname = parts[0] || "User";
	const lname = parts.slice(1).join(" ") || "";
	const now = new Date().toISOString().slice(0, 19).replace("T", " ");

	// minimal employee create
	const [{ id }] = await db
		.insert(cybUser)
		.values({
			fname,
			lname,
			phone,
			email: body.email || null,
			userType: 1,
			status: 1,
			isDeleted: 0,
			phoneVerified: 1,
			createDate: now,
			modifyDate: now,
		})
		.$returningId();

	await accountMigrationRepositery.createRelation(id, companyId);
	const superGroup = await accountMigrationRepositery.findSuperAdminUserGroup(companyId);
	if (superGroup) {
		await accountMigrationRepositery.createPermission({
			userId: id,
			groupId: superGroup.id,
			addedBy: companyId,
			parentId: companyId,
		});
	}
	await loginRepositery.deleteOtps({ phone });
	const data = await getStatistics(id, token);
	return {
		status: true,
		messages: "User registered and merged successfully",
		data,
	};
}

// ====== AI generate row ======
export async function aiGenerateRowService(body: AiGenerateRowBody) {
	const apiKey = process.env.GPT || process.env.OPENAI_API_KEY;
	if (!apiKey) return { status: false, messages: "GPT API key not configured" };

	const system =
		body.type === "JOB_DESCRIPTION"
			? `Write a concise job description (max 800 chars) for job_title="${body.job_title || ""}". Base on: ${body.query}`
			: `Rewrite into 2-3 bullet options of about 30 words each: ${body.query}`;

	try {
		const res = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: process.env.GPT_MODEL || "gpt-4.1-mini",
				temperature: 0.3,
				max_tokens: 300,
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: body.query },
				],
			}),
			signal: AbortSignal.timeout(10_000),
		});
		const raw = await res.text();
		if (!res.ok) return { status: false, messages: raw };
		const json = JSON.parse(raw);
		const text = json?.choices?.[0]?.message?.content || "";
		return { status: true, data: String(text) };
	} catch (e: any) {
		return { status: false, messages: e?.message || String(e) };
	}
}

// ====== revoke delete ======
export async function revokeDeleteAccountService(userId: number) {
	const n = await accountMigrationRepositery.hardDeleteAccountRequests(userId);
	if (!n) return { status: false, messages: "Account not revoked" };
	return { status: true, messages: "Account revoked successfully" };
}

// ====== digilocker ======
export async function digilockerService() {
	return {
		status: true,
		message: "DigiLocker",
		data: {
			info: "DigiLocker verification landing. Complete KYC via supported document flows.",
			url: process.env.DIGILOCKER_URL || "https://www.digilocker.gov.in/",
		},
	};
}

// ====== default lists ======
export async function nonclaimCompanyService() {
	const rows = await accountMigrationRepositery.defaultCompanies(10);
	const companyList = [];
	for (const r of rows) {
		companyList.push({
			id: r.id,
			individual_id: r.individual_id,
			company_logo: r.profile ? `${s3Prefix}${r.profile}` : r.socialImage || "",
			company: r.company,
			contact_person: r.contact_person || "",
			city_name: r.city_name || "",
			claim_status: r.claim_status ?? 0,
			state_name: r.state_name || "",
			industry_name: r.industry_name || "",
			is_verified: await user_verified(r.id!),
			exploreTalent: await accountMigrationRepositery.hasActiveJobs(r.id!),
			total_employment: await accountMigrationRepositery.employmentCount(r.id!),
		});
	}
	return { status: true, messages: "", data: { companyList } };
}

export async function defaultUserListService() {
	const rows = await accountMigrationRepositery.defaultUsers(10);
	const data = [];
	for (const r of rows) {
		data.push({
			id: r.id,
			individual_id: r.individual_id,
			profile: r.profile ? `${s3Prefix}${r.profile}` : r.socialImage || "",
			name: [r.fname, r.lname].filter(Boolean).join(" "),
			slug: r.slug,
			designation_name: r.designation_name || "",
			company_name: r.company_name || "",
			userRating: 0,
			is_verified: await user_verified(r.id!),
		});
	}
	return { status: true, message: "User List", data };
}
