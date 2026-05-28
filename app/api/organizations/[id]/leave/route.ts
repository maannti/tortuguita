import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyOrganizationMembership, isOrganizationOwner } from "@/lib/organization-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify membership
    const membership = await verifyOrganizationMembership(session.user.id, id);
    if (!membership) {
      return NextResponse.json(
        { error: "No sos miembro de este espacio" },
        { status: 404 }
      );
    }

    // Check if owner - owners cannot leave
    if (membership.role === "owner") {
      return NextResponse.json(
        { error: "El dueño no puede salir del espacio. Transferí la propiedad o eliminá el espacio." },
        { status: 400 }
      );
    }

    // Check if user has other spaces — they need at least one to stay in the app
    const userOrgCount = await prisma.userOrganization.count({
      where: { userId: session.user.id },
    });

    if (userOrgCount <= 1) {
      return NextResponse.json(
        { error: "No podés salir de tu único espacio. Tenés que tener al menos uno." },
        { status: 400 }
      );
    }

    // Remove membership
    await prisma.userOrganization.delete({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: id,
        },
      },
    });

    // If this was the current org, switch to another org
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.currentOrganizationId === id) {
      const anotherOrg = await prisma.userOrganization.findFirst({
        where: { userId: session.user.id },
      });

      if (anotherOrg) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { currentOrganizationId: anotherOrg.organizationId },
        });
      }
    }

    return NextResponse.json({ message: "Saliste del espacio" });
  } catch (error) {
    console.error("Error leaving organization:", error);
    return NextResponse.json(
      { error: "No se pudo salir del espacio. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
