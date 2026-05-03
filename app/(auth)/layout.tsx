export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Warm mauve-to-blush gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(345,18%,12%)] via-[hsl(343,16%,20%)] to-[hsl(351,22%,28%)]" />

      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Soft rose orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#F4ACB7]/10 blur-3xl" />
        {/* Sage accent bottom-left */}
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[#D8E2DC]/8 blur-3xl" />
        {/* Peach accent top-right */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#FFE5D9]/8 blur-3xl" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[hsl(345,18%,8%)] to-transparent" />
        {/* Subtle sparkle dots */}
        <div className="absolute top-16 right-16 w-1 h-1 bg-white/30 rounded-full" />
        <div className="absolute top-36 right-36 w-0.5 h-0.5 bg-white/20 rounded-full" />
        <div className="absolute top-28 left-1/4 w-1 h-1 bg-white/15 rounded-full" />
        <div className="absolute top-56 right-1/3 w-0.5 h-0.5 bg-white/20 rounded-full" />
        <div className="absolute bottom-32 left-16 w-1 h-1 bg-[#F4ACB7]/40 rounded-full" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {children}
      </div>
    </div>
  )
}
