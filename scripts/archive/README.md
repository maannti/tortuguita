# Archived scripts

One-off scripts that have already been run in production. Kept here for
historical reference. Do **not** run them again unless you understand exactly
what they do — most are idempotent guards but some are destructive.

| Script | Purpose | Runtime |
|--------|---------|---------|
| `migrate-to-multi-org.ts` | Migrated `User.organizationId` → `User.currentOrganizationId` and created `UserOrganization` rows. Already executed. | one-off |
