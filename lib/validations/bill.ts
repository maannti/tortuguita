import { z } from "zod"

const billAssignmentSchema = z.object({
  userId: z.string().min(1, "User is required"),
  percentage: z.coerce
    .number()
    .min(0.01, "Percentage must be at least 0.01")
    .max(100, "Percentage cannot exceed 100")
    .multipleOf(0.01, "Percentage must have at most 2 decimal places"),
})

export const billSchema = z
  .object({
    label: z.string().min(1, "Label is required").max(100, "Label is too long"),
    amount: z.coerce
      .number()
      .positive("Amount must be positive")
      .multipleOf(0.01, "Amount must have at most 2 decimal places"),
    paymentDate: z.coerce.date(),
    dueDate: z.coerce.date().nullable().optional(),
    billTypeId: z.string().min(1, "Category is required"),
    notes: z.string().optional(),
    assignments: z.array(billAssignmentSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.assignments.length === 0) return true
      const total = data.assignments.reduce(
        (sum, assignment) => sum + assignment.percentage,
        0
      )
      return Math.abs(total - 100) < 0.01 // Allow for floating point errors
    },
    {
      message: "Total percentage must equal 100%",
      path: ["assignments"],
    }
  )

export type BillFormData = z.input<typeof billSchema>
export type BillAssignmentData = z.input<typeof billAssignmentSchema>
