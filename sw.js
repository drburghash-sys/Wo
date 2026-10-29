/* Khatwati PWA v1.2: navigation and code updated online, cached offline. */
const CACHE='khatwati-shell-v3';
const ASSETS=['./','./index.html','./styles.css?v=1.2','./app.js?v=1.2','./privacy.html','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('khatwati-shell-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 const dynamic=req.mode==='navigate'||['script','style','document'].includes(req.destination);
 if(dynamic){e.respondWith(fetch(req,{cache:'no-store'}).then(response=>{if(response.ok){const copy=response.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)));}return response;}).catch(async()=>{const match=await caches.match(req);return match||caches.match('./index.html');}));return;}
 e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok){const copy=response.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)));}return response;})));
});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>clients.length?clients[0].focus():self.clients.openWindow('./')))});
