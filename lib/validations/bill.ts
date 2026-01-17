import { z } from "zod"

export const billSchema = z.object({
  label: z.string().min(1, "Label is required").max(100, "Label is too long"),
  amount: z.coerce
    .number({ required_error: "Amount is required" })
    .positive("Amount must be positive")
    .multipleOf(0.01, "Amount must have at most 2 decimal places"),
  paymentDate: z.coerce.date({ required_error: "Payment date is required" }),
  dueDate: z.coerce.date().optional().nullable(),
  billTypeId: z.string().min(1, "Category is required"),
  notes: z.string().optional(),
})

export type BillFormData = z.infer<typeof billSchema>
