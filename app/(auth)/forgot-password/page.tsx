"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useTranslations } from "@/components/providers/language-provider";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const t = useTranslations();

  const formSchema = z.object({
    email: z.string().email(t.validation.invalidEmail),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      setIsSubmitted(true);
    } catch (error) {
      // Still show success to prevent email enumeration
      setIsSubmitted(true);
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
          <h1 className="text-2xl font-bold text-white">{t.auth.forgotPasswordTitle}</h1>
          <p className="text-sm text-white/60">{t.auth.forgotPasswordDescription}</p>
        </div>

        {isSubmitted ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <CheckCircle className="h-12 w-12 text-green-400" />
              <p className="text-center text-sm text-white/80">
                {t.auth.resetLinkSent}
              </p>
            </div>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white rounded-full py-5 backdrop-blur-sm transition-all"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.auth.backToLogin}
              </Button>
            </Link>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                          className="w-full bg-transparent border-0 border-b border-white/30 px-0 py-3 text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none focus:ring-0 transition-colors pr-8"
                          {...field}
                        />
                        <Mail className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
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
                {isLoading ? t.auth.sendingResetLink : t.auth.sendResetLink}
              </Button>
            </form>
          </Form>
        )}

        {!isSubmitted && (
          <p className="text-center text-sm text-white/60">
            <Link href="/login" className="text-white underline underline-offset-4 hover:text-white/80 transition-colors">
              {t.auth.backToLogin}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
