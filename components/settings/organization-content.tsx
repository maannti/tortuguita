"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { JoinCodeCard } from "@/components/organization/join-code-card";
import { useTranslations } from "@/components/providers/language-provider";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: string;
}

interface OrganizationContentProps {
  organization: {
    id: string;
    name: string;
    joinCode: string | null;
    createdAt: string;
  };
  users: User[];
  currentUserId: string;
}

export function OrganizationContent({ organization, users, currentUserId }: OrganizationContentProps) {
  const t = useTranslations();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.settings.organizationSettings}</h1>
        <p className="text-muted-foreground">{t.settings.organizationDescription}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.organizationDetails}</CardTitle>
          <CardDescription>{t.settings.organizationInfo}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t.settings.organizationName}</label>
            <p className="text-lg mt-1">{organization.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium">{t.settings.members}</label>
            <p className="text-lg mt-1">{users.length}</p>
          </div>
        </CardContent>
      </Card>

      <JoinCodeCard organizationId={organization.id} initialJoinCode={organization.joinCode} />

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.members}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
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
                  {user.id === currentUserId && (
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {t.common.you || "You"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
