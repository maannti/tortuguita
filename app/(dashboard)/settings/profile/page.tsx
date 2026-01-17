import { auth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function ProfileSettingsPage() {
  const session = await auth()

  if (!session?.user) {
    return <div>Unauthorized</div>
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
              <AvatarFallback className="text-2xl">
                {getInitials(session.user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Profile Picture</p>
              <p className="text-sm text-muted-foreground">
                {session.user.image ? "Provided by OAuth" : "Using default avatar"}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Name</label>
            <p className="text-lg mt-1">{session.user.name}</p>
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-lg mt-1">{session.user.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
