const fs = require('fs');
const vm = require('vm');

function loadLucidKey(path) {
  const source = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const match = source.match(/^\s*var\s+key\s*=\s*([\s\S]*?)\s*;\s*$/);
  if (!match) throw new Error(`${path} is not a supported "var key = ..." Lucid payload`);
  return { key: JSON.parse(match[1]), wrapper: 'var key = <JSON>;' };
}

function loadLzString(path) {
  const context = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
  return context.module.exports;
}

function decodeBase64Map(map, lz) {
  return Object.fromEntries(
    Object.entries(map || {}).map(([id, encoded]) => [id, {
      encoded,
      decoded: encoded.includes(':') ? encoded : lz.decompressFromBase64(encoded),
    }]),
  );
}

module.exports = { loadLucidKey, loadLzString, decodeBase64Map };
