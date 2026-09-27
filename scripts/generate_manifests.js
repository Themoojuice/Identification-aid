#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const read = rel => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const jsonRefs = read('data/manifests/references.json');
jsonRefs.unique_urls ??= new Set(jsonRefs.records.map(x => x.url)).size;
const htmlAssets = read('data/manifests/html_assets.json');
const playerAssets = read('data/manifests/player_assets.json');
const byUrl = new Map();

const priority = { downloaded: 10, broken_reference: 8, http_error: 7, inaccessible: 6, reachable_not_archived: 5, observed_live_not_archived: 4, intentionally_not_downloaded: 3, pending: 1 };
const clean = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const shorten = (values, limit = 3) => {
  const unique = [...new Set(values.filter(Boolean))];
  return unique.length <= limit ? unique.join('; ') : `${unique.slice(0, limit).join('; ')}; +${unique.length - limit} more`;
};

function merge(record) {
  const current = byUrl.get(record.url);
  if (!current) {
    byUrl.set(record.url, {
      url: record.url,
      local_path: record.local_path || null,
      asset_type: record.asset_type || record.type || path.extname(new URL(record.url).pathname).slice(1).toLowerCase() || 'page',
      classification: record.classification || 'UNKNOWN',
      associations: [...(record.associations || [])],
      captions: [...(record.captions || [])],
      source_pages: [...(record.source_pages || [])],
      status: record.status,
      http_status: record.http_status || null,
      content_type: record.content_type || null,
      bytes: record.bytes || null,
      sha256: record.sha256 || null,
      provenance_sensitive: record.provenance_sensitive ?? ['CORE LOGIC', 'TAXONOMIC TEXT', 'MEDIA'].includes(record.classification),
      notes: record.notes || null,
    });
    return;
  }
  current.local_path ||= record.local_path || null;
  current.associations.push(...(record.associations || []));
  current.captions.push(...(record.captions || []));
  current.source_pages.push(...(record.source_pages || []));
  if ((priority[record.status] || 0) > (priority[current.status] || 0)) {
    for (const field of ['status', 'http_status', 'content_type', 'bytes', 'sha256', 'notes']) current[field] = record[field] ?? current[field];
  }
  if (current.classification === 'UNKNOWN' && record.classification !== 'UNKNOWN') current.classification = record.classification;
  current.provenance_sensitive ||= record.provenance_sensitive || ['CORE LOGIC', 'TAXONOMIC TEXT', 'MEDIA'].includes(record.classification);
}

for (const record of jsonRefs.records) {
  merge({
    ...record,
    classification: record.role === 'fact_sheet' ? 'TAXONOMIC TEXT' : 'MEDIA',
    asset_type: record.type,
    associations: [`${record.source}:${record.source_id} ${record.source_name} (${record.role})`],
    captions: [record.caption],
    source_pages: ['salticidae.json'],
    provenance_sensitive: true,
  });
}
for (const record of htmlAssets.records) merge({ ...record, associations: [], captions: [], provenance_sensitive: ['TAXONOMIC TEXT', 'MEDIA'].includes(record.classification) });
for (const record of playerAssets.records) merge({ ...record, asset_type: path.extname(new URL(record.url).pathname).slice(1), associations: [], captions: [], source_pages: [record.discovery], provenance_sensitive: record.classification === 'CORE LOGIC' });

const manuallyArchived = {
  'https://apps.lucidcentral.org/salticidae/assets/css/salticidae.css': 'source/lucid-original/metadata/salticidae.css',
};
for (const [url, localPath] of Object.entries(manuallyArchived)) {
  const full = path.join(ROOT, localPath);
  merge({
    url, local_path: localPath, asset_type: path.extname(full).slice(1),
    classification: 'PLAYER-ONLY / NOT NEEDED', associations: [], captions: [],
    source_pages: ['landing-page source/CSS forensics'], status: 'downloaded',
    bytes: fs.statSync(full).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'),
    provenance_sensitive: false,
    notes: 'Archived to discover key-site background imagery.',
  });
}

