export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Gradient background using the app's green color palette */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(153,20%,10%)] via-[hsl(134,22%,20%)] to-[hsl(122,20%,25%)]" />

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large glowing orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-t from-[hsl(84,22%,45%,0.3)] to-[hsl(122,20%,42%,0.1)] blur-3xl" />
        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[hsl(153,20%,8%)] to-transparent" />
        {/* Subtle stars/dots */}
        <div className="absolute top-20 right-20 w-1 h-1 bg-white/40 rounded-full" />
        <div className="absolute top-40 right-40 w-0.5 h-0.5 bg-white/30 rounded-full" />
        <div className="absolute top-32 left-1/4 w-1 h-1 bg-white/20 rounded-full" />
        <div className="absolute top-60 right-1/3 w-0.5 h-0.5 bg-white/25 rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  )
}
