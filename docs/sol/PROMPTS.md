# Copy-ready prompts for GPT-5.6 Sol

Use these in order in this project. Begin with Prompt 1. Each prompt authorizes only its stage. Use the same task for continuity or a new task with the project attached and this handoff available. Do not paste all prompts as one assignment unless you deliberately want all stages implemented.

## Prompt 1 — foundation and audited data contract

```text
Begin Stage 1 of the Australian Salticidae tool in C:\Users\Brend\TaxonomyTool.

Read AGENTS.md and docs/sol/README.md, STATUS.md, DATA_AUDIT.md, ARCHITECTURE.md and IMPLEMENTATION_PLAN.md. Read all eleven supplied packet files before modifying scientific-model or application code; inspect large files in bounded batches and do not mistake truncated output for a complete read.

Implement Stage 1, not merely a plan. First inspect the existing React/TypeScript prototype, compiler and tests, and record the baseline. Reuse sound existing work. Create the scientific contract, source-faithful importer, persistent ID aliases, explicit provenance, machine-readable review register and deterministic runtime compilation foundation described in the handoff. Preserve every scientific distinction and every original packet byte. Retain unknown fields or fail explicitly; do not silently discard them.

Verify the exact Lucid matrix reconstruction, the full key structure, references, persistent identity behaviour and issue inventory. Distinguish source facts from curator interpretation. Do not silently resolve taxonomy or media errors. No species classifier, new backend, wholesale UI rewrite, automatic dependency upgrades, source re-extraction or deployment.

Complete the Stage 1 acceptance criteria and update docs/sol/STATUS.md with actual changes, checks, limitations and the next stage. If a source problem blocks one derived rule, quarantine it and continue unaffected work. Finish with a concise account of what works and what remains. Do not start Stage 2 automatically.
```

## Prompt 2 — genus engine

```text
Implement Stage 2 from docs/sol/IMPLEMENTATION_PLAN.md. Read AGENTS.md, the handoff and current STATUS.md; complete the mandatory packet reading if this task has not already done so. Verify Stage 1's actual state before building on it.

Build the explainable genus engine over the scientific contract. Separate user unknown, unobservable, skipped, source uncertain, unreported, absent and inapplicable. Support OR alternatives and explicitly valid joint observations, per-specimen context, sex/stage/preparation rules, reversible answer suspension, graded contradictions, coverage and useful conflict recovery. Source uncertainty must not add positive support. All-zero profiles retain their original zeros with explicit protective interpretation. Zero evidence is unassessed. Keep source parity distinguishable from default app behaviour.

Use pure testable logic independent of React and preserve useful existing functions through adapters where appropriate. Add meaningful regression/property tests for Stage 2 acceptance criteria, run relevant checks and update STATUS.md. Do not add species suggestions or silently resolve audit issues. Complete Stage 2 and stop before Stage 3.
```

## Prompt 3 — taxonomy and reconciliation

```text
Implement Stage 3 of docs/sol/IMPLEMENTATION_PLAN.md using the current scientific contract and engine. Read AGENTS.md, docs/sol/STATUS.md and the scientific handoff; verify prerequisites rather than assuming earlier prompts were completed.

Create concept-level identification results alongside recoverable historical Lucid matches. Implement reviewed equivalence, partial overlap, splits, non-equivalence and unresolved mappings. Exercise legacy Maratus, Saitis, Salpesia and Servaea explicitly. Do not clone aggregate Lucid score profiles into descendant concepts, propagate blanket absences across partial overlaps, or count multiple historical routes as independent support. Preserve residues, unreviewed mappings, independent concept-evidence pathways and thesis nomenclatural qualifications. Never join biological records by name strings.

Add update/replay fixtures for renamed display, changed combination and split/merge concepts while leaving historical scores unchanged. Meet Stage 3 acceptance criteria, run checks and update STATUS.md with actual results. Do not start the UI or species stages automatically.
```

## Prompt 4 — mobile genus identification

```text
Implement Stage 4 of docs/sol/IMPLEMENTATION_PLAN.md. Read AGENTS.md and the handoff, inspect current STATUS.md and verify the existing app and engine contracts.

Upgrade the current interface into a highly usable mobile-first genus identification flow: progressive specimen context, one useful illustrated question, not-sure/cannot-see controls, ranked candidate comparison, why-this-question explanations, evidence review, reversible answer editing and saved partial results. Keep one identification app with no Lucid/Schubert source-choice gate. Foreground genus and honest coverage/compatibility labels; remove unsupported numeric confidence presentation. Expert and equipment options should be distinct.

Demonstrate unknown-sex identification, legacy Maratus reconciliation and unresolved female outcomes. Preserve useful existing functionality and old session evidence with explicit migration. Use safe text/placeholder fallbacks for unavailable or uncleared assets, and do not relabel questionable figures. Perform available responsive/browser and accessibility checks and distinguish those actually performed from deferred checks. Run relevant automated checks, update STATUS.md and finish Stage 4 without implementing later stages.
```

