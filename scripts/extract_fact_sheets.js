#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const keyPath = path.join(ROOT, 'data', 'normalized', 'key.json');
const outputPath = path.join(ROOT, 'data', 'normalized', 'fact_sheets.json');
const data = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const referenceManifestPath = path.join(ROOT, 'data', 'manifests', 'references.json');
const referenceManifest = fs.existsSync(referenceManifestPath) ? JSON.parse(fs.readFileSync(referenceManifestPath, 'utf8')) : null;
const referenceById = new Map((referenceManifest?.records || []).map(x => [x.id, x]));
const REMOTE_ROOT = 'https://apps.lucidcentral.org/salticidae/key/salticidae/Media/';

function decodeEntities(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', ndash: '–', mdash: '—' };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity) => {
    if (entity[0] === '#') {
      const value = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : _;
    }
    return named[entity.toLowerCase()] ?? _;
  });
}

function textOf(html) {
  return decodeEntities(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const sheets = [];
for (const collection of [data.media, data.fact_sheets]) {
  for (const ref of collection) {
    const archived = referenceById.get(ref.id);
    if (archived) {
      for (const field of ['status', 'http_status', 'content_type', 'bytes', 'sha256', 'notes']) ref[field] = archived[field];
    }
    ref.provenance_sensitive = true;
  }
}
for (const ref of data.fact_sheets.filter(x => x.source === 'entity')) {
  const localPath = path.join(ROOT, ref.local_path);
  if (!fs.existsSync(localPath)) throw new Error(`Missing fact sheet ${ref.local_path}`);
  const source = fs.readFileSync(localPath, 'utf8');
  const start = source.search(/<div\s+id=["']fsf_content["'][^>]*>/i);
  const end = source.search(/<div\s+id=["']footer["'][^>]*>/i);
  if (start < 0 || end < 0 || end <= start) throw new Error(`Unrecognized fact-sheet structure: ${ref.local_path}`);
  const content = source.slice(start, end);
  const markers = [...content.matchAll(/<a\s+name=["']([^"']+)["'][^>]*>\s*<\/a>\s*<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const sections = markers.map((match, index) => {
    const sectionStart = match.index + match[0].length;
    const sectionEnd = index + 1 < markers.length ? markers[index + 1].index : content.length;
    const html = content.slice(sectionStart, sectionEnd).trim();
    return { id: match[1], heading: textOf(match[2]), html, text: textOf(html) };
  });
  const baseUrl = new URL(ref.source_path, REMOTE_ROOT).href;
  const links = [...content.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)].map(match => match[2].replace(/&amp;/g, '&')).filter(x => x && x !== '#' && !/^javascript:/i.test(x)).map(raw => {
    let url = null;
    try { url = new URL(raw, baseUrl).href; } catch {}
    return { raw, url };
  });
  const titleMatch = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const copyrightMatch = source.match(/<meta\s+name=["']copyright["']\s+content=["']([^"']*)/i);
  sheets.push({
    entity_id: ref.source_id,
    entity_uid: ref.source_uid,
    entity_name: ref.source_name,
    title: titleMatch ? textOf(titleMatch[1]) : ref.source_name,
    source_path: ref.source_path,
    source_url: baseUrl,
    local_path: ref.local_path,
    sha256: sha(localPath),
    copyright_notice: copyrightMatch ? decodeEntities(copyrightMatch[1]) : null,
    sections,
    links,
    provenance: { extraction: 'lossless section HTML plus derived plain text', source_reference_id: ref.id },
  });
}

fs.writeFileSync(outputPath, JSON.stringify({
  format: 'taxonomytool.fact-sheets.v1',
  generated_at: new Date().toISOString(),
  sheets,
}, null, 2) + '\n');

const byEntity = new Map(sheets.map(x => [x.entity_id, x]));
for (const ref of data.fact_sheets) {
  const sheet = ref.source === 'entity' ? byEntity.get(ref.source_id) : null;
  ref.content_file = sheet ? 'data/normalized/fact_sheets.json' : null;
  ref.section_count = sheet ? sheet.sections.length : null;
  ref.content_sha256 = sheet ? sheet.sha256 : null;
}
data.metadata.counts.normalized_fact_sheets = sheets.length;
data.metadata.counts.normalized_fact_sheet_sections = sheets.reduce((n, x) => n + x.sections.length, 0);
fs.writeFileSync(keyPath, JSON.stringify(data, null, 2) + '\n');
console.log(`Extracted ${sheets.length} fact sheets with ${data.metadata.counts.normalized_fact_sheet_sections} sections.`);
