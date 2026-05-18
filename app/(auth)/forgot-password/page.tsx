"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { LogoWordmark } from "@/components/ui/logo";
import { CheckCircle } from "lucide-react";

const INPUT_CLASS = "w-full rounded-2xl border border-[#E8DDE0] bg-white/80 px-4 py-3.5 text-sm text-[#4A3540] placeholder:text-[#9D8189]/60 focus:outline-none focus:border-[#9D8189] transition-colors"

const formSchema = z.object({
  email: z.string().email("Ingresá un email válido"),
});

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
    } catch {}
    // Always show success to prevent email enumeration
    setIsSubmitted(true);
    setIsLoading(false);
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p
          className="text-sm font-medium"
          style={{ color: "#9D8189", fontFamily: "var(--font-fraunces, serif)", fontStyle: "italic" }}
        >
          Restablecer contraseña en
        </p>
        <LogoWordmark size="lg" />
      </div>

      {isSubmitted ? (
        <div className="space-y-5 text-center">
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="size-10" style={{ color: "#9D8189" }} />
            <div>
              <p className="font-medium text-sm" style={{ color: "#4A3540" }}>¡Listo! Revisá tu correo</p>
              <p className="text-xs mt-1" style={{ color: "#9D8189" }}>
                Si existe una cuenta con ese email, te enviamos un enlace para restablecer tu contraseña.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="block w-full text-center rounded-full py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
            style={{ background: "#4A3540" }}
          >
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-center" style={{ color: "#9D8189" }}>
            Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input
                        type="email"
                        placeholder="tu@email.com"
                        autoComplete="email"
                        disabled={isLoading}
                        className={INPUT_CLASS}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-500 px-1" />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: "#4A3540" }}
              >
                {isLoading ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          </Form>

          <p className="text-center text-xs" style={{ color: "#9D8189" }}>
            <Link href="/login" className="font-semibold underline underline-offset-4" style={{ color: "#6B5159" }}>
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
