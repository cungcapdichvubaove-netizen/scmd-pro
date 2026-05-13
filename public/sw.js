// Kill-switch SW: thay thế SW cũ, xóa cache, không intercept bất kỳ fetch nào
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
// Không có fetch handler → mọi request đi thẳng tới network
