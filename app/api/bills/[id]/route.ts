import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { billSchema } from "@/lib/validations/bill"
import { z } from "zod"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        billType: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(bill)
  } catch (error) {
    console.error("Error fetching bill:", error)
    return NextResponse.json(
      { error: "Failed to fetch bill" },
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

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const data = billSchema.parse(body)

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      )
    }

    // Verify billType belongs to organization
    const billType = await prisma.billType.findFirst({
      where: {
        id: data.billTypeId,
        organizationId: session.user.organizationId,
      },
    })

    if (!billType) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      )
    }

    const updated = await prisma.bill.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate || null,
      },
      include: {
        billType: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

    console.error("Error updating bill:", error)
    return NextResponse.json(
      { error: "Failed to update bill" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      )
    }

    await prisma.bill.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Bill deleted successfully" })
  } catch (error) {
    console.error("Error deleting bill:", error)
    return NextResponse.json(
      { error: "Failed to delete bill" },
      { status: 500 }
    )
  }
}
