import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/notifications
 * Returns the last 7 days of notifications for the current user.
 * Response: { notifications: Notification[], unreadCount: number }
 */
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      type: true,
      readAt: true,
      createdAt: true,
    },
  })

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return NextResponse.json({ notifications, unreadCount })
}

/**
 * PATCH /api/notifications
 * Marks all notifications as read for the current user.
 */
export async function PATCH(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
