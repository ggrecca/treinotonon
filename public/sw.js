const CACHE_PREFIX = "treino-tonon-pwa-";
// Bump this revision with every release that changes the app shell. The
// activate handler removes every previous cache under CACHE_PREFIX.
const CACHE_REVISION = "2.0.0-20260719";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_REVISION}`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-${CACHE_REVISION}`;
const CURRENT_CACHES = new Set([SHELL_CACHE, ASSET_CACHE]);
const APP_SHELL_URL = new URL("./", self.registration.scope).href;
const APP_SHELL_REQUEST = new Request(APP_SHELL_URL, {method:"GET", credentials:"same-origin"});
const SENSITIVE_PATH_PREFIXES = [
  "/auth/v1/",
  "/rest/v1/",
  "/storage/v1/",
  "/functions/v1/",
  "/realtime/v1/",
  "/graphql/v1/",
];

function isSensitiveUrl(url){
  return SENSITIVE_PATH_PREFIXES.some(prefix=>url.pathname.startsWith(prefix));
}

function isStaticAssetUrl(url){
  return url.origin === self.location.origin && !isSensitiveUrl(url) && (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  );
}

function responseCanBeCached(response){
  if(!response?.ok || response.type !== "basic") return false;
  if(!response.url || new URL(response.url).origin !== self.location.origin) return false;
  const cacheControl = response.headers.get("cache-control") || "";
  return !/(?:^|,)\s*(?:no-store|private)(?:\s|,|$)/i.test(cacheControl);
}

async function cacheStaticAsset(url){
  if(!isStaticAssetUrl(url)) return;
  const request = new Request(url.href, {method:"GET", credentials:"same-origin", cache:"reload"});
  try{
    const response = await fetch(request);
    if(!responseCanBeCached(response)) return;
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response);
  }catch{
    // Installation remains usable; runtime fetch can retry this asset later.
  }
}

function referencedStaticAssets(html){
  const assets = new Set([new URL("manifest.webmanifest", APP_SHELL_URL).href]);
  const attributePattern = /(?:src|href)=["']([^"']+)["']/gi;
  let match = attributePattern.exec(html);
  while(match){
    try{
      const url = new URL(match[1], APP_SHELL_URL);
      if(isStaticAssetUrl(url)) assets.add(url.href);
    }catch{
      // Ignore malformed markup URLs without failing service-worker install.
    }
    match = attributePattern.exec(html);
  }
  return assets;
}

async function seedAppShell(){
  try{
    const response = await fetch(new Request(APP_SHELL_REQUEST, {cache:"reload"}));
    if(!responseCanBeCached(response)) return;

    const html = await response.clone().text();
    const shellCache = await caches.open(SHELL_CACHE);
    await shellCache.put(APP_SHELL_REQUEST, response.clone());
    await Promise.all([...referencedStaticAssets(html)].map(value=>cacheStaticAsset(new URL(value))));
  }catch{
    // A later successful navigation will populate the offline shell.
  }
}

async function handleNavigation(request){
  try{
    const response = await fetch(request);
    if(responseCanBeCached(response)){
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(APP_SHELL_REQUEST, response.clone());
    }
    return response;
  }catch{
    const cachedShell = await caches.match(APP_SHELL_REQUEST, {cacheName:SHELL_CACHE});
    if(cachedShell) return cachedShell;
    return new Response("Aplicativo indisponivel sem conexao no primeiro acesso.", {
      status:503,
      statusText:"Offline",
      headers:{"Content-Type":"text/plain; charset=utf-8"},
    });
  }
}

async function handleStaticAsset(request){
  const cached = await caches.match(request, {cacheName:ASSET_CACHE});
  if(cached) return cached;

  const response = await fetch(request);
  if(responseCanBeCached(response)){
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", event=>{
  event.waitUntil(seedAppShell());
});
self.addEventListener("activate", event=>{
  event.waitUntil((async ()=>{
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter(name=>name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.has(name))
      .map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event=>{
  const {request} = event;
  if(request.method !== "GET") return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin || isSensitiveUrl(url)) return;

  if(request.mode === "navigate"){
    event.respondWith(handleNavigation(request));
    return;
  }

  if(isStaticAssetUrl(url)) event.respondWith(handleStaticAsset(request));
});
