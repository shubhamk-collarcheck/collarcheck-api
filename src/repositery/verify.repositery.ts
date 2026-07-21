import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import db from "../db";
import {
	cybVerifyDocument,
	cybLogs,
	cybUser,
	cybOtp,
	cybUserDomains,
	cybUserExperience,
} from "../db/schema";

function nowStr() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

class VerifyRepository {
	async findUserById(userId: number) {
		const [row] = await db
			.select()
			.from(cybUser)
			.where(and(eq(cybUser.id, userId), eq(cybUser.isDeleted, 0)))
			.limit(1);
		return row;
	}

	// ── verify_document ──────────────────────────────────────────────

	/** Other user already verified same doctype + encrypted docnumber */
	async findDuplicateVerified(doctype: string | number, encryptedDocnumber: string, excludeUserId: number) {
		const [row] = await db
			.select()
			.from(cybVerifyDocument)
			.where(
				and(
					eq(cybVerifyDocument.doctype, String(doctype)),
					eq(cybVerifyDocument.docnumber, encryptedDocnumber),
					eq(cybVerifyDocument.verify, 1),
					ne(cybVerifyDocument.userId, excludeUserId)
				)
			)
			.limit(1);
		return row;
	}

	/** check_verify_document: other active verified user with same doc */
	async checkVerifyDocument(userId: number, doctype: string | number, encryptedDocnumber: string) {
		return this.findDuplicateVerified(doctype, encryptedDocnumber, userId);
	}

	async findByUserAndDoctype(userId: number, doctype: string | number) {
		const [row] = await db
			.select()
			.from(cybVerifyDocument)
			.where(
				and(
					eq(cybVerifyDocument.userId, userId),
					eq(cybVerifyDocument.doctype, String(doctype))
				)
			)
			.orderBy(desc(cybVerifyDocument.id))
			.limit(1);
		return row;
	}

	async findAnyByUser(userId: number) {
		const [row] = await db
			.select()
			.from(cybVerifyDocument)
			.where(eq(cybVerifyDocument.userId, userId))
			.orderBy(desc(cybVerifyDocument.id))
			.limit(1);
		return row;
	}

	async findById(id: number) {
		const [row] = await db.select().from(cybVerifyDocument).where(eq(cybVerifyDocument.id, id)).limit(1);
		return row;
	}

	async insertVerifyDocument(data: {
		userId: number;
		doctype?: string | number | null;
		docName?: string | null;
		docnumber?: string | null;
		methodType?: string | null;
		verify?: number;
		clientId?: string | null;
	}) {
		const now = nowStr();
		const [{ id }] = await db
			.insert(cybVerifyDocument)
			.values({
				userId: data.userId,
				doctype: data.doctype != null ? String(data.doctype) : null,
				docName: data.docName ?? null,
				docnumber: data.docnumber ?? null,
				methodType: data.methodType ?? null,
				verify: data.verify ?? 0,
				clientId: data.clientId ?? null,
				createDate: now,
				modifyDate: now,
			})
			.$returningId();
		return id;
	}

	async updateVerifyDocument(id: number, data: Record<string, unknown>) {
		await db
			.update(cybVerifyDocument)
			.set({ ...data, modifyDate: nowStr() } as any)
			.where(eq(cybVerifyDocument.id, id));
	}

	/** Upsert by user + doctype: update existing or insert */
	async upsertByUserDoctype(
		userId: number,
		doctype: string | number,
		data: {
			docName?: string | null;
			docnumber?: string | null;
			methodType?: string | null;
			verify?: number;
			clientId?: string | null;
		}
	) {
		const existing = await this.findByUserAndDoctype(userId, doctype);
		if (existing) {
			await this.updateVerifyDocument(existing.id, {
				docName: data.docName ?? existing.docName,
				docnumber: data.docnumber ?? existing.docnumber,
				methodType: data.methodType ?? existing.methodType,
				verify: data.verify ?? existing.verify ?? 0,
				clientId: data.clientId ?? existing.clientId,
			});
			return existing.id;
		}
		return this.insertVerifyDocument({
			userId,
			doctype,
			...data,
		});
	}

