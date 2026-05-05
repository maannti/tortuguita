import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { billTypeSchema } from "@/lib/validations/bill-type"
import { getUserOrganizations } from "@/lib/organization-utils"
import { z } from "zod"

async function getOrgIds(userId: string) {
  const orgs = await getUserOrganizations(userId)
  return orgs.map(o => o.id)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const orgIds = await getOrgIds(session.user.id)

    const billType = await prisma.billType.findFirst({
      where: { id, organizationId: { in: orgIds } },
    })

    if (!billType) return NextResponse.json({ error: "Bill type not found" }, { status: 404 })

    return NextResponse.json(billType)
  } catch (error) {
    console.error("Error fetching bill type:", error)
    return NextResponse.json({ error: "Failed to fetch bill type" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const orgIds = await getOrgIds(session.user.id)
    const body = await request.json()
    const data = billTypeSchema.parse(body)

    const billType = await prisma.billType.findFirst({
      where: { id, organizationId: { in: orgIds } },
    })

    if (!billType) return NextResponse.json({ error: "Bill type not found" }, { status: 404 })

    const updated = await prisma.billType.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("Error updating bill type:", error)
    return NextResponse.json({ error: "Failed to update bill type" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const force = new URL(request.url).searchParams.get("force") === "true"
    const orgIds = await getOrgIds(session.user.id)

    const billType = await prisma.billType.findFirst({
      where: { id, organizationId: { in: orgIds } },
    })
    if (!billType) return NextResponse.json({ error: "Bill type not found" }, { status: 404 })

    // Count associated bills (as primary billTypeId or as CC categoryId)
    const billCount = await prisma.bill.count({
      where: { OR: [{ billTypeId: id }, { categoryId: id }] },
    })

    if (billCount > 0 && !force) {
      return NextResponse.json(
        { error: "has_bills", count: billCount },
        { status: 409 }
      )
    }

    // Force delete: remove bills first, then the bill type
    if (billCount > 0) {
      await prisma.$transaction([
        prisma.billAssignment.deleteMany({ where: { bill: { OR: [{ billTypeId: id }, { categoryId: id }] } } }),
        prisma.bill.deleteMany({ where: { OR: [{ billTypeId: id }, { categoryId: id }] } }),
        prisma.billType.delete({ where: { id } }),
      ])
    } else {
      await prisma.billType.delete({ where: { id } })
    }

    return NextResponse.json({ message: "Bill type deleted successfully" })
  } catch (error) {
    console.error("Error deleting bill type:", error)
    return NextResponse.json({ error: "No se pudo eliminar la categoría" }, { status: 500 })
  }
}
