/* Online-only shell. No cache storage, fetch interception, offline API, or push yet. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
