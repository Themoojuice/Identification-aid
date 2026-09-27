# Handoff for Qwen: decoding the Australian Salticidae Lucid key

This document is a self-contained implementation guide for the source file `salticidae.json` from **A Key to the Genera of Australian Jumping Spiders**. The decoding described here has been run against the complete file and validated cell-for-cell in the reconstructed project.

## Short answer

The encoded values use **LZ-String's `decompressFromBase64` algorithm**. They are not ordinary Base64 text and should not be decoded with `atob()` alone.

- `scores[stateId]` decompresses to a positional string containing one single-digit score code for every entry in `entities`.
- `dependencies[controllingStateId]` decompresses to `dependentFeatureId:dependencyCode` pairs separated by `::`.
- Positions in a score vector refer to **array order in `entities`**, not directly to entity IDs.
- Do not remove the root `Salticidae` entity until after score vectors have been mapped; it occupies offset 0 in every vector.

The current source has:

| Item | Count |
|---|---:|
| Entities, including the Salticidae root | 86 |
| Actual genus entities | 85 |
| Features, including groups | 114 |
| Feature groups | 15 |
| Character features | 99 |
| Character states | 296 |
| Compressed score vectors | 296 |
| Decoded score cells | 25,456 |
| Compressed dependency vectors | 5 |
| Decoded dependency edges | 23 |
| Numeric measure records | 0 |
| Scope records | 0 |

## 1. Loading the file

Despite its filename, the downloaded source is normally JavaScript shaped like this:

```js
var key = { ... };
```

Do not evaluate it. Remove the wrapper and parse the inner JSON:

```js
import fs from 'node:fs'

export function loadLucidKey(filename) {
  const source = fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '')
  const match = source.match(/^\s*var\s+key\s*=\s*([\s\S]*?)\s*;\s*$/)
  if (!match) throw new Error('Expected a Lucid payload shaped as: var key = <JSON>;')
  return JSON.parse(match[1])
}
```

If Qwen has received a version that is already pure JSON, use `JSON.parse()` directly. A tolerant loader can try pure JSON first, then the wrapper parser.

## 2. Use the correct decompressor

The live Lucid Player loads `lz-string.min.js` and calls:

```js
LZString.decompressFromBase64(encodedValue)
```

For Node/TypeScript, install the standard `lz-string` package:

```text
npm install lz-string
```

Then use:

```js
import LZString from 'lz-string'

function decompress(encoded, label) {
  const decoded = LZString.decompressFromBase64(encoded)
  if (decoded == null) throw new Error(`Could not decompress ${label}`)
  return decoded
}
```

The original decoder used during reconstruction is also archived locally as:

```text
source/lucid-original/metadata/lz-string.min.js
```

That archived copy can be loaded instead of installing a package. It exports the same `decompressFromBase64` function.

## 3. Decoding scores

`key.scores` is an object keyed by **state ID**. Each value is an LZ-String Base64 string.

For example, source state 7 (`standard jumping spider`) contains:

```text
AwRj4z1LbqbyYpYg
```

It decompresses to:

```text
01111111111111111110111111111111111111111111111101111111111111111111110111111111111111
```

This is exactly 86 characters long. Character `decoded[0]` applies to `entities[0]`, character `decoded[1]` applies to `entities[1]`, and so on.

### Complete JavaScript/TypeScript decoder

