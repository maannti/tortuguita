import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrganizationContent } from "@/components/settings/organization-content";

export default async function OrganizationSettingsPage() {
  const session = await auth();

  if (!session?.user?.organizationId) {
    return <div>Unauthorized</div>;
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: session.user.organizationId,
    },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!organization) {
    return <div>Organization not found</div>;
  }

  return (
    <OrganizationContent
      organization={{
        id: organization.id,
        name: organization.name,
        joinCode: organization.joinCode,
        createdAt: organization.createdAt.toISOString(),
      }}
      users={organization.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        createdAt: u.createdAt.toISOString(),
      }))}
      currentUserId={session.user.id}
    />
  );
}
