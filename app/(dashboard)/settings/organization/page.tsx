import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrganizationContent } from "@/components/settings/organization-content";
import { getUserOrganizations } from "@/lib/organization-utils";

export default async function OrganizationSettingsPage() {
  const session = await auth();

  if (!session?.user?.currentOrganizationId || !session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  const [organization, userOrganizations] = await Promise.all([
    prisma.organization.findUnique({
      where: {
        id: session.user.currentOrganizationId,
      },
      include: {
        userOrganizations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    }),
    getUserOrganizations(session.user.id),
  ]);

  if (!organization) {
    return <div>Organization not found</div>;
  }

  const currentMembership = organization.userOrganizations.find(
    (m) => m.userId === session.user.id
  );

  return (
    <OrganizationContent
      organization={{
        id: organization.id,
        name: organization.name,
        joinCode: organization.joinCode,
        isPersonal: organization.isPersonal,
        createdAt: organization.createdAt.toISOString(),
      }}
      users={organization.userOrganizations.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        createdAt: m.user.createdAt.toISOString(),
      }))}
      currentUserId={session.user.id}
      currentUserRole={currentMembership?.role || "member"}
      allOrganizations={userOrganizations}
    />
  );
}
