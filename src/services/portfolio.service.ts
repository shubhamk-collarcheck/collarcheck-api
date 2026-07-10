//portfolio service
import portfolioRepositery from "../repositery/portfolio.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import { PORTFOLIO_TYPE, type PortfolioRequestBody } from "../types/portfolio.types";

const s3Prefix = process.env.S3_PREFIX || '';

function extractYouTubeId(youtube: string | null): string | null {
	if (!youtube) return null;
	const match = youtube.match(/[?&]v=([^&]+)/);
	return match ? match[1] : youtube;
}

function mapPortfolioItem(item: any, extractYoutube = false) {
	const base: any = {
		id: item.id,
		type: item.type,
		title: item.title,
		description: item.description,
	};

	if (item.type === PORTFOLIO_TYPE.IMAGE) {
		base.image = item.image ? `${s3Prefix}${item.image}` : null;
	} else if (item.type === PORTFOLIO_TYPE.VIDEO) {
		base.video = item.video ? `${s3Prefix}${item.video}` : null;
		base.youtube = extractYoutube ? extractYouTubeId(item.youtube) : item.youtube;
	} else if (item.type === PORTFOLIO_TYPE.URL) {
		base.url = item.url;
	} else if (item.type === PORTFOLIO_TYPE.PDF) {
		base.pdf = item.pdf ? `${s3Prefix}${item.pdf}` : null;
	}

	return base;
}

export async function addPortfolioService(userId: number, data: PortfolioRequestBody, file?: Express.MulterS3.File) {
	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	const saveData: any = {
		user: userId,
		type: data.type,
		title: data.title,
		description: data.description || null,
		youtube: null,
		image: null,
		video: null,
		pdf: null,
		url: null,
		status: 1,
		sortOrder: 1,
		isDeleted: 0,
		createDate: now,
		modifyDate: now,
	};

	switch (data.type as PORTFOLIO_TYPE) {
		case PORTFOLIO_TYPE.IMAGE: {
			if (file) {
				saveData.image = file.key;
			}
			break
		}
		case PORTFOLIO_TYPE.VIDEO: {
			if (file) {
				saveData.video = file.key;
			} else {
				saveData.youtube = data.youtube || null;
			}
			break
		}
		case PORTFOLIO_TYPE.URL: {
			saveData.url = data.url || null;
			break
		}
		case PORTFOLIO_TYPE.PDF: {
			if (file) {
				saveData.pdf = file.key;
			}
		}
	}
	const result = await portfolioRepositery.create(saveData);
	if (!result) {
		throw new BadRequestError("Something Went Wrong");
	}
	return "Successfully Added!";
}

export async function updatePortfolioService(
	userId: number,
	portfolioId: number,
	data: PortfolioRequestBody,
	file?: Express.MulterS3.File,
) {
	const existing = await portfolioRepositery.findById(portfolioId);
	if (!existing || existing.user !== userId) {
		throw new BadRequestError("Portfolio not found");
	}

	const now = new Date().toISOString().replace("T", " ").split(".")[0];

	const saveData: any = {
		title: data.title,
		description: data.description || null,
		youtube: null,
		image: null,
		video: null,
		pdf: null,
		url: null,
		modifyDate: now,
	};

	switch (data.type as PORTFOLIO_TYPE) {
		case PORTFOLIO_TYPE.IMAGE: {
			if (file) {
				saveData.image = file.key;
			}
			break
		}
		case PORTFOLIO_TYPE.VIDEO: {
			if (file) {
				saveData.video = file.key;
				saveData.youtube = null;
			} else {
				saveData.youtube = data.youtube || null;
			}
			break
		}
		case PORTFOLIO_TYPE.URL: {
			saveData.url = data.url || null;
			break
		}
		case PORTFOLIO_TYPE.PDF: {
			if (file) {
				saveData.pdf = file.key;
			}
			break
		}
	}

	await portfolioRepositery.update(portfolioId, saveData);
	return "Successfully Updated!";
}

export async function allPortfolioListService(userId: number) {
	const items = await portfolioRepositery.getAllByUserId(userId);
	return items.map(item => mapPortfolioItem(item, true));
}

export async function portfolioDetailService(userId: number, id: number) {
	const item = await portfolioRepositery.findByIdAndUser(id, userId);
	if (!item) {
		throw new BadRequestError("No record found!");
	}
	return mapPortfolioItem(item, false);
}

export async function deletePortfolioService(userId: number, id: number) {
	const deleted = await portfolioRepositery.deleteByUserAndId(userId, id);
	if (!deleted) {
		throw new BadRequestError("Try again something went wrong");
	}
	return "Deleted Sucessfully";
}
