const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { buildScientificPackage, canonical, persistentIdFor, sha256 } = require('../scripts/lib/scientific-importer');

const ROOT = path.resolve(__dirname, '..');

function build() {
  return buildScientificPackage(ROOT);
}

test('all packet inputs remain byte-identical to the immutable source manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/scientific/source-manifest.json'), 'utf8'));
  assert.equal(manifest.packet_files.length, 11);
  for (const source of [...manifest.packet_files, ...manifest.additional_immutable_sources]) {
    const bytes = fs.readFileSync(path.join(ROOT, source.path));
    assert.equal(bytes.length, source.bytes, source.path);
    assert.equal(sha256(bytes), source.sha256, source.path);
  }
});

test('deterministic compilation produces identical packages from identical inputs', () => {
  const first = canonical(build());
  const second = canonical(build());
  assert.equal(sha256(first), sha256(second));
  assert.equal(first, second);
});

test('the Lucid matrix reconstructs exactly with all defined score classes', () => {
  const scientific = build();
  const matrix = scientific.model.matrix;
  assert.equal(matrix.taxonIds.length, 86);
  assert.equal(matrix.stateIds.length, 296);
  assert.equal(matrix.cellCount, 86 * 296);
  assert.equal(Buffer.from(matrix.cellsBase64, 'base64').length, 25456);
  assert.deepEqual(scientific.validation.lucid.scoreCounts, {
    absent: 15900,
    common: 9538,
    rare: 0,
    uncertain: 18,
    common_misinterpreted: 0,
    rare_misinterpreted: 0,
  });
  assert.deepEqual(Object.values(matrix.scoreLegend).map((x) => x.originalCode).sort(), [0, 1, 2, 3, 4, 5]);
});

test('the Salticidae root is explicit and excluded from the 85 genus leaves', () => {
  const scientific = build();
  const matrix = scientific.model.matrix;
  assert.equal(matrix.genusLeafTaxonIds.length, 85);
  assert(!matrix.genusLeafTaxonIds.includes(matrix.rootTaxonId));
  const aliases = scientific.identities.aliases[matrix.rootTaxonId];
  assert(aliases.some((x) => x.scheme === 'packet_id' && x.value === 'LTX001'));
});

test('persistent identity is independent of packet array order', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, '01_lucid_schema.json'), 'utf8'));
  const taxon = schema.taxa.find((x) => x.id === 'LTX043');
  const before = persistentIdFor('01_lucid_schema.json', '/taxa/42', taxon);
  const after = persistentIdFor('01_lucid_schema.json', '/taxa/0', taxon);
  assert.equal(before, after);
  assert(before.includes(taxon.original_uid.toLowerCase()));

  const relation = JSON.parse(fs.readFileSync(path.join(ROOT, '04_taxon_concepts.json'), 'utf8')).relationships[0];
  assert.equal(
    persistentIdFor('04_taxon_concepts.json', '/relationships/0', relation),
    persistentIdFor('04_taxon_concepts.json', '/relationships/28', relation),
  );
});

test('concepts, exact name usages, placements, nomenclatural acts and phylogeny remain separate', () => {
  const model = build().model;
  assert.equal(model.taxonConcepts.length, 23);
  assert.equal(model.placementAssertions.length, 227);
  assert.equal(model.phylogeneticAssertions.length, 29);
  assert(model.nameUsages.length > model.taxonConcepts.length);
  assert(model.nomenclaturalActAssertions.length > 0);
  assert(model.taxonConcepts.every((x) => x.preferredNameUsageId && !x.id.includes(x.preferredNameUsageId)));
  assert(model.nomenclaturalActAssertions.every((x) => x.qualifyingEvidence === null));
});

test('all report and audit issues are open, sourced and policy-bearing', () => {
  const issues = build().model.reviewIssues;
  assert.equal(issues.length, 36);
  for (let i = 1; i <= 22; i += 1) assert(issues.some((x) => x.id === `VR${String(i).padStart(2, '0')}`));
  for (let i = 1; i <= 14; i += 1) assert(issues.some((x) => x.id === `AU${String(i).padStart(2, '0')}`));
  assert(issues.every((x) => x.status === 'open' && x.sourceText && x.sourceLocator && x.interimPolicy));
});

