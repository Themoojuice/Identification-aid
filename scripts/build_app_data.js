const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const key = JSON.parse(fs.readFileSync(path.join(root, 'data', 'normalized', 'key.json'), 'utf8'));
const facts = JSON.parse(fs.readFileSync(path.join(root, 'data', 'normalized', 'fact_sheets.json'), 'utf8'));
const curated = JSON.parse(fs.readFileSync(path.join(root, 'data', 'curated', 'character_metadata.json'), 'utf8'));
const curatedStateMedia = JSON.parse(fs.readFileSync(path.join(root, 'data', 'curated', 'state_media.json'), 'utf8'));
const outputDirectory = path.join(root, 'public', 'data');
const mediaDirectory = path.join(root, 'source', 'lucid-original', 'media');

fs.mkdirSync(outputDirectory, { recursive: true });

const compact = {
  format: 'australian-salticidae-app-data@1',
  generated_from: key.provenance.source_file,
  source_sha256: key.provenance.source_sha256,
  metadata: key.metadata,
  taxa: key.taxa,
  features: key.features,
  states: key.states,
  dependencies: key.dependencies,
  curated_state_media: curatedStateMedia,
  score_vectors: Object.fromEntries(
    Object.entries(key.raw_encoded.scores).map(([stateId, score]) => [stateId, score.decoded]),
  ),
};

if (compact.taxa.length !== key.metadata.counts.entities || compact.states.length !== key.metadata.counts.states) {
  throw new Error('App data count check failed.');
}

function validateMediaPath(sourcePath, owner) {
  if (!sourcePath) return;
  let decoded;
  try { decoded = decodeURIComponent(sourcePath); } catch { decoded = sourcePath; }
  const resolved = path.resolve(mediaDirectory, ...decoded.split('/'));
  if (!resolved.startsWith(path.resolve(mediaDirectory)) || !fs.existsSync(resolved) || fs.statSync(resolved).size === 0) {
    throw new Error(`Missing archived media for ${owner}: ${sourcePath}`);
  }
}

for (const record of [...compact.taxa, ...compact.features, ...compact.states]) {
  for (const image of record.images || []) {
    validateMediaPath(image.path, `${record.kind || 'state'} ${record.id}`);
    validateMediaPath(image.thumb_path, `${record.kind || 'state'} ${record.id} thumbnail`);
  }
}
for (const [stateId, images] of Object.entries(curatedStateMedia.records)) {
  for (const image of images) {
    validateMediaPath(image.path, `curated state ${stateId}`);
    validateMediaPath(image.thumb_path, `curated state ${stateId} thumbnail`);
  }
}

fs.writeFileSync(path.join(outputDirectory, 'key.json'), JSON.stringify(compact));
fs.writeFileSync(path.join(outputDirectory, 'fact_sheets.json'), JSON.stringify(facts));
fs.writeFileSync(path.join(outputDirectory, 'character_metadata.json'), JSON.stringify(curated, null, 2));
console.log(`App data prepared: ${compact.taxa.length - 1} genera, ${compact.features.length} features, ${compact.states.length} states.`);
