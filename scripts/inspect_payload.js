#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');

function loadKey(path) {
  const source = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const match = source.match(/^\s*var\s+key\s*=\s*([\s\S]*?)\s*;\s*$/);
  if (!match) throw new Error(`${path} is not a supported Lucid key payload`);
  return JSON.parse(match[1]);
}

function loadLz(path) {
  const context = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
  return context.module.exports;
}

function collectShapes(value, path = '$', result = new Map()) {
  if (value === null) return result;
  if (Array.isArray(value)) {
    const key = `${path}[]`;
    if (!result.has(key)) result.set(key, new Set());
    for (const item of value) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        for (const k of Object.keys(item)) result.get(key).add(k);
      }
      collectShapes(item, key, result);
    }
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectShapes(v, `${path}.${k}`, result);
  }
  return result;
}

const key = loadKey(process.argv[2] || 'salticidae.json');
const lz = loadLz(process.argv[3] || 'source/lucid-original/metadata/lz-string.min.js');

console.log('TOP LEVEL');
for (const [name, value] of Object.entries(key)) {
  console.log(name, Array.isArray(value) ? `array(${value.length})` : value && typeof value === 'object' ? `object(${Object.keys(value).length})` : JSON.stringify(value));
}
console.log('\nARRAY RECORD SHAPES');
for (const [path, fields] of collectShapes(key)) console.log(path, [...fields].sort().join(', '));

console.log('\nDECOMPRESSED SCORE SAMPLES');
for (const [id, compressed] of Object.entries(key.scores || {}).slice(0, 20)) {
  console.log(id, JSON.stringify(lz.decompressFromBase64(compressed)));
}
console.log('\nDECOMPRESSED DEPENDENCIES');
for (const [id, compressed] of Object.entries(key.dependencies || {})) {
  console.log(id, JSON.stringify(lz.decompressFromBase64(compressed)));
}
console.log('\nDECOMPRESSED MEASURES');
for (const [id, compressed] of Object.entries(key.measures || {})) {
  console.log(id, JSON.stringify(lz.decompressFromBase64(compressed)));
}
console.log('\nDECOMPRESSED SCOPES');
for (const [id, compressed] of Object.entries(key.scopes || {})) {
  console.log(id, JSON.stringify(lz.decompressFromBase64(compressed)));
}
