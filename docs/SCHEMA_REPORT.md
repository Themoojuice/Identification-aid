# Lucid payload schema report

## Source and envelope

The source file is named `salticidae.json`, but it is not a bare JSON document. It is a JavaScript assignment:

```javascript
var key = { ... };
```

The JSON object inside that assignment parses without repair. The source is 286,072 bytes and has SHA-256 `cea9492cd5649764482748e88be2d6cfab91344c573b3dada2f85b9d4aa6b4c8`. The original at the project root was not modified; a byte-identical archival copy is at `source/lucid-original/salticidae.json`.

## Exact counts

| Item | Count |
|---|---:|
| Entities, including the Salticidae root | 86 |
| Terminal genus entities | 85 |
| Feature records, including grouping nodes | 114 |
| Feature-group nodes (`type: 0`) | 15 |
| Scored character features (`type: 1`) | 99 |
| States | 296 |
| Compressed state score vectors | 296 |
| Atomic state × entity score cells | 25,456 |
| Atomic score `0` (absent) | 15,900 |
| Atomic score `1` (common) | 9,538 |
| Atomic score `3` (uncertain) | 18 |
| Compressed dependency vectors | 5 |
| Decoded dependency edges | 23 |
| Numeric measure vectors | 0 |
| Scope vectors | 0 |
| Subsets | 0 |
| Text-reference occurrences | 87 |
| Full-image occurrences | 557 |
| Thumbnail occurrences | 557 |
| All JSON reference occurrences | 1,201 |
| Unique JSON-referenced URLs | 1,116 |

The live `about.html` says “98 characters, 294 character states”. Those figures are stale: the current payload contains 99 scored characters and 296 states. Counts in this report come from the payload and are enforced by tests.

## Top-level object

| Field | Observed value/type | Meaning |
|---|---|---|
| `title` | string | Key title. |
| `basePath` | `key/salticidae/` | Player-relative key resource root. |
| `keyType` | `0` | Matrix-key mode in this player. |
| `retainUncerts` | `true` | Initial player policy for uncertain scores. |
| `allowMisints` | `true` | Initial player policy for misinterpretation scores. |
| `matchType` | `0` | Initial matching mode; evidence indicates `0` is Any State. |
| `features` | array[114] | Feature hierarchy and character metadata. |
| `states` | array[296] | Categorical states. |
| `entities` | array[86] | Taxon hierarchy. |
| `subsets` | empty array | Reserved for feature/entity subsets; unused here. |
| `scores` | object with 296 keys | LZString-compressed, state-keyed score vectors. |
| `measures` | empty object | Reserved for numeric score records; unused here. |
| `dependencies` | object with 5 keys | LZString-compressed, controlling-state-keyed dependency vectors. |
| `scopes` | empty object | Reserved for Not Scoped/feature-scope data; unused here. |

No other top-level fields are present.

## Feature records

All observed feature fields are preserved. There are two record shapes.

Grouping nodes (`type: 0`, 15 records) have:

- `id`: unique integer, 1–15 in this dataset.
- `uid`: globally unique UUID string.
- `name`: display label.
- `parent`: `0` for top-level groups.
- `type`: `0`.
- `children`: always `true`.
- `text`: optional array; observed only on feature 1.

Scored characters (`type: 1`, 99 records) have:

- `id`, `uid`, `name`, and `parent`.
- `parent`: a grouping-feature ID.
- `inc_best`: always `true`; every character participates in Best-character calculations.
- `match_type`: always `0`; per-character matching mode.
- `weight`: always `1.0`; no differential character weighting is present.
- `single_choice`: always `false`; the player may accept more than one selected state.
- `states`: ordered array of state IDs.

Example:

```json
{
  "id": 18,
  "uid": "99ec7cab-aa76-4526-97a0-b093db9a7ca1",
  "name": "Overall body form",
  "parent": 2,
  "type": 1,
  "inc_best": true,
  "match_type": 0,
  "weight": 1.0,
  "single_choice": false,
  "states": [7, 8, 9, 10]
}
```

Feature names are not unique: there are 103 distinct names across 114 records. IDs and UUIDs, not names, are the keys.

## State records

Every state has:

- `id`: unique integer; the score-map key uses its decimal string.
- `uid`: globally unique UUID.
- `name`: display label. State names are not unique (203 distinct names among 296 records).
- `type`: always `0` in this key.
- `feature`: the owning scored-character ID.
- `images`: optional array, present on 241 states. Each observed state has at most one image record, but the schema is an array and is preserved as such.

Example state 8, “ant-like”, belongs to feature 18 and carries an image, caption, comments, thumbnail and media type.

## Entity/taxon records

Every entity has:

- `id`: unique integer.
- `uid`: globally unique UUID.
- `name`: unique display/taxon label in this dataset.
- `type`: always `1`.
- `children`: Boolean.
- `parent`: entity ID, or `0` for the root.
- `text`: one-record array containing the linked fact sheet.
- `images`: array of full-size image records.

The hierarchy consists of entity 1, `Salticidae`, with `parent: 0` and `children: true`, plus 85 terminal genera whose parent is entity 1. No species-level entity nodes occur.

Example:

```json
{
  "id": 35,
  "uid": "4c08889f-2267-4298-85ef-37ab2b2817a8",
  "name": "Holoplatys Simon, 1885",
  "type": 1,
  "children": false,
  "parent": 1,
  "text": [{
    "caption": "Fact Sheet",
    "path": "Html/entities/holoplatys_simon_1885.htm",
    "type": 2
  }]
}
```

## Text and image records

