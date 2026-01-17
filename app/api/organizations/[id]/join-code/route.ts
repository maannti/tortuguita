import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateJoinCode } from "@/lib/join-code"

export async function POST(
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

    // Verify user belongs to this organization
    if (session.user.organizationId !== id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Generate a unique join code
    let joinCode = generateJoinCode()
    let attempts = 0
    const maxAttempts = 10

    // Ensure the code is unique
    while (attempts < maxAttempts) {
      const existing = await prisma.organization.findUnique({
        where: { joinCode },
      })

      if (!existing) {
        break
      }

      joinCode = generateJoinCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Failed to generate unique join code" },
        { status: 500 }
      )
    }

    // Update organization with the new join code
    const organization = await prisma.organization.update({
      where: { id },
      data: { joinCode },
    })

    return NextResponse.json({ joinCode: organization.joinCode })
  } catch (error) {
    console.error("Error generating join code:", error)
    return NextResponse.json(
      { error: "Failed to generate join code" },
      { status: 500 }
    )
  }
}
