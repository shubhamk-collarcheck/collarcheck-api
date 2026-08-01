import companyBenefitGalleryRepositery from "../repositery/company-benefit-gallery.repositery";

const S3_PREFIX = process.env.S3_PREFIX || '';

/** Store path only (PHP s3fileUploads), not full URL. */
function s3ObjectPath(file: Express.MulterS3.File): string {
	if (file.key) return file.key;
	const loc = file.location || '';
	const uploadsIdx = loc.indexOf('uploads/');
	if (uploadsIdx >= 0) return loc.slice(uploadsIdx);
	return loc.replace(/^https?:\/\/[^/]+\//, '');
}

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

	/**
	 * POST /wapi/company/addBenafit[/:id]
	 * Duplicate check ALWAYS runs (even with :id) — PHP parity.
	 */
	async addBenefitService(companyId: number, data: {
		benefit_id: string;
		sortOrder?: string;
		description?: string;
	}, updateId?: number) {
		try {
			if (!data.benefit_id?.trim()) {
				return { status: false as const, messages: 'Id is required.' };
			}

			let benefitId: number;
			const raw = data.benefit_id.trim();
			// FILTER_VALIDATE_INT style: pure integer string
			if (/^\d+$/.test(raw)) {
				benefitId = Number(raw);
			} else {
				const existingBenefit = await companyBenefitGalleryRepositery.getBenefitByName(raw);
				if (existingBenefit) {
					benefitId = existingBenefit.id;
				} else {
					benefitId = await companyBenefitGalleryRepositery.createBenefit(raw, companyId);
				}
			}

			// ⚠ Always before insert/update — same benefit_id on :id → "Record Already added!"
			const isDuplicate = await companyBenefitGalleryRepositery.checkDuplicateBenefit(
				companyId,
				benefitId,
			);
			if (isDuplicate) {
				return { status: false as const, messages: 'Record Already added!' };
			}

			const sortOrder = data.sortOrder != null && data.sortOrder !== ''
				? Number(data.sortOrder)
				: undefined;

			if (updateId) {
				const result = await companyBenefitGalleryRepositery.updateCompanyBenefit(updateId, {
					benefitId,
					sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
					description: data.description,
				});
				void result;
			} else {
				await companyBenefitGalleryRepositery.createCompanyBenefit({
					companyId,
					benefitId,
					sortOrder: Number.isFinite(sortOrder as number) ? sortOrder : undefined,
					description: data.description,
				});
			}

			return { status: true as const, messages: 'Successfully added' };
		} catch (e: any) {
			return {
				status: false as const,
				messages: e?.message || 'Something Went Wrong',
			};
		}
	}

	async deleteBenefitService(companyId: number, id: number) {
		const record = await companyBenefitGalleryRepositery.getCompanyBenefitById(id, companyId);
		if (!record) {
			return { status: false as const, messages: 'Invalid Id' };
		}

		await companyBenefitGalleryRepositery.deleteCompanyBenefit(id, companyId);

		return { status: true as const, messages: 'Delete Successfully' };
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

	/**
	 * POST /wapi/company/addGallery[/:id]
	 * :id ignored — always insert. No files → status true + "Nothing Modified !"
	 */
	async addGalleryService(
		companyId: number,
		files: Express.MulterS3.File[] | undefined,
		titles?: string | string[],
	) {
		try {
			if (!files || files.length === 0) {
				return { status: true as const, messages: 'Nothing Modified !' };
			}

			const titleArray = Array.isArray(titles)
				? titles
				: (titles ? Array(files.length).fill(titles) : Array(files.length).fill(''));

			let inserted = 0;
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const path = s3ObjectPath(file);
				if (!path) continue;
				const title = titleArray[i] || '';
				await companyBenefitGalleryRepositery.createGallery({
					companyId,
					name: title,
					image: path,
				});
				inserted += 1;
			}

			if (inserted > 0) {
				return { status: true as const, messages: 'Successfully added' };
			}
			return { status: true as const, messages: 'Nothing Modified !' };
		} catch (e: any) {
			return {
				status: false as const,
				messages: e?.message || 'Access denied',
			};
		}
	}

	async deleteGalleryService(companyId: number, id: number) {
		const record = await companyBenefitGalleryRepositery.getGalleryById(id, companyId);
		if (!record) {
			return { status: false as const, messages: 'Invalid Id' };
		}

		await companyBenefitGalleryRepositery.deleteGallery(id, companyId);

		return { status: true as const, messages: 'Delete Successfully' };
	}
}

export default new companyBenefitGalleryService();
