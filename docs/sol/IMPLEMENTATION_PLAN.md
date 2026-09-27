# Staged implementation and acceptance criteria

## Scope and sequencing

Build incrementally over the existing prototype. Each stage is a complete, reviewable assignment. Read the packet before scientific-model or engine changes. Carry earlier invariants forward. The user invokes stages through `PROMPTS.md`; this plan does not authorize automatic execution.

## Stage 1 — scientific foundation

Inspect existing types, data compiler, tests and storage. Record baseline test/build outcomes. Create the normalized scientific contract, immutable source import, stable ID aliases, provenance records and machine-readable issue register. Add a deterministic package/compiler path compatible with later stages without prematurely replacing the interface.

Acceptance:

- All eleven packet inputs are accounted for and remain byte-identical.
- Matrix reconstructs to 86 x 296 and exact score totals, including code definitions not currently observed.
- Root is explicitly distinguished from genus leaves.
- Every packet record has a recoverable source location/alias; IDs survive reordering of source arrays.
- Concepts, names/usages, placement, phylogeny and nomenclature are separate.
- All 22 report issues and AU01–AU14 are imported as open issues with provenance and interim policies.
- Missing or invalid references cannot silently become absence.
- Unknown fields are preserved or cause visible import incompatibility, not silently dropped.
- A losslessness inventory explains where every scientifically meaningful input field is retained.

## Stage 2 — explainable genus engine

Implement observation semantics, applicability, evidence bands, coverage and conflict recovery behind a pure domain API. Preserve a literal source evaluation path for comparison. Reuse existing code where sound; replace positive support for source uncertainty and unsupported strong-match labels.

Acceptance:

- Not sure/cannot see/skip introduce no negative evidence.
- Source uncertainty is retained without positive support.
- All-zero source profiles retain original codes and trigger protective reviewed behaviour.
- F030 sex limitation is covered by an explicit interpretation.
- Unknown sex/stage never fabricates adult male applicability.
- Changing context suspends incompatible answers reversibly.
- OR alternatives differ from joint presence; mixed specimens do not merge implicitly.
- Reordering observations preserves results; removal/revision restores candidates.
- Zero evidence is unassessed; sparse coverage cannot create a strong result.
- Explanations cite observations, assertions and interpretation versions.

## Stage 3 — concept reconciliation

Implement typed crosswalk interpretation and concept-level candidates alongside historical matches. Preserve unresolved residues and independent concept evidence pathways.

Acceptance:

- LTX043 exposes eight possible destinations and unresolved residue without cloning scores.
- Saitis/Salpesia non-equivalence edges are not positive routes.
- Partial overlap cannot become full equivalence or blanket inherited absence.
- Servaea retains an unresolved historical result; other unmapped genera are labelled unreviewed.
- Multiple legacy routes do not duplicate positive support.
- Names are never join keys; proposed-name qualifications remain visible.
- A renamed presentation or split leaves historical runs and original matrix unchanged.

## Stage 4 — usable mobile genus experience

Integrate the engine and reconciled results into the existing application. Implement context, one-question flow, candidate comparison, evidence review, revision and local saving. Use approved/appropriate assets or clear placeholders; do not redistribute uncleared archive assets.

Acceptance:

- Unknown-sex identification, legacy Maratus reconciliation and unresolved female outcomes work end to end.
- No source-selection step or unsupported probability percentage.
- Genus remains the primary result; partial results can be saved.
- Useful controls remain reachable on small screens and at text zoom.
- State choice, explanation and candidate evidence remain usable with missing images.
- Old local sessions migrate without silent identity changes; retain/export unconvertible history explicitly.
- Record actual browser checks separately from automated tests.

## Stage 5 — Schubert and question selection

Integrate scoped Schubert assertions in the same workflow, retain the exact male key as reference, and add transparent next-question utility.

Acceptance:

- Adult-male resolver is unavailable as a female/juvenile key.
- Female-supported assertions remain available appropriately.
- Key K10 OR and K11 AND conditions survive reconstruction.
- AU03–AU05 do not silently create universal exclusions.
- Dynamic activation prioritizes relevant questions without making concepts unreachable.
- Utility accounts for usable views, source uncertainty, effort, error risk, applicability and redundant evidence.
- Overlapping state frequencies are not treated as disjoint probabilities.
- Near-equal information favours easier observations; users can select another question or stop.

## Stage 6 — reliable offline packages

Implement IndexedDB sessions, approved media packs, verified offline readiness, package staging, activation and rollback. Keep a clear distinction between local archive access and distributable packs.

Acceptance:

- Cold launch, deep links, identification and saved sessions work offline after verified installation.
- Core diagnostic coverage is never lazy-missing.
- Interrupted updates cannot activate partial or mixed packages.
- Previous runs can be reproduced under pinned versions.
- Quota/storage failures preserve data where possible and offer export/recovery.
- No AU06–AU12 association is presented as reviewed without evidence.
- No image is included in a distributable pack solely because its local path exists.

## Stage 7 — optional species suggestions

Implement the 32 selective profiles as a removable downstream module, with sex-specific feasibility and transparent conditions.

Acceptance:

- Disabling/removing the module produces identical genus results.
- Locality alone never creates a suggestion.
- All five outcomes are supported: none, possible, plausible, strong candidate, diagnostic-if-confirmed.
- Strong status requires reviewed diagnostic scope and sufficient comparison coverage; otherwise abstain or qualify.
- SP0008 is male-only, angle/lighting-sensitive and conditional on genus evidence.
- Female limitations override coarse species-wide photo feasibility.
- The other 195 placements are not treated as scored-negative competitors or as comprehensive coverage.

## Stage 8 — release evaluation and polish

Run comprehensive regression and real-device evaluation, refine accessibility and explanatory UX, and document outstanding scientific/reuse limits. Do not deploy unless separately requested.

Acceptance:

- Source reconstruction, all eight packet examples and additional issue regressions pass.
- No unperformed expert, accuracy, media-rights or browser review is reported as complete.
- Tests include poor photos, juveniles, contradictory answers, missing taxa, undescribed species, historical names, homoplasy and changed taxonomy.
- Versioned sessions export/import and survive updates.
- Document real-world evaluation needs: independently identified specimens across sex/stage/view conditions.
- Report recall of displayed candidates, false confident results, appropriate abstention, question usability and recovery from user error when actual data exist.

## Testing principles

Use existing source tests as preservation checks. Add meaningful properties and hand-authored semantic cases, not tests that simply duplicate the implementation. Source-generated profiles are not independently verified specimen accuracy tests.

Run targeted tests during iteration, then the applicable full suite and build at stage completion. Record failures before changes and distinguish pre-existing failures from regressions. Do not regenerate source or edit expected scientific values to make tests green.

Proposed performance budgets: ordinary reevaluation under 100 ms and next-question ranking under 250 ms on a specified lower-end test device. These are targets, not measurements; optimize after profiling.

## Suggested module boundaries

Importer/validator; scientific repository; name/concept resolver; applicability; compatibility; reconciliation; next questions; explanations; session storage; optional species service; media/rights; package compiler/updater; mobile UI. Exact folder names should fit the existing project and be documented after inspection.

## Definition of stage completion

Working implementation for the requested stage, meaningful checks, source preservation, current documentation and an honest `STATUS.md` update. Report material blockers while completing unaffected work. Do not request routine approval for reversible implementation choices within the invoked scope.
