import { z } from "zod"

export const billTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
  icon: z.string().optional(),
  isCreditCard: z.boolean(),
})

// Base billing period schema without refinements for proper type inference
const baseBillingPeriodSchema = z.object({
  currentClosingDate: z.coerce.date(),
  currentDueDate: z.coerce.date(),
  nextClosingDate: z.coerce.date().optional(),
  nextDueDate: z.coerce.date().optional(),
})

// Schema with validations for API use
export const billingPeriodSchema = baseBillingPeriodSchema.refine(
  (data) => {
    // Due date must be after closing date
    return data.currentDueDate > data.currentClosingDate
  },
  {
    message: "Due date must be after closing date",
    path: ["currentDueDate"],
  }
).refine(
  (data) => {
    // If next period is provided, both dates must be present
    if (data.nextClosingDate || data.nextDueDate) {
      return data.nextClosingDate && data.nextDueDate
    }
    return true
  },
  {
    message: "Both next closing and due dates are required",
    path: ["nextClosingDate"],
  }
).refine(
  (data) => {
    // Next due date must be after next closing date
    if (data.nextClosingDate && data.nextDueDate) {
      return data.nextDueDate > data.nextClosingDate
    }
    return true
  },
  {
    message: "Next due date must be after next closing date",
    path: ["nextDueDate"],
  }
)

export type BillTypeFormData = z.infer<typeof billTypeSchema>
export type BillingPeriodFormData = z.infer<typeof baseBillingPeriodSchema>
