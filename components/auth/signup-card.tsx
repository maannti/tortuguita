"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "./signup-form";
import { useTranslations } from "@/components/providers/language-provider";

export function SignupCard() {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{t.auth.createAccount}</CardTitle>
        <CardDescription>{t.auth.signUpDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
