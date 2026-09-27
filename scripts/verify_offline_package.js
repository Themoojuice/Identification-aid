const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const dist = path.resolve(__dirname, '..', 'dist')
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'offline-manifest.json'), 'utf8'))
const required = ['/index.html', '/data/key.json', '/data/fact_sheets.json', '/data/character_metadata.json', '/data/scientific-package.json']
if (manifest.localArchiveIncluded !== false || manifest.optionalMediaPacks.length) throw new Error('Unreviewed media entered the distributable package.')
for (const url of required) if (!manifest.coreAssets.some((asset) => asset.url === url)) throw new Error(`Missing required asset ${url}`)
for (const asset of manifest.coreAssets) {
  const content = fs.readFileSync(path.join(dist, ...asset.url.split('/').filter(Boolean)))
  const digest = crypto.createHash('sha256').update(content).digest('hex')
  if (digest !== asset.sha256 || content.length !== asset.bytes) throw new Error(`Integrity mismatch for ${asset.url}`)
}
if (fs.existsSync(path.join(dist, 'media', 'private-reference'))) throw new Error('Private references were copied into the distributable build.')
console.log(`Offline package verified: ${manifest.packageId}, ${manifest.coreAssets.length} assets.`)
