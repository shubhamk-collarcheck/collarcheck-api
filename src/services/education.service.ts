import educationRepositery from "../repositery/education.repositery";

export async function allEducationListService(id: number) {
	return await educationRepositery.getEducationList(id);
}
