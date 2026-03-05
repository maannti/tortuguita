import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { billingPeriodSchema } from "@/lib/validations/bill-type"
import { z } from "zod"
import { needsRotation, rotateBillingPeriod } from "@/lib/budget-date"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.currentOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    const billType = await prisma.billType.findFirst({
      where: {
        id,
        organizationId: session.user.currentOrganizationId,
      },
      select: {
        id: true,
        name: true,
        isCreditCard: true,
        currentClosingDate: true,
        currentDueDate: true,
        nextClosingDate: true,
        nextDueDate: true,
      },
    })

    if (!billType) {
      return NextResponse.json(
        { error: "Bill type not found" },
        { status: 404 }
      )
    }

    // Check if rotation is needed
    const billingPeriod = {
      currentClosingDate: billType.currentClosingDate,
      currentDueDate: billType.currentDueDate,
      nextClosingDate: billType.nextClosingDate,
      nextDueDate: billType.nextDueDate,
    }

    if (needsRotation(billingPeriod)) {
      // Rotate the period
      const rotated = rotateBillingPeriod(billingPeriod)

      await prisma.billType.update({
        where: { id },
        data: {
          currentClosingDate: rotated.currentClosingDate,
          currentDueDate: rotated.currentDueDate,
          nextClosingDate: rotated.nextClosingDate,
          nextDueDate: rotated.nextDueDate,
        },
      })

      return NextResponse.json({
        ...billType,
        currentClosingDate: rotated.currentClosingDate,
        currentDueDate: rotated.currentDueDate,
        nextClosingDate: rotated.nextClosingDate,
        nextDueDate: rotated.nextDueDate,
        wasRotated: true,
      })
    }

    return NextResponse.json(billType)
  } catch (error) {
    console.error("Error fetching billing period:", error)
    return NextResponse.json(
      { error: "Failed to fetch billing period" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.currentOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Verify the bill type exists and belongs to the organization
    const billType = await prisma.billType.findFirst({
      where: {
        id,
        organizationId: session.user.currentOrganizationId,
      },
    })

    if (!billType) {
      return NextResponse.json(
        { error: "Bill type not found" },
        { status: 404 }
      )
    }

    if (!billType.isCreditCard) {
      return NextResponse.json(
        { error: "Billing period can only be set for credit card categories" },
        { status: 400 }
      )
    }

    // Validate the billing period data
    const data = billingPeriodSchema.parse(body)

    // Update the billing period
    const updated = await prisma.billType.update({
      where: { id },
      data: {
        currentClosingDate: data.currentClosingDate,
        currentDueDate: data.currentDueDate,
        nextClosingDate: data.nextClosingDate || null,
        nextDueDate: data.nextDueDate || null,
      },
      select: {
        id: true,
        name: true,
        isCreditCard: true,
        currentClosingDate: true,
        currentDueDate: true,
        nextClosingDate: true,
        nextDueDate: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating billing period:", error)
    return NextResponse.json(
      { error: "Failed to update billing period" },
      { status: 500 }
    )
  }
}
