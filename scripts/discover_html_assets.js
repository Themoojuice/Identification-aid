#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const ARCHIVE = path.join(ROOT, 'source', 'lucid-original');
const output = path.join(ROOT, 'data', 'manifests', 'html_assets.json');
const previous = fs.existsSync(output)
  ? new Map(JSON.parse(fs.readFileSync(output, 'utf8')).records.map(x => [x.url, x]))
  : new Map();
const SITE_ROOT = 'https://apps.lucidcentral.org/salticidae/';
const MEDIA_ROOT_PATH = '/salticidae/key/salticidae/Media/';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function sourceUrl(file) {
  const rel = path.relative(ARCHIVE, file).replace(/\\/g, '/');
  if (rel.startsWith('Media/')) return new URL(rel.slice('Media/'.length), SITE_ROOT + 'key/salticidae/Media/').href;
  if (rel === 'fact-sheets/index.htm') return SITE_ROOT + 'key/salticidae/Media/Html/entities/index.htm';
  if (rel === 'html/index.html') return SITE_ROOT;
  if (rel === 'html/key.html') return SITE_ROOT + 'key.html';
  if (rel === 'html/about.html') return SITE_ROOT + 'about.html';
  return null;
}

function localDestination(url) {
  const parsed = new URL(url);
  if (parsed.hostname !== 'apps.lucidcentral.org') return null;
  if (parsed.pathname.startsWith(MEDIA_ROOT_PATH)) {
    const rel = decodeURIComponent(parsed.pathname.slice(MEDIA_ROOT_PATH.length));
    return 'source/lucid-original/Media/' + rel;
  }
  if (parsed.pathname.startsWith('/salticidae/assets/')) {
    return 'source/lucid-original/site/assets/' + decodeURIComponent(parsed.pathname.slice('/salticidae/assets/'.length));
  }
  if (parsed.pathname.startsWith('/salticidae/logos/')) {
    return 'source/lucid-original/site/logos/' + decodeURIComponent(parsed.pathname.slice('/salticidae/logos/'.length));
  }
  const exact = {
    '/salticidae/': 'source/lucid-original/html/index.html',
    '/salticidae/about.html': 'source/lucid-original/html/about.html',
    '/salticidae/key.html': 'source/lucid-original/html/key.html',
    '/salticidae/key/salticidae.json': 'source/lucid-original/salticidae.json',
  };
  return exact[parsed.pathname] || null;
}

function classify(url) {
  const u = new URL(url);
  const lower = u.pathname.toLowerCase();
  if (u.hostname !== 'apps.lucidcentral.org') return 'EXTERNAL REFERENCE';
  if (/\.(?:jpe?g|png|gif|webp|svg)$/.test(lower)) return 'MEDIA';
  if (lower.endsWith('.pdf')) return 'TAXONOMIC TEXT';
  if (/\/html\/entities\/.*\.html?$/.test(lower)) return 'TAXONOMIC TEXT';
  if (lower.endsWith('glossary.htm') || lower.endsWith('about.html')) return 'HELP / DOCUMENTATION';
  if (/\.(?:js|css)$/.test(lower) || lower.includes('/cdn-cgi/')) return 'PLAYER-ONLY / NOT NEEDED';
  return 'UNKNOWN';
}

function shouldDownload(record) {
  if (!record.local_path) return false;
  if (record.classification === 'TAXONOMIC TEXT' || record.classification === 'MEDIA' || record.classification === 'HELP / DOCUMENTATION') return true;
  return record.url.endsWith('/css/template.css');
}

const htmlFiles = [
  ...walk(path.join(ARCHIVE, 'html')),
  ...walk(path.join(ARCHIVE, 'fact-sheets')),
  ...walk(path.join(ARCHIVE, 'Media', 'Html')),
].filter(file => /\.html?$/i.test(file));

const cssFiles = [
  path.join(ARCHIVE, 'metadata', 'salticidae.css'),
  ...walk(path.join(ARCHIVE, 'Media', 'Html')).filter(file => /\.css$/i.test(file)),
].filter(file => fs.existsSync(file));