test('every array record has recoverable provenance and raw fields stay available', () => {
  const scientific = build();
  assert(scientific.provenance.length > 1900);
  assert(scientific.provenance.every((x) => x.locator.packetFile && x.locator.jsonPointer && x.locator.packetSha256 && x.rawRecordSha256));
  assert.equal(new Set(scientific.provenance.map((x) => x.subjectId)).size, scientific.provenance.length);
  assert.deepEqual(scientific.rawSnapshots['08_media_manifest.json'].media[565], require('../08_media_manifest.json').media[565]);
  const inventory = scientific.losslessness.files['08_media_manifest.json'].fieldInventory;
  assert(inventory.some((x) => x.path === '/media[]/notes' && x.retention === 'raw_snapshot'));
});

test('unknown and invalid references fail rather than becoming absent scores', () => {
  const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, '02_lucid_matrix.json'), 'utf8'));
  assert.equal(matrix.encoding.default_score, 'absent');
  assert.equal(build().compatibility.unresolvedReferencePolicy, 'compile_error');
  const source = fs.readFileSync(path.join(ROOT, 'scripts/lib/scientific-importer.js'), 'utf8');
  assert.match(source, /references unknown taxon/);
  assert.match(source, /references missing state/);
});

test('crosswalk structure preserves split, non-equivalence and unresolved residue semantics', () => {
  const scientific = build();
  const aliases = scientific.identities.aliases;
  const relationByPacketId = (packetId) => scientific.model.conceptRelations.find((relation) =>
    aliases[relation.id].some((alias) => alias.scheme === 'packet_id' && alias.value === packetId));
  assert.equal(relationByPacketId('CW005').targetConceptIds.length, 8);
  assert.equal(relationByPacketId('CW010').targetConceptIds.length, 0);
  assert.equal(relationByPacketId('CW008').targetConceptIds.length, 4);
  assert.equal(relationByPacketId('CW009').targetConceptIds.length, 1);
});

test('the full published male key retains K10 alternatives and K11 conjunctions', () => {
  const key = build().rawSnapshots['05_schubert_genus_characters.json'].published_key;
  assert.equal(key.nodes.length, 23);
  assert.equal(key.nodes.filter((x) => x.branches).length, 11);
  assert.equal(key.nodes.filter((x) => x.result_taxon_concept_id).length, 12);
  assert.equal(key.nodes.find((x) => x.node_id === 'K10').branches[0].conditions_match, 'any');
  assert.deepEqual(key.nodes.find((x) => x.node_id === 'K10').branches[0].state_ids, ['SC009_A', 'SC009_B']);
  assert(key.nodes.find((x) => x.node_id === 'K11').branches.every((x) => x.conditions_match === 'all' && x.conditions.length === 3));
});

test('AU01 all-zero profiles are inventoried without changing the source matrix', () => {
  const scientific = build();
  assert.equal(scientific.model.interpretations.allZeroProfiles.length, 122);
  assert(scientific.model.interpretations.allZeroProfiles.every((x) => x.issueId === 'AU01'));
  assert.equal(scientific.model.interpretations.sourceFactsRemainUnmodified, true);
});

test('reviewed Schubert page locators supplement 21 immutable packet assertions', () => {
  const scientific = build();
  const corrections = scientific.model.interpretations.provenanceCorrections;
  assert.equal(corrections.length, 21);
  assert.equal(scientific.validation.provenanceCorrections, 21);
  assert.equal(scientific.model.interpretations.provenanceCorrectionSource.sourceFactsRemainUnmodified, true);
  assert.equal(scientific.rawSnapshots['05_schubert_genus_characters.json'].taxon_character_assertions[28].source.page, 176);

  const maratus = corrections.filter((item) => item.target.taxonConceptPacketId === 'TC0007');
  const prostheclina = corrections.filter((item) => item.target.taxonConceptPacketId === 'TC0009');
  assert.equal(maratus.length, 11);
  assert.equal(prostheclina.length, 10);
  assert(maratus.every((item) => item.originalLocator.page === 176 && item.reviewedLocator.page === 178));
  assert(prostheclina.every((item) => item.reviewedLocator.page === item.originalLocator.page + 2));

  const correctedAssertions = scientific.model.characterAssertions.filter((item) => item.reviewedLocator);
  assert.equal(correctedAssertions.length, 21);
  assert(correctedAssertions.every((item) => item.locator.page !== item.reviewedLocator.page));
  assert(correctedAssertions.every((item) => item.reviewedLocator.sourceReference.startsWith('data/scientific/provenance-corrections.json#PLC')));
});
