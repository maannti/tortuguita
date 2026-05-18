interface LogoProps {
  className?: string
  size?: number
  showWordmark?: boolean
}

export function TurtleLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  // Simplified side-profile turtle — works well at small sizes
  // All colors hardcoded (CSS vars don't always resolve in inline SVG fill)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Body */}
      <ellipse cx="22" cy="30" rx="14" ry="10" fill="#C4A8AE" />

      {/* Shell */}
      <ellipse cx="22" cy="24" rx="12" ry="9" fill="#F4ACB7" />
      {/* Shell — hexagonal plate pattern */}
      <polygon points="22,18 26,21 26,27 22,30 18,27 18,21" fill="#E898A8" stroke="#C87080" strokeWidth="0.7"/>
      <line x1="22" y1="18" x2="22" y2="15"       stroke="#C87080" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="26" y1="21" x2="30.5" y2="17.5"   stroke="#C87080" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="26" y1="27" x2="30.5" y2="30.5"   stroke="#C87080" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="22" y1="30" x2="22"   y2="33"      stroke="#C87080" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="18" y1="27" x2="13.5" y2="30.5"   stroke="#C87080" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="18" y1="21" x2="13.5" y2="17.5"   stroke="#C87080" strokeWidth="0.7" strokeLinecap="round"/>

      {/* Head */}
      <ellipse cx="34" cy="25" rx="5" ry="4" fill="#C4A8AE" />
      {/* Eye */}
      <circle cx="36" cy="23.5" r="1.2" fill="#6B5159" />
      <circle cx="36.4" cy="23.1" r="0.4" fill="white" />
      {/* Smile */}
      <path d="M34 27 Q35.5 28.2 37 27" stroke="#6B5159" strokeWidth="0.7" fill="none" strokeLinecap="round" />

      {/* Front flipper */}
      <ellipse cx="31" cy="36" rx="4" ry="3" fill="#C4A8AE" transform="rotate(-25 31 36)" />
      {/* Back flipper */}
      <ellipse cx="12" cy="37" rx="4" ry="3" fill="#C4A8AE" transform="rotate(20 12 37)" />

      {/* Tail */}
      <path d="M9 30 Q4 32 3 36" stroke="#C4A8AE" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function LogoWordmark({ className = "", size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  const turtleSize = size === "lg" ? 44 : 30
  const textSize = size === "lg" ? "1.75rem" : "1.2rem"
  const gap = size === "lg" ? "gap-3" : "gap-2"
  return (
    <div className={`flex items-center ${gap} ${className}`}>
      <TurtleLogo size={turtleSize} />
      <span
        style={{ fontFamily: "var(--font-fraunces, serif)", letterSpacing: "-0.02em", fontSize: textSize }}
        className="font-medium leading-none"
      >
        <span style={{ color: "#6B5159" }}>tortu</span>
        <span style={{ color: "#9D8189", fontStyle: "italic" }}>guita</span>
      </span>
    </div>
  )
}

export function Logo({ className = "", size = 36, showWordmark = true }: LogoProps) {
  if (showWordmark) return <LogoWordmark className={className} />
  return <TurtleLogo size={size} className={className} />
}
