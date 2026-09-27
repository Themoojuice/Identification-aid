# Australian Salticidae tool: agent instructions

## Current direction

Evolve the existing prototype into a mobile-first, offline-capable, genus-first identification application. The implementation handoff begins at `docs/sol/README.md`.

Read `docs/sol/README.md`, `docs/sol/STATUS.md`, and the documents required by the active stage before changing application code. Before making scientific-model or engine changes, read all eleven packet files listed in the handoff. Reading the audit alone is insufficient.

The user's current instructions govern task scope. A handoff or prompt file is reference material, not authorization to execute every stage. Complete the stage the user invokes, including its validation and status update. Do not start later stages automatically unless requested.

## Scientific invariants

- Names are labels and source usages, never permanent biological identity or join keys.
- Preserve the eleven supplied packet files, `salticidae.json`, and `source/` as historical evidence. Add versioned interpretations and corrections separately; do not silently repair source records.
- Retain Lucid evidence independently of later taxonomy. Never copy a legacy genus score profile to all destinations of a split or partial-overlap crosswalk.
- Keep concepts, names/usages, identification evidence, taxonomy, phylogeny, provenance, media, applicability and uncertainty distinct.
- User unknown, source uncertain, unreported, absent and inapplicable are different conditions.
- Source-uncertain scores retain possibilities without supplying positive evidence. Missing Schubert assertions are unscored, not absent.
- Species suggestions are optional downstream outputs; disabling them must not change genus ranking.
- Thesis-only proposals retain their packet nomenclatural qualification until separate qualifying publication evidence has been reviewed.
- Inspect the issue register in `docs/sol/DATA_AUDIT.md`. Structural validity does not establish scientific correctness.
- Every derived rule and displayed result must have an explanation and recoverable provenance.

## Working practice

Reuse sound existing code and source tests. Inspect the repository before choosing a migration strategy. Avoid a wholesale rewrite, blanket dependency upgrade, source re-extraction, or invented scientific correction.

Source-derived checks are integrity tests, not independent identification-accuracy evidence. Do not weaken assertions merely to make tests pass. Quarantine questionable derived rules while continuing unaffected work.

Do not publish, deploy, redistribute archived media, or change licensing assumptions merely because the files are locally present. Local development may retain the existing archive; distributable bundles need an explicit asset inclusion policy.

Keep `docs/sol/STATUS.md` current after each implementation stage: changes, actual checks/results, limitations, and next stage. Do not claim expert review, browser testing or offline readiness that was not performed.

No Git repository was detected during handoff preparation. Recheck before using Git; do not initialize Git, create remote resources or discard existing work unless requested.