```js
import LZString from 'lz-string'

export const SCORE_TYPES = {
  0: 'absent',
  1: 'common',
  2: 'rare',
  3: 'uncertain',
  4: 'common_misinterpreted',
  5: 'rare_misinterpreted',
}

export function decodeScores(key) {
  const stateById = new Map(key.states.map(state => [state.id, state]))
  const records = []
  const vectors = {}

  for (const [stateIdText, encoded] of Object.entries(key.scores)) {
    const stateId = Number(stateIdText)
    const state = stateById.get(stateId)
    if (!state) throw new Error(`Score vector references missing state ${stateId}`)

    const decoded = LZString.decompressFromBase64(encoded)
    if (decoded == null) throw new Error(`Could not decompress score vector ${stateId}`)
    if (decoded.length !== key.entities.length) {
      throw new Error(
        `State ${stateId}: vector length ${decoded.length}, expected ${key.entities.length}`,
      )
    }
    vectors[stateId] = decoded

    key.entities.forEach((entity, entityOffset) => {
      const rawCode = Number(decoded[entityOffset])
      if (!(rawCode in SCORE_TYPES)) {
        throw new Error(`Unknown score ${decoded[entityOffset]} at state ${stateId}, offset ${entityOffset}`)
      }
      records.push({
        entity_id: entity.id,
        entity_uid: entity.uid,
        entity_offset: entityOffset,
        feature_id: state.feature,
        state_id: state.id,
        state_uid: state.uid,
        raw_code: rawCode,
        score_type: SCORE_TYPES[rawCode],
      })
    })
  }

  return { vectors, records }
}
```

### Critical indexing rule

Use this:

```js
const code = Number(decodedVector[entityOffset])
```

where `entityOffset` is the position of the entity in `key.entities`.

Do **not** initially use this:

```js
const code = Number(decodedVector[entity.id])
```

IDs happen to be sequential in this payload, but IDs are one-based while string offsets are zero-based, and array order is the actual serialized relationship. Retaining `entity_offset` makes the mapping explicit and robust.

## 4. Score meanings

Lucid supports these categorical score codes:

| Code | Meaning | Present in this key? |
|---:|---|---|
| 0 | Absent/incompatible | Yes: 15,900 cells |
| 1 | Common/present | Yes: 9,538 cells |
| 2 | Rare | No |
| 3 | Author uncertain | Yes: 18 cells |
| 4 | Common by possible user misinterpretation | No |
| 5 | Rare by possible user misinterpretation | No |

Relevant top-level settings in this source are:

```json
{
  "retainUncerts": true,
  "allowMisints": true,
  "matchType": 0,
  "keyType": 0
}
```

Confirmed Lucid behaviour:

- With `retainUncerts: true`, score 3 is retained like a common match. If false, it behaves like absent.
- With `allowMisints: true`, code 4 behaves like common and code 5 behaves like rare. If false, both behave like absent.
- Rare matches remain possible but rank below common matches.
- `matchType: 0` / character `match_type: 0` is the normal **Any State** behaviour: if a user selects multiple states for one character, a taxon matches when at least one selected state matches.

Do not confuse `state.type` with a matrix score. Compatibility is held in the decompressed score vector, not in the state record's `type` field.

## 5. Decoding dependencies

`key.dependencies` is keyed by a **controlling state ID**. Decompress each value with the same `decompressFromBase64` call. The result contains fragments separated by `::`; each fragment is:

```text
dependentFeatureId:dependencyCode
```

Dependency codes are:

| Code | Meaning |
|---:|---|
| 1 | Negative: hide/disable the dependent feature when the controlling state is selected |
| 2 | Positive: the dependent feature is hidden initially and enabled when the controlling state is selected |

Example:

```text
dependencies[1] decompresses to:
9:1::10:1::11:1::12:1::15:1::17:1
```

State 1 is `male(s) only`; those six female-related feature groups are negatively dependent on it.

### Complete dependency decoder

