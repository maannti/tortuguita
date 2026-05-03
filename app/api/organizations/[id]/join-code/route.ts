import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  generateJoinCode,
  isOrganizationOwner,
} from "@/lib/organization-utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Only organization owners can rotate the join code
    const isOwner = await isOrganizationOwner(session.user.id, id)
    if (!isOwner) {
      return NextResponse.json(
        { error: "Only organization owners can regenerate the join code" },
        { status: 403 }
      )
    }

    // Personal organizations cannot have join codes
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { isPersonal: true },
    })
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }
    if (org.isPersonal) {
      return NextResponse.json(
        { error: "Personal organizations do not have join codes" },
        { status: 400 }
      )
    }

    // Generate a unique join code
    let joinCode = generateJoinCode()
    let attempts = 0
    const maxAttempts = 10

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
