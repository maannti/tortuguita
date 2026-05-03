import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrganizationContent } from "@/components/settings/organization-content";
import { IncomeSettings } from "@/components/settings/income-settings";
import { SettingsBackHeader } from "@/components/settings/settings-back-header";
import { getUserOrganizations } from "@/lib/organization-utils";
import { startOfMonth, endOfMonth } from "date-fns";

export default async function OrganizationSettingsPage() {
  const session = await auth();

  if (!session?.user?.currentOrganizationId || !session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  const orgId = session.user.currentOrganizationId;
  const now = new Date();

  const [organization, userOrganizations, memberIncomeRows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        userOrganizations: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, createdAt: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    }),
    getUserOrganizations(session.user.id),
    prisma.income.groupBy({
      by: ["userId"],
      where: {
        organizationId: orgId,
        incomeDate: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      _sum: { amount: true },
    }),
  ]);

  if (!organization) return <div>Organization not found</div>;

  const currentMembership = organization.userOrganizations.find(
    (m) => m.userId === session.user.id
  );

  const members = organization.userOrganizations.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));

  const initialIncomes = memberIncomeRows.reduce(
    (acc: Record<string, number>, row) => {
      acc[row.userId] = Number(row._sum.amount || 0);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6 p-4 pb-24">
      <SettingsBackHeader title="Configuración" />
      <IncomeSettings members={members} initialIncomes={initialIncomes} />

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
    </div>
  );
}
