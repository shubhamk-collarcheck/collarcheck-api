import widgetRepositery from "../repositery/widget.repositery";
import { get_user_detail } from "./users.service";
import type { PaginationQuery, ViewImpressionsBody } from "../types/widget.types";

const s3Prefix = process.env.S3_PREFIX || "";

/** Simple in-memory cache for widget-detail sidebar (2h TTL). */
const sidebarCache = new Map<string, { exp: number; value: any[] }>();

/** Short TTL geo cache — many widget lists re-fetch the same viewer context. */
const geoCache = new Map<number, { exp: number; value: Awaited<ReturnType<typeof widgetRepositery.getUserGeo>> }>();
const GEO_TTL_MS = 30_000;

async function getUserGeoCached(userId: number) {
	const hit = geoCache.get(userId);
	const now = Date.now();
	if (hit && hit.exp > now) return hit.value;
	const value = await widgetRepositery.getUserGeo(userId);
	geoCache.set(userId, { exp: now + GEO_TTL_MS, value });
	return value;
}

function pageToSqlOffset(page: number, limit: number) {
	const p = Number(page) || 0;
	if (p <= 1) return 0;
	return p * limit - limit;
}

function haversineKm(
	lat1?: string | number | null,
	lon1?: string | number | null,
	lat2?: string | number | null,
	lon2?: string | number | null
): number {
	const a = Number(lat1);
	const b = Number(lon1);
	const c = Number(lat2);
	const d = Number(lon2);
	if (![a, b, c, d].every((n) => Number.isFinite(n))) return 0;
	const toRad = (x: number) => (x * Math.PI) / 180;
	const R = 6371;
	const dLat = toRad(c - a);
	const dLon = toRad(d - b);
	const s =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLon / 2) ** 2;
	return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) * 10) / 10;
}

function profileUrl(profile?: string | null, social?: string | null) {
	if (profile) return `${s3Prefix}${profile}`;
	return social || "";
}

function followingFromMap(
	map: Map<number, { status: number }>,
	targetId: number
) {
	const row = map.get(targetId);
	if (!row) return { requestSend: false, requestApproved: false };
	return { requestSend: true, requestApproved: row.status === 1 };
}

/** Batch-map company cards: ~4 queries total instead of ~4×N. */
async function mapCompanyCardsBatch(
	rows: any[],
	viewerId: number,
	opts?: {
		includeSize?: boolean;
		geo?: { lat?: string | null; lng?: string | null };
	}
) {
	if (!rows.length) return [] as any[];
	const ids = rows.map((r) => r.id as number);
	const [verified, followMap, followCounts, activeJobs] = await Promise.all([
		widgetRepositery.batchUsersVerified(ids),
		widgetRepositery.batchFollowStatus(viewerId, ids),
		widgetRepositery.batchFollowCounts(ids),
		widgetRepositery.batchHasActiveJobs(ids),
	]);

	const data = rows.map((row) => {
		const distance = opts?.geo
			? haversineKm(opts.geo.lat, opts.geo.lng, row.latitude, row.longitude)
			: undefined;
		return {
			id: row.id,
			profile: profileUrl(row.profile, row.socialImage),
			name: row.fname || row.name || "",
			individual_id: row.individualId,
			slug: row.slug,
			city_name: row.cityName || "",
			state_name: row.stateName || "",
			country_name: row.countryName || "",
			industry_name: row.industryName || "",
			is_verified: verified.get(row.id) ?? false,
			followData: followCounts.get(row.id) ?? { following: 0, follower: 0 },
			following: followingFromMap(followMap, row.id),
			exploreTalent: activeJobs.has(row.id) ? 1 : 0,
			...(distance != null ? { distance } : {}),
			...(opts?.includeSize
				? {
						turnover_name: row.turnoverName || null,
						company_size_name: row.companySizeName || null,
					}
				: {}),
		};
	});

	if (opts?.geo) {
		data.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
	}
	return data;
}

