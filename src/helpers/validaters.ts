

export function isEmptyObject(obj: unknown): obj is Record<string, never> {
	if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
		return false;
	}

	return Object.keys(obj).length === 0;
}
