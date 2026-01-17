import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { billTypeSchema } from "@/lib/validations/bill-type"
import { z } from "zod"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const billTypes = await prisma.billType.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(billTypes)
  } catch (error) {
    console.error("Error fetching bill types:", error)
    return NextResponse.json(
      { error: "Failed to fetch bill types" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = billTypeSchema.parse(body)

    const billType = await prisma.billType.create({
      data: {
        ...data,
        organizationId: session.user.organizationId,
      },
    })

    return NextResponse.json(billType, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error creating bill type:", error)
    return NextResponse.json(
      { error: "Failed to create bill type" },
      { status: 500 }
    )
  }
}
