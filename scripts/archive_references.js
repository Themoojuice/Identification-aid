#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const manifestPath = path.join(ROOT, 'data', 'manifests', 'references.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const concurrency = Math.max(1, Math.min(Number(process.env.ARCHIVE_CONCURRENCY || 3), 4));

const unique = new Map();
for (const record of manifest.records) {
  if (!unique.has(record.url)) unique.set(record.url, record);
}
const queue = [...unique.values()];
let next = 0;
let done = 0;

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function archiveOne(record) {
  return new Promise(resolve => {
    const destination = path.resolve(ROOT, record.local_path);
    if (!destination.startsWith(path.resolve(ROOT, 'source', 'lucid-original') + path.sep)) {
      resolve({ status: 'error', notes: 'Refused destination outside archive root.' });
      return;
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const partial = destination + '.part';
    const args = [
      '-L', '--fail', '--silent', '--show-error',
      '--connect-timeout', '15', '--max-time', '90', '--retry', '1',
      '--user-agent', 'TaxonomyTool source archive research',
      '--write-out', '%{http_code}\t%{content_type}',
      record.url, '-o', partial,
    ];
    const child = spawn('curl.exe', args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('close', code => {
      const [statusText, contentType = ''] = stdout.trim().split('\t');
      const httpStatus = Number(statusText) || null;
      if (code === 0 && fs.existsSync(partial)) {
        if (fs.existsSync(destination)) fs.rmSync(destination);
        fs.renameSync(partial, destination);
        resolve({
          status: 'downloaded', http_status: httpStatus,
          content_type: contentType || null,
          bytes: fs.statSync(destination).size,
          sha256: sha256(destination), notes: null,
        });
      } else {
        if (fs.existsSync(partial)) fs.rmSync(partial);
        resolve({
          status: httpStatus ? 'http_error' : 'error', http_status: httpStatus,
          content_type: contentType || null, bytes: null, sha256: null,
          notes: stderr.trim().slice(0, 500) || `curl exit code ${code}`,
        });
      }
    });
  });
}

async function worker() {
  while (true) {
    const index = next++;
    if (index >= queue.length) return;
    const record = queue[index];
    const result = await archiveOne(record);
    Object.assign(record, result);
    done++;
    if (done % 25 === 0 || done === queue.length) {
      console.log(`Archived ${done}/${queue.length}`);
    }
    await new Promise(r => setTimeout(r, 125));
  }
}

Promise.all(Array.from({ length: concurrency }, () => worker())).then(() => {
  const byUrl = new Map(queue.map(record => [record.url, record]));
  for (const record of manifest.records) {
    const result = byUrl.get(record.url);
    for (const key of ['status', 'http_status', 'content_type', 'bytes', 'sha256', 'notes']) {
      record[key] = result[key];
    }
  }
  manifest.archived_at = new Date().toISOString();
  manifest.summary = Object.fromEntries(
    [...new Set(queue.map(x => x.status))].sort().map(status => [status, queue.filter(x => x.status === status).length]),
  );
  manifest.unique_urls = queue.length;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest.summary));
});
