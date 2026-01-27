import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { incomeTypeSchema } from "@/lib/validations/income-type"
import { z } from "zod"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.currentOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const incomeTypes = await prisma.incomeType.findMany({
      where: {
        organizationId: session.user.currentOrganizationId,
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(incomeTypes)
  } catch (error) {
    console.error("Error fetching income types:", error)
    return NextResponse.json(
      { error: "Failed to fetch income types" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.currentOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = incomeTypeSchema.parse(body)

    const incomeType = await prisma.incomeType.create({
      data: {
        ...data,
        organizationId: session.user.currentOrganizationId,
      },
    })

    return NextResponse.json(incomeType, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating income type:", error)
    return NextResponse.json(
      { error: "Failed to create income type" },
      { status: 500 }
    )
  }
}
