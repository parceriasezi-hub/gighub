const CACHE_NAME = "gighub-v1.0.1"
const STATIC_CACHE = "gighub-static-v1.0.1"
const DYNAMIC_CACHE = "gighub-dynamic-v1.0.1"
const API_CACHE = "gighub-api-v1.0.1"

// Recursos para cache estático
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/login",
  "/register",
  "/offline",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
]

// Recursos para cache dinâmico
const CACHE_STRATEGIES = {
  // Cache First - para assets estáticos
  CACHE_FIRST: "cache-first",
  // Network First - para dados dinâmicos
  NETWORK_FIRST: "network-first",
  // Stale While Revalidate - para recursos que podem ser atualizados
  STALE_WHILE_REVALIDATE: "stale-while-revalidate",
  // Network Only - para dados críticos
  NETWORK_ONLY: "network-only",
}

// Configuração de rotas e estratégias
const ROUTE_STRATEGIES = [
  {
    pattern: /^https:\/\/fonts\.googleapis\.com/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cache: STATIC_CACHE,
  },
  {
    pattern: /^https:\/\/fonts\.gstatic\.com/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cache: STATIC_CACHE,
    maxAge: 60 * 60 * 24 * 365, // 1 ano
  },
  {
    pattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cache: STATIC_CACHE,
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  },
  {
    pattern: /\.(?:js|css)$/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cache: STATIC_CACHE,
  },
  {
    pattern: /\/api\//,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cache: API_CACHE,
    maxAge: 60 * 5, // 5 minutos
  },
]

// Instalar Service Worker
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker: Instalando...")

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("📦 Service Worker: Cache estático criado")
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log("✅ Service Worker: Instalação concluída")
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error("❌ Service Worker: Erro na instalação:", error)
      }),
  )
})

// Ativar Service Worker
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker: Ativando...")

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
              console.log("🗑️ Service Worker: Removendo cache antigo:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        console.log("✅ Service Worker: Ativação concluída")
        return self.clients.claim()
      })
      .catch((error) => {
        console.error("❌ Service Worker: Erro na ativação:", error)
      }),
  )
})

// Interceptar requisições
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requisições não-GET
  if (request.method !== "GET") {
    return
  }

  // Ignorar requisições do Chrome Extensions
  if (url.protocol === "chrome-extension:") {
    return
  }

  // Encontrar estratégia para a requisição
  const routeConfig = ROUTE_STRATEGIES.find((route) => route.pattern.test(request.url))

  if (routeConfig) {
    event.respondWith(handleRequest(request, routeConfig))
  } else {
    // Estratégia padrão para páginas
    event.respondWith(handlePageRequest(request))
  }
})

// Manipular requisições com estratégias específicas
async function handleRequest(request, config) {
  const { strategy, cache: cacheName, maxAge } = config

  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cacheName, maxAge)

    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cacheName, maxAge)

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cacheName)

    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request)

    default:
      return networkFirst(request, cacheName)
  }
}

// Estratégia Cache First
async function cacheFirst(request, cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      // Verificar se o cache expirou
      if (maxAge) {
        const cachedDate = new Date(cachedResponse.headers.get("date"))
        const now = new Date()
        const age = (now.getTime() - cachedDate.getTime()) / 1000

        if (age > maxAge) {
          // Cache expirado, buscar nova versão
          try {
            const networkResponse = await fetch(request)
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone())
              return networkResponse
            }
          } catch (error) {
            // Rede falhou, usar cache expirado
            console.warn("⚠️ Rede falhou, usando cache expirado:", error)
          }
        }
      }

      return cachedResponse
    }

    // Não está em cache, buscar da rede
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error("❌ Cache First falhou:", error)
    return new Response("Recurso não disponível", { status: 503 })
  }
}

// Estratégia Network First
async function networkFirst(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }

    throw new Error("Network response not ok")
  } catch (error) {
    console.warn("⚠️ Rede falhou, tentando cache:", error)

    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    return new Response("Recurso não disponível offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    })
  }
}

