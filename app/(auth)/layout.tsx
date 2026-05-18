export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-5 py-12"
      style={{
        background: "linear-gradient(to bottom, #FFFFFF 0%, #D8E2DC 20%, #FFE5D9 40%, #FFCAD4 60%, #F4ACB7 78%, #9D8189 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
