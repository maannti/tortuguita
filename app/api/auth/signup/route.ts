import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { generateJoinCode } from "@/lib/join-code"

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  organizationName: z.string().optional(),
  joinCode: z.string().optional(),
}).refine(
  (data) => data.organizationName || data.joinCode,
  {
    message: "Either organization name or join code is required",
    path: ["organizationName"],
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, organizationName, joinCode } = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create or join organization and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let organization

      if (joinCode) {
        // Join existing organization
        organization = await tx.organization.findUnique({
          where: { joinCode },
        })

        if (!organization) {
          throw new Error("Invalid join code")
        }
      } else if (organizationName) {
        // Create new organization with a join code
        const newJoinCode = generateJoinCode()

        organization = await tx.organization.create({
          data: {
            name: organizationName,
            joinCode: newJoinCode,
          },
        })
      } else {
        throw new Error("Either organization name or join code is required")
      }

      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          organizationId: organization.id,
        },
      })

      return { user, organization }
    })

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === "Invalid join code") {
      return NextResponse.json(
        { error: "Invalid join code. Please check and try again." },
        { status: 400 }
      )
    }

    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
