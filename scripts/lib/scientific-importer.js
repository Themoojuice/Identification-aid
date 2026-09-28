const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SCORE_CLASSES = [
  'absent', 'common', 'rare', 'uncertain', 'common_misinterpreted', 'rare_misinterpreted',
];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function contentId(namespace, value) {
  return `as:${namespace}:${sha256(canonical(value)).slice(0, 20)}`;
}

function pointerEscape(value) {
  return String(value).replace(/~/g, '~0').replace(/\//g, '~1');
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function fail(message) {
  throw new Error(`Scientific import failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertUnique(records, getId, label) {
  const seen = new Set();
  for (const record of records) {
    const id = getId(record);
    assert(id != null && id !== '', `${label} has a missing ID`);
    assert(!seen.has(id), `${label} has duplicate ID ${id}`);
    seen.add(id);
  }
  return seen;
}

function packetAliasFor(file, pointer, record) {
  const top = pointer.split('/').filter(Boolean);
  const collection = top[0];
  if (file === '01_lucid_schema.json') {
    if (collection === 'feature_groups') return record.id;
    if (collection === 'features') return record.id;
    if (collection === 'states') return record.id;
    if (collection === 'taxa') return record.id;
  }
  if (file === '03_lucid_dependencies.json' && collection === 'dependencies') return record.id;
  if (file === '04_taxon_concepts.json' && collection === 'concepts') return record.concept_id;
  if (file === '05_schubert_genus_characters.json' && collection === 'characters') {
    if (top.length === 2) return record.character_id;
    if (top.includes('states')) return record.state_id;
  }
  if (file === '05_schubert_genus_characters.json' && collection === 'published_key' && top.includes('nodes')) return record.node_id;
  if (file === '06_taxon_crosswalk.json' && collection === 'mappings') return record.mapping_id;
  if (file === '07_species_hints.json' && collection === 'species') return record.species_id;
  if (file === '08_media_manifest.json' && collection === 'media') return record.media_id;
  if (file === '09_examples.json' && collection === 'examples') return record.id;
  return null;
}

function persistentIdFor(file, pointer, record) {
  const packetAlias = packetAliasFor(file, pointer, record);
  if (file === '01_lucid_schema.json' && record.original_uid) {
    const kind = pointer.startsWith('/taxa/') ? 'source-entity'
      : pointer.startsWith('/feature_groups/') ? 'feature-group'
        : pointer.startsWith('/features/') ? 'feature' : 'state';
    return `as:lucid:${kind}:${record.original_uid.toLowerCase()}`;
  }
  if (packetAlias) {
    const kind = packetAlias.replace(/[0-9].*$/, '').toLowerCase();
    return `as:packet:${kind}:${packetAlias.toLowerCase()}`;
  }
  return contentId(`record:${file.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`, record);
}

function aliasesFor(record, packetAlias) {
  const aliases = [];
  if (packetAlias) aliases.push({ scheme: 'packet_id', value: packetAlias });
  if (record.original_id != null) aliases.push({ scheme: 'original_numeric_id', value: String(record.original_id) });
  if (record.original_uid) aliases.push({ scheme: 'original_uid', value: record.original_uid });
  if (record.file_path) aliases.push({ scheme: 'source_path', value: record.file_path });
  if (record.source_reference) aliases.push({ scheme: 'source_reference', value: record.source_reference });
  return aliases;
}

function collectRecordProvenance(file, packetSha256, value, evidenceClass) {
  const records = [];
  function walk(node, pointer, parentAlias = null) {
    if (Array.isArray(node)) {
      node.forEach((item, index) => {
        const itemPointer = `${pointer}/${index}`;
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const packetAlias = packetAliasFor(file, itemPointer, item);
          const subjectId = packetAlias || item.original_uid
            ? persistentIdFor(file, itemPointer, item)
            : contentId(`record:${file.replace(/[^a-z0-9]/gi, '-').toLowerCase()}:${parentAlias || 'root'}`, item);
          records.push({
            id: contentId('provenance', { file, itemPointer, subjectId }),
            subjectId,
            locator: { packetFile: file, jsonPointer: itemPointer, packetSha256 },
            aliases: aliasesFor(item, packetAlias),
            rawRecordSha256: sha256(canonical(item)),
            evidenceClass,
          });
          walk(item, itemPointer, packetAlias || parentAlias);
          return;
        }
        walk(item, itemPointer, parentAlias);
      });
      return;
    }
    if (node && typeof node === 'object') {
      for (const [key, item] of Object.entries(node)) walk(item, `${pointer}/${pointerEscape(key)}`, parentAlias);
    }
  }
  walk(value, '');
  return records;
}

function fieldInventory(value) {
  const fields = new Map();
  function walk(node, pointer) {
    const type = Array.isArray(node) ? 'array' : node === null ? 'null' : typeof node;
    const entry = fields.get(pointer) || { path: pointer || '/', occurrences: 0, types: new Set() };
    entry.occurrences += 1;
    entry.types.add(type);
    fields.set(pointer, entry);
    if (Array.isArray(node)) node.forEach((item) => walk(item, `${pointer}[]`));
    else if (node && typeof node === 'object') {
      for (const [key, item] of Object.entries(node)) walk(item, `${pointer}/${pointerEscape(key)}`);
    }
  }
  walk(value, '');
  return [...fields.values()].map((entry) => ({
    path: entry.path,
    occurrences: entry.occurrences,
    types: [...entry.types].sort(),
    retention: 'raw_snapshot',
  })).sort((a, b) => a.path.localeCompare(b.path));
}

function validateReferences(data) {
  const schema = data['01_lucid_schema.json'];
  const matrix = data['02_lucid_matrix.json'];
  const dependencies = data['03_lucid_dependencies.json'];
  const concepts = data['04_taxon_concepts.json'];
  const schubert = data['05_schubert_genus_characters.json'];
  const crosswalk = data['06_taxon_crosswalk.json'];
  const species = data['07_species_hints.json'];
  const media = data['08_media_manifest.json'];

  const groupIds = assertUnique(schema.feature_groups, (x) => x.id, 'Lucid feature group');
  const featureIds = assertUnique(schema.features, (x) => x.id, 'Lucid feature');
  const stateIds = assertUnique(schema.states, (x) => x.id, 'Lucid state');
  const taxonIds = assertUnique(schema.taxa, (x) => x.id, 'Lucid taxon');
  assert(schema.taxa.filter((x) => x.is_root).length === 1, 'Lucid root count is not exactly one');
  for (const feature of schema.features) {
    assert(groupIds.has(feature.group_id), `${feature.id} references missing group ${feature.group_id}`);
    for (const stateId of feature.state_ids) assert(stateIds.has(stateId), `${feature.id} references missing state ${stateId}`);
  }
  for (const state of schema.states) assert(featureIds.has(state.feature_id), `${state.id} references missing feature ${state.feature_id}`);
  for (const taxon of schema.taxa) {
    assert(taxon.is_root ? taxon.parent_id === null : taxonIds.has(taxon.parent_id), `${taxon.id} has invalid parent ${taxon.parent_id}`);
  }

  assert(matrix.taxon_ids.length === 86, `matrix taxon dimension is ${matrix.taxon_ids.length}, expected 86`);
  assert(Object.keys(matrix.state_scores).length === 296, `matrix state dimension is ${Object.keys(matrix.state_scores).length}, expected 296`);
  assert(new Set(matrix.taxon_ids).size === 86 && matrix.taxon_ids.every((id) => taxonIds.has(id)), 'matrix taxon order has duplicates or unknown references');
  assert(Object.keys(matrix.state_scores).every((id) => stateIds.has(id)), 'matrix contains an unknown state reference');

  const scoreCounts = Object.fromEntries(SCORE_CLASSES.map((name) => [name, 0]));
  const cells = [];
  for (const state of schema.states) {
    const row = matrix.state_scores[state.id];
    assert(row && typeof row === 'object', `matrix row ${state.id} is missing`);
    const assignments = new Map();
    for (const scoreClass of SCORE_CLASSES.filter((name) => name !== 'absent')) {
      for (const taxonId of row[scoreClass] || []) {
        assert(taxonIds.has(taxonId), `${state.id} references unknown taxon ${taxonId}`);
        assert(!assignments.has(taxonId), `${state.id}/${taxonId} has multiple score classes`);
        assignments.set(taxonId, scoreClass);
      }
    }
    for (const taxonId of matrix.taxon_ids) {
      const scoreClass = assignments.get(taxonId) || 'absent';
      scoreCounts[scoreClass] += 1;
      cells.push(matrix.encoding.score_classes[scoreClass].original_code);
    }
  }
  assert(cells.length === 25456, `matrix reconstructs to ${cells.length} cells, expected 25456`);
  const expectedCounts = { absent: 15900, common: 9538, rare: 0, uncertain: 18, common_misinterpreted: 0, rare_misinterpreted: 0 };
  assert(canonical(scoreCounts) === canonical(expectedCounts), `matrix score totals differ: ${JSON.stringify(scoreCounts)}`);
  assert(canonical(scoreCounts) === canonical(matrix.validation.score_counts), 'matrix totals disagree with packet validation');

  for (const dependency of dependencies.dependencies) {
    assert(stateIds.has(dependency.trigger.state_id), `${dependency.id} has missing trigger state`);
    if (dependency.effect.feature_id) assert(featureIds.has(dependency.effect.feature_id), `${dependency.id} has missing feature target`);
    if (dependency.effect.feature_group_id) assert(groupIds.has(dependency.effect.feature_group_id), `${dependency.id} has missing group target`);
  }

  const conceptIds = assertUnique(concepts.concepts, (x) => x.concept_id, 'taxon concept');
  const sourceIds = assertUnique(concepts.sources, (x) => x.source_id, 'concept source');
  for (const concept of concepts.concepts) assert(sourceIds.has(concept.source_id), `${concept.concept_id} has missing source`);
  for (const relation of concepts.relationships) {
    assert(conceptIds.has(relation.subject) && conceptIds.has(relation.object), `concept relationship has missing endpoint ${relation.subject}/${relation.object}`);
    assert(sourceIds.has(relation.source_id), 'concept relationship has missing source');
  }

  const schubertCharacterIds = assertUnique(schubert.characters, (x) => x.character_id, 'Schubert character');
  const schubertStateIds = new Set();
  for (const character of schubert.characters) {
    for (const state of character.states) {
      assert(!schubertStateIds.has(state.state_id), `duplicate Schubert state ${state.state_id}`);
      schubertStateIds.add(state.state_id);
    }
  }
  for (const assertion of schubert.taxon_character_assertions) {
    assert(conceptIds.has(assertion.taxon_concept_id), `assertion references missing concept ${assertion.taxon_concept_id}`);
    assert(schubertCharacterIds.has(assertion.character_id), `assertion references missing character ${assertion.character_id}`);
    assert(schubertStateIds.has(assertion.state_id), `assertion references missing state ${assertion.state_id}`);
  }
  const keyNodeIds = assertUnique(schubert.published_key.nodes, (x) => x.node_id, 'published key node');
  assert(keyNodeIds.has(schubert.published_key.root_node_id), 'published key root is missing');
  for (const node of schubert.published_key.nodes) {
    if (node.character_id) assert(schubertCharacterIds.has(node.character_id), `${node.node_id} references missing character`);
    if (node.result_taxon_concept_id) assert(conceptIds.has(node.result_taxon_concept_id), `${node.node_id} references missing result concept`);
    for (const branch of node.branches || []) {
      assert(keyNodeIds.has(branch.next_node), `${node.node_id} branch references missing node ${branch.next_node}`);
      for (const stateId of [...(branch.state_ids || []), ...(branch.state_id ? [branch.state_id] : [])]) {
        assert(schubertStateIds.has(stateId), `${node.node_id} references missing state ${stateId}`);
      }
      for (const condition of branch.conditions || []) {
        assert(schubertCharacterIds.has(condition.character_id), `${node.node_id} condition references missing character`);
        assert(schubertStateIds.has(condition.state_id), `${node.node_id} condition references missing state`);
      }
    }
  }

  for (const mapping of crosswalk.mappings) {
    assert(taxonIds.has(mapping.from.taxon_id), `${mapping.mapping_id} has missing Lucid source taxon`);
    for (const target of mapping.to) assert(conceptIds.has(target.taxon_concept_id), `${mapping.mapping_id} has missing target concept`);
    for (const component of mapping.component_evidence || []) {
      if (component.taxon_concept_id) assert(conceptIds.has(component.taxon_concept_id), `${mapping.mapping_id} component has missing concept`);
    }
  }

  const speciesIds = assertUnique(species.species, (x) => x.species_id, 'species hint');
  for (const item of species.species) assert(conceptIds.has(item.genus_concept_id), `${item.species_id} has missing genus concept`);
  assertUnique(media.media, (x) => x.media_id, 'media');
  for (const item of media.media) {
    if (item.subject.lucid_taxon_id) assert(taxonIds.has(item.subject.lucid_taxon_id), `${item.media_id} has missing Lucid taxon`);
    if (item.subject.taxon_concept_id) assert(conceptIds.has(item.subject.taxon_concept_id), `${item.media_id} has missing concept`);
    if (item.subject.character_id) assert(schubertCharacterIds.has(item.subject.character_id) || featureIds.has(item.subject.character_id), `${item.media_id} has missing character`);
    if (item.subject.state_id) assert(schubertStateIds.has(item.subject.state_id) || stateIds.has(item.subject.state_id), `${item.media_id} has missing state`);
    if (item.subject.species_id) assert(speciesIds.has(item.subject.species_id), `${item.media_id} has missing species`);
  }

  return { cells: Uint8Array.from(cells), scoreCounts, conceptIds, featureIds, stateIds, taxonIds, schubertCharacterIds, schubertStateIds };
}

function buildScientificPackage(root) {
  const sourceManifest = readJson(root, 'data/scientific/source-manifest.json');
  const reviewRegister = readJson(root, 'data/scientific/review-register.json');
  const provenanceCorrectionPath = 'data/scientific/provenance-corrections.json';
  const provenanceCorrectionBytes = fs.readFileSync(path.join(root, provenanceCorrectionPath));
  const provenanceCorrectionDocument = JSON.parse(provenanceCorrectionBytes.toString('utf8'));
  const allSources = [...sourceManifest.packet_files, ...sourceManifest.additional_immutable_sources];
  for (const source of allSources) {
    const bytes = fs.readFileSync(path.join(root, source.path));
    assert(bytes.length === source.bytes, `${source.path} byte length changed (${bytes.length}, expected ${source.bytes})`);
    assert(sha256(bytes) === source.sha256, `${source.path} SHA-256 changed`);
  }

  const jsonFiles = sourceManifest.packet_files.map((x) => x.path).filter((x) => x.endsWith('.json'));
  const data = Object.fromEntries(jsonFiles.map((file) => [file, readJson(root, file)]));
  const validated = validateReferences(data);
  const schema = data['01_lucid_schema.json'];
  const matrix = data['02_lucid_matrix.json'];
  const concepts = data['04_taxon_concepts.json'];
  const schubert = data['05_schubert_genus_characters.json'];
  const crosswalk = data['06_taxon_crosswalk.json'];

  assert(provenanceCorrectionDocument.format === 'australian-salticidae-provenance-corrections@1', 'unsupported provenance correction format');
  assert(typeof provenanceCorrectionDocument.version === 'string' && provenanceCorrectionDocument.version, 'provenance correction version is missing');
  assert(Array.isArray(provenanceCorrectionDocument.corrections), 'provenance corrections are not an array');
  assert(provenanceCorrectionDocument.corrections.length === 21, `provenance correction set has ${provenanceCorrectionDocument.corrections.length} entries, expected 21`);
  assertUnique(provenanceCorrectionDocument.corrections, (x) => x.id, 'provenance correction');
  const provenanceCorrections = provenanceCorrectionDocument.corrections.map((correction) => {
    const target = correction.target;
    assert(target.packet_file === '05_schubert_genus_characters.json', `${correction.id} targets an unsupported packet`);
    const match = /^\/taxon_character_assertions\/(\d+)$/.exec(target.json_pointer);
    assert(match, `${correction.id} has an invalid assertion pointer`);
    const assertion = schubert.taxon_character_assertions[Number(match[1])];
    assert(assertion, `${correction.id} targets a missing assertion`);
    assert(assertion.taxon_concept_id === target.taxon_concept_id, `${correction.id} concept identity changed`);
    assert(assertion.character_id === target.character_id, `${correction.id} character identity changed`);
    assert(assertion.state_id === target.state_id, `${correction.id} state identity changed`);
    assert(assertion.source.page === correction.original_locator.page, `${correction.id} original page no longer matches the packet`);
    assert(assertion.source.section === correction.original_locator.section, `${correction.id} original section no longer matches the packet`);
    assert(Number.isInteger(correction.reviewed_locator.page) && correction.reviewed_locator.page > 0, `${correction.id} reviewed page is invalid`);
    assert(typeof correction.reason === 'string' && correction.reason, `${correction.id} reason is missing`);
    return {
      id: correction.id,
      interpretationVersion: provenanceCorrectionDocument.version,
      target: {
        packetFile: target.packet_file,
        jsonPointer: target.json_pointer,
        taxonConceptPacketId: target.taxon_concept_id,
        characterPacketId: target.character_id,
        statePacketId: target.state_id,
      },
      originalLocator: correction.original_locator,
      reviewedLocator: correction.reviewed_locator,
      reason: correction.reason,
      evidence: {
        sourceId: provenanceCorrectionDocument.review.source_id,
        sourcePath: provenanceCorrectionDocument.review.source_path,
        sourceSha256: provenanceCorrectionDocument.review.source_sha256,
        method: provenanceCorrectionDocument.review.method,
        reviewedOn: provenanceCorrectionDocument.review.reviewed_on,
        correctionRecord: `${provenanceCorrectionPath}#${correction.id}`,
      },
    };
  });
  const provenanceCorrectionByPointer = new Map(provenanceCorrections.map((correction) => [correction.target.jsonPointer, correction]));

  assert(reviewRegister.issues.length === 36, `review register has ${reviewRegister.issues.length} issues, expected 36`);
  assertUnique(reviewRegister.issues, (x) => x.id, 'review issue');
  for (let i = 1; i <= 22; i += 1) assert(reviewRegister.issues.some((x) => x.id === `VR${String(i).padStart(2, '0')}` && x.status === 'open'), `VR${i} missing or not open`);
  for (let i = 1; i <= 14; i += 1) assert(reviewRegister.issues.some((x) => x.id === `AU${String(i).padStart(2, '0')}` && x.status === 'open'), `AU${i} missing or not open`);

  const packetSha = Object.fromEntries(sourceManifest.packet_files.map((x) => [x.path, x.sha256]));
  const provenance = [];
  for (const file of jsonFiles) {
    const evidenceClass = file === '06_taxon_crosswalk.json' ? 'curator_interpretation'
      : file === '09_examples.json' ? 'synthetic_guidance' : 'source_fact';
    provenance.push(...collectRecordProvenance(file, packetSha[file], data[file], evidenceClass));
  }

  const aliases = {};
  for (const item of provenance) {
    if (!aliases[item.subjectId]) aliases[item.subjectId] = item.aliases;
  }
  const persistentForAlias = new Map();
  for (const [id, values] of Object.entries(aliases)) {
    for (const alias of values) {
      if (alias.scheme === 'packet_id') persistentForAlias.set(alias.value, id);
    }
  }
  const pid = (packetId) => {
    const result = persistentForAlias.get(packetId);
    assert(result, `missing persistent alias for ${packetId}`);
    return result;
  };

  const nameUsages = [];
  const taxonomicNames = [];
  const placementAssertions = [];
  const nomenclaturalActAssertions = [];
  const preferredUsageByConcept = new Map();

  function addUsage(concept, role, name, authorship, year, page, extra = {}) {
    const basis = { concept: concept.concept_id, role, name, authorship: authorship ?? null, year: year ?? null, page: page ?? null, extra };
    const usageId = contentId('name-usage', basis);
    const nameId = `${usageId}:name`;
    taxonomicNames.push({ id: nameId, canonicalSpelling: name, authorship: authorship ?? null, year: year ?? null, aliases: [] });
    nameUsages.push({
      id: usageId,
      exactSpelling: name,
      qualifier: name.startsWith('cf. ') ? 'cf.' : null,
      taxonomicNameId: nameId,
      taxonConceptId: pid(concept.concept_id),
      locator: {
        packetFile: '04_taxon_concepts.json',
        jsonPointer: `/concepts/${concepts.concepts.findIndex((x) => x.concept_id === concept.concept_id)}`,
        sourceId: concept.source_id,
        ...(page != null ? { page } : {}),
        packetSha256: packetSha['04_taxon_concepts.json'],
      },
    });
    return usageId;
  }

  for (const concept of concepts.concepts) {
    const preferredUsage = addUsage(concept, 'preferred', concept.preferred_name.name, concept.preferred_name.authorship, concept.preferred_name.year, concept.source_pages[0]);
    preferredUsageByConcept.set(concept.concept_id, preferredUsage);
    if (concept.type_species) addUsage(concept, 'type_species', concept.type_species.name, concept.type_species.authorship, concept.type_species.year, concept.type_species.source_page);
    for (const assertion of concept.type_species_assertions || []) addUsage(concept, 'type_species_assertion', assertion.name, null, null, assertion.source_page, { assertion_status: assertion.assertion_status });
    for (const included of concept.included_taxa) {
      const usageId = addUsage(concept, 'included_taxon', included.name, null, null, included.source_page, { rank: included.rank, status: included.status, relationship: included.relationship });
      const placementId = contentId('placement', { concept: concept.concept_id, usageId, sourcePage: included.source_page, status: included.status, relationship: included.relationship });
      placementAssertions.push({
        id: placementId,
        subjectNameUsageId: usageId,
        objectConceptId: pid(concept.concept_id),
        placementStatus: included.status,
        relationship: included.relationship,
        uncertainty: ['incertae_sedis', 'unresolved', 'source_conflict', 'nomen_dubium'].includes(included.status) ? included.status : null,
        locator: nameUsages.find((x) => x.id === usageId).locator,
      });
      if (included.previous_name) addUsage(concept, 'previous_name', included.previous_name, null, null, included.source_page, { placementId });
      if (included.nomenclatural_status) {
        nomenclaturalActAssertions.push({
          id: contentId('nomenclatural-act', { placementId, status: included.nomenclatural_status }),
          affectedUsageIds: [usageId],
          actKind: included.relationship || 'source_status',
          status: included.nomenclatural_status,
          qualifyingEvidence: null,
          locator: nameUsages.find((x) => x.id === usageId).locator,
        });
      }
    }
  }

  const taxonConcepts = concepts.concepts.map((concept) => ({
    id: pid(concept.concept_id),
    rank: concept.rank,
    accordingToSourceId: concept.source_id,
    preferredNameUsageId: preferredUsageByConcept.get(concept.concept_id),
    biologicalStatus: concept.concept_status,
    nomenclaturalStatus: concept.nomenclatural_status,
    aliases: [{ scheme: 'packet_id', value: concept.concept_id }],
  }));

  const phylogeneticAssertions = concepts.relationships.map((relation) => ({
    id: contentId('phylogenetic-assertion', relation),
    subjectConceptId: pid(relation.subject),
    predicate: relation.predicate,
    objectConceptId: pid(relation.object),
    supportMetric: relation.support.type,
    supportValue: relation.support.value,
    qualification: relation.notes,
    locator: { packetFile: '04_taxon_concepts.json', sourceId: relation.source_id, page: relation.source_page, packetSha256: packetSha['04_taxon_concepts.json'] },
  }));

  const matrixBytes = Buffer.from(validated.cells);
  const rootEntity = schema.taxa.find((x) => x.is_root);
  const matrixSnapshot = {
    id: 'as:matrix:lucid-richardson-whyte-zabka:v1',
    taxonIds: matrix.taxon_ids.map(pid),
    stateIds: schema.states.map((x) => pid(x.id)),
    rootTaxonId: pid(rootEntity.id),
    genusLeafTaxonIds: schema.taxa.filter((x) => !x.is_root).map((x) => pid(x.id)),
    scoreLegend: Object.fromEntries(SCORE_CLASSES.map((name) => [name, {
      originalCode: matrix.encoding.score_classes[name].original_code,
      meaning: matrix.encoding.score_classes[name].meaning,
      observed: matrix.encoding.score_classes[name].observed_in_source,
    }])),
    encoding: 'row_major_uint8_base64',
    cellsBase64: matrixBytes.toString('base64'),
    cellCount: matrixBytes.length,
    cellsSha256: sha256(matrixBytes),
  };

  const characterDefinitions = [
    ...schema.features.map((feature) => ({
      id: pid(feature.id), label: feature.name, sourceId: schema.source.source_id,
      stateIds: feature.state_ids.map(pid), sourceWording: feature,
    })),
    ...schubert.characters.map((character) => ({
      id: pid(character.character_id), label: character.name, sourceId: character.source.source_id,
      stateIds: character.states.map((state) => pid(state.state_id)), sourceWording: character,
    })),
  ];

  const characterAssertions = schubert.taxon_character_assertions.map((assertion, index) => {
    const jsonPointer = `/taxon_character_assertions/${index}`;
    const correction = provenanceCorrectionByPointer.get(jsonPointer);
    const locator = { packetFile: '05_schubert_genus_characters.json', jsonPointer, sourceId: assertion.source.source_id, page: assertion.source.page, packetSha256: packetSha['05_schubert_genus_characters.json'] };
    return {
      id: contentId('character-assertion', assertion),
      subjectConceptId: pid(assertion.taxon_concept_id),
      stateId: pid(assertion.state_id),
      assertionType: assertion.assertion_type,
      sex: assertion.sex,
      lifeStage: assertion.life_stage,
      variation: assertion.variation,
      locator,
      reviewedLocator: correction ? { ...locator, page: correction.reviewedLocator.page, sourceReference: correction.evidence.correctionRecord } : null,
    };
  });

  const conceptRelations = crosswalk.mappings.map((mapping) => ({
    id: pid(mapping.mapping_id),
    sourceEntityId: pid(mapping.from.taxon_id),
    targetConceptIds: mapping.to.filter((target) => target.relationship !== 'not_equivalent').map((target) => pid(target.taxon_concept_id)),
    targetRelations: mapping.to.map((target) => ({
      targetConceptId: pid(target.taxon_concept_id),
      relationship: target.relationship,
    })),
    relationship: mapping.relationship,
    componentRelations: mapping.component_evidence.map((component) => ({
      id: contentId('crosswalk-component', { mappingId: mapping.mapping_id, component }),
      targetConceptId: component.taxon_concept_id ? pid(component.taxon_concept_id) : null,
      relationship: component.relationship,
      confidence: component.confidence,
      sourceComponent: component,
    })),
    mappingUncertainty: mapping.confidence,
    basis: mapping.basis,
    rationale: mapping.rationale,
    notes: mapping.notes,
    locator: { packetFile: '06_taxon_crosswalk.json', jsonPointer: `/mappings/${crosswalk.mappings.findIndex((x) => x.mapping_id === mapping.mapping_id)}`, packetSha256: packetSha['06_taxon_crosswalk.json'] },
  }));

  const allZeroProfiles = [];
  const stateByFeature = new Map(schema.features.map((feature) => [feature.id, feature.state_ids]));
  const taxonOffset = new Map(matrix.taxon_ids.map((id, index) => [id, index]));
  for (const taxon of schema.taxa.filter((x) => !x.is_root)) {
    for (const feature of schema.features) {
      const offset = taxonOffset.get(taxon.id);
      const isAllZero = stateByFeature.get(feature.id).every((stateId) => {
        const rowIndex = schema.states.findIndex((state) => state.id === stateId);
        return validated.cells[(rowIndex * matrix.taxon_ids.length) + offset] === 0;
      });
      if (isAllZero) allZeroProfiles.push({ taxonId: pid(taxon.id), featureId: pid(feature.id), issueId: 'AU01' });
    }
  }
  assert(allZeroProfiles.length === 122, `AU01 inventory has ${allZeroProfiles.length} profiles, expected 122`);

  const losslessness = {
    policy: 'Every JSON packet is embedded verbatim as parsed data. Every field path is inventoried. Normalized views are additional interpretations and never replace raw packet records.',
    files: Object.fromEntries(jsonFiles.map((file) => [file, {
      sha256: packetSha[file],
      fieldInventory: fieldInventory(data[file]),
      normalizedDestinations: file === '01_lucid_schema.json' ? ['model.characterDefinitions', 'model.matrix identities', 'identities.aliases']
        : file === '02_lucid_matrix.json' ? ['model.matrix']
          : file === '03_lucid_dependencies.json' ? ['rawSnapshots', 'provenance']
            : file === '04_taxon_concepts.json' ? ['model.taxonConcepts', 'model.taxonomicNames', 'model.nameUsages', 'model.placementAssertions', 'model.nomenclaturalActAssertions', 'model.phylogeneticAssertions']
              : file === '05_schubert_genus_characters.json' ? ['model.characterDefinitions', 'model.characterAssertions', 'rawSnapshots']
                : file === '06_taxon_crosswalk.json' ? ['model.conceptRelations']
                  : ['rawSnapshots', 'provenance'],
    }]))
  };

  const provenanceCorrectionSha256 = sha256(provenanceCorrectionBytes);
  const inputDigest = sha256(`${sourceManifest.packet_files.map((x) => `${x.path}:${x.sha256}`).join('\n')}\n${provenanceCorrectionPath}:${provenanceCorrectionSha256}`);
  return {
    format: 'australian-salticidae-scientific-package@1',
    packageVersion: 'pre-stage7-provenance-2026-09-28',
    inputDigest,
    sourceManifest,
    compatibility: {
      rawPacketFieldsPreserved: true,
      unknownFieldPolicy: 'preserve_in_raw_snapshot_and_inventory',
      unresolvedReferencePolicy: 'compile_error',
    },
    identities: { aliases },
    model: {
      taxonConcepts,
      taxonomicNames,
      nameUsages,
      placementAssertions,
      nomenclaturalActAssertions,
      phylogeneticAssertions,
      matrix: matrixSnapshot,
      characterDefinitions,
      characterAssertions,
      conceptRelations,
      reviewIssues: reviewRegister.issues.map((issue) => ({
        id: issue.id, status: issue.status, kind: issue.kind, sourceFile: issue.source_file,
        sourceLocator: issue.source_locator, sourceText: issue.source_text, interimPolicy: issue.interim_policy,
      })),
      interpretations: {
        allZeroProfiles,
        provenanceCorrections,
        provenanceCorrectionSource: {
          path: provenanceCorrectionPath,
          sha256: provenanceCorrectionSha256,
          version: provenanceCorrectionDocument.version,
          sourceFactsRemainUnmodified: true,
        },
        quarantinedIssueIds: ['AU03', 'AU04', 'AU05', 'AU06', 'AU07', 'AU08', 'AU09', 'AU10', 'AU11', 'AU12'],
        sourceFactsRemainUnmodified: true,
        genusEngine: {
          policyVersion: 'stage2-reviewed-policy@1',
          uncertaintyAddsSupport: false,
          allZeroProtection: {
            issueId: 'AU01',
            interpretationVersion: 'stage2-gap-protection@1',
            sourceCodesRemainUnmodified: true,
          },
          applicabilityOverlays: [
            {
              id: 'INT-SEX-STAGE-MALE-1', evidenceClass: 'curator_interpretation',
              groupPacketIds: ['FG008', 'FG013', 'FG014'], sex: 'male', adultOnly: true,
              provenance: ['01_lucid_schema.json#FG008', '01_lucid_schema.json#FG013', '01_lucid_schema.json#FG014'],
              interpretationVersion: 'stage2-applicability@1',
            },
            {
              id: 'INT-SEX-STAGE-FEMALE-1', evidenceClass: 'curator_interpretation',
              groupPacketIds: ['FG009', 'FG010', 'FG011', 'FG012', 'FG015'], sex: 'female', adultOnly: true,
              provenance: ['01_lucid_schema.json#FG009', '01_lucid_schema.json#FG010', '01_lucid_schema.json#FG011', '01_lucid_schema.json#FG012', '01_lucid_schema.json#FG015'],
              interpretationVersion: 'stage2-applicability@1',
            },
            {
              id: 'INT-F026-MALE-1', evidenceClass: 'curator_interpretation',
              characterPacketIds: ['F026'], sex: 'male', adultOnly: true,
              provenance: ['01_lucid_schema.json#F026', '03_lucid_dependencies.json#D011', '03_lucid_dependencies.json#D022'],
              interpretationVersion: 'stage2-applicability@1',
            },
            {
              id: 'INT-AU02-F030-MALE-1', evidenceClass: 'curator_interpretation',
              characterPacketIds: ['F030'], sex: 'male', adultOnly: true,
              provenance: ['01_lucid_schema.json#F030', 'data/scientific/review-register.json#AU02'],
              interpretationVersion: 'stage2-applicability@1',
            },
            {
              id: 'INT-EPIGYNE-CLEARED-1', evidenceClass: 'curator_interpretation',
              groupPacketIds: ['FG011'], sex: 'female', adultOnly: true, preparation: 'epigyne_cleared',
              provenance: ['01_lucid_schema.json#F002', '03_lucid_dependencies.json#D023'],
              interpretationVersion: 'stage2-applicability@1',
            },
          ],
        },
        conceptReconciliation: {
          policyVersion: 'stage3-reconciliation@1',
          positiveTargetRelationships: ['equivalent_to', 'partially_overlaps', 'contains_some', 'new_combination', 'probably_corresponds_to'],
          nonPositiveTargetRelationships: ['not_equivalent'],
          splitCopiesSourceEvidence: false,
          partialOverlapTransfersUniversalAbsence: false,
          unmappedSourcePolicy: 'retain_historical_unreviewed',
        },
      },
    },
    validation: {
      lucid: {
        featureGroups: schema.feature_groups.length,
        features: schema.features.length,
        states: schema.states.length,
        taxa: schema.taxa.length,
        roots: schema.taxa.filter((x) => x.is_root).length,
        genusLeaves: schema.taxa.filter((x) => !x.is_root).length,
        matrixCells: validated.cells.length,
        scoreCounts: validated.scoreCounts,
        dependencies: data['03_lucid_dependencies.json'].dependencies.length,
      },
      schubertKey: {
        nodes: schubert.published_key.nodes.length,
        questions: schubert.published_key.nodes.filter((x) => x.branches).length,
        terminals: schubert.published_key.nodes.filter((x) => x.result_taxon_concept_id).length,
      },
      reviewIssues: reviewRegister.issues.length,
      provenanceCorrections: provenanceCorrections.length,
      referenceErrors: 0,
    },
    provenance,
    rawSnapshots: data,
    losslessness,
  };
}

module.exports = { buildScientificPackage, canonical, contentId, persistentIdFor, sha256 };
