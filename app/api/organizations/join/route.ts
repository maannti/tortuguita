import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { limiters, rateLimitOrError } from "@/lib/rate-limit";

const joinSchema = z.object({
  joinCode: z.string().min(1).max(10),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Limit join-code attempts per user — the join code is 6 chars over a
    // 32-symbol alphabet, so this is what stops brute-forcing.
    const limited = rateLimitOrError(
      `user:${session.user.id}`,
      limiters.joinOrganization,
    );
    if (limited) return limited;

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
        { error: "Código de invitación inválido" },
        { status: 404 }
      );
    }

    // Check if personal space
    if (organization.isPersonal) {
      return NextResponse.json(
        { error: "No te podés unir a un espacio personal" },
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
        { error: "Ya sos miembro de este espacio" },
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
      { error: "No se pudo unir al espacio. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
