"use client";

import Image from "next/image";
import { LoginForm } from "./login-form";
import { useTranslations } from "@/components/providers/language-provider";

export function LoginCard() {
  const t = useTranslations();

  return (
    <div className="relative p-8 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/logo-dark.svg"
            alt="Logo"
            width={280}
            height={280}
            className="drop-shadow-lg"
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white text-center">{t.auth.login}</h1>

        {/* Form */}
        <LoginForm />
      </div>
    </div>
  );
}
