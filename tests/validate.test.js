const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadLucidKey, loadLzString } = require('../scripts/lib/lucid');

const ROOT = path.resolve(__dirname, '..');
const sourcePath = path.join(ROOT, 'salticidae.json');
const archivePath = path.join(ROOT, 'source', 'lucid-original', 'salticidae.json');
const { key: raw } = loadLucidKey(sourcePath);
const normalized = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'normalized', 'key.json'), 'utf8'));
const references = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'manifests', 'references.json'), 'utf8'));
const factSheets = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'normalized', 'fact_sheets.json'), 'utf8'));
const assets = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'manifests', 'assets.json'), 'utf8'));
const lz = loadLzString(path.join(ROOT, 'source', 'lucid-original', 'metadata', 'lz-string.min.js'));

const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const ids = records => new Set(records.map(x => x.id));

test('the original source and archived copy are byte-identical', () => {
  assert.equal(sha(sourcePath), sha(archivePath));
  assert.equal(sha(sourcePath), normalized.provenance.source_sha256);
});

test('top-level source collections and counts are preserved', () => {
  assert.equal(normalized.metadata.title, raw.title);
  assert.equal(normalized.metadata.base_path, raw.basePath);
  assert.equal(normalized.metadata.key_type, raw.keyType);
  assert.equal(normalized.metadata.retain_uncertains, raw.retainUncerts);
  assert.equal(normalized.metadata.allow_misinterpretations, raw.allowMisints);
  assert.equal(normalized.metadata.match_type, raw.matchType);
  assert.equal(normalized.taxa.length, raw.entities.length);
  assert.equal(normalized.features.length, raw.features.length);
  assert.equal(normalized.states.length, raw.states.length);
  assert.equal(normalized.metadata.counts.source_score_vectors, Object.keys(raw.scores).length);
  assert.equal(normalized.scores.length, raw.entities.length * raw.states.length);
  assert.deepEqual(normalized.subsets, raw.subsets);
  assert.equal(normalized.raw_encoded.measures && Object.keys(normalized.raw_encoded.measures).length, Object.keys(raw.measures).length);
  assert.equal(normalized.raw_encoded.scopes && Object.keys(normalized.raw_encoded.scopes).length, Object.keys(raw.scopes).length);
});

test('source records are not silently dropped or altered', () => {
  for (const [sourceRecords, normalizedRecords] of [
    [raw.entities, normalized.taxa], [raw.features, normalized.features], [raw.states, normalized.states],
  ]) {
    assert.equal(sourceRecords.length, normalizedRecords.length);
    sourceRecords.forEach((sourceRecord, i) => {
      for (const [field, value] of Object.entries(sourceRecord)) {
        assert.deepEqual(normalizedRecords[i][field], value, `${normalizedRecords[i].provenance.source_collection}[${i}].${field}`);
      }
    });
  }
});

test('all hierarchy and state references resolve', () => {
  const entityIds = ids(normalized.taxa);
  const featureIds = ids(normalized.features);
  const stateIds = ids(normalized.states);
  for (const entity of normalized.taxa) assert.ok(entity.parent === 0 || entityIds.has(entity.parent));
  for (const feature of normalized.features) {
    assert.ok(feature.parent === 0 || featureIds.has(feature.parent));
    for (const stateId of feature.states || []) assert.ok(stateIds.has(stateId));
  }
  for (const state of normalized.states) assert.ok(featureIds.has(state.feature));
});

test('UUIDs are unique globally and collection IDs are unique', () => {
  const all = [...normalized.taxa, ...normalized.features, ...normalized.states];
  assert.equal(new Set(all.map(x => x.uid)).size, all.length);
  for (const records of [normalized.taxa, normalized.features, normalized.states]) {
    assert.equal(ids(records).size, records.length);
  }
});

test('every score cell resolves and exactly reproduces its decoded raw vector', () => {
  const entityIds = ids(normalized.taxa);
  const featureIds = ids(normalized.features);
  const stateIds = ids(normalized.states);
  const scoreByPair = new Map(normalized.scores.map(x => [`${x.state_id}:${x.entity_id}`, x]));
  assert.equal(scoreByPair.size, normalized.scores.length);
  for (const score of normalized.scores) {
    assert.ok(entityIds.has(score.entity_id));
    assert.ok(featureIds.has(score.feature_id));
    assert.ok(stateIds.has(score.state_id));
  }
  for (const state of raw.states) {
    const decoded = lz.decompressFromBase64(raw.scores[String(state.id)]);
    assert.equal(decoded.length, raw.entities.length);
    raw.entities.forEach((entity, offset) => {
      const score = scoreByPair.get(`${state.id}:${entity.id}`);
      assert.equal(String(score.raw_code), decoded[offset]);
      assert.equal(score.source_vector_offset, offset);
      assert.equal(score.feature_id, state.feature);
    });
  }
});

