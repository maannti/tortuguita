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

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations();

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
        router.push("/ai");
        router.refresh();
      }
    } catch (error) {
      setError(t.auth.invalidCredentials);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
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
                    <Mail className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
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
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <Lock className="h-4 w-4 text-white/40" />
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
