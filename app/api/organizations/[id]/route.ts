import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyOrganizationMembership, isOrganizationOwner } from "@/lib/organization-utils";
import { z } from "zod";

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateOrgSchema.parse(body);

    // Verify ownership
    const isOwner = await isOrganizationOwner(session.user.id, id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Solo el dueño del espacio puede cambiarle el nombre" },
        { status: 403 }
      );
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: { name: data.name },
    });

    return NextResponse.json({
      id: organization.id,
      name: organization.name,
      isPersonal: organization.isPersonal,
      joinCode: organization.joinCode,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el espacio. Intentá de nuevo." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const isOwner = await isOrganizationOwner(session.user.id, id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Solo el dueño del espacio puede eliminarlo" },
        { status: 403 }
      );
    }

    // Check if user has other spaces — they need at least one to stay in the app
    const userOrgCount = await prisma.userOrganization.count({
      where: { userId: session.user.id },
    });

    if (userOrgCount <= 1) {
      return NextResponse.json(
        { error: "No podés eliminar tu único espacio. Tenés que tener al menos uno." },
        { status: 400 }
      );
    }

    // Check if this is the active space
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    // Delete space (cascades to bills, billTypes, conversations, userOrganizations)
    await prisma.organization.delete({
      where: { id },
    });

    // If this was the active space, switch to another one
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

    return NextResponse.json({ message: "Espacio eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el espacio. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
