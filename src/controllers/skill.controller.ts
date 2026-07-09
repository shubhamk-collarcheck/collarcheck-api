import { Request, Response, NextFunction } from "express"
import { addSkillService, allSkillService, deleteSkillService } from "../services/skill.service"
import { AuthUser } from "../types/express"
import type { SkillBody } from "../types/skill.types"
import type { CommonIdParams } from "../utils/validation"

export async function addSkill(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { body } = req.validated as { body: SkillBody }

		const messages = await addSkillService(user_id, body)

		return res.status(201).json({
			status: true,
			messages,
		})
	} catch (err) {
		next(err)
	}
}

export async function allSkill(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser

		const skills = await allSkillService(user_id)
		const data = skills.map((s) => ({
			id: s.id,
			skill: s.skillName,
			rating: s.rating,
		}))

		return res.status(200).json({
			status: true,
			messages: "skill History",
			data,
		})
	} catch (err) {
		next(err)
	}
}

export async function deleteSkill(req: Request, res: Response, next: NextFunction) {
	try {
		const { user_id } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams

		const messages = await deleteSkillService(user_id, params.id)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (err) {
		next(err)
	}
}
