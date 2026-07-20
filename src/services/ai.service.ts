import aiRepositery from "../repositery/ai.repositery";
import {
	callAiService,
	semanticChatEnvelope,
	alwaysSuccessEnvelope,
	normalizeDomain,
	getAiRegisterDomain,
} from "../utils/aiProxy";

function nowSqlDatetime() {
	return new Date().toISOString().slice(0, 19).replace("T", " ");
}

// ====== A. Semantic suggestions ======

async function proxySemantic(
	apiKey: string,
	path: string,
	body: Record<string, unknown>
) {
	const result = await callAiService({
		method: "POST",
		path,
		apiKey,
		body,
	});
	return semanticChatEnvelope(result);
}

export async function suggestSkillsService(apiKey: string, body: any) {
	return proxySemantic(apiKey, "/semantic/suggest_skills", {
		query: body?.query ?? null,
	});
}

export async function suggestDesignationsService(apiKey: string, body: any) {
	return proxySemantic(apiKey, "/semantic/suggest_designations", {
		query: body?.query ?? null,
	});
}

export async function suggestDepartmentsService(apiKey: string, body: any) {
	return proxySemantic(apiKey, "/semantic/suggest_departments", {
		query: body?.query ?? null,
	});
}

export async function suggestParametersService(apiKey: string, body: any) {
	return proxySemantic(apiKey, "/semantic/suggest_parameters", {
		query: body?.query ?? null,
	});
}

export async function suggestRolesService(apiKey: string, body: any) {
	return proxySemantic(apiKey, "/semantic/suggest_roles", {
		designation: body?.designation ?? null,
		department: body?.department ?? null,
		company_name: body?.company_name ?? null,
		skills: body?.skills ?? null,
	});
}

// ====== B. Chat ======

export async function chatHealthService(apiKey: string) {
	const result = await callAiService({
		method: "GET",
		path: "/chat",
		apiKey,
		timeoutMs: 0,
	});
	return semanticChatEnvelope(result);
}

export async function simpleChatService(apiKey: string, body: any) {
	const result = await callAiService({
		method: "POST",
		path: "/chat/api/chat",
		apiKey,
		body: { query: body?.query ?? null },
	});
	return semanticChatEnvelope(result);
}

export async function chatConversationService(apiKey: string, body: any) {
	// Fixed double-slash typo from PHP (`/api//conversation` → `/api/conversation`)
	const result = await callAiService({
		method: "POST",
		path: "/chat/api/conversation",
		apiKey,
		body: {
			query: body?.query ?? null,
			session_id: body?.session_id ?? null,
		},
	});
	return semanticChatEnvelope(result);
}

/** Was missing in PHP (404). Proxies to AI FAQ refresh when available. */
export async function refreshFaqsService(apiKey: string, body: any) {
	const result = await callAiService({
		method: "POST",
		path: "/chat/api/refresh-faqs",
		apiKey,
		body: body && Object.keys(body).length ? body : {},
	});
	return semanticChatEnvelope(result);
}

export async function endSessionService(apiKey: string, body: any) {
	const result = await callAiService({
		method: "POST",
		path: "/chat/api/end-session",
		apiKey,
		body: { session_id: body?.session_id ?? null },
	});
	return semanticChatEnvelope(result);
}

export async function resetTopicService(apiKey: string, body: any) {
	const result = await callAiService({
		method: "POST",
		path: "/chat/api/reset-topic",
		apiKey,
		body: { session_id: body?.session_id ?? null },
	});
	return semanticChatEnvelope(result);
}

export async function getAllFaqsService(apiKey: string) {
	const result = await callAiService({
		method: "GET",
		path: "/chat/api/faqs",
		apiKey,
	});
	return semanticChatEnvelope(result);
}

export async function getFaqByIdService(apiKey: string, id: string) {
	const result = await callAiService({
		method: "GET",
		path: `/chat/api/faq/${encodeURIComponent(id)}`,
		apiKey,
	});
	return semanticChatEnvelope(result);
}

// ====== C. Domain ======

