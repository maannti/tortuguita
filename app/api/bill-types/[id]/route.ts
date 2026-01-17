import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { billTypeSchema } from "@/lib/validations/bill-type"
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

    const billType = await prisma.billType.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!billType) {
      return NextResponse.json(
        { error: "Bill type not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(billType)
  } catch (error) {
    console.error("Error fetching bill type:", error)
    return NextResponse.json(
      { error: "Failed to fetch bill type" },
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
    const data = billTypeSchema.parse(body)

    const billType = await prisma.billType.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!billType) {
      return NextResponse.json(
        { error: "Bill type not found" },
        { status: 404 }
      )
    }

    const updated = await prisma.billType.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating bill type:", error)
    return NextResponse.json(
      { error: "Failed to update bill type" },
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

    const billType = await prisma.billType.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    })

    if (!billType) {
      return NextResponse.json(
        { error: "Bill type not found" },
        { status: 404 }
      )
    }

    await prisma.billType.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Bill type deleted successfully" })
  } catch (error) {
    console.error("Error deleting bill type:", error)
    return NextResponse.json(
      { error: "Failed to delete bill type" },
      { status: 500 }
    )
  }
}