/** Batch-map person cards: ~2 queries total instead of ~3×N. */
async function mapPersonCardsBatch(
	rows: any[],
	viewerId: number,
	opts?: {
		imageKey?: boolean;
		geo?: { lat?: string | null; lng?: string | null };
	}
) {
	if (!rows.length) return [] as any[];
	const ids = rows.map((r) => r.id as number);
	const [verified, followMap] = await Promise.all([
		widgetRepositery.batchUsersVerified(ids),
		widgetRepositery.batchFollowStatus(viewerId, ids),
	]);

	const data = rows.map((row) => {
		const distance = opts?.geo
			? haversineKm(opts.geo.lat, opts.geo.lng, row.latitude, row.longitude)
			: undefined;
		const image = profileUrl(row.profile, row.socialImage);
		return {
			id: row.id,
			individual_id: row.individualId,
			name: [row.fname, row.lname].filter(Boolean).join(" "),
			designation_name: row.designationName || "",
			slug: row.slug,
			...(opts?.imageKey !== false ? { image } : {}),
			profile: image,
			city_name: row.cityName || "",
			state_name: row.stateName || "",
			country_name: row.countryName || "",
			company_name: row.companyName || "",
			is_verified: verified.get(row.id) ?? false,
			userRating: 0,
			ratings: {},
			following: followingFromMap(followMap, row.id),
			on_explore: row.onExplore ?? 0,
			on_immediate: row.onImmediate ?? 0,
			on_notice: row.onNotice ?? 0,
			user_type: row.userType ?? 1,
			...(distance != null ? { distance } : {}),
			...(row.universityName ? { university_name: row.universityName } : {}),
		};
	});

	if (opts?.geo) {
		data.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
	}
	return data;
}

type ListResult = { status: boolean; message?: string; messages?: string; data: any[]; totalCounts: number };

async function listCompaniesEnriched(
	viewerId: number,
	opts: Parameters<typeof widgetRepositery.listCompanies>[0] & {
		message?: string;
		geo?: { lat?: string | null; lng?: string | null };
		includeSize?: boolean;
	}
): Promise<ListResult> {
	const { rows, total } = await widgetRepositery.listCompanies(opts);
	const data = await mapCompanyCardsBatch(rows, viewerId, {
		includeSize: opts.includeSize,
		geo: opts.geo,
	});
	return {
		status: true,
		...(opts.message ? { message: opts.message } : {}),
		data,
		totalCounts: total,
	};
}

async function listEmployeesEnriched(
	viewerId: number,
	opts: Parameters<typeof widgetRepositery.listEmployees>[0] & {
		message?: string;
		geo?: { lat?: string | null; lng?: string | null };
	},
	rowsOverride?: { rows: any[]; total: number }
): Promise<ListResult> {
	const { rows, total } = rowsOverride || (await widgetRepositery.listEmployees(opts));
	const data = await mapPersonCardsBatch(rows, viewerId, { geo: opts.geo });
	return {
		status: true,
		...(opts.message ? { message: opts.message } : {}),
		data,
		totalCounts: total,
	};
}

function feedOpts(q: PaginationQuery) {
	const limit = q.limit || 10;
	const sqlOffset = pageToSqlOffset(q.offset || 0, limit);
	return { limit, sqlOffset, skipCount: !!q.skipCount };
}

// ====== Discovery endpoints ======

export async function similarCompanyService(viewerId: number, q: PaginationQuery) {
	const geo = await getUserGeoCached(viewerId);
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	return listCompaniesEnriched(viewerId, {
		excludeId: viewerId,
		industry: geo?.industry,
		limit,
		sqlOffset,
		skipCount,
		orderRandom: true,
	});
}

export async function peopleSimilarUniversityService(viewerId: number, q: PaginationQuery) {
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	const uniIds = await widgetRepositery.getViewerUniversityIds(viewerId);
	const result = await widgetRepositery.listPeopleByUniversities(
		uniIds,
		viewerId,
		limit,
		sqlOffset,
		skipCount
	);
	return listEmployeesEnriched(viewerId, { limit, sqlOffset, excludeId: viewerId }, result);
}

