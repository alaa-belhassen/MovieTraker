const CACHE_VERSION = 'cinetrack-v2'
const APP_SHELL = [
  '/', '/offline', '/recherche', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-512-maskable.png',
]
const PERSONAL_PATHS = ['/mes-listes', '/profil', '/pour-vous', '/listes-partagees', '/watch', '/seances']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))))
})
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'SIGNED_OUT') event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('cinetrack-user-')).map((key) => caches.delete(key)))))
})
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || request.url.includes('/auth/') || request.url.includes('supabase.co/realtime')) return
  const url = new URL(request.url)
  const accepts = request.headers.get('accept') || ''
  // Let Next.js App Router navigation and RSC streams pass through untouched.
  // Caching a live Flight stream can close its writable stream before React finishes reading it.
  if (url.pathname.startsWith('/_next/') || accepts.includes('text/x-component') || request.headers.has('RSC')) return
  if (url.pathname === '/sw.js' || url.pathname.startsWith('/api/')) return
  const isPersonal = PERSONAL_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))
  if (isPersonal) {
    event.respondWith(fetch(request).catch(() => caches.match('/offline')))
    return
  }
  if (request.destination === 'image') {
    event.respondWith(caches.open('cinetrack-images').then(async (cache) => { const hit = await cache.match(request); const fresh = fetch(request).then((response) => { if (response.ok || response.type === 'opaque') cache.put(request, response.clone()); return response }).catch(() => hit); return hit || fresh }))
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => { const copy = response.clone(); caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)); return response }).catch(() => caches.match(request).then((cached) => cached || caches.match('/offline'))))
    return
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => { if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone())); return response })))
})
