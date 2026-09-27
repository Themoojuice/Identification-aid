# Sol implementation handoff

Prepared: 2026-09-21. This pack records the approved design direction from the architecture discussion. It does not assert that the proposed system is implemented or scientifically validated.

## Start here

1. Read the root `AGENTS.md` and `STATUS.md` in this directory.
2. Read all eleven scientific packet files below. Treat them as evidence, not a prescribed runtime schema.
3. Read `DATA_AUDIT.md`, `ARCHITECTURE.md` and `IMPLEMENTATION_PLAN.md`.
4. Inspect the current prototype and run an appropriate baseline when implementation is authorized.
5. Execute only the stage requested by the user, using the matching prompt in `PROMPTS.md`.

All paths below are relative to the project root unless stated otherwise.

## Scientific packet: mandatory reading

- `00_START_HERE.md`
- `01_lucid_schema.json`
- `02_lucid_matrix.json`
- `03_lucid_dependencies.json`
- `04_taxon_concepts.json`
- `05_schubert_genus_characters.json`
- `06_taxon_crosswalk.json`
- `07_species_hints.json`
- `08_media_manifest.json`
- `09_examples.json`
- `10_validation_report.md`

Inspect complete structures and their scientific qualifications. Large matrices and manifests may be parsed and inspected in bounded batches; do not mistake a truncated tool response for a completed read. Verify aggregate properties programmatically and inspect exceptions and free-text notes. Media notes contain identification instructions not present in the character descriptions.

## Documents in this pack

| Document | Purpose |
|---|---|
| `DATA_AUDIT.md` | Evidence inventory, existing caveats and additional semantic issues with interim handling. |
| `ARCHITECTURE.md` | Target model, engine behaviour, UX, offline storage and scientific update design. |
| `IMPLEMENTATION_PLAN.md` | Stage boundaries, acceptance criteria, modules and testing strategy. |
| `PROMPTS.md` | Copy-ready implementation prompts in execution order. |
| `STATUS.md` | Honest implementation ledger and continuity between tasks. |

## Existing prototype

There is already a React/TypeScript/Vite application. Relevant entry points:

- `src/App.tsx`, `src/styles.css`: existing interface.
- `src/lib/types.ts`, `src/lib/data.ts`: runtime contracts and loading.
- `src/lib/engine.ts`, `src/lib/engine.test.ts`: scoring, dependencies and question selection.
- `scripts/build_app_data.js`: existing runtime compiler.
- `scripts/serve_app.js`: local serving and archive access.
- `data/normalized/`: faithful legacy reconstruction.
- `data/curated/`: provisional presentation and difficulty metadata.
- `tests/APP_TEST_SCENARIOS.md`: existing behavioural scenarios.

Existing commands, observed in package.json:

- `npm run test:source`
- `npm run test:app`
- `npm test`
- `npm run build`
- `npm run dev`

These commands were inspected, not executed during documentation preparation. The build and development scripts run `app:data`, which writes generated application data. Understand that operation before invoking it.

## Relationship to older documentation

`docs/APP_ARCHITECTURE.md` and `docs/PROTOTYPE_STATUS.md` describe the legacy prototype. Their fixed scoring weights, numeric compatibility presentation and local-storage sessions are not the new target design. `docs/SCORING_SEMANTICS.md` remains useful evidence about historical Lucid behaviour; source parity and the app's reviewed behaviour must remain distinguishable.

Resolve contradictions through explicit decisions and provenance. Do not treat either the new audit or an old README as a biological authority overriding the source.

## Priorities

Usability; clarity; robust genus identification; graceful uncertainty; provenance; taxonomic updateability; mobile ergonomics; offline performance; optional species suggestions; aesthetic polish.

No AI species classifier, backend, account system, live taxonomy API or phylogenetic reconstruction is required for V1.
