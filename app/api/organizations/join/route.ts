import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const joinSchema = z.object({
  joinCode: z.string().min(1).max(10),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = joinSchema.parse(body);

    // Find organization by join code
    const organization = await prisma.organization.findUnique({
      where: { joinCode: data.joinCode.toUpperCase() },
      include: {
        _count: {
          select: { userOrganizations: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Invalid join code" },
        { status: 404 }
      );
    }

    // Check if personal org
    if (organization.isPersonal) {
      return NextResponse.json(
        { error: "Cannot join a personal organization" },
        { status: 400 }
      );
    }

    // Check if already a member
    const existingMembership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: organization.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "You are already a member of this organization" },
        { status: 400 }
      );
    }

    // Create membership
    await prisma.userOrganization.create({
      data: {
        userId: session.user.id,
        organizationId: organization.id,
        role: "member",
      },
    });

    return NextResponse.json({
      id: organization.id,
      name: organization.name,
      isPersonal: organization.isPersonal,
      joinCode: organization.joinCode,
      role: "member",
      memberCount: organization._count.userOrganizations + 1,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Error joining organization:", error);
    return NextResponse.json(
      { error: "Failed to join organization" },
      { status: 500 }
    );
  }
}
