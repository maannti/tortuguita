import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { incomeSchema } from "@/lib/validations/income"
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

    const income = await prisma.income.findFirst({
      where: {
        id,
        organizationId: session.user.currentOrganizationId,
      },
      include: {
        incomeType: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!income) {
      return NextResponse.json(
        { error: "Income not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(income)
  } catch (error) {
    console.error("Error fetching income:", error)
    return NextResponse.json(
      { error: "Failed to fetch income" },
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
    const data = incomeSchema.parse(body)

    const income = await prisma.income.findFirst({
      where: {
        id,
        organizationId: session.user.currentOrganizationId,
      },
    })

    if (!income) {
      return NextResponse.json(
        { error: "Income not found" },
        { status: 404 }
      )
    }

    // Verify incomeType belongs to organization
    const incomeType = await prisma.incomeType.findFirst({
      where: {
        id: data.incomeTypeId,
        organizationId: session.user.currentOrganizationId,
      },
    })

    if (!incomeType) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      )
    }

    // Verify all assigned users belong to organization via UserOrganization
    if (data.assignments && data.assignments.length > 0) {
      const userIds = data.assignments.map((a) => a.userId)
      const memberships = await prisma.userOrganization.findMany({
        where: {
          userId: { in: userIds },
          organizationId: session.user.currentOrganizationId,
        },
      })

      if (memberships.length !== userIds.length) {
        return NextResponse.json(
          { error: "Invalid user assignments" },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.income.update({
      where: { id },
      data: {
        label: data.label,
        amount: data.amount,
        incomeDate: data.incomeDate,
        incomeTypeId: data.incomeTypeId,
        notes: data.notes,
        assignments: {
          deleteMany: {},
          create: data.assignments?.map((assignment) => ({
            userId: assignment.userId,
            percentage: assignment.percentage,
          })),
        },
      },
      include: {
        incomeType: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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

    console.error("Error updating income:", error)
    return NextResponse.json(
      { error: "Failed to update income" },
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

    const income = await prisma.income.findFirst({
      where: {
        id,
        organizationId: session.user.currentOrganizationId,
      },
    })

    if (!income) {
      return NextResponse.json(
        { error: "Income not found" },
        { status: 404 }
      )
    }

    await prisma.income.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Income deleted successfully" })
  } catch (error) {
    console.error("Error deleting income:", error)
    return NextResponse.json(
      { error: "Failed to delete income" },
      { status: 500 }
    )
  }
}
