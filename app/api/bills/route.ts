import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { billSchema } from "@/lib/validations/bill"
import { z } from "zod"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const billTypeId = searchParams.get("billTypeId")
    const userId = searchParams.get("userId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: Prisma.BillWhereInput = {
      organizationId: session.user.organizationId,
    }

    if (billTypeId) {
      where.billTypeId = billTypeId
    }

    if (userId) {
      where.userId = userId
    }

    if (startDate || endDate) {
      where.paymentDate = {}
      if (startDate) {
        where.paymentDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.paymentDate.lte = new Date(endDate)
      }
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        billType: true,
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
        paymentDate: "desc",
      },
    })

    return NextResponse.json(bills)
  } catch (error) {
    console.error("Error fetching bills:", error)
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.organizationId || !session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = billSchema.parse(body)

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

    // Verify all assigned users belong to organization
    if (data.assignments && data.assignments.length > 0) {
      const userIds = data.assignments.map((a) => a.userId)
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          organizationId: session.user.organizationId,
        },
      })

      if (users.length !== userIds.length) {
        return NextResponse.json(
          { error: "Invalid user assignments" },
          { status: 400 }
        )
      }
    }

    const bill = await prisma.bill.create({
      data: {
        label: data.label,
        amount: data.amount,
        paymentDate: data.paymentDate,
        dueDate: data.dueDate || null,
        billTypeId: data.billTypeId,
        notes: data.notes,
        organizationId: session.user.organizationId,
        userId: session.user.id,
        assignments: {
          create: data.assignments?.map((assignment) => ({
            userId: assignment.userId,
            percentage: assignment.percentage,
          })),
        },
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

    return NextResponse.json(bill, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating bill:", error)
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    )
  }
}
