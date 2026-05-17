import { NextResponse } from "next/server"

/**
 * Serve the Firebase Messaging Service Worker with env vars injected.
 * This is needed because service workers can't access NEXT_PUBLIC_ env vars directly.
 * Registered at: /firebase-messaging-sw.js
 */
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  }

  const sw = `
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js")

firebase.initializeApp(${JSON.stringify(config)})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  const url = payload.data?.url ?? "/"

  self.registration.showNotification(title ?? "tortuguita", {
    body: body ?? "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: { url },
    requireInteraction: false,
  })
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        if (clients.openWindow) return clients.openWindow(url)
      })
  )
})
`

  return new NextResponse(sw, {
    headers: {
      "Content-Type": "application/javascript",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache",
    },
  })
}
