const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')

test('offline worker activates only after every asset is fetched and hash-verified', () => {
  const worker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8')
  const verification = worker.indexOf('if (await digest(buffer) !== asset.sha256)')
  const cacheWrite = worker.indexOf('await cache.put(asset.url, response)')
  const activation = worker.indexOf("'active-package': manifest.packageId", cacheWrite)
  assert.ok(verification > 0 && cacheWrite > verification && activation > cacheWrite)
  assert.match(worker, /catch \(error\)[\s\S]*caches\.delete\(cacheName\)/)
})

test('offline fetches use only a complete active package and deep links fall back to its shell', () => {
  const worker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8')
  assert.match(worker, /if \(await packageReady\(packageId, record\)\)/)
  assert.match(worker, /record\?\.status !== 'complete'[\s\S]*record\.assets\.map/)
  assert.match(worker, /event\.request\.mode === 'navigate'[\s\S]*cache\.match\(scoped\('index\.html'\)\)/)
  assert.doesNotMatch(worker, /cache\.put\(event\.request/)
})

test('distributable package builder excludes private local references and declares no media pack', () => {
  const builder = fs.readFileSync(path.join(root, 'scripts', 'build_offline_package.js'), 'utf8')
  assert.match(builder, /private-reference/)
  assert.match(builder, /optionalMediaPacks: \[\]/)
  assert.match(builder, /localArchiveIncluded: false/)
})
