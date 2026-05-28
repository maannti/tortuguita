import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth } from "date-fns"
import { getUserOrganizations } from "@/lib/organization-utils"

// PUT /api/settings/incomes
// Body: { organizationId, members: [{ userId, amount }] }
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId, members } = await request.json() as {
      organizationId: string
      members: { userId: string; amount: number }[]
    }

    if (!organizationId || !Array.isArray(members)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Validate user is a member of this org
    const userOrgs = await getUserOrganizations(session.user.id)
    const org = userOrgs.find(o => o.id === organizationId)
    if (!org) {
      return NextResponse.json({ error: "Espacio no encontrado" }, { status: 404 })
    }

    // Find or create a "Sueldo" income type for this org
    let incomeType = await prisma.incomeType.findFirst({
      where: { organizationId, name: "Sueldo" },
    })
    if (!incomeType) {
      incomeType = await prisma.incomeType.create({
        data: { name: "Sueldo", organizationId, isRecurring: true },
      })
    }

    const monthStart = startOfMonth(new Date())

    // Upsert one income record per member for this month
    await Promise.all(
      members.map(async ({ userId, amount }) => {
        const existing = await prisma.income.findFirst({
          where: {
            organizationId,
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
              organizationId,
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