```js
import LZString from 'lz-string'

export function decodeDependencies(key) {
  const stateIds = new Set(key.states.map(state => state.id))
  const featureIds = new Set(key.features.map(feature => feature.id))
  const edges = []

  for (const [controllingStateIdText, encoded] of Object.entries(key.dependencies ?? {})) {
    const controllingStateId = Number(controllingStateIdText)
    if (!stateIds.has(controllingStateId)) {
      throw new Error(`Dependency controller state ${controllingStateId} does not exist`)
    }

    const decoded = LZString.decompressFromBase64(encoded)
    if (decoded == null) throw new Error(`Could not decompress dependency ${controllingStateId}`)

    for (const fragment of decoded.split('::').filter(Boolean)) {
      const [featureIdText, codeText, ...extra] = fragment.split(':')
      if (extra.length || !featureIdText || !codeText) {
        throw new Error(`Malformed dependency fragment: ${fragment}`)
      }
      const dependentFeatureId = Number(featureIdText)
      const rawCode = Number(codeText)
      if (!featureIds.has(dependentFeatureId)) {
        throw new Error(`Dependency target feature ${dependentFeatureId} does not exist`)
      }
      if (rawCode !== 1 && rawCode !== 2) {
        throw new Error(`Unknown dependency code ${rawCode}`)
      }
      edges.push({
        controlling_state_id: controllingStateId,
        dependent_feature_id: dependentFeatureId,
        raw_dependency_code: rawCode,
        dependency_type: rawCode === 1 ? 'negative' : 'positive',
        source_fragment: fragment,
      })
    }
  }

  return edges
}
```

### All decoded dependencies in this key

| Controlling state | Dependency | Dependent feature IDs |
|---|---|---|
| 1 `male(s) only` | negative | 9, 10, 11, 12, 15, 17 |
| 2 `female(s) only` | negative | 8, 13, 14, 41 |
| 2 `female(s) only` | positive | 17 |
| 3 `male(s) and female(s)` | positive | 17 |
| 4 `sex(es) unknown` | negative | 8, 9, 10, 11, 12, 13, 14, 15, 17, 41 |
| 5 `No` (epigyne not cleared/dissected) | negative | 11 |

Features can be hierarchy groups. When a dependency disables a group, recursively disable its descendant groups and characters too. If active positive and negative rules conflict, negative takes priority.

### Applying dependencies

```js
function descendantsOf(rootId, features) {
  const result = new Set([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const feature of features) {
      if (!result.has(feature.id) && result.has(feature.parent)) {
        result.add(feature.id)
        changed = true
      }
    }
  }
  return result
}

export function availableFeatureIds(key, edges, chosenStateIds) {
  const chosen = new Set(chosenStateIds)
  const allPositiveTargets = new Set(
    edges.filter(edge => edge.dependency_type === 'positive')
      .map(edge => edge.dependent_feature_id),
  )
  const enabledPositiveTargets = new Set(
    edges.filter(edge => edge.dependency_type === 'positive' && chosen.has(edge.controlling_state_id))
      .map(edge => edge.dependent_feature_id),
  )
  const disabledRoots = new Set(
    edges.filter(edge => edge.dependency_type === 'negative' && chosen.has(edge.controlling_state_id))
      .map(edge => edge.dependent_feature_id),
  )

  // Positive targets begin hidden until a matching controller is selected.
  for (const target of allPositiveTargets) {
    if (!enabledPositiveTargets.has(target)) disabledRoots.add(target)
  }

  const disabled = new Set()
  for (const root of disabledRoots) {
    for (const id of descendantsOf(root, key.features)) disabled.add(id)
  }
  return new Set(key.features.filter(feature => !disabled.has(feature.id)).map(feature => feature.id))
}
```

Useful controlling selections for an interface are:

```js
function controlStateIds(sex, epigyneCleared) {
  if (sex === 'male') return [1]
  if (sex === 'unknown') return [4]
  if (sex === 'female') return [2, epigyneCleared ? 6 : 5]
  return []
}
```

## 6. Connecting entities, features and states

The remaining relationships are ordinary numeric foreign keys:

```text
feature.parent       -> feature.id
feature.states[]     -> state.id
state.feature        -> feature.id
entity.parent        -> entity.id
scores[state.id][entity array offset]
dependencies[state.id] -> dependent feature.id
```

UUIDs are opaque provenance identifiers. Preserve them, but the source relationships use numeric IDs.

Feature types are:

| `feature.type` | Meaning |
|---:|---|
| 0 | hierarchy group |
| 1 | multistate categorical character |
| 2 | numeric character |

This Salticidae key has no type-2 numeric features. Its `measures`, `scopes`, and `subsets` collections are empty. Do not invent numeric ranges or scope rules for it.

