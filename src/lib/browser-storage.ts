/** Browser privacy settings can throw even when merely accessing localStorage. */
export function readLocalValue(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function writeLocalValue(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true } catch { return false }
}
