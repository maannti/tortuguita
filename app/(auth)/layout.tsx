export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-dvh overflow-y-auto relative">
      {/* Background — fixed so it doesn't scroll */}
      <div className="fixed inset-0 bg-gradient-to-br from-[hsl(345,18%,12%)] via-[hsl(343,16%,20%)] to-[hsl(351,22%,28%)]" />

      {/* Decorative blobs — fixed */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#F4ACB7]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 size-72 rounded-full bg-[#D8E2DC]/8 blur-3xl" />
        <div className="absolute top-0 right-0 size-64 rounded-full bg-[#FFE5D9]/8 blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[hsl(345,18%,8%)] to-transparent" />
        <div className="absolute top-16 right-16 size-1 bg-white/30 rounded-full" />
        <div className="absolute top-36 right-36 size-0.5 bg-white/20 rounded-full" />
        <div className="absolute top-28 left-1/4 size-1 bg-white/15 rounded-full" />
        <div className="absolute top-56 right-1/3 size-0.5 bg-white/20 rounded-full" />
        <div className="absolute bottom-32 left-16 size-1 bg-[#F4ACB7]/40 rounded-full" />
      </div>

      {/* Content — scrolls within h-dvh container */}
      <div className="relative z-10 flex min-h-full flex-col items-center justify-center p-4 pt-10"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2.5rem)" }}>
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
