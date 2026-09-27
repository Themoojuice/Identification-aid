# Interactive key architecture

## Scope

The prototype is a static React/TypeScript application. It has no remote API, user account, database, AI component or live taxonomy integration. Its only runtime inputs are local, reproducibly generated JSON and the existing media archive.

## Data separation

- `salticidae.json` and `source/lucid-original/` remain untouched source records.
- `data/normalized/` remains the complete canonical reconstruction.
- `scripts/build_app_data.js` derives `public/data/key.json` by retaining source taxa, features, states, dependencies, IDs, UUIDs and decoded score vectors while omitting the redundant 25,456 expanded score objects.
- `public/data/fact_sheets.json` is a byte-for-byte JSON serialization of the normalized fact-sheet object.
- `data/curated/character_metadata.json` is explicitly provisional UX metadata. It does not modify or masquerade as source taxonomy.

## Identification engine

`src/lib/engine.ts` is independent of React and covers four jobs:

1. Apply Lucid positive and negative dependencies, including descendant groups.
2. Rank all 85 genera from multi-state observations.
3. Suggest unused characters that split the plausible candidate set, discounted by difficulty in field mode.
4. Return only differing character rows for comparisons of two to five genera.

For an observation containing multiple selected states, the strongest compatible source score is used. This gives the choices an “any of these” meaning and avoids counting one character more than once.

## Compatibility weights

These provisional, easily tuned contributions are multiplied by user confidence:

| Lucid score | Contribution |
| --- | ---: |
| common | +1.00 |
| rare | +0.60 |
| uncertain | +0.12 |
| common by misinterpretation | +0.35 |
| rare by misinterpretation | +0.18 |
| absent/conflict | −0.85 |

User confidence multipliers are 1.00 (certain), 0.65 (fairly sure) and 0.35 (unsure). A candidate is never removed from the underlying ranked list. “Plausible” is a presentation subset: within 18 compatibility points of the leader, at least 38 compatibility, and no more than one conflict beyond the best candidate.

The displayed number is explicitly a compatibility score, not a probability.

## Local operation

Vite builds the app into `dist/`. `scripts/serve_app.js` is a small static-file server that also exposes the archived media from its existing location, avoiding a second 170 MB copy. A service worker caches the application data and media as used. Session choices and theme are saved in browser local storage.

## Interface structure

The desktop application uses one shared observation state across three coordinated areas:

- a compact specimen rail for sex, cleared-epigyne context, progress, recorded observations and access to the complete character browser;
- the central Fieldmate workflow, which presents the current discriminator-selected character and allows skipping or revising without changing the engine semantics;
- a wide candidate column with archived source thumbnails, evidence counts, source-gap indicators and fact-sheet/gallery access.

When two to five plausible genera remain, the central workspace offers an image-led differential comparison. It is built directly from `differentialRows`, excludes already-recorded characters, and labels all-zero source gaps as “Not scored”.
