"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { useTranslations } from "@/components/providers/language-provider";

export function LoginCard() {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{t.auth.welcomeBack}</CardTitle>
        <CardDescription>{t.auth.signInDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
