import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { billingPeriodSchema } from "@/lib/validations/bill-type"
import { z } from "zod"
import { needsRotation } from "@/lib/budget-date"
import { getUserOrganizations } from "@/lib/organization-utils"

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
      select: {
        id: true, name: true, isCreditCard: true,
        currentClosingDate: true, currentDueDate: true,
        nextClosingDate: true, nextDueDate: true,
      },
    })

    if (!billType) return NextResponse.json({ error: "Bill type not found" }, { status: 404 })

    const billingPeriod = {
      currentClosingDate: billType.currentClosingDate,
      currentDueDate: billType.currentDueDate,
      nextClosingDate: billType.nextClosingDate,
      nextDueDate: billType.nextDueDate,
    }

    return NextResponse.json({ ...billType, needsRotation: needsRotation(billingPeriod) })
  } catch (error) {
    console.error("Error fetching billing period:", error)
    return NextResponse.json({ error: "Failed to fetch billing period" }, { status: 500 })
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

    const billType = await prisma.billType.findFirst({
      where: { id, organizationId: { in: orgIds } },
    })

    if (!billType) return NextResponse.json({ error: "Bill type not found" }, { status: 404 })

    if (!billType.isCreditCard) {
      return NextResponse.json(
        { error: "Billing period can only be set for credit card categories" },
        { status: 400 }
      )
    }

    const data = billingPeriodSchema.parse(body)

    const updated = await prisma.billType.update({
      where: { id },
      data: {
        currentClosingDate: data.currentClosingDate,
        currentDueDate: data.currentDueDate,
        nextClosingDate: data.nextClosingDate || null,
        nextDueDate: data.nextDueDate || null,
      },
      select: {
        id: true, name: true, isCreditCard: true,
        currentClosingDate: true, currentDueDate: true,
        nextClosingDate: true, nextDueDate: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("Error updating billing period:", error)
    return NextResponse.json({ error: "Failed to update billing period" }, { status: 500 })
  }
}
