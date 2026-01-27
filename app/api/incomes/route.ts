import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { incomeSchema } from "@/lib/validations/income"
import { z } from "zod"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.currentOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const incomeTypeId = searchParams.get("incomeTypeId")
    const userId = searchParams.get("userId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: Prisma.IncomeWhereInput = {
      organizationId: session.user.currentOrganizationId,
    }

    if (incomeTypeId) {
      where.incomeTypeId = incomeTypeId
    }

    if (userId) {
      where.userId = userId
    }

    if (startDate || endDate) {
      where.incomeDate = {}
      if (startDate) {
        where.incomeDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.incomeDate.lte = new Date(endDate)
      }
    }

    const incomes = await prisma.income.findMany({
      where,
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
      orderBy: {
        incomeDate: "desc",
      },
    })

    return NextResponse.json(incomes)
  } catch (error) {
    console.error("Error fetching incomes:", error)
    return NextResponse.json(
      { error: "Failed to fetch incomes" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.currentOrganizationId || !session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = incomeSchema.parse(body)

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

    // Extract session values for use in transaction (TypeScript narrowing)
    const organizationId = session.user.currentOrganizationId
    const userId = session.user.id

    const income = await prisma.income.create({
      data: {
        label: data.label,
        amount: data.amount,
        incomeDate: data.incomeDate,
        incomeTypeId: data.incomeTypeId,
        notes: data.notes,
        organizationId,
        userId,
        assignments: {
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

    return NextResponse.json(income, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating income:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to create income: ${errorMessage}` },
      { status: 500 }
    )
  }
}
