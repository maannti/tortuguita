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

    // Check for multi-home distribution
    const multiHomeDistribution = body.multiHomeDistribution as Array<{
      organizationId: string
      percentage: number
    }> | undefined

    // Verify incomeType belongs to current organization
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
    const currentOrganizationId = session.user.currentOrganizationId
    const userId = session.user.id

    // Handle multi-home distribution
    if (multiHomeDistribution && multiHomeDistribution.length > 1) {
      // Verify user has access to all specified organizations
      const orgIds = multiHomeDistribution.map(d => d.organizationId)
      const memberships = await prisma.userOrganization.findMany({
        where: {
          userId,
          organizationId: { in: orgIds },
        },
      })

      if (memberships.length !== orgIds.length) {
        return NextResponse.json(
          { error: "You don't have access to all specified organizations" },
          { status: 403 }
        )
      }

      // Validate percentages sum to 100
      const totalPercentage = multiHomeDistribution.reduce((sum, d) => sum + d.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return NextResponse.json(
          { error: "Multi-home percentages must total 100%" },
          { status: 400 }
        )
      }

      // Create incomes in each organization within a transaction
      const createdIncomes = await prisma.$transaction(async (tx) => {
        const incomes = []

        for (const distribution of multiHomeDistribution) {
          const orgId = distribution.organizationId
          const percentage = distribution.percentage
          const proportionalAmount = Math.round((data.amount * percentage) / 100 * 100) / 100

          // Find or create a matching income type in the target organization
          let targetIncomeTypeId = data.incomeTypeId

          if (orgId !== currentOrganizationId) {
            // Try to find an income type with the same name in the target org
            let targetIncomeType = await tx.incomeType.findFirst({
              where: {
                organizationId: orgId,
                name: incomeType.name,
              },
            })

            // If not found, create one with the same properties
            if (!targetIncomeType) {
              targetIncomeType = await tx.incomeType.create({
                data: {
                  name: incomeType.name,
                  description: incomeType.description,
                  color: incomeType.color,
                  icon: incomeType.icon,
                  isRecurring: incomeType.isRecurring,
                  organizationId: orgId,
                },
              })
            }

            targetIncomeTypeId = targetIncomeType.id
          }

          // Create the income (without member assignments for non-current orgs)
          const income = await tx.income.create({
            data: {
              label: data.label,
              amount: proportionalAmount,
              incomeDate: data.incomeDate,
              incomeTypeId: targetIncomeTypeId,
              notes: data.notes ? `${data.notes} (${percentage}% of shared income)` : `${percentage}% of shared income`,
              organizationId: orgId,
              userId,
              // Only include assignments for the current organization
              assignments: orgId === currentOrganizationId && data.assignments ? {
                create: data.assignments.map((assignment) => ({
                  userId: assignment.userId,
                  percentage: assignment.percentage,
                })),
              } : undefined,
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

          incomes.push(income)
        }

        return incomes
      })

      // Return the income from the current organization
      const currentOrgIncome = createdIncomes.find(i => i.organizationId === currentOrganizationId)
      return NextResponse.json(currentOrgIncome || createdIncomes[0], { status: 201 })
    }

    // Single organization income (original behavior)
    const income = await prisma.income.create({
      data: {
        label: data.label,
        amount: data.amount,
        incomeDate: data.incomeDate,
        incomeTypeId: data.incomeTypeId,
        notes: data.notes,
        organizationId: currentOrganizationId,
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
