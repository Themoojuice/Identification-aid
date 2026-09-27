#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const manifestPath = path.join(ROOT, 'data', 'manifests', 'html_assets.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const queue = manifest.records.filter(x => x.should_download && x.status !== 'downloaded');
const concurrency = 3;
let next = 0;
let done = 0;

const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function get(record) {
  return new Promise(resolve => {
    const destination = path.resolve(ROOT, record.local_path);
    const archiveRoot = path.resolve(ROOT, 'source', 'lucid-original') + path.sep;
    if (!destination.startsWith(archiveRoot)) return resolve({ status: 'error', notes: 'Unsafe destination.' });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const part = destination + '.part';
    const child = spawn('curl.exe', ['-L','--fail','--silent','--show-error','--connect-timeout','15','--max-time','90','--retry','1','--user-agent','TaxonomyTool source archive research','--write-out','%{http_code}\t%{content_type}',record.url,'-o',part], { windowsHide: true });
    let out = '', err = '';
    child.stdout.on('data', x => out += x);
    child.stderr.on('data', x => err += x);
    child.on('close', code => {
      const [http, contentType = ''] = out.trim().split('\t');
      if (code === 0 && fs.existsSync(part)) {
        if (fs.existsSync(destination)) fs.rmSync(destination);
        fs.renameSync(part, destination);
        resolve({ status: 'downloaded', http_status: Number(http) || null, content_type: contentType || null, bytes: fs.statSync(destination).size, sha256: digest(destination), notes: null });
      } else {
        if (fs.existsSync(part)) fs.rmSync(part);
        resolve({ status: Number(http) ? 'http_error' : 'error', http_status: Number(http) || null, content_type: contentType || null, bytes: null, sha256: null, notes: err.trim().slice(0, 500) || `curl exit ${code}` });
      }
    });
  });
}

async function worker() {
  while (true) {
    const i = next++;
    if (i >= queue.length) return;
    Object.assign(queue[i], await get(queue[i]));
    if (++done % 20 === 0 || done === queue.length) console.log(`Archived ${done}/${queue.length}`);
    await new Promise(r => setTimeout(r, 125));
  }
}

Promise.all(Array.from({ length: concurrency }, worker)).then(() => {
  manifest.archived_at = new Date().toISOString();
  manifest.summary = Object.fromEntries([...new Set(manifest.records.map(x => x.status))].sort().map(s => [s, manifest.records.filter(x => x.status === s).length]));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest.summary));
});
