function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    await reg.update().catch(() => {})
    return reg
  } catch (err) {
    console.warn("Service Worker registration failed:", err)
    return null
  }
}

export async function subscribeToPushNotifications(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return false
  }

  try {
    const reg = await registerServiceWorker()
    if (!reg) return false

    // Request browser permission
    const permission = await Notification.requestPermission()
    if (permission !== "granted") return false

    // Fetch VAPID public key from backend
    const res = await fetch("/api/account/notifications/vapid-public-key", {
      credentials: "include",
    })
    if (!res.ok) return false
    const { publicKey } = await res.json()
    if (!publicKey) return false

    // Check existing subscription or create new
    let subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(publicKey)
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      })
    }

    // Send subscription to server
    const subJSON = subscription.toJSON()
    if (!subJSON.endpoint || !subJSON.keys?.p256dh || !subJSON.keys?.auth) {
      return false
    }

    await fetch("/api/account/notifications/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        endpoint: subJSON.endpoint,
        keys: {
          p256dh: subJSON.keys.p256dh,
          auth: subJSON.keys.auth,
        },
      }),
    })

    return true
  } catch (err) {
    console.warn("Push subscription failed:", err)
    return false
  }
}
