import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { incomeTypeSchema } from "@/lib/validations/income-type"
import { z } from "zod"

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

    const incomeType = await prisma.incomeType.findFirst({
      where: {
        id,
        organizationId: session.user.currentOrganizationId,
      },
    })

    if (!incomeType) {
      return NextResponse.json(
        { error: "Income type not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(incomeType)
  } catch (error) {
    console.error("Error fetching income type:", error)
    return NextResponse.json(
      { error: "Failed to fetch income type" },
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
    const data = incomeTypeSchema.parse(body)

    const incomeType = await prisma.incomeType.findFirst({
      where: {
        id,
        organizationId: session.user.currentOrganizationId,
      },
    })

    if (!incomeType) {
      return NextResponse.json(
        { error: "Income type not found" },
        { status: 404 }
      )
    }

    const updated = await prisma.incomeType.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating income type:", error)
    return NextResponse.json(
      { error: "Failed to update income type" },
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

    if (!session?.user?.currentOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    const incomeType = await prisma.incomeType.findFirst({
      where: {
        id,
        organizationId: session.user.currentOrganizationId,
      },
    })

    if (!incomeType) {
      return NextResponse.json(
        { error: "Income type not found" },
        { status: 404 }
      )
    }

    await prisma.incomeType.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Income type deleted successfully" })
  } catch (error) {
    console.error("Error deleting income type:", error)
    return NextResponse.json(
      { error: "Failed to delete income type" },
      { status: 500 }
    )
  }
}
