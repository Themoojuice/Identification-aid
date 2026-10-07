const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');

function harness() {
  const metadata = new Map();
  const stores = new Map();
  const listeners = new Map();
  const bodies = new Map();
  const context = vm.createContext({ URL, Response, crypto: webcrypto, console,
    self: { registration: { scope: 'https://example.test/aid/' }, location: { origin: 'https://example.test' }, addEventListener: (type, listener) => listeners.set(type, listener) },
    caches: { async open(name) { if (!stores.has(name)) stores.set(name, new Map()); const store = stores.get(name); return { match: async (url) => store.get(url)?.clone(), put: async (url, response) => store.set(url, response.clone()) }; }, async delete(name) { return stores.delete(name); } },
    fetch: async (url) => { const body = bodies.get(typeof url === 'string' ? url : url.url); return new Response(body ?? 'missing', { status: body === undefined ? 404 : 200 }); },
    testRead: async (key) => metadata.get(key) ?? null,
    testWrite: async (entries) => { for (const [key, value] of Object.entries(entries)) metadata.set(key, value); },
  });
  vm.runInContext(fs.readFileSync('public/sw.js', 'utf8') + '\nreadMeta = testRead; writeMeta = testWrite;', context);
  return { context, metadata, stores, listeners, bodies, run: (code) => vm.runInContext(code, context) };
}

test('actual worker staging rejects bad hashes and preserves the previous complete package', async () => {
  const h = harness();
  const body = 'verified shell';
  const hash = Buffer.from(await webcrypto.subtle.digest('SHA-256', Buffer.from(body))).toString('hex');
  h.bodies.set('/aid/index.html', body);
  h.context.manifest = { packageId: 'one', packageVersion: 'test', coreAssets: [{ url: '/aid/index.html', sha256: hash }] };
  await h.run('stagePackage(manifest)');
  assert.equal(h.metadata.get('active-package'), 'one');
  assert.equal(await h.run("packageReady('one', { status: 'complete', assets: manifest.coreAssets })"), true);
  h.context.bad = { ...h.context.manifest, packageId: 'two', coreAssets: [{ url: '/aid/index.html', sha256: 'bad-hash' }] };
  await assert.rejects(h.run('stagePackage(bad)'), /hash failed/);
  assert.equal(h.metadata.get('active-package'), 'one');
  assert.equal(h.stores.has('salticidae-core:two'), false);
  assert.equal(h.metadata.get('package:two').status, 'failed');
  h.context.good = { ...h.context.manifest, packageId: 'three' };
  await h.run('stagePackage(good)');
  assert.equal(h.metadata.get('previous-package'), 'one');
  assert.equal(h.metadata.get('active-package'), 'three');
});

test('actual fetch handler falls back online when browser package storage is unavailable', async () => {
  const h = harness();
  const url = 'https://example.test/aid/data/key.json';
  h.bodies.set(url, 'online data');
  h.run("readMeta = async () => { throw new Error('Storage denied') }");
  let response;
  h.listeners.get('fetch')({ request: { method: 'GET', url, mode: 'cors' }, respondWith: (promise) => { response = promise; } });
  assert.equal(await (await response).text(), 'online data');
});

test('an already-open tab keeps its own core data after another package activates', async () => {
  const h = harness();
  async function install(id) {
    const assets = [];
    for (const name of ['index.html', 'data/key.json']) {
      const body = `${id}:${name}`;
      const url = `/aid/${name}`;
      h.bodies.set(url, body);
      assets.push({ url, sha256: Buffer.from(await webcrypto.subtle.digest('SHA-256', Buffer.from(body))).toString('hex') });
    }
    h.context.next = { packageId: id, packageVersion: id, coreAssets: assets };
    await h.run('stagePackage(next)');
  }
  async function load(path, mode, clientId, resultingClientId = '') {
    let pending;
    h.listeners.get('fetch')({ request: { method: 'GET', url: `https://example.test/aid/${path}`, mode }, clientId, resultingClientId, respondWith: (promise) => { pending = promise; } });
    return pending;
  }
  await install('one');
  assert.equal(await (await load('deep/link', 'navigate', '', 'tab-one')).text(), 'one:index.html');
  await install('two');
  assert.equal(await (await load('data/key.json', 'cors', 'tab-one')).text(), 'one:data/key.json');
  assert.equal(await (await load('', 'navigate', '', 'tab-two')).text(), 'two:index.html');
  assert.equal(await (await load('data/key.json', 'cors', 'tab-two')).text(), 'two:data/key.json');
  h.stores.get('salticidae-core:one').delete('/aid/data/key.json');
  assert.equal((await load('data/key.json', 'cors', 'tab-one')).status, 503);
});
