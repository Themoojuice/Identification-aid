const DB_NAME = 'australian-salticidae-offline'
const DB_VERSION = 1
const META_STORE = 'metadata'
const PACKAGE_PREFIX = 'salticidae-core:'
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/?$/, '/')
const scoped = (relative) => `${SCOPE_PATH}${relative}`.replace(/\/{2,}/g, '/')
const MANIFEST_URL = scoped('offline-manifest.json')

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('sessions')) request.result.createObjectStore('sessions')
      if (!request.result.objectStoreNames.contains(META_STORE)) request.result.createObjectStore(META_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readMeta(key) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(key)
    request.onsuccess = () => { database.close(); resolve(request.result ?? null) }
    request.onerror = () => { database.close(); reject(request.error) }
  })
}

async function writeMeta(entries) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(META_STORE, 'readwrite')
    const store = transaction.objectStore(META_STORE)
    for (const [key, value] of Object.entries(entries)) store.put(value, key)
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
    transaction.onabort = () => { database.close(); reject(transaction.error) }
  })
}

async function digest(buffer) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
}

async function notify(status) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const client of clients) client.postMessage({ type: 'OFFLINE_STATUS', status })
}

async function packageReady(packageId, record) {
  if (!packageId || record?.status !== 'complete' || !Array.isArray(record.assets) || !record.assets.length) return false
  const cache = await caches.open(`${PACKAGE_PREFIX}${packageId}`)
  const checks = await Promise.all(record.assets.map((asset) => cache.match(asset.url)))
  return checks.every(Boolean)
}

async function status(extra = {}) {
  const activePackageId = await readMeta('active-package')
  const previousPackageId = await readMeta('previous-package')
  const record = activePackageId ? await readMeta(`package:${activePackageId}`) : null
  const coreReady = await packageReady(activePackageId, record)
  return { supported: true, coreReady, activePackageId, previousPackageId, packageVersion: record?.packageVersion ?? null, updateState: 'idle', message: coreReady ? 'Core diagnostic package ready offline.' : 'Core package is not yet ready.', ...extra }
}

async function fetchManifest() {
  const response = await fetch(`${MANIFEST_URL}?update=${Date.now()}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Offline package manifest could not be downloaded.')
  const manifest = await response.json()
  if (!manifest.packageId || !Array.isArray(manifest.coreAssets) || !manifest.coreAssets.length) throw new Error('Offline package manifest is invalid.')
  const required = ['index.html', 'data/key.json', 'data/fact_sheets.json', 'data/character_metadata.json', 'data/scientific-package.json'].map(scoped)
  for (const url of required) if (!manifest.coreAssets.some((asset) => asset.url === url)) throw new Error(`Required core asset is missing: ${url}`)
  return manifest
}

async function stagePackage(manifest) {
  const current = await readMeta('active-package')
  const existing = await readMeta(`package:${manifest.packageId}`)
  if (await packageReady(manifest.packageId, existing)) {
    if (current !== manifest.packageId) await writeMeta({ 'previous-package': current, 'active-package': manifest.packageId })
    return manifest.packageId
  }
  const cacheName = `${PACKAGE_PREFIX}${manifest.packageId}`
  await caches.delete(cacheName)
  await writeMeta({ [`package:${manifest.packageId}`]: { status: 'staging', packageVersion: manifest.packageVersion, startedAt: new Date().toISOString() } })
  const cache = await caches.open(cacheName)
  try {
    for (const asset of manifest.coreAssets) {
      const response = await fetch(asset.url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Core asset failed: ${asset.url}`)
      const buffer = await response.clone().arrayBuffer()
      if (await digest(buffer) !== asset.sha256) throw new Error(`Core asset hash failed: ${asset.url}`)
      await cache.put(asset.url, response)
    }
    const verifiedAt = new Date().toISOString()
    const previous = current && current !== manifest.packageId ? current : await readMeta('previous-package')
    await writeMeta({ [`package:${manifest.packageId}`]: { status: 'complete', packageVersion: manifest.packageVersion, verifiedAt, assetCount: manifest.coreAssets.length, assets: manifest.coreAssets }, 'previous-package': previous, 'active-package': manifest.packageId })
    return manifest.packageId
  } catch (error) {
    await caches.delete(cacheName)
    await writeMeta({ [`package:${manifest.packageId}`]: { status: 'failed', packageVersion: manifest.packageVersion, error: String(error), failedAt: new Date().toISOString() } })
    throw error
  }
}

self.addEventListener('install', (event) => { event.waitUntil(fetchManifest().then(stagePackage).then(() => self.skipWaiting())) })
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim().then(async () => notify(await status()))) })

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  const url = new URL(event.request.url)
  if (url.pathname === scoped('sw.js') || url.pathname === MANIFEST_URL) return
  event.respondWith((async () => {
    const packageId = await readMeta('active-package')
    const record = packageId ? await readMeta(`package:${packageId}`) : null
    if (await packageReady(packageId, record)) {
      const cache = await caches.open(`${PACKAGE_PREFIX}${packageId}`)
      if (event.request.mode === 'navigate') {
        const shell = await cache.match(scoped('index.html'))
        if (shell) return shell
      }
      const cached = await cache.match(url.pathname)
      if (cached) return cached
    }
    return fetch(event.request)
  })())
})

self.addEventListener('message', (event) => {
  const type = event.data?.type
  if (type === 'GET_STATUS') event.waitUntil(status().then(notify))
  if (type === 'CHECK_UPDATE') event.waitUntil((async () => {
    await notify(await status({ updateState: 'checking', message: 'Checking and verifying the core package…' }))
    try { await stagePackage(await fetchManifest()); await notify(await status({ updateState: 'ready', message: 'Verified core package is ready offline.' })) }
    catch (error) { await notify(await status({ updateState: 'failed', message: `Update was not activated: ${error instanceof Error ? error.message : String(error)}` })) }
  })())
  if (type === 'ROLLBACK') event.waitUntil((async () => {
    const active = await readMeta('active-package')
    const previous = await readMeta('previous-package')
    const record = previous ? await readMeta(`package:${previous}`) : null
    const ready = await packageReady(previous, record)
    if (ready) await writeMeta({ 'active-package': previous, 'previous-package': active })
    await notify(await status({ message: ready ? 'Previous complete package restored.' : 'No complete previous package is available.' }))
  })())
  if (type === 'PIN_PACKAGE' && typeof event.data.packageId === 'string') event.waitUntil((async () => {
    const pinned = await readMeta('pinned-packages') ?? []
    await writeMeta({ 'pinned-packages': [...new Set([...pinned, event.data.packageId])] })
  })())
})
