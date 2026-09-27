import type { IdentificationSession } from './session'

const DB_NAME = 'australian-salticidae-offline'
const DB_VERSION = 1
const SESSION_STORE = 'sessions'
const META_STORE = 'metadata'
const CURRENT_SESSION = 'current'

export type StorageResult = { persisted: boolean; fallback: boolean; error?: string }

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('IndexedDB is unavailable.'))
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(SESSION_STORE)) database.createObjectStore(SESSION_STORE)
      if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

export async function loadIndexedSession(): Promise<IdentificationSession | null> {
  try {
    const database = await openDatabase()
    const value = await requestResult(database.transaction(SESSION_STORE, 'readonly').objectStore(SESSION_STORE).get(CURRENT_SESSION))
    database.close()
    return value && typeof value === 'object' ? value as IdentificationSession : null
  } catch { return null }
}

export async function saveIndexedSession(session: IdentificationSession): Promise<StorageResult> {
  try {
    const database = await openDatabase()
    const transaction = database.transaction(SESSION_STORE, 'readwrite')
    transaction.objectStore(SESSION_STORE).put(session, CURRENT_SESSION)
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Session write failed.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Session write was aborted.'))
    })
    database.close()
    return { persisted: true, fallback: false }
  } catch (error) {
    return { persisted: false, fallback: true, error: error instanceof Error ? error.message : 'IndexedDB write failed.' }
  }
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null
  try { return await navigator.storage.persist() } catch { return false }
}

export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null
  try { return await navigator.storage.estimate() } catch { return null }
}

export async function rememberPinnedPackage(packageId: string) {
  try {
    const database = await openDatabase()
    const pinned = await requestResult(database.transaction(META_STORE, 'readonly').objectStore(META_STORE).get('pinned-packages')) as string[] | undefined
    await requestResult(database.transaction(META_STORE, 'readwrite').objectStore(META_STORE).put([...new Set([...(pinned ?? []), packageId])], 'pinned-packages'))
    database.close()
  } catch { /* session export remains the recovery path when browser storage is unavailable */ }
}
