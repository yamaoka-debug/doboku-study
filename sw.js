const CACHE='doboku-shell-v1';
const FILES=['./','./index.html','./style.css','./app.js','./model.js','./mobile.js','./past-exams.json','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('doboku-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  // Only cache this app's explicitly listed files. Source PDFs remain on the source site.
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!FILES.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
    return response;
  }).catch(async()=>{
    const cached=await caches.match(event.request,{ignoreSearch:true});
    return cached||new Response('通信に接続して、もう一度開いてください。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }));
});