async function bootstrapCompanyPermissions(addedBy: number, companyUserId: number) {
	const now = nowSqlDatetime();

	const existing = await aiRepositery.findUserRelation(addedBy, companyUserId);
	if (existing) return;

	await aiRepositery.insertUserRelation({
		userId: addedBy,
		companyId: companyUserId,
		type: 1,
		createDate: now,
		modifyDate: now,
	});

	const usergroup = await aiRepositery.findSuperAdminUserGroup(addedBy);
	if (!usergroup) return;

	const perm = await aiRepositery.findUserPermission({
		userId: addedBy,
		addedBy: companyUserId,
		groupId: usergroup.id,
	});
	if (perm) return;

	await aiRepositery.insertUserPermission({
		userId: addedBy,
		groupId: usergroup.id,
		addedBy: companyUserId,
		parentId: addedBy,
		createDate: now,
		modifyDate: now,
	});
}

export async function domainRegisterService(apiKey: string, body: any) {
	try {
		const domain = normalizeDomain(String(body?.domain ?? ""));
		const payload = {
			domain,
			user_id: Number(body?.user_id) || 0,
			added_by: Number(body?.added_by) || 0,
		};
		const result = await callAiService({
			method: "POST",
			path: "/verify_domain/domain/register",
			apiKey,
			body: payload,
			baseUrl: getAiRegisterDomain(),
		});
		return alwaysSuccessEnvelope(result);
	} catch (error: any) {
		return { status: false as const, messages: error?.message || String(error) };
	}
}

export async function domainVerifyService(apiKey: string, body: any) {
	try {
		const domain = normalizeDomain(String(body?.domain ?? ""));
		const userId = Number(body?.user_id) || 0;
		const addedBy = Number(body?.added_by) || 0;
		const payload = { domain, user_id: userId, added_by: addedBy };

		const result = await callAiService({
			method: "POST",
			path: "/verify_domain/domain/verify",
			apiKey,
			body: payload,
		});

		const response = alwaysSuccessEnvelope(result);
		const data = response.data as any;
		// Fixed inverted PHP check: bootstrap permissions when domain IS verified
		const verified = data?.verified;
		if (verified) {
			try {
				await bootstrapCompanyPermissions(addedBy, userId);
			} catch (sideErr) {
				console.error("[AI] domain_verify side-effect failed:", sideErr);
			}
		}

		return response;
	} catch (error: any) {
		return { status: false as const, messages: error?.message || String(error) };
	}
}

/**
 * Fixed domain reset (PHP used wrong path + non-interpolated body).
 * Upstream: POST {AI_DOMAIN}/verify_domain/domain/reset
 */
export async function domainResetService(apiKey: string, body: any) {
	try {
		const payload = {
			confirm: body?.confirm ?? null,
			user_id: Number(body?.user_id) || 0,
		};
		const result = await callAiService({
			method: "POST",
			path: "/verify_domain/domain/reset",
			apiKey,
			body: payload,
		});
		return alwaysSuccessEnvelope(result);
	} catch (error: any) {
		return { status: false as const, messages: error?.message || String(error) };
	}
}

// ====== D. Rank + scrape ======

const DEFAULT_RANK_BODY = {
	job_id: 255,
	weights: {
		semantic: 0.5,
		skill_overlap: 0.2,
		experience: 0.15,
		location: 0.1,
		verification: 0.05,
	},
	shortlist_limit: 200,
	final_limit: 50,
};

export async function rankCandidatesService(apiKey: string, body: any) {
	try {
		// Accept real client body; fall back to legacy hard-coded defaults
		const payload = {
			job_id: body?.job_id ?? DEFAULT_RANK_BODY.job_id,
			weights: {
				...DEFAULT_RANK_BODY.weights,
				...(body?.weights && typeof body.weights === "object" ? body.weights : {}),
			},
			shortlist_limit: body?.shortlist_limit ?? DEFAULT_RANK_BODY.shortlist_limit,
			final_limit: body?.final_limit ?? DEFAULT_RANK_BODY.final_limit,
		};
		const result = await callAiService({
			method: "POST",
			path: "/rec_candidates/rank",
			apiKey,
			body: payload,
		});
		return alwaysSuccessEnvelope(result);
	} catch (error: any) {
		return { status: false as const, messages: error?.message || String(error) };
	}
}

export async function scrapeService(apiKey: string, body: any) {
	try {
		const result = await callAiService({
			method: "POST",
			path: "/fetch/scrape",
			apiKey,
			body: { url: body?.url ?? null },
		});
		return alwaysSuccessEnvelope(result);
	} catch (error: any) {
		return { status: false as const, messages: error?.message || String(error) };
	}
}
