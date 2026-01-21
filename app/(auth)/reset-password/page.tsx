"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useTranslations } from "@/components/providers/language-provider";
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  const formSchema = z.object({
    password: z.string().min(6, t.auth.passwordMinLength),
    confirmPassword: z.string().min(1, t.auth.passwordRequired),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t.auth.passwordsDoNotMatch,
    path: ["confirmPassword"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token) {
      setError(t.auth.invalidResetToken);
    }
  }, [token, t.auth.invalidResetToken]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error === "Invalid or expired token" ? t.auth.invalidResetToken : data.error);
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      setError(t.auth.invalidResetToken);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative p-8 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={64}
            height={64}
            className="drop-shadow-lg"
          />
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">{t.auth.resetPasswordTitle}</h1>
          <p className="text-sm text-white/60">{t.auth.resetPasswordDescription}</p>
        </div>

        {isSuccess ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <CheckCircle className="h-12 w-12 text-green-400" />
              <p className="text-center text-sm text-white/80">
                {t.auth.passwordResetSuccess}
              </p>
            </div>
            <Link href="/login">
              <Button
                className="w-full bg-white text-gray-900 hover:bg-white/90 font-semibold py-5 rounded-full transition-all shadow-lg hover:shadow-xl"
              >
                {t.auth.signIn}
              </Button>
            </Link>
          </div>
        ) : error && !token ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-center text-sm text-red-300">
                {error}
              </p>
            </div>
            <Link href="/forgot-password">
              <Button
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white rounded-full py-5 backdrop-blur-sm transition-all"
              >
                {t.auth.forgotPasswordTitle}
              </Button>
            </Link>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="p-3 text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
                  {error}
                </div>
              )}

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder={t.auth.newPassword}
                          autoComplete="new-password"
                          disabled={isLoading}
                          className="w-full bg-transparent border-0 border-b border-white/30 px-0 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-0 transition-colors pr-8"
                          {...field}
                        />
                        <Lock className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-300" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder={t.auth.confirmPassword}
                          autoComplete="new-password"
                          disabled={isLoading}
                          className="w-full bg-transparent border-0 border-b border-white/30 px-0 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-0 transition-colors pr-8"
                          {...field}
                        />
                        <Lock className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-300" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-gray-900 hover:bg-white/90 font-semibold py-5 rounded-full transition-all shadow-lg hover:shadow-xl"
              >
                {isLoading ? t.auth.resettingPassword : t.auth.resetPassword}
              </Button>
            </form>
          </Form>
        )}

        {!isSuccess && token && (
          <p className="text-center text-sm text-white/60">
            <Link href="/login" className="text-white underline underline-offset-4 hover:text-white/80 transition-colors">
              <ArrowLeft className="inline-block mr-1 h-3 w-3" />
              {t.auth.backToLogin}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