export async function userPastCompanyService(viewerId: number, q: PaginationQuery) {
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	const companyIds = await widgetRepositery.getPastCompanyIds(viewerId);
	const result = await widgetRepositery.listPeopleByCompanies(
		companyIds,
		viewerId,
		limit,
		sqlOffset,
		undefined,
		skipCount
	);
	return listEmployeesEnriched(viewerId, { limit, sqlOffset, excludeId: viewerId }, result);
}

export async function userCurrentCompanyService(viewerId: number, q: PaginationQuery) {
	const geo = await getUserGeoCached(viewerId);
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	if (!geo?.currentCompany) {
		return { status: true, data: [], totalCounts: 0 };
	}
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		currentCompany: geo.currentCompany,
		limit,
		sqlOffset,
		skipCount,
	});
}

export async function similarEmployeeService(viewerId: number, q: PaginationQuery) {
	const geo = await getUserGeoCached(viewerId);
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		industry: geo?.industry,
		city: geo?.city,
		limit,
		sqlOffset,
		skipCount,
		orderRandom: true,
	});
}

export async function featuredEmployeeService(viewerId: number, q: PaginationQuery) {
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		onExplore: true,
		limit,
		sqlOffset,
		skipCount,
		orderRandom: true,
	});
}

export async function peopleMightKnowService(viewerId: number, q: PaginationQuery) {
	const geo = await getUserGeoCached(viewerId);
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		city: geo?.city,
		limit,
		sqlOffset,
		skipCount,
		orderRandom: true,
	});
}

export async function nearbyCompanyService(viewerId: number, q: PaginationQuery) {
	const geo = await getUserGeoCached(viewerId);
	if (!geo) return { status: false, messages: "invalid User", data: [], totalCounts: 0 };
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	return listCompaniesEnriched(viewerId, {
		excludeId: viewerId,
		city: geo.city,
		limit,
		sqlOffset,
		skipCount,
		message: "Near by company list",
		geo: { lat: geo.latitude, lng: geo.longitude },
		includeSize: true,
	});
}

export async function nearbyEmployeeService(viewerId: number, q: PaginationQuery) {
	const geo = await getUserGeoCached(viewerId);
	if (!geo) return { status: false, messages: "invalid User", data: [], totalCounts: 0 };
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		city: geo.city,
		limit,
		sqlOffset,
		skipCount,
		geo: { lat: geo.latitude, lng: geo.longitude },
	});
}

/** Fixed: return real open jobs (legacy was buggy nearby-people). */
export async function similarJobService(viewerId: number, q: PaginationQuery) {
	return authAllJobService(viewerId, q, true);
}

export async function immediateJoinerService(viewerId: number, q: PaginationQuery) {
	const geo = await getUserGeoCached(viewerId);
	if (!geo || geo.userType !== 2) {
		return { status: false, messages: "invalid company", data: [], totalCounts: 0 };
	}
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		onImmediate: true,
		onExplore: true,
		city: geo.city,
		limit,
		sqlOffset,
		skipCount,
		geo: { lat: geo.latitude, lng: geo.longitude },
	});
}

export async function noticePeriodService(viewerId: number, q: PaginationQuery) {
	const geo = await getUserGeoCached(viewerId);
	if (!geo || geo.userType !== 2) {
		return { status: false, messages: "invalid company", data: [], totalCounts: 0 };
	}
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		onNotice: true,
		limit,
		sqlOffset,
		skipCount,
	});
}

export async function similarCompaniesCurrentService(viewerId: number, q: PaginationQuery) {
	const geo = await getUserGeoCached(viewerId);
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	// Similar to current company industry
	let industry = geo?.industry;
	if (geo?.currentCompany) {
		const company = await getUserGeoCached(geo.currentCompany);
		industry = company?.industry ?? industry;
	}
	return listCompaniesEnriched(viewerId, {
		excludeId: geo?.currentCompany || viewerId,
		industry,
		limit,
		sqlOffset,
		skipCount,
		orderRandom: true,
	});
}

export async function recommendedEmployeeGeneralService(viewerId: number, q: PaginationQuery) {
	const geo = await getUserGeoCached(viewerId);
	if (!geo || geo.userType !== 2) {
		return { status: false, messages: "invalid company", data: [], totalCounts: 0 };
	}
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		industry: geo.industry,
		city: geo.city,
		limit,
		sqlOffset,
		skipCount,
		orderRandom: true,
		geo: { lat: geo.latitude, lng: geo.longitude },
	});
}

