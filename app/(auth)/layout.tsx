export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-5 py-12"
      style={{
        background: "linear-gradient(to bottom, #D8E2DC 0%, #FFFFFF 30%, #FFE5D9 55%, #FFCAD4 75%, #F4ACB7 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
