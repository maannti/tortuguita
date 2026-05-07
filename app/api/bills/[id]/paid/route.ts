import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserOrganizations } from "@/lib/organization-utils"

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const userOrgs = await getUserOrganizations(session.user.id)
    const orgIds = userOrgs.map(o => o.id)

    const bill = await prisma.bill.findFirst({
      where: { id, organizationId: { in: orgIds } },
      select: { id: true, isPaid: true },
    })

    if (!bill) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })

    const updated = await prisma.bill.update({
      where: { id },
      data: { isPaid: !bill.isPaid },
      select: { id: true, isPaid: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error toggling isPaid:", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }
}
