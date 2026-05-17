// Firebase Cloud Messaging Service Worker
// This file must be at the root (public/) so the browser can register it at /firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js")

// These values are replaced at build time via __FIREBASE_CONFIG__ injection,
// or fall back to self.FIREBASE_CONFIG set below.
// NOTE: fill these in once you have your Firebase config.
firebase.initializeApp({
  apiKey: self.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: self.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: self.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: self.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: self.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: self.NEXT_PUBLIC_FIREBASE_APP_ID || "",
})

const messaging = firebase.messaging()

// Handle background messages (app in background or closed)
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

// On notification click — open/focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        // Open new window
        if (clients.openWindow) return clients.openWindow(url)
      })
  )
})