export async function peopleRecentlyJoinService(viewerId: number, q: PaginationQuery) {
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	const geo = await getUserGeoCached(viewerId);
	// Company team: people currently at this company who joined recently
	if (geo?.userType === 2) {
		return listEmployeesEnriched(viewerId, {
			excludeId: viewerId,
			currentCompany: viewerId,
			recentJoinDays: 90,
			limit,
			sqlOffset,
			skipCount,
		});
	}
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		recentJoinDays: 90,
		limit,
		sqlOffset,
		skipCount,
	});
}

export async function currentlyUnemployedService(viewerId: number, q: PaginationQuery) {
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	// work_status often: unemployed codes vary; use on_explore as proxy + no current company
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		onExplore: true,
		limit,
		sqlOffset,
		skipCount,
		orderRandom: true,
	});
}

export async function freshersService(viewerId: number, q: PaginationQuery) {
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	return listEmployeesEnriched(viewerId, {
		excludeId: viewerId,
		fresher: true,
		limit,
		sqlOffset,
		skipCount,
		orderRandom: true,
	});
}

export async function authAllJobService(
	viewerId: number,
	q: PaginationQuery,
	urgentOnly = false
) {
	const { limit, sqlOffset, skipCount } = feedOpts(q);
	const { rows, total, appliedJobIds } = await widgetRepositery.listOpenJobs({
		limit,
		sqlOffset,
		urgent: urgentOnly,
		viewerId,
		skipCount,
	});
	const data = rows.map((j) => ({
		job_title: j.jobTitle,
		individual_id: j.individualId,
		profile: profileUrl(j.companyProfile, j.companySocial),
		slug: j.slug,
		city_name: j.cityName || "",
		state_name: j.stateName || "",
		country_name: j.countryName || "",
		industry_name: j.industryName || "",
		designation_name: j.designationName || "",
		company_name: j.companyName || "",
		company_slug: j.companySlug || "",
		department_name: j.departmentName || "",
		experience_name: j.experienceName || "",
		role_type_name: j.roleTypeName || "",
		job_mode_name: j.jobModeName || "",
		salary_name: j.salaryName || "",
		apply: appliedJobIds.has(j.id),
		create_date: j.createDate,
		vacancy: j.vacancy,
		urgent: j.urgent ?? 0,
		skill: [],
		job_description: (j.jobDescription || "").slice(0, 200),
	}));
	return {
		status: true,
		message: "jobs list",
		data,
		totalCounts: total,
	};
}

// ====== Impressions ======

export async function viewImpressionsService(userId: number, body: ViewImpressionsBody) {
	const remote = await widgetRepositery.findUserById(body.remote_id);
	if (!remote) return { status: false, messages: "Invalid remote user" };

	const rawType = (body.type || "JOB").toString();
	const normalized: "Profile" | "Job" =
		rawType.toUpperCase() === "PROFILE" ? "Profile" : "Job";

	const existing = await widgetRepositery.findImpression(
		userId,
		body.remote_id,
		rawType
	);
	if (existing) return { status: false, messages: "You have already viewed." };

	try {
		await widgetRepositery.insertImpression({
			currentUser: userId,
			remoteId: body.remote_id,
			type: normalized,
		});
		return { status: true, messages: "You have successfully viewed." };
	} catch (e) {
		console.error("[view-impressions]", e);
		return { status: false, messages: "Something went wrong!!" };
	}
}

export async function jobsImpressionsService(viewerId: number, q: PaginationQuery) {
	if (!viewerId) {
		return { status: false, message: "ID is required.", data: [] };
	}
	const limit = q.limit || 10;
	const sqlOffset = pageToSqlOffset(q.offset || 0, limit);
	const { rows, total } = await widgetRepositery.listJobImpressions(
		viewerId,
		limit,
		sqlOffset
	);
	return { status: true, data: rows, totalCounts: total };
}