	/** DigiLocker: find any row for user, update or insert */
	async upsertAnyForUser(
		userId: number,
		data: {
			doctype?: string | number | null;
			docName?: string | null;
			docnumber?: string | null;
			methodType?: string | null;
			verify?: number;
			clientId?: string | null;
		}
	) {
		const existing = await this.findAnyByUser(userId);
		if (existing) {
			if (existing.verify === 0 || existing.verify == null) {
				await this.updateVerifyDocument(existing.id, {
					doctype: data.doctype != null ? String(data.doctype) : existing.doctype,
					docName: data.docName ?? existing.docName,
					docnumber: data.docnumber ?? existing.docnumber,
					methodType: data.methodType ?? existing.methodType,
					clientId: data.clientId ?? existing.clientId,
					verify: data.verify ?? 0,
				});
				return existing.id;
			}
		}
		return this.insertVerifyDocument({
			userId,
			...data,
		});
	}

	// ── logs ─────────────────────────────────────────────────────────

	async insertLog(params: {
		userId: number;
		type?: string;
		callMethod?: string;
		logMessage?: string;
		payload?: unknown;
		statusCode?: number | string | null;
		customMessage?: string;
	}) {
		const now = nowStr();
		try {
			await db.insert(cybLogs).values({
				userId: params.userId,
				type: params.type || null,
				callMethod: params.callMethod || null,
				logMessage: params.logMessage || null,
				payload:
					typeof params.payload === "string"
						? params.payload
						: params.payload
							? JSON.stringify(params.payload)
							: null,
				statusCode:
					params.statusCode != null && params.statusCode !== ""
						? Number(params.statusCode) || null
						: null,
				custumMessage: params.customMessage || params.logMessage || "",
				createDate: now,
			});
		} catch (err) {
			console.error("verify log insert error:", err);
		}
	}

	// ── OTP ──────────────────────────────────────────────────────────

	async upsertEmailOtp(email: string, otp: string, type: "LOGIN" | "SIGNUP" | "VERIFICATION", expiryUnix: string) {
		const now = nowStr();
		await db
			.update(cybOtp)
			.set({ isDeleted: 1 })
			.where(and(eq(cybOtp.email, email), eq(cybOtp.isDeleted, 0)));

		const [{ id }] = await db
			.insert(cybOtp)
			.values({
				phone: "",
				email,
				otp,
				type,
				expiry: expiryUnix,
				status: 1,
				isDeleted: 0,
				createDate: now,
			})
			.$returningId();
		return id;
	}

	async findEmailOtp(email: string) {
		const [row] = await db
			.select()
			.from(cybOtp)
			.where(and(eq(cybOtp.email, email), eq(cybOtp.isDeleted, 0), eq(cybOtp.status, 1)))
			.orderBy(desc(cybOtp.id))
			.limit(1);
		return row;
	}

	async deleteEmailOtps(email: string) {
		await db
			.update(cybOtp)
			.set({ isDeleted: 1 })
			.where(and(eq(cybOtp.email, email), eq(cybOtp.isDeleted, 0)));
	}

	// ── domains / experience ─────────────────────────────────────────