Text records have `caption`, `path`, and `type`. The only observed text type is `2`, interpreted by the player as HTML. There are 87 occurrences: one on every entity plus an anomalous extra reference on feature group 1. That extra reference points to `Html/entities/mopsolodes_zabka_1991.htm`, duplicating the Mopsolodes entity fact sheet and appearing unrelated to the feature label “Sex of specimens”. It is preserved and flagged, not corrected.

Image records have:

- `caption`: HTML-capable caption text.
- `comments`: optional HTML-capable explanatory text; present on 257 of 557 image records.
- `path`: full image path.
- `thumb_path`: player thumbnail path.
- `type`: always `1`, interpreted as image.

There are 241 state-image records and 316 entity-image records. Captions are source data and remain un-sanitized in the canonical representation. Paths contain URL escapes, spaces after decoding, punctuation, mixed capitalization, and occasional apparent filename typos. They are preserved exactly in `source_path`; a decoded filesystem path is used only for the local mirror.

## Score encoding

`scores` is an object whose keys are state IDs and whose values are LZString Base64 strings. The player calls `LZString.decompressFromBase64`. Each decoded value is exactly 86 characters long, with character position *n* corresponding to `entities[n]` in source order.

For example, state 7 decodes to:

```text
01111111111111111110111111111111111111111111111101111111111111111111110111111111111111
```

The canonical dataset expands this to 86 records but also retains the original compressed value, the decoded vector, the source state key and each entity offset.

Player-supported categorical score codes are:

| Code | Meaning | Observed in this payload? |
|---:|---|---|
| 0 | absent | Yes: 15,900 |
| 1 | common/present | Yes: 9,538 |
| 2 | rare | No |
| 3 | uncertain | Yes: 18 |
| 4 | common/present by misinterpretation | No |
| 5 | rare by misinterpretation | No |

“Rare”, “misinterpreted”, and “not scoped” are therefore player/schema capabilities, not scores actually used by this key. See `SCORING_SEMANTICS.md`.

## Dependency encoding

`dependencies` is keyed by controlling state ID. Each value is LZString Base64. Decoding yields `dependentFeatureId:dependencyCode` fragments separated by `::`.

Example:

```text
state 1 -> 9:1::10:1::11:1::12:1::15:1::17:1
```

The coherent player behaviour and official Lucid model establish code `1` as negative (hide/remove the dependent feature when selected) and code `2` as positive (the dependent feature unfolds when selected). The 23 edges are:

| Controlling state | Type | Dependent features |
|---|---|---|
| 1 `male(s) only` | negative | 9, 10, 11, 12, 15, 17 |
| 2 `female(s) only` | negative | 8, 13, 14, 41 |
| 2 `female(s) only` | positive | 17 |
| 3 `male(s) and female(s)` | positive | 17 |
| 4 `sex(es) unknown` | negative | 8, 9, 10, 11, 12, 13, 14, 15, 17, 41 |
| 5 `No` (epigyne not dissected/cleared) | negative | 11 |

This is how sex-specific applicability is encoded. There is no separate `sex` field. There are no explicit life-stage applicability records.

## Numeric characters, ranges, scopes and subsets

No numeric feature (`type: 2`) occurs, and `measures` is empty. Consequently there are no numeric bounds, disjunct ranges, units, uncertainty annotations, or numeric score records to normalize. The archived generic player contains code for numeric `omin`, `nmin`, `nmax`, and `omax` bounds, but those structures cannot be validated against this dataset and have not been invented in the canonical output.

`scopes` is empty, so this key has no Not Scoped feature/entity scores. `subsets` is empty. Their empty source structures are retained.

## Identifier relationships

Numeric IDs carry all in-payload relationships:

- `feature.parent -> feature.id`
- `feature.states[] -> state.id`
- `state.feature -> feature.id`
- `entity.parent -> entity.id`
- `scores[state.id][entity source index]`
- `dependencies[controlling state.id] -> dependent feature.id`

UUIDs are opaque stable identifiers and are unique across all 496 feature, state and entity records. No relationship is expressed directly via UUID, but the normalized records repeat relevant UUIDs beside foreign IDs for traceability.

## External paths and URLs

The payload has no absolute HTTP URL inside a feature, state or entity. All key-specific references are relative paths under the media base. External-path-bearing fields are:

- top-level `basePath`;
- `features[].text[].path`;
- `entities[].text[].path`;
- `states[].images[].path` and `.thumb_path`;
- `entities[].images[].path` and `.thumb_path`.

The normalized manifest resolves them against `https://apps.lucidcentral.org/salticidae/key/salticidae/Media/` while retaining the exact source string.

## Unknown or unresolved fields

- The numeric values for `keyType`, `matchType`, feature `match_type`, entity/state `type`, and media `type` are not self-describing. Their meanings are confirmed or strongly inferred from the player, record shapes and behaviour; raw values are retained.
- The exact tie-breaking formula of the generic Lucid “Best” implementation is not serialized in the payload. The relevant inputs (`inc_best`, `weight`, scores and dependencies) are complete, and the archived player preserves the original implementation.
- Empty `measures` and `scopes` show that those capabilities are unused; their general serialized form cannot be exhaustively reverse-engineered from this key alone.
- `children` is explicit only where supplied; the normalized form preserves rather than recomputes it.
- The feature-group 1 link to the Mopsolodes fact sheet is likely an authoring error, but source intent is not provable.
- The fact-sheet index links `australoneon_richardson_2025.htm`, while the JSON entity points to `australoneon_richardson_2024.htm`; both exist and were archived. Both display “Australoneon Richardson 2025”, and the 2025 page still links the 2024 PDF/media paths. The normalized entity follows the JSON path and the index alias remains in the asset manifest.
- The index percent-encodes the Unicode filename for `psenuc_prószyński_2016.htm`; URL resolution shows this is the same resource as the literal-Unicode JSON path, not a second page.
