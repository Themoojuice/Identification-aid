const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
const basePath = `/${String(process.env.VITE_BASE_PATH || '/').replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '')
const assetUrl = (relative) => `${basePath}/${relative}`.replace(/\/{2,}/g, '/')
fs.rmSync(path.join(dist, 'media', 'private-reference'), { recursive: true, force: true })
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? files(target) : [target]
  })
}
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex') }

const allowed = files(dist).filter((file) => {
  const relative = path.relative(dist, file).replaceAll('\\', '/')
  return relative === 'index.html' || relative === '404.html' || relative === 'manifest.webmanifest' || relative.startsWith('assets/') || relative.startsWith('data/')
}).sort()
const coreAssets = allowed.map((file) => {
  const content = fs.readFileSync(file)
  return { url: assetUrl(path.relative(dist, file).replaceAll('\\', '/')), sha256: sha256(content), bytes: content.length }
})
const packageVersion = JSON.parse(fs.readFileSync(path.join(dist, 'data', 'scientific-package.json'), 'utf8')).packageVersion
const packageDigest = sha256(Buffer.from(coreAssets.map((asset) => `${asset.url}:${asset.sha256}`).join('\n')))
const manifest = { format: 'australian-salticidae-offline-package@1', packageId: `core-${packageDigest.slice(0, 20)}`, packageVersion, createdAt: new Date().toISOString(), coreAssets, optionalMediaPacks: [], localArchiveIncluded: false, notes: 'Core diagnostic data and explanatory code only. Private local/archive media are not distributable assets.' }
fs.writeFileSync(path.join(dist, 'offline-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Offline core prepared: ${manifest.packageId}, ${coreAssets.length} assets, ${coreAssets.reduce((sum, asset) => sum + asset.bytes, 0)} bytes; private media excluded.`)
