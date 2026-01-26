import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateToMultiOrg() {
  console.log("Starting multi-organization migration...");

  // Get all organizations with their users
  const organizations = await prisma.organization.findMany({
    include: {
      legacyUsers: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  console.log(`Found ${organizations.length} organizations to process`);

  for (const org of organizations) {
    console.log(`Processing organization: ${org.name} (${org.id})`);
    console.log(`  Users in organization: ${org.legacyUsers.length}`);

    for (let i = 0; i < org.legacyUsers.length; i++) {
      const user = org.legacyUsers[i];
      const role = i === 0 ? "owner" : "member"; // First user is owner

      // Check if UserOrganization already exists
      const existing = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: org.id,
          },
        },
      });

      if (existing) {
        console.log(`  Skipping user ${user.email} - already has membership`);
        continue;
      }

      // Create UserOrganization entry
      await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role,
        },
      });

      // Set currentOrganizationId if not already set
      if (!user.currentOrganizationId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { currentOrganizationId: org.id },
        });
      }

      console.log(`  Created membership for ${user.email} as ${role}`);
    }
  }

  // Handle users without any organization
  const orphanedUsers = await prisma.user.findMany({
    where: {
      organizationId: null,
      userOrganizations: { none: {} },
    },
  });

  console.log(`\nFound ${orphanedUsers.length} users without organizations`);

  for (const user of orphanedUsers) {
    console.log(`Creating personal organization for ${user.email}`);

    // Create personal organization
    const personalOrg = await prisma.organization.create({
      data: {
        name: `${user.name || "My"} Personal`,
        isPersonal: true,
        // No joinCode for personal orgs
      },
    });

    // Create membership
    await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: personalOrg.id,
        role: "owner",
      },
    });

    // Set as current organization
    await prisma.user.update({
      where: { id: user.id },
      data: { currentOrganizationId: personalOrg.id },
    });
  }

  console.log("\nMigration completed successfully!");
}

migrateToMultiOrg()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