	async findDomainByEmail(email: string) {
		const [row] = await db
			.select()
			.from(cybUserDomains)
			.where(
				and(
					eq(cybUserDomains.email, email),
					eq(cybUserDomains.isVerified, 1),
					eq(cybUserDomains.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findDomainByDomain(domain: string) {
		const [row] = await db
			.select()
			.from(cybUserDomains)
			.where(
				and(
					eq(cybUserDomains.domain, domain),
					eq(cybUserDomains.isVerified, 1),
					eq(cybUserDomains.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async findCompanyVerifiedDomains(companyId: number) {
		return db
			.select()
			.from(cybUserDomains)
			.where(
				and(
					eq(cybUserDomains.userId, companyId),
					eq(cybUserDomains.isVerified, 1),
					eq(cybUserDomains.isDeleted, 0)
				)
			);
	}

	async insertDomain(data: {
		userId: number;
		addedBy?: number | null;
		domain?: string | null;
		email?: string | null;
		isEmailBased?: number;
		isVerified?: number;
	}) {
		const now = nowStr();
		const [{ id }] = await db
			.insert(cybUserDomains)
			.values({
				userId: data.userId,
				addedBy: data.addedBy ?? null,
				domain: data.domain ?? null,
				email: data.email ?? null,
				isEmailBased: data.isEmailBased ?? 0,
				isVerified: data.isVerified ?? 0,
				verifiedAt: data.isVerified ? now : null,
				domainCreatedAt: now,
				domainModifyAt: now,
				isDeleted: 0,
			})
			.$returningId();
		return id;
	}

	async findExperienceById(id: number) {
		const [row] = await db
			.select()
			.from(cybUserExperience)
			.where(and(eq(cybUserExperience.id, id), eq(cybUserExperience.isDeleted, 0)))
			.limit(1);
		return row;
	}

	async findExperienceByWorkEmail(email: string, excludeId?: number) {
		const conditions = [
			eq(cybUserExperience.workEmail, email.toLowerCase()),
			eq(cybUserExperience.isDeleted, 0),
		];
		if (excludeId) conditions.push(ne(cybUserExperience.id, excludeId));
		const [row] = await db
			.select()
			.from(cybUserExperience)
			.where(and(...conditions))
			.limit(1);
		return row;
	}

	async updateExperienceWorkEmail(id: number, email: string) {
		const now = nowStr();
		await db
			.update(cybUserExperience)
			.set({ workEmail: email, workEmailDate: now, modifyDate: now })
			.where(eq(cybUserExperience.id, id));
	}

	/** Clear work_email for experiences under company whose domain doesn't match */
	async clearWorkEmailsNotMatchingDomain(companyId: number, domain: string) {
		const rows = await db
			.select({ id: cybUserExperience.id, workEmail: cybUserExperience.workEmail })
			.from(cybUserExperience)
			.where(
				and(
					eq(cybUserExperience.company, companyId),
					eq(cybUserExperience.isDeleted, 0),
					sql`${cybUserExperience.workEmail} IS NOT NULL AND ${cybUserExperience.workEmail} != ''`
				)
			);

		const now = nowStr();
		for (const row of rows) {
			const email = (row.workEmail || "").toLowerCase();
			const d = email.includes("@") ? email.split("@")[1] : "";
			if (d && d !== domain.toLowerCase()) {
				await db
					.update(cybUserExperience)
					.set({ workEmail: null, workEmailDate: null, modifyDate: now })
					.where(eq(cybUserExperience.id, row.id));
			}
		}
	}

	async findEmployeeByEmail(email: string) {
		const lowered = email.toLowerCase();
		const [row] = await db
			.select()
			.from(cybUser)
			.where(
				and(
					or(eq(cybUser.email, lowered), eq(cybUser.emailAlternate, lowered)),
					eq(cybUser.userType, 1),
					eq(cybUser.isDeleted, 0)
				)
			)
			.limit(1);
		return row;
	}

	async updateUserEmailFlags(userId: number, flags: { emailVerified?: number; emailAlternateVerify?: number }) {
		const data: Record<string, unknown> = { modifyDate: nowStr() };
		if (flags.emailVerified !== undefined) data.emailVerified = flags.emailVerified;
		if (flags.emailAlternateVerify !== undefined) data.emailAlternateVerify = flags.emailAlternateVerify;
		await db.update(cybUser).set(data as any).where(eq(cybUser.id, userId));
	}
}

export default new VerifyRepository();
