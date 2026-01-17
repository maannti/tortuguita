// middleware.ts
import { auth } from "@/lib/auth"

export default auth((req) => {
  if (!req.auth) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return Response.redirect(url)
  }
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/bills/:path*",
    "/categories/:path*",
    "/settings/:path*",
  ],
}
