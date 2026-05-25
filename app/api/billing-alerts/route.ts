import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserOrganizations } from "@/lib/organization-utils"

/**
 * GET /api/billing-alerts
 * Returns credit cards that need attention:
 *   - Never configured: currentDueDate is null
 *   - Stale: currentDueDate has passed and no next period to auto-roll to
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)
  const now = new Date()

  const cards = await prisma.billType.findMany({
    where: {
      organizationId: { in: orgIds },
      isCreditCard: true,
      OR: [
        { currentDueDate: null },                                       // Never configured
        { currentDueDate: { lt: now }, nextDueDate: null },             // Expired, no next to roll
        { currentDueDate: { gte: now }, nextDueDate: null },            // Current ok but no next set yet
      ],
    },
    select: { id: true, name: true, currentDueDate: true, nextDueDate: true },
    orderBy: { name: "asc" },
  })

  const alerts = cards.map(c => ({
    id: c.id,
    name: c.name,
    alertType: !c.currentDueDate
      ? "no_period"
      : (c.currentDueDate < now ? "stale" : "no_next_period"),
  }))

  return NextResponse.json({ alerts })
}
