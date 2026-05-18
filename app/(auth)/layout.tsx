export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-5 py-12"
      style={{
        background: "linear-gradient(to bottom, #FFFFFF 0%, #FFF9F9 22%, #FFE5D9 48%, #F4ACB7 66%, #9D8189 83%, #4A3540 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