// Estratégia Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  // Buscar nova versão em background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    })
    .catch(() => {
      // Ignorar erros de rede em background
    })

  // Retornar cache imediatamente se disponível
  if (cachedResponse) {
    return cachedResponse
  }

  // Se não há cache, aguardar rede
  return fetchPromise
}

// Manipular requisições de páginas
async function handlePageRequest(request) {
  try {
    // Tentar rede primeiro
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      // Cachear páginas importantes
      const url = new URL(request.url)
      if (url.pathname.startsWith("/dashboard") || url.pathname === "/" || url.pathname === "/login") {
        const cache = await caches.open(DYNAMIC_CACHE)
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    }

    throw new Error("Network response not ok")
  } catch (error) {
    console.warn("⚠️ Página não disponível online, tentando cache:", error)

    // Tentar cache dinâmico
    const dynamicCache = await caches.open(DYNAMIC_CACHE)
    const cachedResponse = await dynamicCache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    // Tentar cache estático
    const staticCache = await caches.open(STATIC_CACHE)
    const staticResponse = await staticCache.match(request)

    if (staticResponse) {
      return staticResponse
    }

    // Retornar página offline
    return caches.match("/offline")
  }
}

// Manipular notificações push
self.addEventListener("push", (event) => {
  console.log("📱 Push notification recebida:", event)

  if (!event.data) {
    return
  }

  try {
    const data = event.data.json()
    const options = {
      body: data.body || "Nova notificação do Biskate",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      image: data.image,
      data: data.data || {},
      actions: [
        {
          action: "open",
          title: "Abrir",
          icon: "/icons/action-open.png",
        },
        {
          action: "dismiss",
          title: "Dispensar",
          icon: "/icons/action-dismiss.png",
        },
      ],
      tag: data.tag || "biskate-notification",
      renotify: true,
      requireInteraction: data.priority === "high",
      silent: data.priority === "low",
      timestamp: Date.now(),
      vibrate: [200, 100, 200],
    }

    event.waitUntil(self.registration.showNotification(data.title || "Biskate", options))
  } catch (error) {
    console.error("❌ Erro ao processar push notification:", error)
  }
})

// Manipular cliques em notificações
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notificação clicada:", event)

  event.notification.close()

  if (event.action === "dismiss") {
    return
  }

  const urlToOpen = event.notification.data?.url || "/dashboard"

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Verificar se já há uma janela aberta
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus()
          }
        }

        // Abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
      .catch((error) => {
        console.error("❌ Erro ao abrir notificação:", error)
      }),
  )
})

// Manipular sincronização em background
self.addEventListener("sync", (event) => {
  console.log("🔄 Background sync:", event.tag)

  if (event.tag === "background-sync") {
    event.waitUntil(handleBackgroundSync())
  }
})

// Sincronização em background
async function handleBackgroundSync() {
  try {
    // Sincronizar dados pendentes
    console.log("🔄 Executando sincronização em background...")

    // Aqui você pode implementar lógica para:
    // - Enviar mensagens pendentes
    // - Sincronizar dados offline
    // - Atualizar cache de dados críticos
  } catch (error) {
    console.error("❌ Erro na sincronização:", error)
  }
}

// Manipular mudanças de conectividade
self.addEventListener("online", () => {
  console.log("🌐 Conectividade restaurada")
  // Sincronizar dados pendentes
  handleBackgroundSync()
})

self.addEventListener("offline", () => {
  console.log("📴 Aplicação offline")
})

// Limpeza periódica de cache
setInterval(
  () => {
    cleanupCache()
  },
  60 * 60 * 1000,
) // A cada hora

async function cleanupCache() {
  try {
    const cacheNames = await caches.keys()
    const now = Date.now()
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 dias

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()

      for (const request of keys) {
        const response = await cache.match(request)
        if (response) {
          const dateHeader = response.headers.get("date")
          if (dateHeader) {
            const cacheDate = new Date(dateHeader).getTime()
            if (now - cacheDate > maxAge) {
              await cache.delete(request)
              console.log("🗑️ Cache expirado removido:", request.url)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Erro na limpeza de cache:", error)
  }
}
