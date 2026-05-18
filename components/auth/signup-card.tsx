"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { SignupForm } from "./signup-form";
import Link from "next/link";
import { LogoWordmark } from "@/components/ui/logo";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function SignupCard() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="space-y-7">
      {/* Hero */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p
          className="text-sm font-medium"
          style={{ color: "#9D8189", fontFamily: "var(--font-fraunces, serif)", fontStyle: "italic" }}
        >
          Crear cuenta en
        </p>
        <LogoWordmark size="lg" />
        <p className="text-xs mt-1" style={{ color: "#9D8189" }}>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold underline underline-offset-4" style={{ color: "#6B5159" }}>
            Iniciá sesión
          </Link>
        </p>
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
        className="w-full flex items-center justify-center gap-2.5 rounded-full py-3.5 text-sm font-semibold bg-white shadow-sm border border-[#E8DDE0] text-[#4A3540] transition-all active:scale-[0.98] disabled:opacity-60"
      >
        <GoogleIcon />
        {isGoogleLoading ? "Redirigiendo..." : "Continuar con Google"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#4A3540]/10" />
        <span className="text-xs font-medium" style={{ color: "#9D8189" }}>o con tu email</span>
        <div className="flex-1 h-px bg-[#4A3540]/10" />
      </div>

      {/* Form */}
      <SignupForm />
    </div>
  );
}
