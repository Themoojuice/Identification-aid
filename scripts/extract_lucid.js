#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadLucidKey, loadLzString, decodeBase64Map } = require('./lib/lucid');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'salticidae.json');
const LZ = path.join(ROOT, 'source', 'lucid-original', 'metadata', 'lz-string.min.js');
const OUTPUT = path.join(ROOT, 'data', 'normalized', 'key.json');
const REFS = path.join(ROOT, 'data', 'manifests', 'references.json');
const REMOTE_MEDIA_ROOT = 'https://apps.lucidcentral.org/salticidae/key/salticidae/Media/';
const LOCAL_MEDIA_ROOT = 'source/lucid-original/Media/';
const priorReferenceByUrl = fs.existsSync(REFS)
  ? new Map(JSON.parse(fs.readFileSync(REFS, 'utf8')).records.map(x => [x.url, x]))
  : new Map();

const SCORE_TYPES = {
  '0': 'absent',
  '1': 'common',
  '2': 'rare',
  '3': 'uncertain',
  '4': 'common_misinterpreted',
  '5': 'rare_misinterpreted',
};
const DEPENDENCY_TYPES = { '1': 'negative', '2': 'positive' };
const FEATURE_TYPES = { 0: 'group', 1: 'multistate', 2: 'numeric' };
const MEDIA_TYPES = { 1: 'image', 2: 'html' };

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function normalizedRelativePath(sourcePath) {
  return decodeURIComponent(sourcePath.replace(/\\/g, '/'));
}

function absoluteUrl(sourcePath) {
  return new URL(sourcePath.replace(/\\/g, '/'), REMOTE_MEDIA_ROOT).href;
}

function referenceRecord(ownerType, owner, ref, role, ordinal) {
  const sourcePath = ref.path;
  const rel = normalizedRelativePath(sourcePath);
  const url = absoluteUrl(sourcePath);
  const localPath = LOCAL_MEDIA_ROOT + rel;
  const fullLocalPath = path.join(ROOT, localPath);
  const exists = fs.existsSync(fullLocalPath);
  const prior = priorReferenceByUrl.get(url);
  return {
    id: `${ownerType}:${owner.id}:${role}:${ordinal}`,
    source: ownerType,
    source_id: owner.id,
    source_uid: owner.uid || null,
    source_name: owner.name || null,
    role,
    lucid_media_type: ref.type,
    type: MEDIA_TYPES[ref.type] || 'unknown',
    caption: ref.caption || null,
    comments: ref.comments || null,
    source_path: sourcePath,
    url,
    local_path: localPath,
    status: exists ? 'downloaded' : (prior?.status || 'pending'),
    http_status: prior?.http_status || null,
    content_type: prior?.content_type || (exists ? (ref.type === 1 ? 'image/jpeg' : 'text/html') : null),
    bytes: exists ? fs.statSync(fullLocalPath).size : (prior?.bytes || null),
    sha256: exists ? sha256(fullLocalPath) : (prior?.sha256 || null),
    provenance_sensitive: true,
    notes: null,
  };
}

