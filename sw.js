/* How to quote — service worker
   Bump VERSION whenever you upload a new index.html so phones pick up the update. */
const VERSION = 'howtoquote-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('howtoquote-') && k!==VERSION).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);

  // the page itself: try the network first so edits show up, fall back to the cached copy offline
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone(); caches.open(VERSION).then(c=>c.put('./index.html', copy));
        return res;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  // own files (icons, manifest): cache first
  if(url.origin===location.origin){
    e.respondWith(caches.match(req).then(hit=>hit || fetch(req)));
    return;
  }

  // text reader (tesseract) files from the CDN: keep a copy after the first download
  if(url.hostname==='cdn.jsdelivr.net' || url.hostname.endsWith('projectnaptha.com')){
    e.respondWith(
      caches.match(req).then(hit=>hit || fetch(req).then(res=>{
        if(res.ok){ const copy=res.clone(); caches.open(VERSION).then(c=>c.put(req, copy)); }
        return res;
      }))
    );
  }
});
