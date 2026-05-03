import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganizations, generateJoinCode } from "@/lib/organization-utils";
import { createDefaultCategories } from "@/lib/default-categories";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  isPersonal: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizations = await getUserOrganizations(session.user.id);

    return NextResponse.json(organizations);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createOrgSchema.parse(body);

    // Generate unique join code for shared orgs
    let joinCode: string | null = null;
    if (!data.isPersonal) {
      joinCode = generateJoinCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await prisma.organization.findUnique({
          where: { joinCode },
        });
        if (!existing) break;
        joinCode = generateJoinCode();
        attempts++;
      }
    }

    // Create organization and membership in transaction
    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name,
          isPersonal: data.isPersonal,
          joinCode,
        },
      });

      await tx.userOrganization.create({
        data: {
          userId: session.user.id,
          organizationId: org.id,
          role: "owner",
        },
      });

      // Create default categories for this organization
      await createDefaultCategories(tx, org.id);

      return org;
    });

    return NextResponse.json(
      {
        id: organization.id,
        name: organization.name,
        isPersonal: organization.isPersonal,
        joinCode: organization.joinCode,
        role: "owner",
        memberCount: 1,
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

    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
