"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import Link from "next/link";
import { useTranslations } from "@/components/providers/language-provider";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function LoginForm() {
  const { push, refresh } = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations();

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    setError(null);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  const formSchema = z.object({
    email: z.string().email(t.validation.invalidEmail),
    password: z.string().min(1, t.auth.passwordRequired),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setError(t.auth.invalidCredentials);
      } else {
        push("/dashboard");
        refresh();
      }
    } catch (error) {
      setError(t.auth.invalidCredentials);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Google sign-in */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isLoading}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 px-4 rounded-full transition-all shadow-lg hover:bg-white/90 active:scale-[0.98] disabled:opacity-60"
      >
        <GoogleIcon />
        {isGoogleLoading ? "Redirigiendo..." : "Continuar con Google"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/20" />
        <span className="text-xs text-white/40 font-medium">o con tu email</span>
        <div className="flex-1 h-px bg-white/20" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
              {error}
            </div>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder={t.common.email}
                      autoComplete="email"
                      disabled={isLoading}
                      className="auth-input w-full bg-transparent border-0 border-b border-white/30 px-0 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-0 transition-colors pr-8"
                      {...field}
                    />
                    <Mail className="absolute right-0 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                  </div>
                </FormControl>
                <FormMessage className="text-red-300" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t.common.password}
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="auth-input w-full bg-transparent border-0 border-b border-white/30 px-0 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-0 transition-colors pr-16"
                      {...field}
                    />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-white/40 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                      <Lock className="size-4 text-white/40" />
                    </div>
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
            {isLoading ? t.auth.signingIn : t.auth.signIn}
          </Button>
        </form>
      </Form>

      <div className="flex flex-col items-center gap-2 text-sm text-white/60">
        <Link href="/forgot-password" className="hover:text-white transition-colors">
          {t.auth.forgotPassword}
        </Link>
        <p>
          {t.auth.dontHaveAccount}{" "}
          <Link href="/signup" className="text-white underline underline-offset-4 hover:text-white/80 transition-colors">
            {t.auth.signUp}
          </Link>
        </p>
      </div>
    </div>
  );
}