const help = {
  'scoring-the-key.html': 'https://help.lucidcentral.org/lucid/scoring-the-key/',
  'how-to-use-the-lucid-scores.html': 'https://help.lucidcentral.org/lucid/how-to-use-the-lucid-scores/',
  'setting-dependencies-for-features.html': 'https://help.lucidcentral.org/lucid/setting-dependencies-for-features/',
  'configuring-the-player.html': 'https://help.lucidcentral.org/lucid/configuring-the-player/',
  'setting-key-options.html': 'https://help.lucidcentral.org/lucid/setting-key-options/',
};
for (const [name, url] of Object.entries(help)) {
  const localPath = `source/lucid-original/help/${name}`;
  const full = path.join(ROOT, localPath);
  merge({ url, local_path: localPath, asset_type: 'html', classification: 'HELP / DOCUMENTATION', associations: ['Lucid scoring/schema semantics'], captions: [], source_pages: ['forensic documentation review'], status: 'downloaded', bytes: fs.statSync(full).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'), provenance_sensitive: false, notes: 'Official Lucid help archived to substantiate semantics.' });
}

const records = [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
for (const record of records) {
  record.associations = [...new Set(record.associations)];
  record.captions = [...new Set(record.captions.filter(Boolean))];
  record.source_pages = [...new Set(record.source_pages)];
}

const manifest = {
  format: 'taxonomytool.asset-manifest.v1',
  generated_at: new Date().toISOString(),
  records,
  summary: {
    unique_assets: records.length,
    by_status: Object.fromEntries([...new Set(records.map(x => x.status))].sort().map(s => [s, records.filter(x => x.status === s).length])),
    by_classification: Object.fromEntries([...new Set(records.map(x => x.classification))].sort().map(s => [s, records.filter(x => x.classification === s).length])),
    downloaded_bytes: records.filter(x => x.status === 'downloaded').reduce((n, x) => n + (x.bytes || 0), 0),
  },
};
fs.writeFileSync(path.join(ROOT, 'data', 'manifests', 'assets.json'), JSON.stringify(manifest, null, 2) + '\n');

const rows = records.map(record => `| ${clean(record.url)} | ${clean(record.local_path || '—')} | ${clean(record.asset_type)} | ${clean(record.classification)} | ${clean(shorten(record.associations)) || '—'} | ${clean(shorten(record.captions, 1)) || '—'} | ${clean(shorten(record.source_pages)) || '—'} | ${clean(record.status)}${record.http_status ? ` (${record.http_status})` : ''} | ${record.provenance_sensitive ? 'yes' : 'no'} | ${clean(record.notes || '—')} |`);
const summaryRows = Object.entries(manifest.summary.by_status).map(([status, count]) => `| ${status} | ${count} |`).join('\n');
const markdown = `# Asset manifest\n\nGenerated from the JSON reference manifest, all archived fact-sheet HTML, CSS \`url(...)\` references, the live loaded-player DOM, and the GWT bootstrap. The machine-readable equivalent is \`data/manifests/assets.json\`. “Provenance-sensitive” is a review flag, not a legal conclusion.\n\n## Summary\n\n- Unique discovered resources: ${manifest.summary.unique_assets}\n- Downloaded bytes represented by the unified manifest: ${manifest.summary.downloaded_bytes}\n- JSON reference occurrences (including repeated associations): ${jsonRefs.records.length}\n- Unique JSON-referenced resources: ${jsonRefs.unique_urls}\n- HTML/CSS-linked resources: ${htmlAssets.records.length}\n- Live/dynamically discovered player resources: ${playerAssets.records.length}\n\n| Status | Count |\n|---|---:|\n${summaryRows}\n\n## Complete inventory\n\n| Original URL | Local destination | Type | Classification | Associated taxon/character/state | Caption | Source page/discovery | Status | Provenance-sensitive | Notes |\n|---|---|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`;
fs.writeFileSync(path.join(ROOT, 'docs', 'ASSET_MANIFEST.md'), markdown);

const allFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full); else allFiles.push(full);
  }
}
walk(path.join(ROOT, 'source', 'lucid-original'));
const archiveMeta = {
  format: 'taxonomytool.source-archive.v1',
  generated_at: new Date().toISOString(),
  source_root: 'source/lucid-original',
  file_count: allFiles.length,
  total_bytes: allFiles.reduce((n, f) => n + fs.statSync(f).size, 0),
  source_payload_sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'salticidae.json'))).digest('hex'),
  request_policy: 'Public resources only; three concurrent requests maximum; no authentication or access-control bypass.',
  manifests: ['data/manifests/references.json', 'data/manifests/html_assets.json', 'data/manifests/player_assets.json', 'data/manifests/assets.json'],
};
fs.writeFileSync(path.join(ROOT, 'source', 'lucid-original', 'metadata', 'archive.json'), JSON.stringify(archiveMeta, null, 2) + '\n');
console.log(JSON.stringify(manifest.summary, null, 2));
console.log(JSON.stringify(archiveMeta, null, 2));
