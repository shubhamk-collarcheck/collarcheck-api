import db from "../db";
import { cybSkill } from "../db/schema";
import skillRepositery from "../repositery/skill.repositery";
import userSkillRepositery from "../repositery/user-skill.repositery";
import { BadRequestError } from "../middlewares/errorHandler";
import type { SkillBody } from "../types/skill.types";
import type { InferInsertModel } from "drizzle-orm";

type NewSkill = InferInsertModel<typeof cybSkill>

type ResolveResult<T> = {
	id: number | null
	data: T | null
}

async function resolveSkill(value: string | number, userId: number): Promise<ResolveResult<NewSkill>> {
	if (typeof value === "number") {
		return { id: value, data: null };
	}
	const name = value.trim();
	const existing = await skillRepositery.findByName(name);
	if (existing.length > 0) {
		return { id: existing[0].id, data: null };
	}
	return {
		id: null,
		data: {
			name,
			userDefined: 1,
			userId,
			status: 1,
		} as NewSkill,
	};
}

export async function addSkillService(userId: number, data: SkillBody) {
	const resolved = await resolveSkill(data.skill, userId);

	let skillId = resolved.id;
	if (!skillId && resolved.data) {
		const skill = await skillRepositery.create(resolved.data)
		skillId = skill.id;
	}

	if (!skillId) {
		throw new BadRequestError("Something went wrong try again");
	}

	const now = new Date().toISOString().replace("T", " ").split(".")[0];
	const save = {
		user: userId,
		skill: skillId,
		rating: data.rating,
		modifyDate: now,
	};

	const existing = await userSkillRepositery.findByUserAndSkill(userId, skillId);
	if (existing) {
		await userSkillRepositery.update(existing.id, save);
		return "Successfully added";
	}

	await userSkillRepositery.create({
		...save,
		createDate: now,
		status: 1,
		isDeleted: 0,
	});
	return "Successfully added";
}

export async function allSkillService(userId: number) {
	return await userSkillRepositery.getAllByUserId(userId);
}

export async function deleteSkillService(userId: number, id: number) {
	const deleted = await userSkillRepositery.deleteByUserAndId(userId, id);
	if (!deleted) {
		throw new BadRequestError("Try again something went wrong");
	}
	return "skill deleted";
}
