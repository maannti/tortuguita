import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateJoinCode } from "@/lib/organization-utils";
import {
  clientIdFromRequest,
  limiters,
  rateLimitOrError,
} from "@/lib/rate-limit";

const organizationChoiceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("personal"),
  }),
  z.object({
    type: z.literal("create"),
    name: z.string().min(1, "Organization name is required").max(100),
  }),
  z.object({
    type: z.literal("join"),
    joinCode: z.string().min(1, "Join code is required").max(20),
  }),
]);

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  // Cap the array so a single signup can't try to join 1000 orgs at once. (B4)
  organizationChoices: z
    .array(organizationChoiceSchema)
    .min(1, "Tenés que elegir al menos un espacio")
    .max(5, "Demasiados espacios elegidos"),
});

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimitOrError(
      clientIdFromRequest(request),
      limiters.signup,
    );
    if (limited) return limited;

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
            { error: "No te podés unir a un espacio personal" },
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
