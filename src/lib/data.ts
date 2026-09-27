import type { CuratedMetadata, FactSheetData, KeyData } from './types'
import type { ScientificRuntimePackage } from './scientific-contract'

export async function loadAppData() {
  const [keyResponse, factsResponse, curatedResponse, scientificResponse] = await Promise.all([
    fetch('/data/key.json'),
    fetch('/data/fact_sheets.json'),
    fetch('/data/character_metadata.json'),
    fetch('/data/scientific-package.json'),
  ])
  if (!keyResponse.ok || !factsResponse.ok || !curatedResponse.ok || !scientificResponse.ok) {
    throw new Error('The local key data could not be loaded.')
  }
  return {
    key: await keyResponse.json() as KeyData,
    facts: await factsResponse.json() as FactSheetData,
    curated: await curatedResponse.json() as CuratedMetadata,
    scientific: await scientificResponse.json() as ScientificRuntimePackage,
  }
}

export function mediaUrl(path?: string) {
  if (!path) return ''
  // Lucid paths mix plain spaces with existing percent escapes. Decode each
  // segment once before encoding it for the browser, otherwise `%20` becomes
  // `%2520` and the archived file cannot be found.
  const segments = path.split('/').map((segment) => {
    try { return encodeURIComponent(decodeURIComponent(segment)) }
    catch { return encodeURIComponent(segment) }
  })
  return `/source/lucid-original/media/${segments.join('/')}`
}

export function plainCaption(html?: string) {
  if (!html) return ''
  const document = new DOMParser().parseFromString(html, 'text/html')
  return document.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}
