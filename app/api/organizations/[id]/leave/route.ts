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
        { error: "You are not a member of this organization" },
        { status: 404 }
      );
    }

    // Check if owner - owners cannot leave
    if (membership.role === "owner") {
      return NextResponse.json(
        { error: "Owners cannot leave the organization. Transfer ownership or delete the organization instead." },
        { status: 400 }
      );
    }

    // Check if user has other organizations
    const userOrgCount = await prisma.userOrganization.count({
      where: { userId: session.user.id },
    });

    if (userOrgCount <= 1) {
      return NextResponse.json(
        { error: "Cannot leave your last organization. You must have at least one organization." },
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

    return NextResponse.json({ message: "Left organization successfully" });
  } catch (error) {
    console.error("Error leaving organization:", error);
    return NextResponse.json(
      { error: "Failed to leave organization" },
      { status: 500 }
    );
  }
}
