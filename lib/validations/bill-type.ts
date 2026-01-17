import { z } from "zod"

export const billTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  icon: z.string().optional(),
})

export type BillTypeFormData = z.infer<typeof billTypeSchema>