test('dependencies reproduce the raw compressed dependency map', () => {
  const featureIds = ids(normalized.features);
  const stateIds = ids(normalized.states);
  for (const dependency of normalized.dependencies) {
    assert.ok(stateIds.has(dependency.controlling_state_id));
    assert.ok(featureIds.has(dependency.dependent_feature_id));
  }
  const rebuilt = {};
  for (const dependency of normalized.dependencies) {
    (rebuilt[dependency.source_map_key] ||= []).push(dependency.source_fragment);
  }
  for (const [stateId, compressed] of Object.entries(raw.dependencies)) {
    assert.equal(rebuilt[stateId].join('::'), lz.decompressFromBase64(compressed));
  }
});

test('all external media occurrences are present in the reference manifest', () => {
  const expected = [];
  for (const collection of [raw.features, raw.states, raw.entities]) {
    for (const record of collection) {
      for (const item of record.text || []) expected.push(item.path);
      for (const item of record.images || []) {
        expected.push(item.path);
        if (item.thumb_path) expected.push(item.thumb_path);
      }
    }
  }
  assert.equal(references.records.length, expected.length);
  assert.deepEqual(references.records.map(x => x.source_path).sort(), expected.sort());
  assert.ok(references.records.every(x => x.status === 'downloaded'));
  for (const record of new Map(references.records.map(x => [x.url, x])).values()) {
    const full = path.join(ROOT, record.local_path);
    assert.ok(fs.existsSync(full), record.local_path);
    assert.equal(fs.statSync(full).size, record.bytes);
  }
});

test('the unified asset inventory has no unexamined pending records', () => {
  assert.equal(assets.records.filter(x => x.status === 'pending').length, 0);
  assert.equal(assets.summary.unique_assets, assets.records.length);
});

test('all entity fact sheets are archived and structurally extracted', () => {
  assert.equal(factSheets.sheets.length, raw.entities.length);
  assert.deepEqual(new Set(factSheets.sheets.map(x => x.entity_id)), new Set(raw.entities.map(x => x.id)));
  for (const sheet of factSheets.sheets) {
    assert.ok(sheet.sections.length >= 1, sheet.entity_name);
    if (sheet.entity_id !== 1) {
      assert.ok(sheet.sections.length >= 4, sheet.entity_name);
      assert.ok(sheet.sections.some(x => x.id.toLowerCase() === 'taxonomy'), sheet.entity_name);
      assert.ok(sheet.sections.some(x => x.id.toLowerCase() === 'references'), sheet.entity_name);
    }
    assert.ok(fs.existsSync(path.join(ROOT, sheet.local_path)), sheet.local_path);
  }
});

test('semantic spot-checks match raw vectors for five requested genera', () => {
  const targets = ['Holoplatys', 'Opisthoncus', 'Servaea', 'Ananeon', 'Maratus'];
  const stateById = new Map(normalized.states.map(x => [x.id, x]));
  const featureById = new Map(normalized.features.map(x => [x.id, x]));
  for (const target of targets) {
    const entityIndex = raw.entities.findIndex(x => x.name.startsWith(target + ' '));
    assert.notEqual(entityIndex, -1, target);
    const entity = raw.entities[entityIndex];
    const scored = normalized.scores.filter(x => x.entity_id === entity.id && x.raw_code !== 0);
    for (const score of scored) {
      const rawCode = lz.decompressFromBase64(raw.scores[String(score.state_id)])[entityIndex];
      assert.equal(String(score.raw_code), rawCode);
    }
    const preview = scored.filter(score => score.state_id > 6).slice(0, 4).map(score => {
      const state = stateById.get(score.state_id);
      return `${featureById.get(score.feature_id).name} = ${state.name} [${score.score_type}]`;
    });
    console.log(`${target} (entity ${entity.id}): ${scored.length} non-absent states; ${preview.join('; ')}`);
  }
});
