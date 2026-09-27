# Australian Salticidae Interactive Key

This project contains both the faithful reconstruction of **A Key to the Genera of Australian Jumping Spiders** and a forgiving, local-first interactive identification tool built over that source.

## Open the key locally

The first time only, install the included app packages:

```text
npm install
```

Then start the finished local version:

```text
npm run app
```

Open `http://127.0.0.1:4173/` in a browser. The app and all taxonomic content run from this folder; no internet connection is required. Press `Ctrl+C` in the terminal when finished.

For live development with automatic refresh, use `npm run dev`.

## What the prototype supports

- a three-area desktop field-guide workspace with specimen context, guided Fieldmate and image-led candidates;
- a one-useful-character-at-a-time Fieldmate flow with skip, revision, multi-state and confidence controls;
- sex-aware character availability, including the cleared-epigyne dependency;
- a synchronized complete Lucid character browser for direct specialist control;
- progressive character groups with field and microscope modes;
- multi-state observations and three plain-language confidence levels;
- forgiving candidate ranking that never silently discards a genus;
- readable support, conflict and unchecked-character explanations;
- useful next-character suggestions based on separation, coverage and difficulty;
- an image-led 2–5 genus differential comparison showing only meaningful separators and explicit “not scored” cells;
- structured fact-sheet sections and private-local genus plates where the separately retained media archive is present;
- obvious remove/revise/restart controls, dark mode and local session restore;
- responsive phone and desktop layouts, plus a local offline cache.

Compatibility is deliberately labelled as a heuristic match—not a calibrated probability. The curated difficulty overlay is kept at `data/curated/character_metadata.json`, separate from source-derived facts.

## Results at a glance

- 86 entities: one Salticidae root and 85 genus leaves
- 99 scored characters under 15 feature groups
- 296 categorical states
- 25,456 losslessly expanded state × entity score cells
- 23 dependency edges
- 86 HTML fact sheets and 86 PDF editions archived
- 1,353 media resources archived across JSON, fact-sheet and site references
- 86 fact sheets normalized into 426 structured sections

The root `salticidae.json` remains untouched. Its archived copy has the same SHA-256: `cea9492cd5649764482748e88be2d6cfab91344c573b3dada2f85b9d4aa6b4c8`.

## Important paths

- `source/lucid-original/` — original payload and source archive retained locally, but excluded from the public repository pending a redistribution review
- `LOCAL_EVIDENCE.md` — explains the locally retained evidence/media and which checks require it
- `data/normalized/key.json` — canonical key data, including all atomic scores and raw compressed vectors
- `data/normalized/fact_sheets.json` — lossless section HTML plus derived plain text
- `data/manifests/references.json` — every JSON reference occurrence
- `data/manifests/assets.json` — unified machine-readable asset inventory
- `docs/ASSET_MANIFEST.md` — complete human-readable asset inventory
- `docs/SCHEMA_REPORT.md` — source schema and counts
- `docs/SCORING_SEMANTICS.md` — confirmed/inferred/unresolved Lucid behaviour
- `docs/LUCID_COMPLETENESS_AUDIT.md` — logical and content completeness
- `docs/LICENSING_AND_PROVENANCE_NOTES.md` — rights/provenance evidence and review list

## Validate the public checkout

```text
npm run build
npm run test:app
```

## Validate everything with the local evidence archive

```text
npm test
```

The full suite first verifies the complete reconstructed source, then tests the app engine. Its source-integrity checks require the separately retained `source/` archive described in `LOCAL_EVIDENCE.md`. App scenarios cover reversible ranking, conflict tolerance, sex dependencies, differential rows, and diagnostic source-state checks for Jotus, Holoplatys, Maratus, Adoxotoma, Opisthoncus and Ananeon.

## App structure

- `src/App.tsx` — identification workspace and genus detail experience
- `src/lib/engine.ts` — dependency, ranking, suggestion and comparison logic
- `src/lib/engine.test.ts` — repeatable app-engine scenarios
- `data/curated/character_metadata.json` — provisional difficulty/method guidance
- `public/data/` — generated compact app bundle with source IDs and UUIDs retained
- `scripts/build_app_data.js` — reproducibly derives the compact app bundle
- `tests/APP_TEST_SCENARIOS.md` — human-readable scenario description

## Rebuild normalized data

With the source archive present:

```text
npm run extract
```

## Small command-line proofs

```text
python scripts/query_key.py Holoplatys
python scripts/filter_key.py --state 8
```

The filter follows the payload’s normal retention policy: common, rare, uncertain and allowed-misinterpretation scores are compatible. Add `--strict` to accept only common/rare true-presence scores.

## Archive notes

The local archive was collected from public URLs only, at no more than three concurrent requests, without authentication or access-control bypass. All 1,116 unique JSON-referenced resources downloaded successfully. Broken, inaccessible and deliberately unmirrored generic-player resources remain in the manifests with their observed status. The archive is not included in this public repository; see `LOCAL_EVIDENCE.md`.
