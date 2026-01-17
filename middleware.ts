export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/bills/:path*",
    "/categories/:path*",
    "/settings/:path*",
  ],
}
