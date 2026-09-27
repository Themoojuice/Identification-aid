#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const manifestPath = path.join(ROOT, 'data', 'manifests', 'html_assets.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const queue = manifest.records.filter(x => x.status === 'intentionally_not_downloaded' && !x.http_status);
let next = 0, done = 0;

function check(record) {
  return new Promise(resolve => {
    const child = spawn('curl.exe', ['-L','--head','--silent','--show-error','--connect-timeout','15','--max-time','45','--user-agent','TaxonomyTool source archive research','--write-out','\n%{http_code}\t%{content_type}',record.url], { windowsHide: true });
    let out = '', err = '';
    child.stdout.on('data', x => out += x);
    child.stderr.on('data', x => err += x);
    child.on('close', code => {
      const last = out.trim().split(/\r?\n/).at(-1) || '';
      const [status, contentType = ''] = last.split('\t');
      const http = Number(status) || null;
      resolve({
        status: code === 0 && http && http < 400 ? 'reachable_not_archived' : 'inaccessible',
        http_status: http,
        content_type: contentType || null,
        notes: code === 0 && http && http < 400 ? 'Existence checked with HEAD; intentionally not mirrored.' : (err.trim().slice(0, 500) || `HEAD check failed with curl exit ${code}`),
      });
    });
  });
}

async function worker() {
  while (true) {
    const i = next++;
    if (i >= queue.length) return;
    Object.assign(queue[i], await check(queue[i]));
    if (++done % 10 === 0 || done === queue.length) console.log(`Checked ${done}/${queue.length}`);
    await new Promise(r => setTimeout(r, 150));
  }
}

Promise.all(Array.from({ length: 3 }, worker)).then(() => {
  manifest.checked_at = new Date().toISOString();
  manifest.summary = Object.fromEntries([...new Set(manifest.records.map(x => x.status))].sort().map(s => [s, manifest.records.filter(x => x.status === s).length]));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest.summary));
});
