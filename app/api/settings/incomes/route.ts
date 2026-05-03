import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth } from "date-fns"

// PUT /api/settings/incomes
// Body: { members: [{ userId, amount }] }
// Upserts income records for the current month per member using a shared "Sueldo" IncomeType
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.currentOrganizationId || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = session.user.currentOrganizationId
    const { members } = await request.json() as { members: { userId: string; amount: number }[] }

    if (!Array.isArray(members)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Find or create a "Sueldo" income type for this org
    let incomeType = await prisma.incomeType.findFirst({
      where: { organizationId: orgId, name: "Sueldo" },
    })
    if (!incomeType) {
      incomeType = await prisma.incomeType.create({
        data: { name: "Sueldo", organizationId: orgId, isRecurring: true },
      })
    }

    const monthStart = startOfMonth(new Date())

    // Upsert one income record per member for this month
    await Promise.all(
      members.map(async ({ userId, amount }) => {
        const existing = await prisma.income.findFirst({
          where: {
            organizationId: orgId,
            userId,
            incomeTypeId: incomeType.id,
            incomeDate: { gte: monthStart },
          },
        })
        if (existing) {
          await prisma.income.update({
            where: { id: existing.id },
            data: { amount },
          })
        } else {
          await prisma.income.create({
            data: {
              label: "Sueldo",
              amount,
              incomeDate: monthStart,
              incomeTypeId: incomeType.id,
              organizationId: orgId,
              userId,
            },
          })
        }
      })
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error saving incomes:", error)
    return NextResponse.json({ error: "Error al guardar ingresos" }, { status: 500 })
  }
}
