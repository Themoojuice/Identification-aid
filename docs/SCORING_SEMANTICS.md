# Lucid scoring semantics

## Evidence used

Semantics were checked against three independent forms of evidence:

1. the decoded payload;
2. the archived Lucid Player 2.2.9 bundle (`build: 20240920`), including its `LZString.decompressFromBase64` call and score-label function;
3. Lucid’s official help pages, archived under `source/lucid-original/help/`:
   - [Scoring the key](https://help.lucidcentral.org/lucid/scoring-the-key/)
   - [How to use the Lucid scores](https://help.lucidcentral.org/lucid/how-to-use-the-lucid-scores/)
   - [Configuring the Player](https://help.lucidcentral.org/lucid/configuring-the-player/)
   - [Feature dependencies](https://help.lucidcentral.org/lucid/setting-dependencies-for-features/)

## Directly confirmed

### Categorical score codes

The player reads one character per entity from a decoded state score vector. Its UI-label function maps code 2 to “(rarely)”, 3 to “(?)”, and 4/5 to “(by misinterpretation)”. Lucid’s official scoring documentation supplies the complete six-code meaning:

| Code | Canonical name used locally | Behaviour |
|---:|---|---|
| 0 | `absent` | The state does not occur; selection discards the entity. This is Lucid’s default score. |
| 1 | `common` | The state normally or always occurs; the entity remains. |
| 2 | `rare` | The state occurs rarely; it remains but is ranked below a common match. |
| 3 | `uncertain` | The author does not know whether the state occurs. |
| 4 | `common_misinterpreted` | The state is absent but may commonly appear present through user misinterpretation. |
| 5 | `rare_misinterpreted` | The state is absent but may rarely appear present through user misinterpretation. |

Only codes 0, 1 and 3 occur in this key. Code 2, 4 and 5 support remains in the normalized enum map so a later engine does not silently narrow Lucid semantics.

### Uncertain and misinterpretation options

`retainUncerts: true` means an uncertain score behaves like common for normal identification. Turning it off makes uncertain behave like absent.

`allowMisints: true` means common-by-misinterpretation behaves like common and rare-by-misinterpretation behaves like rare. Turning it off makes both behave like absent. The options matter to the generic engine even though this payload has no score 4 or 5.

### Any State versus All States

Lucid documents two within-feature match policies:

- Any State retains a taxon if it matches at least one selected state of that feature.
- All States retains a taxon only if it matches every selected state of that feature.

The payload sets top-level `matchType: 0` and every character’s `match_type: 0`. The generic player defaults code 0 and describes Any State as the normal/default identification method.

### Rare-score ranking

Lucid’s documentation states that a Rare match remains but is moved below a Common match in the remaining-entity ranking. This key contains no Rare scores, so this rule has no effect on its current matrix.

### Dependencies

Official Lucid documentation defines:

- a negative dependency removes a dependent feature when the controlling state is chosen;
- a positive dependency hides the dependent feature initially and adds it when the controlling state is chosen;
- if positive and negative dependencies conflict, negative takes priority.

The dataset’s code 1 edges exactly describe negative behaviour (for example, `male(s) only` controls all female-anatomy groups), while code 2 edges exactly describe positive unfolding (for example, choosing a female-containing specimen reveals the epigyne-dissection question).

### Not Scoped and feature scopes

Lucid distinguishes Not Scoped from Absent. A feature scored Not Scoped for an entity is logically inapplicable, and feature scopes can hide a feature until all remaining entities are in its scope. This key’s `scopes` object is empty, so no such scores exist here. Sex-specific inapplicability is instead implemented with dependencies.

## Strongly inferred

- Numeric `matchType`/`match_type` value `0` means Any State, based on the player’s default, the official description of Any State as normal, and the live behaviour. The bundle is minified and does not expose a human-readable numeric enum declaration.
- Dependency code `1 = negative`, `2 = positive` is confirmed by every real dependency’s biological effect and the player’s two-class handling, although the minified bundle does not retain readable enum constant names.
- Top-level `keyType: 0` is matrix-key mode because this payload contains matrix features/states and state-by-entity score vectors, and the player processes it as such.
- Feature `weight: 1.0` is the neutral/default weight. All 99 characters share it, so weighting cannot distinguish them in this dataset.
- `inc_best: true` means eligible for Lucid’s Best-character calculation. All 99 characters are eligible.

## Unresolved or inapplicable here

- The exact mathematical formula and tie-breaking order used by Lucid’s Best-character routine are implemented in the generic compiled player, not described by the payload. The original bundle is archived for future parity work. No key-specific inputs are missing.
- No non-default feature weight exists, so weight scaling cannot be empirically tested against this dataset.
- The general serialized form of numeric score records and disjunct ranges cannot be confirmed because `measures` is empty and no numeric features exist.
- The general serialized form of feature scopes cannot be confirmed because `scopes` is empty.
- Lucid supports numeric Normal, Misinterpreted and Uncertain ranges, but none should be synthesized for this key.
