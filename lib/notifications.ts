import { getFirebaseAdmin, admin } from "./firebase-admin"

export interface NotificationPayload {
  title: string
  body: string
  url?: string        // Where to navigate on tap
  data?: Record<string, string>
}

/**
 * Send a push notification to a single FCM token.
 * Returns true on success, false on failure (e.g. token expired).
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: NotificationPayload
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
 */
export async function sendPushToMany(
  tokens: { userId: string; fcmToken: string }[],
  payload: NotificationPayload
): Promise<string[]> {
  const invalidTokenUserIds: string[] = []

  await Promise.all(
    tokens.map(async ({ userId, fcmToken }) => {
      const ok = await sendPushNotification(fcmToken, payload)
      if (!ok) invalidTokenUserIds.push(userId)
    })
  )

  return invalidTokenUserIds
}
