import slugify from "slugify";

export function createSlug(text: string) {
	return slugify(text, {
		lower: true,
		strict: true,
		trim: true,
	});
}



export function urlTitle(str: string, separator = '-', lowercase = false) {
	return slugify(str, {
		replacement: separator,
		lower: lowercase,
		strict: true,     // strips special chars, matches your regex intent
		trim: true,
	});
}
