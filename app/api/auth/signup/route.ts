import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateJoinCode } from "@/lib/organization-utils";

const organizationChoiceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("personal"),
  }),
  z.object({
    type: z.literal("create"),
    name: z.string().min(1, "Organization name is required"),
  }),
  z.object({
    type: z.literal("join"),
    joinCode: z.string().min(1, "Join code is required"),
  }),
]);

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  organizationChoices: z.array(organizationChoiceSchema).min(1, "At least one organization choice is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, organizationChoices } = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Validate join codes before creating anything
    for (const choice of organizationChoices) {
      if (choice.type === "join") {
        const org = await prisma.organization.findUnique({
          where: { joinCode: choice.joinCode.toUpperCase() },
        });
        if (!org) {
          return NextResponse.json(
            { error: "Invalid join code. Please check and try again." },
            { status: 400 }
          );
        }
        if (org.isPersonal) {
          return NextResponse.json(
            { error: "Cannot join a personal organization" },
            { status: 400 }
          );
        }
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user and organizations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user first (without organization)
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      let firstOrgId: string | null = null;

      // Process each organization choice
      for (const choice of organizationChoices) {
        let orgId: string;

        if (choice.type === "personal") {
          // Create personal organization
          const org = await tx.organization.create({
            data: {
              name: `${name} Personal`,
              isPersonal: true,
              // No joinCode for personal orgs
            },
          });
          orgId = org.id;

          // Create membership as owner
          await tx.userOrganization.create({
            data: {
              userId: user.id,
              organizationId: orgId,
              role: "owner",
            },
          });
        } else if (choice.type === "create") {
          // Generate unique join code
          let joinCode = generateJoinCode();
          let attempts = 0;
          while (attempts < 10) {
            const existing = await tx.organization.findUnique({
              where: { joinCode },
            });
            if (!existing) break;
            joinCode = generateJoinCode();
            attempts++;
          }

          // Create shared organization
          const org = await tx.organization.create({
            data: {
              name: choice.name,
              isPersonal: false,
              joinCode,
            },
          });
          orgId = org.id;

          // Create membership as owner
          await tx.userOrganization.create({
            data: {
              userId: user.id,
              organizationId: orgId,
              role: "owner",
            },
          });
        } else {
          // Join existing organization
          const org = await tx.organization.findUnique({
            where: { joinCode: choice.joinCode.toUpperCase() },
          });

          if (!org) {
            throw new Error("Invalid join code");
          }

          orgId = org.id;

          // Create membership as member
          await tx.userOrganization.create({
            data: {
              userId: user.id,
              organizationId: orgId,
              role: "member",
            },
          });
        }

        // Set first org as current
        if (!firstOrgId) {
          firstOrgId = orgId;
        }
      }

      // Update user with current organization
      if (firstOrgId) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            currentOrganizationId: firstOrgId,
            organizationId: firstOrgId, // Keep legacy field for compatibility
          },
        });
      }

      return { user };
    });

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
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Invalid join code") {
      return NextResponse.json(
        { error: "Invalid join code. Please check and try again." },
        { status: 400 }
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
