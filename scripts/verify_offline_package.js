const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const dist = path.resolve(__dirname, '..', 'dist')
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'offline-manifest.json'), 'utf8'))
const indexUrl = manifest.coreAssets.find((asset) => asset.url.endsWith('/index.html'))?.url
if (!indexUrl) throw new Error('Missing required index asset.')
const basePath = indexUrl.slice(0, -'index.html'.length)
const required = ['index.html', 'data/key.json', 'data/fact_sheets.json', 'data/character_metadata.json', 'data/scientific-package.json'].map((relative) => `${basePath}${relative}`)
if (manifest.localArchiveIncluded !== false || manifest.optionalMediaPacks.length) throw new Error('Unreviewed media entered the distributable package.')
for (const url of required) if (!manifest.coreAssets.some((asset) => asset.url === url)) throw new Error(`Missing required asset ${url}`)
for (const asset of manifest.coreAssets) {
  const relative = asset.url.startsWith(basePath) ? asset.url.slice(basePath.length) : asset.url
  const content = fs.readFileSync(path.join(dist, ...relative.split('/').filter(Boolean)))
  const digest = crypto.createHash('sha256').update(content).digest('hex')
  if (digest !== asset.sha256 || content.length !== asset.bytes) throw new Error(`Integrity mismatch for ${asset.url}`)
}
console.log(`Offline package verified: ${manifest.packageId}, ${manifest.coreAssets.length} assets.`)
