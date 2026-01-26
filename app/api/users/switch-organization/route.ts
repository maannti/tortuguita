import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyOrganizationMembership } from "@/lib/organization-utils";
import { z } from "zod";

const switchOrgSchema = z.object({
  organizationId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = switchOrgSchema.parse(body);

    // Verify membership
    const membership = await verifyOrganizationMembership(
      session.user.id,
      data.organizationId
    );

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

    // Update user's current organization
    await prisma.user.update({
      where: { id: session.user.id },
      data: { currentOrganizationId: data.organizationId },
    });

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: data.organizationId },
    });

    return NextResponse.json({
      currentOrganizationId: data.organizationId,
      organization: {
        id: organization?.id,
        name: organization?.name,
        isPersonal: organization?.isPersonal,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Error switching organization:", error);
    return NextResponse.json(
      { error: "Failed to switch organization" },
      { status: 500 }
    );
  }
}