export async function peopleViewedProfileService(viewerId: number, q: PaginationQuery) {
	const { limit, sqlOffset } = feedOpts(q);
	const { rows, total } = await widgetRepositery.listImpressionsOnMe({
		remoteId: viewerId,
		type: "Profile",
		viewerUserType: 1,
		limit,
		sqlOffset,
	});
	const seen = new Set<number>();
	const unique = rows.filter((r) => {
		if (seen.has(r.id)) return false;
		seen.add(r.id);
		return true;
	});
	const data = await mapPersonCardsBatch(unique, viewerId, { imageKey: true });
	return { status: true, data, totalCounts: total };
}

export async function companyViewedProfileService(viewerId: number, q: PaginationQuery) {
	const { limit, sqlOffset } = feedOpts(q);
	const { rows, total } = await widgetRepositery.listImpressionsOnMe({
		remoteId: viewerId,
		type: "Profile",
		viewerUserType: 2,
		limit,
		sqlOffset,
	});
	const seen = new Set<number>();
	const unique = rows.filter((r) => {
		if (seen.has(r.id)) return false;
		seen.add(r.id);
		return true;
	});
	const data = await mapCompanyCardsBatch(unique, viewerId);
	return { status: true, data, totalCounts: total };
}

export async function detailsJobsImpressionsService(
	viewerId: number,
	jobId: number | undefined,
	q: PaginationQuery
) {
	if (!jobId) {
		return { status: false, message: "ID is required.", data: [], totalCounts: 0 };
	}
	const { limit, sqlOffset } = feedOpts(q);
	const { rows, total } = await widgetRepositery.listJobImpressionViewers(
		jobId,
		limit,
		sqlOffset
	);
	const data = await mapPersonCardsBatch(rows, viewerId);
	return { status: true, data, totalCounts: total };
}

// ====== random-widget + widget-detail ======

const API_DISPATCH: Record<
	string,
	(viewerId: number, q: PaginationQuery) => Promise<ListResult | any>
> = {
	near: async (id, q) => {
		const geo = await getUserGeoCached(id);
		if (geo?.userType === 2) return nearbyEmployeeService(id, q);
		return nearbyCompanyService(id, q);
	},
	top_company: (id, q) => similarCompanyService(id, q),
	urgent_job: (id, q) => authAllJobService(id, q, true),
	message: async () => ({ status: true, data: [], totalCounts: 0 }),
	university: peopleSimilarUniversityService,
	past_company: userPastCompanyService,
	current_company: userCurrentCompanyService,
	similar_profile: similarEmployeeService,
	might_know: peopleMightKnowService,
	similar_companies_current: similarCompaniesCurrentService,
	company_viewed_profile: companyViewedProfileService,
	feature_employee: featuredEmployeeService,
	immediate_joiner: immediateJoinerService,
	notice_period: noticePeriodService,
	recommend_employee: recommendedEmployeeGeneralService,
	people_recentaly_join: peopleRecentlyJoinService,
	currentaly_unemployed: currentlyUnemployedService,
	freshers: freshersService,
	similar_companies: similarCompanyService,
	people_viewed_profile: peopleViewedProfileService,
	jobs_impressions: jobsImpressionsService,
};

const SLUG_DISPATCH: Record<string, (viewerId: number, q: PaginationQuery) => Promise<any>> = {
	"nearby-company": nearbyCompanyService,
	"nearby-employee": nearbyEmployeeService,
	similarcompany: similarCompanyService,
	"people-similar-university": peopleSimilarUniversityService,
	"user-past-company": userPastCompanyService,
	"user-current-company": userCurrentCompanyService,
	similaremployee: similarEmployeeService,
	"featured-employee": featuredEmployeeService,
	"people-might-know": peopleMightKnowService,
	"similar-job": similarJobService,
	"immediate-joiner": immediateJoinerService,
	"notice-period": noticePeriodService,
	"similar-companies-current": similarCompaniesCurrentService,
	"recommended-employee-general": recommendedEmployeeGeneralService,
	"people-recentaly-join": peopleRecentlyJoinService,
	"currentaly-unemployed": currentlyUnemployedService,
	freshers: freshersService,
	"auth-all-job": (id, q) => authAllJobService(id, q, false),
	"people-viewed-profile": peopleViewedProfileService,
	"company-viewed-profile": companyViewedProfileService,
	"jobs-impressions": jobsImpressionsService,
	"home/top-company": similarCompanyService,
	"position-closing-soon": (id, q) => authAllJobService(id, q, true),
};

