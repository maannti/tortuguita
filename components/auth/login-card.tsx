"use client";

import { LoginForm } from "./login-form";
import { useTranslations } from "@/components/providers/language-provider";

function TurtleLogoAuth() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turtle SVG */}
      <svg width="72" height="72" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="38" cy="44" rx="22" ry="16" fill="#C4A8AE" />
        <ellipse cx="38" cy="40" rx="17" ry="13" fill="#F4ACB7" />
        <path d="M38 27 C38 27 28 33 26 40 C30 40 46 40 50 40 C48 33 38 27 38 27Z" fill="#FFCAD4" opacity="0.6" />
        <line x1="38" y1="27" x2="38" y2="40" stroke="#9D8189" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="26" y1="40" x2="50" y2="40" stroke="#9D8189" strokeWidth="1" strokeOpacity="0.4" />
        <ellipse cx="57" cy="38" rx="7" ry="6" fill="#C4A8AE" />
        <circle cx="60" cy="36" r="1.5" fill="#6B5159" />
        <circle cx="60.5" cy="35.5" r="0.5" fill="white" />
        <path d="M58 39.5 Q60 41 62 39.5" stroke="#6B5159" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <ellipse cx="52" cy="55" rx="5" ry="4" fill="#C4A8AE" transform="rotate(-20 52 55)" />
        <ellipse cx="22" cy="56" rx="5" ry="4" fill="#C4A8AE" transform="rotate(20 22 56)" />
        <path d="M18 46 Q10 48 8 52" stroke="#C4A8AE" strokeWidth="4" strokeLinecap="round" fill="none" />
      </svg>
      {/* Wordmark */}
      <div className="text-center">
        <span
          style={{ fontFamily: "var(--font-fraunces, serif)", letterSpacing: "-0.01em" }}
          className="text-3xl font-medium text-white"
        >
          <span style={{ color: "#FFCAD4" }}>tortu</span>
          <span style={{ color: "#F4ACB7", fontStyle: "italic" }}>guita</span>
        </span>
      </div>
    </div>
  );
}

export function LoginCard() {
  const t = useTranslations();

  return (
    <div className="relative px-7 py-8 rounded-3xl border border-white/15 bg-white/8 backdrop-blur-xl shadow-2xl">
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-7">
        {/* Logo */}
        <div className="flex justify-center pt-2">
          <TurtleLogoAuth />
        </div>

        {/* Form */}
        <LoginForm />
      </div>
    </div>
  );
}
