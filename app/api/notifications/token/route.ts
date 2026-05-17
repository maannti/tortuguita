import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/notifications/token — save or update FCM token for current user
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { token } = await request.json()
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { fcmToken: token, notificationsEnabled: true },
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/notifications/token — clear FCM token (user disabled notifications)
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { fcmToken: null, notificationsEnabled: false },
  })

  return NextResponse.json({ ok: true })
}
