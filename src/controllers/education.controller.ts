import { Request, Response, NextFunction } from "express"
import { allEducationListService } from "../services/education.service"
import { AuthUser } from "../types/express"
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


