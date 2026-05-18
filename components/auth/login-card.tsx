"use client";

import { LoginForm } from "./login-form";
import { LogoWordmark } from "@/components/ui/logo";

export function LoginCard() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p
          className="text-sm font-medium"
          style={{ color: "#9D8189", fontFamily: "var(--font-fraunces, serif)", fontStyle: "italic" }}
        >
          Bienvenido a
        </p>
        <LogoWordmark size="lg" />
      </div>

      {/* Form */}
      <LoginForm />
    </div>
  );
}
