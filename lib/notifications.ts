import { getFirebaseAdmin, admin } from "./firebase-admin"
import { prisma } from "@/lib/prisma"

export interface NotificationPayload {
  title: string
  body: string
  type?: string    // Notification type (e.g. "due_date", "general")
  url?: string        // Where to navigate on tap
  data?: Record<string, string>
}

/**
 * Send a push notification to a single FCM token.
 * Returns true on success, false on failure (e.g. token expired).
 * If userId is provided, also saves the notification to the DB.
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: NotificationPayload,
  userId?: string
): Promise<boolean> {
  try {
    getFirebaseAdmin()
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          requireInteraction: false,
        },
        fcmOptions: {
          link: payload.url ?? "/dashboard",
        },
      },
      data: {
        url: payload.url ?? "/dashboard",
        ...payload.data,
      },
    })

    if (userId) {
      await prisma.notification.create({
        data: {
          userId,
          title: payload.title,
          body: payload.body,
          type: payload.type ?? "general",
        },
      })
    }

    return true
  } catch (err: any) {
    // Token invalid/unregistered — caller should clear it from DB
    if (
      err?.errorInfo?.code === "messaging/invalid-registration-token" ||
      err?.errorInfo?.code === "messaging/registration-token-not-registered"
    ) {
      return false
    }
    console.error("FCM send error:", err)
    return false
  }
}

/**
 * Send to multiple tokens, returns list of invalid tokens to clean up.
 * Each userId is passed to sendPushNotification for DB persistence.
 */
export async function sendPushToMany(
  tokens: { userId: string; fcmToken: string }[],
  payload: NotificationPayload
): Promise<string[]> {
  const invalidTokenUserIds: string[] = []

  await Promise.all(
    tokens.map(async ({ userId, fcmToken }) => {
      const ok = await sendPushNotification(fcmToken, payload, userId)
      if (!ok) invalidTokenUserIds.push(userId)
    })
  )

  return invalidTokenUserIds
}