## 7. Exact Lucid-style matching versus a forgiving interface

Decoding and ranking are separate jobs.

For a strict Lucid-like Any State test for one selected character:

```js
function strictFeatureMatch(key, vectors, entityOffset, selectedStateIds) {
  return selectedStateIds.some(stateId => {
    const code = Number(vectors[stateId][entityOffset])
    if (code === 1 || code === 2) return true
    if (code === 3) return key.retainUncerts
    if (code === 4 || code === 5) return key.allowMisints
    return false
  })
}
```

For an improved forgiving key, do not discard a genus on the first code-0 conflict. Rank it using transparent contributions instead. The local prototype currently uses:

| Source code | Contribution |
|---:|---:|
| 0 absent/conflict | -0.85 |
| 1 common | +1.00 |
| 2 rare | +0.60 |
| 3 uncertain | +0.12 |
| 4 common by misinterpretation | +0.35 |
| 5 rare by misinterpretation | +0.18 |

User-confidence multipliers are 1.0 for certain, 0.65 for fairly sure, and 0.35 for unsure. These are deliberately understandable heuristics, **not calibrated probabilities and not claimed to reproduce Lucid's ranking formula**.

There is an important source ambiguity: some taxon/feature combinations contain code 0 for every state in the feature. The source does not distinguish “genuinely incompatible with all states” from “this character was not scored for this taxon.” The improved local prototype treats such all-zero feature blocks as unassessed/neutral. A strict Lucid reproduction may instead treat the selected state as absent. Whichever choice is made should be explicit in the UI and tests.

## 8. Required validation checks

After decoding, assert all of the following:

```js
if (key.entities.length !== 86) throw new Error('Unexpected entity count')
if (key.features.length !== 114) throw new Error('Unexpected feature count')
if (key.states.length !== 296) throw new Error('Unexpected state count')
if (Object.keys(key.scores).length !== 296) throw new Error('Unexpected score-vector count')

for (const vector of Object.values(decodedVectors)) {
  if (vector.length !== key.entities.length) throw new Error('Bad score-vector length')
  if (!/^[0-5]+$/.test(vector)) throw new Error('Unknown score code')
}

if (decodedScoreRecords.length !== 296 * 86) {
  throw new Error('Expected exactly 25,456 score cells')
}
if (decodedDependencyEdges.length !== 23) {
  throw new Error('Expected exactly 23 dependency edges')
}
```

Also verify every `state.feature`, `feature.parent`, `feature.states[]`, `entity.parent`, dependency controller, and dependency target resolves.

## 9. Known-good reconstruction already available

If Qwen can be given more than one file, it does not need to repeat the decoding. The project already contains:

```text
data/normalized/key.json
```

That file contains:

- the original taxa, features, states, IDs and UUIDs;
- 25,456 expanded score records;
- 23 expanded dependency records;
- the original compressed strings and decoded vectors under `raw_encoded`;
- provenance and source offsets.

For the smaller web-app form, use:

```text
public/data/key.json
```

It retains the original records and decoded vectors as `score_vectors[stateId]`, but omits the redundant expanded score array. Its lookup rule is:

```js
const offset = key.taxa.findIndex(taxon => taxon.id === taxonId)
const scoreCode = Number(key.score_vectors[String(stateId)][offset])
```

## 10. One-paragraph instruction to give Qwen

> Use LZ-String `decompressFromBase64` on every value in `scores` and `dependencies`. A decoded score value is a one-character-per-entity vector aligned by `entities` array position, including the Salticidae root at offset 0; map codes 0–5 using the table in this document. A decoded dependency value is a `::`-separated list of `dependentFeatureId:code` fragments, where 1 is negative and 2 is positive. Preserve source IDs/UUIDs and validate 296 vectors × 86 entities = 25,456 cells plus 23 dependency edges. Do not use ordinary Base64 decoding, do not index vectors by entity ID, and do not infer compatibility from `state.type`.