## Prompt 5 — Schubert and better questions

```text
Implement Stage 5 of docs/sol/IMPLEMENTATION_PLAN.md. Read AGENTS.md, the handoff and STATUS.md, and verify earlier stages.

Integrate reviewed Schubert assertions into the same multi-access identification session. Preserve source character identities and scoped alignments. Retain the complete adult-male key as an expert reference/resolver with its exact OR/AND branch logic; never present it as a female or juvenile key or convert every key path into a universal genus profile. Keep audit conflicts AU03–AU05 explicit and quarantine unsupported exclusion rules.

Improve next-question ranking using expected useful genus-resolution gain adjusted for usable views, source gaps, effort, error risk, applicability and correlation. Include abstention and indirect utility of context questions. Do not treat overlapping states as disjoint probabilities or reward a split simply for creating more records. Prefer an easier observation when discrimination is nearly equal. Allow manual question selection and useful stopping points.

Meet Stage 5 acceptance criteria, add explanatory tests and run appropriate checks. Update STATUS.md, including which observation-cost annotations are curator/product judgments. Do not start offline packaging or species work automatically.
```

## Prompt 6 — offline reliability

```text
Implement Stage 6 of docs/sol/IMPLEMENTATION_PLAN.md. Read AGENTS.md, the handoff and STATUS.md and inspect the current service worker, local server, build pipeline and session storage.

Provide reliable offline operation with IndexedDB sessions, complete core diagnostic data, explicit core/media-pack readiness, portable session export/import and recoverable package updates. Stage and verify content before switching the active package pointer; do not assume Cache Storage and IndexedDB are one transaction. Preserve pinned historical versions and rollback. Handle interrupted updates, quota failures, offline deep links and cold starts.

Separate existing local archive access from distributable assets. Do not include media in distributable packs without reviewed eligibility, and do not use quarantined associations as scientific examples. Core explanatory content must remain useful when optional images are absent. No backend or deployment is required.

Meet Stage 6 acceptance criteria and report actual offline/browser tests with limitations. Update STATUS.md and stop before species implementation.
```

## Prompt 7 — conditional species suggestions

```text
Implement Stage 7 of docs/sol/IMPLEMENTATION_PLAN.md after verifying genus identification is working. Read AGENTS.md, the handoff, current STATUS.md and all species-hint limitations.

Add a removable downstream species-suggestion service for the 32 selective profiles. Support no suggestion, possible, plausible, strong candidate and diagnostic-if-confirmed, with explicit source comparison scope and review requirements. Explain observed support, missing evidence, sex/stage, microscopy/genital/association requirements and thesis nomenclatural status. Apply sex-specific limitations rather than coarse species-wide photo-feasibility flags. Locality alone must never create or settle a suggestion.

Keep genus as the primary result. Prove that disabling or removing the species package leaves genus results unchanged. Do not pretend the other 195 placements are comprehensively scored or make male-only suggestions for females. Exercise SP0008 and difficult female cases. Meet Stage 7 acceptance criteria, run checks and update STATUS.md. Do not deploy.
```

## Prompt 8 — release review and usability refinement

```text
Complete Stage 8 of docs/sol/IMPLEMENTATION_PLAN.md. Read AGENTS.md, the handoff and STATUS.md, inspect implemented behaviour and run the release-oriented checks appropriate to the actual app.

Verify source preservation, concept reconciliation, applicability, uncertainty, all eight packet examples, additional audit regressions, mobile ergonomics, accessibility, offline cold starts, interrupted updates and versioned session export/import. Fix defects within this scope. Refine explanations and visual hierarchy without weakening scientific distinctions. Do not claim scientific accuracy from synthetic or source-generated fixtures.

Produce an honest readiness report separating implemented/tested features, unresolved scientific issues, media distribution eligibility and expert/real-specimen evaluation still needed. Record performance on the actual test environment rather than claiming target budgets as measurements. Update STATUS.md and relevant user documentation. Do not publish or deploy unless I separately request it.
```

## Resume prompt — interrupted or new task

```text
Continue the active implementation stage for the Australian Salticidae tool. Read AGENTS.md, docs/sol/README.md and STATUS.md, then the active stage's contract and acceptance criteria. Complete mandatory packet reading if not already available in this task. Inspect the actual files and tests to verify recorded progress. Preserve existing work, finish outstanding acceptance criteria, run appropriate checks and update STATUS.md. Do not restart from scratch or advance to another stage unless that is already authorized. Report discrepancies between the ledger and repository honestly.
```
