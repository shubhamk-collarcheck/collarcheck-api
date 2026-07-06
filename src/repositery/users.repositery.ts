
import { and, asc, desc, eq, inArray, ne, sql, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import db from '../db';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { cybUser, cybUserExperience, cybEmployementType, cybDesignation, cybDepartment } from '../db/schema';
import { isEmptyArray } from '../utils/helpers';
import { createSlug } from "../utils/generator";


type User = InferSelectModel<typeof cybUser>
type NewUser = InferInsertModel<typeof cybUser>
type Exprience = InferSelectModel<typeof cybUserExperience>

export const USER_PREFIX = { EMPLOYEE: "CCE", COMPANY: "CCC", } as const;
export const USER_TYPE = { EMPLOYEE: 1, COMPANY: 2, } as const;


export function randomNumber(length = 6): string {
	const max = Math.pow(10, length) - 1;
	return Math.floor(Math.random() * max + 1).toString().padStart(length, "0");
}


const isSemiRound = (num: string) =>
	num.length === 6 &&
	num[0] === num[1] &&
	num.slice(2) === "0000";

const vipRules = [
	(n: string) => /(\d)\1/.test(n),
	(n: string) => /^(\d)\1{5}$/.test(n),
	(n: string) => /^(\d{2})\1+$/.test(n),
	(n: string) => /^[1-9]0{5}$/.test(n),
	isSemiRound,
	(n: string) => n === n.split("").reverse().join(""),
	(n: string) => /012345|123456|234567|345678|456789|567890/.test(n),
	(n: string) => /987654|876543|765432|654321|543210/.test(n),
];

export const isVipNumber = (num: string): boolean => {
	return vipRules.some(rule => rule(num));
};


class UsersRepository {
	async findById(id: number): Promise<User | undefined> {
		const [user] = await db.select().from(cybUser).where(eq(cybUser.id, id));
		return user;
	}

	async findByName(name: string, userType?: number): Promise<User[]> {
		const conditions = [
			eq(cybUser.fname, name),
			eq(cybUser.isDeleted, 0),
			eq(cybUser.status, 1),
		];
		if (userType !== undefined) {
			conditions.push(eq(cybUser.userType, userType));
		}
		return await db.select().from(cybUser).where(and(...conditions));
	}


	async findBySlug(slug: string): Promise<User[]> {
		return await db.select().from(cybUser).where(eq(cybUser.slug, slug))
	}
	async create(data: Partial<NewUser>): Promise<User> {
		const [{ id }] = await db.insert(cybUser).values(data).$returningId();

		const user = await this.findById(id);

		if (!user) {
			throw new Error("User was inserted but could not be retrieved.");
		}
		return user;
	}
	async update(id: number, data: Partial<NewUser>): Promise<User | undefined> {
		await db.update(cybUser).set(data).where(eq(cybUser.id, id));
		return this.findById(id);
	}

	async getHireDetail(id: number): Promise<Exprience[] | []> {
		const condition = [eq(cybUserExperience.user, id), ne(cybUserExperience.hired, 0), eq(cybUserExperience.isDeleted, 0)]
		const hireList = await db.select().from(cybUserExperience).where(and(...condition))
		return hireList
	}

	async getUserExperience(id: number) {
		const companyUser = alias(cybUser, 'company');
		const condition = [and(eq(cybUserExperience.user, id), eq(cybUserExperience.isDeleted, 0), eq(companyUser.isDeleted, 0))]
		const result = await db.select().from(cybUserExperience)
			.leftJoin(companyUser, eq(cybUserExperience.company, companyUser.id))
			.leftJoin(cybEmployementType, eq(cybUserExperience.employmentType, cybEmployementType.id))
			.leftJoin(cybDesignation, eq(cybUserExperience.designation, cybDesignation.id))
			.leftJoin(cybDepartment, eq(cybUserExperience.department, cybDepartment.id))
			.where(and(...condition))
			.orderBy(desc(cybUserExperience.stillWorking), desc(cybUserExperience.joiningDate));

		return result;
	}
	async generateUniqueId(prefix: string): Promise<string> {
		while (true) {
			const num = randomNumber();

			// Skip VIP numbers
			if (isVipNumber(num)) {
				continue;
			}

			const uniqueId = `${prefix}${num}`;

			const existing = await db.select().from(cybUser).where(eq(cybUser.individualId, uniqueId))

			if (isEmptyArray(existing)) {
				return uniqueId;
			}
		}
	}
	async generateSlug(name: string) {
		const baseSlug = createSlug(name);

		let slug = baseSlug;
		let counter = 1;

		while (!(isEmptyArray(await this.findBySlug(slug)))) {
			slug = `${baseSlug}-${counter}`;
			counter++;
		}

		return slug;
	}


}

export default new UsersRepository();


