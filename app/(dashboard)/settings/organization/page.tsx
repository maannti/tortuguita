import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { JoinCodeCard } from "@/components/organization/join-code-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function OrganizationSettingsPage() {
  const session = await auth()

  if (!session?.user?.organizationId) {
    return <div>Unauthorized</div>
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
  })

  if (!organization) {
    return <div>Organization not found</div>
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization and invite members
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Information about your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Organization Name</label>
            <p className="text-lg mt-1">{organization.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Created</label>
            <p className="text-lg mt-1">
              {new Date(organization.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Total Members</label>
            <p className="text-lg mt-1">{organization.users.length}</p>
          </div>
        </CardContent>
      </Card>

      <JoinCodeCard
        organizationId={organization.id}
        initialJoinCode={organization.joinCode}
      />

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            People who have access to this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {organization.users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between py-3 border-b last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.image || ""} alt={user.name || ""} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  {user.id === session.user.id && (
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      You
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
