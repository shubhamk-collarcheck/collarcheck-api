import { Request, Response, NextFunction } from "express"
import { allEducationListService, createEducationService, deleteEducationService, educationDetailService, updateEducationService } from "../services/education.service"
import { AuthUser } from "../types/express"
import { EducationRequestBody } from "../types/education.types"
import { CommonIdParams } from "../utils/validation"
import { decodeCertificateURLs } from "../utils/decoders"

export async function allEducationList(req: Request, res: Response, next: NextFunction) {
	try {
		const { id } = req.auth as AuthUser
		const educationList = await allEducationListService(id)

		const data = educationList.map((item) => {
			const entry: Record<string, unknown> = {
				id: item.id,
				university: item.universityName,
				course_type: item.courseTypeName,
				course: item.courseName,
				starting_date: item.startingDate,
				ending_date: item.endingDate,
				country: item.countryName,
				ishighest: item.ishighest === 1,
				ongoing: item.ongoing === 1,
				document: decodeCertificateURLs(item.certificate),
			}

			if (item.courseName && item.courseName.toLowerCase() !== "online") {
				entry.state = item.stateName
				entry.city = item.cityName
			}

			return entry
		})

		return res.status(200).json({
			status: true,
			messages: "education History",
			data,
		})
	} catch (err) {
		next(err)
	}
}

export async function educationDetail(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams

		const detail = await educationDetailService(user_id, params.id)

		if (!detail) {
			return res.status(404).json({
				status: false,
				messages: "no record found!",
			})
		}

		const entry: Record<string, unknown> = {
			id: detail.id,
			university: detail.universityName,
			course_type: detail.courseType,
			course: detail.courseName,
			starting_date: detail.startingDate,
			ending_date: detail.endingDate,
			country: detail.countryName,
			ishighest: detail.ishighest === 1,
			ongoing: detail.ongoing === 1,
			city: detail.city,
			state: detail.state,
			country_id: detail.country,
			document: decodeCertificateURLs(detail.certificate),
		}

		if (detail.courseName && detail.courseName.toLowerCase() !== "online") {
			entry.state_name = detail.stateName
			entry.city_name = detail.cityName
		}

		return res.status(200).json({
			status: true,
			messages: "education History",
			data: entry,
		})
	} catch (err) {
		next(err)
	}
}

export async function addEducation(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body } = req.validated as EducationRequestBody
		const files = req.files as Express.MulterS3.File[] | undefined

		const messages = await createEducationService(user_id, body, files)

		return res.status(201).json({
			status: true,
			messages,
		})
	} catch (err) {
		next(err)
	}
}

export async function updateEducation(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body, params } = req.validated as EducationRequestBody
		const files = req.files as Express.MulterS3.File[] | undefined

		const messages = await updateEducationService(user_id, params.id!, body, files)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (err) {
		next(err)
	}
}

export async function deleteEducation(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams

		const messages = await deleteEducationService(user_id, params.id)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (err) {
		next(err)
	}
}