const byUrl = new Map();
for (const file of htmlFiles) {
  const base = sourceUrl(file);
  if (!base) continue;
  const text = fs.readFileSync(file, 'utf8');
  const attrs = /\b(href|src|data-src)\s*=\s*(["'])(.*?)\2/gi;
  for (const match of text.matchAll(attrs)) {
    const raw = match[3].replace(/&amp;/g, '&').trim();
    if (!raw || raw === '#' || /^(?:javascript|mailto|tel|data):/i.test(raw)) continue;
    let url;
    try { url = new URL(raw, base); } catch { continue; }
    url.hash = '';
    const href = url.href;
    const localPath = localDestination(href);
    let record = byUrl.get(href);
    if (!record) {
      const prior = previous.get(href) || {};
      const existing = localPath && fs.existsSync(path.join(ROOT, localPath));
      record = {
        url: href,
        local_path: localPath,
        asset_type: path.extname(url.pathname).slice(1).toLowerCase() || 'page',
        classification: classify(href),
        source_pages: [],
        attributes: [],
        raw_values: [],
        should_download: false,
        status: existing ? 'downloaded' : (prior.status || 'pending'),
        http_status: prior.http_status || null,
        content_type: prior.content_type || null,
        bytes: existing ? fs.statSync(path.join(ROOT, localPath)).size : (prior.bytes || null),
        sha256: existing ? crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, localPath))).digest('hex') : (prior.sha256 || null),
        notes: prior.notes || null,
      };
      byUrl.set(href, record);
    }
    if (!record.source_pages.includes(base)) record.source_pages.push(base);
    if (!record.attributes.includes(match[1].toLowerCase())) record.attributes.push(match[1].toLowerCase());
    if (!record.raw_values.includes(raw)) record.raw_values.push(raw);
    record.should_download ||= shouldDownload(record);
    if (/^https?:\/\//i.test(raw) === false && /^https?\/\//i.test(raw)) {
      record.classification = 'EXTERNAL REFERENCE';
      record.should_download = false;
      record.status = 'broken_reference';
      record.notes = 'Malformed absolute URL in source: missing colon after scheme.';
    }
    if (href === 'https://doi/') {
      record.status = 'broken_reference';
      record.should_download = false;
      record.notes = 'Malformed/incomplete DOI URL in source.';
    }
  }
}

for (const file of cssFiles) {
  const rel = path.relative(ARCHIVE, file).replace(/\\/g, '/');
  const base = rel === 'metadata/salticidae.css'
    ? SITE_ROOT + 'assets/css/salticidae.css'
    : sourceUrl(file);
  if (!base) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    const raw = match[2].trim();
    if (!raw || raw.startsWith('data:')) continue;
    const url = new URL(raw, base);
    url.hash = '';
    const href = url.href;
    const localPath = localDestination(href);
    let record = byUrl.get(href);
    if (!record) {
      const existing = localPath && fs.existsSync(path.join(ROOT, localPath));
      record = {
        url: href, local_path: localPath,
        asset_type: path.extname(url.pathname).slice(1).toLowerCase() || 'asset',
        classification: classify(href), source_pages: [], attributes: ['css:url'], raw_values: [],
        should_download: false, status: existing ? 'downloaded' : 'pending', http_status: null,
        content_type: null, bytes: existing ? fs.statSync(path.join(ROOT, localPath)).size : null,
        sha256: existing ? crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, localPath))).digest('hex') : null,
        notes: null,
      };
      byUrl.set(href, record);
    }
    if (!record.source_pages.includes(base)) record.source_pages.push(base);
    if (!record.attributes.includes('css:url')) record.attributes.push('css:url');
    if (!record.raw_values.includes(raw)) record.raw_values.push(raw);
    record.should_download ||= shouldDownload(record);
  }
}

for (const record of byUrl.values()) {
  if (!record.should_download && record.status === 'pending') record.status = 'intentionally_not_downloaded';
}

const manifest = {
  format: 'taxonomytool.html-asset-manifest.v1',
  generated_at: new Date().toISOString(),
  scanned_html_files: htmlFiles.length,
  scanned_css_files: cssFiles.length,
  records: [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url)),
};
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Scanned ${htmlFiles.length} HTML files; discovered ${manifest.records.length} unique linked resources.`);
console.log(Object.fromEntries([...new Set(manifest.records.map(x => x.classification))].map(c => [c, manifest.records.filter(x => x.classification === c).length])));
