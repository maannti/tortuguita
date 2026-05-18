import { z } from "zod"

const assignmentSchema = z.object({
  userId: z.string().min(1),
  percentage: z.coerce.number().min(0).max(100),
})

export const recurringBillSchema = z.object({
  label: z.string().min(1, "El nombre es requerido").max(100),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  amountUSD: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  billTypeId: z.string().min(1, "La categoría es requerida"),
  categoryId: z.string().optional().nullable(),
  organizationId: z.string().min(1),
  dayOfMonth: z.coerce.number().int().min(1).max(28, "El día máximo es 28"),
  isActive: z.boolean().default(true),
  assignments: z.array(assignmentSchema).default([]),
}).refine(
  (data) => {
    if (data.assignments.length === 0) return true
    const total = data.assignments.reduce((s, a) => s + a.percentage, 0)
    return Math.abs(total - 100) < 0.01
  },
  { message: "Los porcentajes deben sumar 100%", path: ["assignments"] }
)

export type RecurringBillFormData = z.infer<typeof recurringBillSchema>
