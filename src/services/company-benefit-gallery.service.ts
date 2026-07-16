import companyBenefitGalleryRepositery from "../repositery/company-benefit-gallery.repositery";

const S3_PREFIX = process.env.S3_PREFIX || '';

class companyBenefitGalleryService {

	async getBenefitService(companyId: number) {
		const benefits = await companyBenefitGalleryRepositery.getCompanyBenefits(companyId);

		return benefits.map(b => ({
			id: b.id,
			name: b.name || '',
			benefit_description: b.benefitDescription || '',
			image: b.image ? `${S3_PREFIX}${b.image}` : '',
			sortOrder: b.sortOrder,
		}));
	}

	async addBenefitService(companyId: number, data: {
		benefit_id: string;
		sortOrder?: string;
		description?: string;
	}, updateId?: number) {
		let benefitId: number;

		// Check if benefit_id is a string (new benefit name) or int (existing benefit ID)
		const parsedId = parseInt(data.benefit_id);
		if (!isNaN(parsedId) && String(parsedId) === data.benefit_id) {
			// It's an existing benefit ID
			benefitId = parsedId;
		} else {
			// It's a new benefit name - create it
			const existingBenefit = await companyBenefitGalleryRepositery.getBenefitByName(data.benefit_id);
			if (existingBenefit) {
				benefitId = existingBenefit.id;
			} else {
				benefitId = await companyBenefitGalleryRepositery.createBenefit(data.benefit_id);
			}
		}

		if (!updateId) {
			// Check for duplicate (only on create, not update)
			const isDuplicate = await companyBenefitGalleryRepositery.checkDuplicateBenefit(companyId, benefitId);
			if (isDuplicate) {
				return { success: false, message: "Record Already added!" };
			}

			await companyBenefitGalleryRepositery.createCompanyBenefit({
				companyId,
				benefitId,
				sortOrder: data.sortOrder ? parseInt(data.sortOrder) : undefined,
				description: data.description,
			});
		} else {
			await companyBenefitGalleryRepositery.updateCompanyBenefit(updateId, {
				benefitId,
				sortOrder: data.sortOrder ? parseInt(data.sortOrder) : undefined,
				description: data.description,
			});
		}

		return { success: true, message: "Successfully added" };
	}

	async deleteBenefitService(companyId: number, id: number) {
		const record = await companyBenefitGalleryRepositery.getCompanyBenefitById(id, companyId);
		if (!record) {
			return { success: false, message: "Invalid Id" };
		}

		await companyBenefitGalleryRepositery.deleteCompanyBenefit(id, companyId);

		return { success: true, message: "Delete Successfully" };
	}

	async getGalleryService(companyId: number) {
		const galleries = await companyBenefitGalleryRepositery.getGalleries(companyId);

		return galleries.map(g => ({
			id: g.id,
			name: g.name || '',
			description: g.description || '',
			image: g.image ? `${S3_PREFIX}${g.image}` : '',
		}));
	}

	async addGalleryService(companyId: number, files: Express.MulterS3.File[], titles?: string | string[]) {
		if (!files || files.length === 0) {
			return { success: true, message: "Nothing Modified !" };
		}

		const titleArray = Array.isArray(titles) ? titles : 
			(titles ? Array(files.length).fill(titles) : Array(files.length).fill(''));

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const title = titleArray[i] || '';

			await companyBenefitGalleryRepositery.createGallery({
				companyId,
				name: title,
				image: file.location,
			});
		}

		return { success: true, message: "Successfully added" };
	}

	async deleteGalleryService(companyId: number, id: number) {
		const record = await companyBenefitGalleryRepositery.getGalleryById(id, companyId);
		if (!record) {
			return { success: false, message: "Invalid Id" };
		}

		await companyBenefitGalleryRepositery.deleteGallery(id, companyId);

		return { success: true, message: "Delete Successfully" };
	}
}

export default new companyBenefitGalleryService();