function main() {
  const { key, wrapper } = loadLucidKey(SOURCE);
  const lz = loadLzString(LZ);
  const entityIds = new Set(key.entities.map(x => x.id));
  const stateIds = new Set(key.states.map(x => x.id));
  const featureIds = new Set(key.features.map(x => x.id));
  const stateById = new Map(key.states.map(x => [x.id, x]));
  const decodedScores = decodeBase64Map(key.scores, lz);
  const decodedDependencies = decodeBase64Map(key.dependencies, lz);
  const decodedMeasures = decodeBase64Map(key.measures, lz);
  const decodedScopes = decodeBase64Map(key.scopes, lz);

  const taxa = key.entities.map((entity, sourceIndex) => ({
    ...entity,
    kind: 'taxon',
    entity_type_name: entity.type === 1 ? 'entity' : 'unknown',
    source_index: sourceIndex,
    provenance: { source_collection: 'entities', source_id: entity.id, source_uid: entity.uid },
  }));
  const features = key.features.map((feature, sourceIndex) => ({
    ...feature,
    kind: FEATURE_TYPES[feature.type] || 'unknown',
    source_index: sourceIndex,
    provenance: { source_collection: 'features', source_id: feature.id, source_uid: feature.uid },
  }));
  const states = key.states.map((state, sourceIndex) => ({
    ...state,
    kind: 'categorical_state',
    source_index: sourceIndex,
    provenance: { source_collection: 'states', source_id: state.id, source_uid: state.uid },
  }));

  const scores = [];
  for (const state of key.states) {
    const raw = decodedScores[String(state.id)];
    if (!raw || raw.decoded == null) throw new Error(`Missing/undecodable score vector for state ${state.id}`);
    if (raw.decoded.length !== key.entities.length) {
      throw new Error(`State ${state.id} score vector length ${raw.decoded.length} != entity count ${key.entities.length}`);
    }
    key.entities.forEach((entity, entityIndex) => {
      const rawCode = raw.decoded[entityIndex];
      if (!SCORE_TYPES[rawCode]) throw new Error(`Unknown score code ${rawCode} at state ${state.id}, entity ${entity.id}`);
      scores.push({
        entity_id: entity.id,
        entity_uid: entity.uid,
        feature_id: state.feature,
        state_id: state.id,
        state_uid: state.uid,
        raw_code: Number(rawCode),
        score_type: SCORE_TYPES[rawCode],
        source_vector_key: String(state.id),
        source_vector_offset: entityIndex,
      });
    });
  }

  const dependencies = [];
  for (const [controllingStateId, raw] of Object.entries(decodedDependencies)) {
    const parts = raw.decoded.split('::');
    for (const part of parts) {
      const [featureIdText, typeText] = part.split(':');
      const featureId = Number(featureIdText);
      const dependencyCode = Number(typeText);
      dependencies.push({
        controlling_state_id: Number(controllingStateId),
        controlling_state_uid: stateById.get(Number(controllingStateId))?.uid || null,
        dependent_feature_id: featureId,
        raw_dependency_code: dependencyCode,
        dependency_type: DEPENDENCY_TYPES[typeText] || 'unknown',
        source_map_key: controllingStateId,
        source_fragment: part,
      });
    }
  }

  const references = [];
  const media = [];
  const factSheets = [];
  for (const [ownerType, owners] of [['feature', key.features], ['character_state', key.states], ['entity', key.entities]]) {
    for (const owner of owners) {
      (owner.text || []).forEach((ref, i) => {
        const rec = referenceRecord(ownerType, owner, ref, ref.type === 2 ? 'fact_sheet' : 'text', i);
        references.push(rec);
        if (rec.role === 'fact_sheet') factSheets.push({ ...rec });
      });
      (owner.images || []).forEach((ref, i) => {
        const full = referenceRecord(ownerType, owner, ref, 'full_image', i);
        references.push(full);
        media.push({ ...full });
        if (ref.thumb_path) {
          const thumb = referenceRecord(ownerType, owner, { ...ref, path: ref.thumb_path }, 'thumbnail', i);
          references.push(thumb);
          media.push({ ...thumb });
        }
      });
    }
  }

  const normalized = {
    format: 'taxonomytool.lucid.normalized.v1',
    metadata: {
      title: key.title,
      base_path: key.basePath,
      key_type: key.keyType,
      retain_uncertains: key.retainUncerts,
      allow_misinterpretations: key.allowMisints,
      match_type: key.matchType,
      counts: {
        entities: key.entities.length,
        features_total: key.features.length,
        feature_groups: key.features.filter(x => x.type === 0).length,
        character_features: key.features.filter(x => x.type !== 0).length,
        states: key.states.length,
        source_score_vectors: Object.keys(key.scores).length,
        atomic_score_cells: scores.length,
        dependencies: dependencies.length,
        source_dependency_vectors: Object.keys(key.dependencies).length,
        measures: Object.keys(key.measures).length,
        scopes: Object.keys(key.scopes).length,
        subsets: key.subsets.length,
        reference_records: references.length,
        media_records: media.length,
        fact_sheet_records: factSheets.length,
      },
      enum_maps: {
        score_types: SCORE_TYPES,
        dependency_types: DEPENDENCY_TYPES,
        feature_types: FEATURE_TYPES,
        media_types: MEDIA_TYPES,
      },
    },
    taxa,
    features,
    states,
    scores,
    dependencies,
    measures: [],
    scopes: [],
    subsets: key.subsets,
    media,
    fact_sheets: factSheets,
    raw_encoded: {
      scores: decodedScores,
      dependencies: decodedDependencies,
      measures: decodedMeasures,
      scopes: decodedScopes,
    },
    provenance: {
      source_file: 'salticidae.json',
      archived_copy: 'source/lucid-original/salticidae.json',
      source_sha256: sha256(SOURCE),
      source_wrapper: wrapper,
      source_url: 'https://apps.lucidcentral.org/salticidae/key/salticidae.json',
      live_key_url: 'https://apps.lucidcentral.org/salticidae/',
      extraction_script: 'scripts/extract_lucid.js',
      extraction_date: new Date().toISOString().slice(0, 10),
      transformations: [
        'Removed only the outer JavaScript variable assignment for parsing.',
        'Decoded score, dependency, measure, and scope values with the archived Lucid-provided LZString implementation.',
        'Expanded every state score vector into one record per source entity while retaining raw vectors and offsets.',
        'Resolved relative media paths against the source base path without altering source path strings.',
      ],
    },
  };

  for (const feature of features) {
    if (feature.parent !== 0 && !featureIds.has(feature.parent)) throw new Error(`Unresolved feature parent ${feature.parent}`);
  }
  for (const entity of taxa) {
    if (entity.parent !== 0 && !entityIds.has(entity.parent)) throw new Error(`Unresolved entity parent ${entity.parent}`);
  }
  for (const state of states) {
    if (!featureIds.has(state.feature)) throw new Error(`Unresolved state feature ${state.feature}`);
  }
  for (const dep of dependencies) {
    if (!stateIds.has(dep.controlling_state_id) || !featureIds.has(dep.dependent_feature_id)) {
      throw new Error(`Unresolved dependency ${JSON.stringify(dep)}`);
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.mkdirSync(path.dirname(REFS), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(normalized, null, 2) + '\n');
  fs.writeFileSync(REFS, JSON.stringify({
    format: 'taxonomytool.reference-manifest.v1',
    generated_from: 'salticidae.json',
    generated_at: new Date().toISOString(),
    unique_urls: new Set(references.map(x => x.url)).size,
    records: references,
  }, null, 2) + '\n');
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)} (${scores.length} score cells)`);
  console.log(`Wrote ${path.relative(ROOT, REFS)} (${references.length} reference occurrences)`);
}

main();
