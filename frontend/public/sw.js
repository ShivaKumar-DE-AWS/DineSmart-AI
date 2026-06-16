/* Mehfil Web Push service worker */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "Mehfil", body: "Your order has an update", data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_e) {
    if (event.data) payload.body = event.data.text();
  }
  const options = {
    body: payload.body,
    icon: "/mehfil-icon-192.png",
    badge: "/mehfil-badge-72.png",
    tag: payload.data?.order_id ? `order-${payload.data.order_id}` : "mehfil",
    renotify: true,
    vibrate: [120, 60, 120],
    data: payload.data || {},
  };
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const orderId = event.notification.data && event.notification.data.order_id;
  const url = orderId ? `/customer/track/${orderId}` : "/customer";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
