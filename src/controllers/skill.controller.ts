import { Request, Response, NextFunction } from "express"
import { addSkillService, allSkillService, deleteSkillService } from "../services/skill.service"
import { AuthUser } from "../types/express"
import type { SkillBody } from "../types/skill.types"
import type { CommonIdParams } from "../utils/validation"

export async function addSkill(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: actingUserId } = req.auth as AuthUser
		const { body } = req.validated as { body: SkillBody }

		const messages = await addSkillService(actingUserId, body)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (err) {
		next(err)
	}
}

export async function allSkill(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: actingUserId } = req.auth as AuthUser

		const skills = await allSkillService(actingUserId)
		// PHP: skip empty/0/null ratings; skill = master name string (or "")
		const data = skills
			.filter((s) => s.rating != null && s.rating !== 0 && String(s.rating).trim() !== "")
			.map((s) => ({
				id: s.id,
				skill: s.skillName || "",
				rating: s.rating,
			}))

		return res.status(200).json({
			status: true,
			messages: "skill History",
			data,
		})
	} catch (err) {
		return res.status(200).json({
			status: false,
			messages: "Access denied",
		})
	}
}

export async function deleteSkill(req: Request, res: Response, next: NextFunction) {
	try {
		const { id: actingUserId } = req.auth as AuthUser
		const { params } = req.validated as CommonIdParams

		const messages = await deleteSkillService(actingUserId, params.id)

		return res.status(200).json({
			status: true,
			messages,
		})
	} catch (err) {
		next(err)
	}
}
