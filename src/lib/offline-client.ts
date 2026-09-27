export interface OfflineStatus {
  supported: boolean
  online: boolean
  coreReady: boolean
  activePackageId: string | null
  previousPackageId: string | null
  packageVersion: string | null
  storagePersistent: boolean | null
  updateState: 'idle' | 'checking' | 'ready' | 'failed'
  message: string
}

export const initialOfflineStatus: OfflineStatus = {
  supported: 'serviceWorker' in navigator,
  online: navigator.onLine,
  coreReady: false,
  activePackageId: null,
  previousPackageId: null,
  packageVersion: null,
  storagePersistent: null,
  updateState: 'idle',
  message: 'Checking offline package…',
}

export function requestOfflineStatus() {
  navigator.serviceWorker?.controller?.postMessage({ type: 'GET_STATUS' })
}

export function checkForOfflineUpdate() {
  navigator.serviceWorker?.controller?.postMessage({ type: 'CHECK_UPDATE' })
}

export function rollbackOfflinePackage() {
  navigator.serviceWorker?.controller?.postMessage({ type: 'ROLLBACK' })
}

export function pinOfflinePackage(packageId?: string | null) {
  if (packageId) navigator.serviceWorker?.controller?.postMessage({ type: 'PIN_PACKAGE', packageId })
}

export function subscribeOfflineStatus(callback: (status: Partial<OfflineStatus>) => void) {
  const message = (event: MessageEvent) => {
    if (event.data?.type === 'OFFLINE_STATUS') callback(event.data.status)
  }
  const connectivity = () => callback({ online: navigator.onLine })
  navigator.serviceWorker?.addEventListener('message', message)
  window.addEventListener('online', connectivity)
  window.addEventListener('offline', connectivity)
  navigator.serviceWorker?.ready.then(requestOfflineStatus).catch(() => callback({ message: 'Offline installation is unavailable.' }))
  return () => {
    navigator.serviceWorker?.removeEventListener('message', message)
    window.removeEventListener('online', connectivity)
    window.removeEventListener('offline', connectivity)
  }
}
