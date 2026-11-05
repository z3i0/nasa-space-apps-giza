// Service Worker for Web Push Notifications
// Space Apps Giza Platform

self.addEventListener('install', function (event) {
  // Immediately activate new service worker without waiting for browser restart
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // Immediately take control of all active clients/tabs
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  if (!event.data) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // If the user has any tab of the application currently open and visible/focused:
        // Do NOT show an OS browser notification!
        const hasVisibleClient = clientList.some(function (client) {
          return client.visibilityState === 'visible' || client.focused;
        });

        if (hasVisibleClient) {
          // User is actively in the application.
          return;
        }

        try {
          const data = event.data.json();
          let title = data.title || 'New message';
          if (/[\u0600-\u06FF]/.test(title)) {
            title = 'New message';
          }
          const options = {
            body: data.body || '',
            icon: data.icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: data.tag || 'general',
            data: {
              url: data.url || '/dashboard',
            },
            silent: false,
            vibrate: [200, 100, 200],
          };

          return self.registration.showNotification(title, options);
        } catch (err) {
          const text = event.data.text();
          return self.registration.showNotification('NASA Space Apps Giza', {
            body: text,
            icon: '/favicon.ico',
            data: { url: '/dashboard' },
          });
        }
      })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // If a tab of the app is already open, focus it and navigate
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // If all tabs were closed, open a new window to the chat
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
