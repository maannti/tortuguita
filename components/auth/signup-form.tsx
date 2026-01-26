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
import Link from "next/link";
import { useTranslations } from "@/components/providers/language-provider";
import { Eye, EyeOff } from "lucide-react";

export function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations();

  const formSchema = z.object({
    name: z.string().min(1, t.auth.nameRequired),
    email: z.string().email(t.validation.invalidEmail),
    password: z.string().min(6, t.auth.passwordMinLength),
    organizationName: z.string().optional(),
    joinCode: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      organizationName: "",
      joinCode: "",
    },
  });

  function translateError(error: string): string {
    const errorMap: Record<string, string> = {
      "User with this email already exists": t.errors.userAlreadyExists,
      "Invalid join code. Please check and try again.": t.errors.invalidJoinCode,
      "Either home name or join code is required": t.errors.homeNameOrJoinCodeRequired,
      "Something went wrong": t.errors.somethingWentWrong,
    };
    return errorMap[error] || error;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      const payload = mode === "create" ? { ...values, joinCode: undefined } : { ...values, organizationName: undefined };

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <Button type="button" variant={mode === "create" ? "default" : "ghost"} className="flex-1 text-xs sm:text-sm truncate" onClick={() => setMode("create")}>
          {t.settings.createOrganization}
        </Button>
        <Button type="button" variant={mode === "join" ? "default" : "ghost"} className="flex-1 text-xs sm:text-sm truncate" onClick={() => setMode("join")}>
          {t.settings.joinOrganization}
        </Button>
      </div>

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
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "create" ? (
            <FormField
              control={form.control}
              name="organizationName"
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
          ) : (
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
