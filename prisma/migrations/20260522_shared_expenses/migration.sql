-- Add paidByUserId to Bill
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "paidByUserId" TEXT;

-- Add foreign key
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_paidByUserId_fkey"
  FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS "Bill_paidByUserId_idx" ON "Bill"("paidByUserId");

-- Add isSettled and settledAt to BillAssignment
ALTER TABLE "BillAssignment" ADD COLUMN IF NOT EXISTS "isSettled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BillAssignment" ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3);
