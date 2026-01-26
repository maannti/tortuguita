import { prisma } from "@/lib/prisma";

export async function verifyOrganizationMembership(
  userId: string,
  organizationId: string
) {
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  return membership;
}

export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.userOrganization.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          _count: {
            select: { userOrganizations: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    isPersonal: m.organization.isPersonal,
    joinCode: m.organization.joinCode,
    role: m.role,
    memberCount: m.organization._count.userOrganizations,
    joinedAt: m.joinedAt.toISOString(),
  }));
}

export async function canUserAccessOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await verifyOrganizationMembership(userId, organizationId);
  return !!membership;
}

export async function isOrganizationOwner(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await verifyOrganizationMembership(userId, organizationId);
  return membership?.role === "owner";
}

export function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
