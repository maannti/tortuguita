"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

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

const INPUT_CLASS = "w-full rounded-full border border-[#E8DDE0] bg-white/80 px-4 py-3.5 text-sm text-[#4A3540] placeholder:text-[#9D8189]/60 focus:outline-none focus:border-[#9D8189] transition-colors"
const BTN_PRIMARY = "w-full flex items-center justify-center gap-2.5 rounded-full py-3.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60"

export function LoginForm() {
  const { push, refresh } = useRouter();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    setError(null);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Ingresá un email válido");
      return;
    }
    setError(null);
    setStep("password");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setError("Ingresá tu contraseña"); return }
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Email o contraseña incorrectos. ¿No tenés cuenta? Registrate abajo.");
      } else {
        push("/dashboard");
        refresh();
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isLoading}
        className={`${BTN_PRIMARY} bg-white shadow-sm border border-[#E8DDE0] text-[#4A3540]`}
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

      {/* Email / password steps */}
      <form onSubmit={step === "email" ? handleContinue : handleSignIn} className="space-y-3">
        {/* Email — always visible */}
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            placeholder="tu@email.com"
            autoComplete="email"
            disabled={step === "password" || isLoading}
            className={`${INPUT_CLASS} ${step === "password" ? "opacity-50 cursor-default" : ""}`}
          />
          {step === "password" && (
            <button
              type="button"
              onClick={() => { setStep("email"); setPassword(""); setError(null) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
              style={{ color: "#9D8189" }}
            >
              cambiar
            </button>
          )}
        </div>

        {/* Password — slides in */}
        {step === "password" && (
          <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              placeholder="Contraseña"
              autoComplete="current-password"
              autoFocus
              disabled={isLoading}
              className={`${INPUT_CLASS} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "#9D8189" }}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 px-1">{error}</p>
        )}

        {/* CTA */}
        <button
          type="submit"
          disabled={isLoading}
          className={`${BTN_PRIMARY} mt-1 text-white`}
          style={{ background: "#4A3540" }}
        >
          {isLoading ? "Ingresando..." : step === "email" ? "Continuar" : "Ingresar"}
        </button>
      </form>

      {/* Footer links */}
      <div className="flex flex-col items-center gap-1.5 pt-1">
        {step === "password" && (
          <Link
            href="/forgot-password"
            className="text-xs transition-colors"
            style={{ color: "#9D8189" }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        )}
        <p className="text-xs" style={{ color: "#9D8189" }}>
          ¿No tenés cuenta?{" "}
          <Link href="/signup" className="font-semibold underline underline-offset-4" style={{ color: "#6B5159" }}>
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
