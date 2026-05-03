-- Add index on Bill.dueDate scoped by org (queries that filter by upcoming
-- payments now use an actual index instead of a sequential scan).
CREATE INDEX IF NOT EXISTS "Bill_organizationId_dueDate_idx"
  ON "Bill" ("organizationId", "dueDate");

-- Prevent duplicate installments inside the same installmentGroupId. The app
-- guarantees this at runtime, but a unique index makes drift via direct DB
-- writes or accidental AI-tool retries impossible.
--
-- Postgres treats NULLs as distinct by default, so this does NOT affect bills
-- with no installmentGroupId (regular non-installment bills).
CREATE UNIQUE INDEX IF NOT EXISTS "Bill_installmentGroupId_currentInstallment_key"
  ON "Bill" ("installmentGroupId", "currentInstallment");
