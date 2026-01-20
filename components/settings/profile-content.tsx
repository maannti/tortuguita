"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "@/components/providers/language-provider";
import { LanguageSettings } from "./language-settings";

interface ProfileContentProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function ProfileContent({ user }: ProfileContentProps) {
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.settings.profileSettings}</h1>
        <p className="text-muted-foreground">{t.settings.profileDescription}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.profileInformation}</CardTitle>
          <CardDescription>{t.settings.yourPersonalDetails}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.image || ""} alt={user.name || ""} />
              <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Profile Picture</p>
              <p className="text-sm text-muted-foreground">
                {user.image ? "Provided by OAuth" : "Using default avatar"}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">{t.common.name}</label>
            <p className="text-lg mt-1">{user.name}</p>
          </div>

          <div>
            <label className="text-sm font-medium">{t.common.email}</label>
            <p className="text-lg mt-1">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <LanguageSettings />
    </div>
  );
}