export async function randomWidgetService(viewerId: number, fixed = false) {
	try {
		const user = await get_user_detail(viewerId);
		if (!user) return { status: false, messages: "invalid User" };
		const audience = user.userType === 1 ? "USER" : "COMPANY";
		const widgets = fixed
			? await widgetRepositery.getFixedWidgets(audience)
			: await widgetRepositery.getRandomWidgets(audience, 10);

		// Feed mode: skip COUNT(*) on every list; batch card enrichment is always on
		const q: PaginationQuery = { limit: 10, offset: 0, skipCount: true };

		// Warm geo cache once so parallel handlers share it
		await getUserGeoCached(viewerId);

		// Run all widget list handlers in parallel (was sequential ~10× latency)
		const blocks = await Promise.all(
			widgets.map(async (w) => {
				const apiKey = (w.api || "").trim();
				const handler = API_DISPATCH[apiKey];
				let list: any[] = [];
				if (handler) {
					try {
						const res = await handler(viewerId, q);
						list = Array.isArray(res?.data) ? res.data : [];
					} catch (err) {
						console.error(`[random-widget] api=${apiKey}`, err);
						list = [];
					}
				}
				const minLimit = w.minLimit ?? 0;
				if (list.length < minLimit) return null;

				const block: Record<string, unknown> = {
					heading: (w.heading || "").trim(),
					widget: w.widget,
					placement: 0,
					version: w.variant || "v1",
					slug: w.slug,
					list,
				};
				if (w.id === 25 || w.id === 26) {
					block.profile_view = true;
					block.placement = 10;
				}
				return block;
			})
		);

		const data = blocks.filter((b): b is NonNullable<typeof b> => b != null);
		return { status: true, data };
	} catch (e: any) {
		return { status: false, messages: e?.message || String(e) };
	}
}

export async function widgetDetailService(
	viewerId: number,
	slug: string,
	q: PaginationQuery
) {
	const widget = await widgetRepositery.getWidgetBySlug(slug);
	if (!widget) {
		return {
			status: false,
			message: "widget detail",
			data: [],
			widgetList: [],
		};
	}

	// Sidebar cache
	const day = new Date().toISOString().slice(0, 10);
	const cacheKey = `random-widget-user-${viewerId}-${day}`;
	let widgetList = sidebarCache.get(cacheKey)?.value;
	const now = Date.now();
	if (!widgetList || (sidebarCache.get(cacheKey)?.exp || 0) < now) {
		const composed = await randomWidgetService(viewerId, true);
		widgetList = (composed.data || []).map((b: any) => ({
			heading: b.heading,
			slug: b.slug,
			widget: b.widget,
		}));
		sidebarCache.set(cacheKey, { exp: now + 7200_000, value: widgetList });
	}

	const apiSlug = (widget.apiSlug || widget.slug || "").replace(/^\/+/, "");
	const slugKey = apiSlug.split("?")[0];
	const handler =
		SLUG_DISPATCH[slugKey] ||
		SLUG_DISPATCH[slug] ||
		API_DISPATCH[(widget.api || "").trim()];

	let listRes: any = { status: true, data: [], totalCounts: 0 };
	if (handler) {
		listRes = await handler(viewerId, {
			limit: q.limit || 20,
			offset: q.offset || 0,
		});
	}

	const list = Array.isArray(listRes?.data) ? listRes.data : [];
	const base: any = {
		status: list.length > 0,
		message: "widget detail",
		heading: widget.heading,
		widget: widget.widget,
		placement: 0,
		version: widget.variant || "v1",
		data: list,
		totalCounts: listRes?.totalCounts ?? list.length,
		widgetList,
	};
	if (widget.id === 25 || widget.id === 26) base.profile_view = true;
	if (list.length === 0) {
		base.status = false;
		base.data = [];
	}
	return base;
}
