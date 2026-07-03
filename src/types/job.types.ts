
export interface SearchJobFilter {
	keyword?: string;
	city?: number;
	state?: number;
	salary?: number;
	designation?: number;
	urgent?: number;
	vacancy?: number;
	industry?: number;
	country?: number;
	job_mode?: number;
	department?: number;
	experience?: number;
	role_type?: number;
	company?: number;
	id_not_in?: number;
	posted_date?: number;
	stateArr?: { id: number }[],
	citiesArr?: { id: number }[],
	designationArr?: { id: number }[],
	departmentArr?: { id: number }[];
	skillArray?: { id: number }[];
	job_id?: number[];
	random?: boolean;
	limit?: number;
	offset?: number;
}
