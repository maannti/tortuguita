"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useTranslations } from "@/components/providers/language-provider";
import { Eye, EyeOff, User, Home, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type OrgChoice = "personal" | "create" | "join";

export function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Set<OrgChoice>>(new Set(["personal"]));
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations();

  const formSchema = z.object({
    name: z.string().min(1, t.auth.nameRequired),
    email: z.string().email(t.validation.invalidEmail),
    password: z.string().min(6, t.auth.passwordMinLength),
    sharedOrgName: z.string().optional(),
    joinCode: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      sharedOrgName: "",
      joinCode: "",
    },
  });

  function toggleChoice(choice: OrgChoice) {
    const newChoices = new Set(selectedChoices);
    if (newChoices.has(choice)) {
      // Don't allow removing if it's the last choice
      if (newChoices.size > 1) {
        newChoices.delete(choice);
      }
    } else {
      newChoices.add(choice);
    }
    setSelectedChoices(newChoices);
  }

  function translateError(error: string): string {
    const errorMap: Record<string, string> = {
      "User with this email already exists": t.errors.userAlreadyExists,
      "Invalid join code. Please check and try again.": t.errors.invalidJoinCode,
      "Either home name or join code is required": t.errors.homeNameOrJoinCodeRequired,
      "Something went wrong": t.errors.somethingWentWrong,
      "At least one organization choice is required": t.errors.homeNameOrJoinCodeRequired,
      "Organization name is required": t.errors.homeNameOrJoinCodeRequired,
      "Join code is required": t.errors.invalidJoinCode,
    };
    return errorMap[error] || error;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    // Build organization choices array
    const organizationChoices: Array<
      { type: "personal" } | { type: "create"; name: string } | { type: "join"; joinCode: string }
    > = [];

    if (selectedChoices.has("personal")) {
      organizationChoices.push({ type: "personal" });
    }
    if (selectedChoices.has("create")) {
      if (!values.sharedOrgName?.trim()) {
        setError(t.errors.homeNameOrJoinCodeRequired);
        setIsLoading(false);
        return;
      }
      organizationChoices.push({ type: "create", name: values.sharedOrgName.trim() });
    }
    if (selectedChoices.has("join")) {
      if (!values.joinCode?.trim()) {
        setError(t.errors.invalidJoinCode);
        setIsLoading(false);
        return;
      }
      organizationChoices.push({ type: "join", joinCode: values.joinCode.trim().toUpperCase() });
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          organizationChoices,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(translateError(data.error) || t.errors.somethingWentWrong);
        setIsLoading(false);
        return;
      }

      // Sign in after successful signup
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setError(t.errors.accountCreatedButSignInFailed);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setError(t.errors.somethingWentWrong);
    } finally {
      setIsLoading(false);
    }
  }

  const orgOptions = [
    {
      id: "personal" as const,
      icon: User,
      title: t.settings.personalFinances,
      description: t.settings.personalFinancesDesc,
    },
    {
      id: "create" as const,
      icon: Home,
      title: t.settings.createSharedHome,
      description: t.settings.createSharedHomeDesc,
    },
    {
      id: "join" as const,
      icon: Users,
      title: t.settings.joinExistingHome,
      description: t.settings.joinExistingHomeDesc,
    },
  ];

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
              {error}
            </div>
          )}

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.common.name}</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" autoComplete="name" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.common.email}</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" type="email" autoComplete="email" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.common.password}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      disabled={isLoading}
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>{t.settings.chooseOrganizations}</Label>
            <div className="grid gap-2">
              {orgOptions.map((option) => {
                const isSelected = selectedChoices.has(option.id);
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleChoice(option.id)}
                    disabled={isLoading}
                    className={cn(
                      "relative flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium">{option.title}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedChoices.has("create") && (
            <FormField
              control={form.control}
              name="sharedOrgName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.settings.organizationName}</FormLabel>
                  <FormControl>
                    <Input placeholder="Mi Hogar" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {selectedChoices.has("join") && (
            <FormField
              control={form.control}
              name="joinCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.settings.joinCode}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="XXXXXXXX"
                      disabled={isLoading}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? t.auth.signingUp : t.auth.signUp}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.alreadyHaveAccount}{" "}
        <Link href="/login" className="underline underline-offset-4 hover:text-primary">
          {t.auth.signIn}
        </Link>
      </p>
    </div>
  );
}
