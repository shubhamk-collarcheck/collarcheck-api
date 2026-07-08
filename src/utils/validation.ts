import { z } from "zod"


export const commonIdParamsSchema = z.object({
	params: z.object({
		id: z.coerce.number().int().positive()
	})
})


export type CommonIdParams = z.infer<typeof commonIdParamsSchema>
