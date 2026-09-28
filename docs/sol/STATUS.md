# Implementation status

Updated: 2026-09-28, Stage 8 implementation and release evaluation complete; controlled private field evaluation is the next step.

## Current state

- Stages 1–7 are implemented over the existing React/TypeScript/Vite prototype. The optional Stage 7 species module is downstream of the unchanged genus and concept results and covers only the 32 supplied selective profiles.
- The eleven supplied packet files, `salticidae.json`, archived Lucid payload and `source/` evidence remain byte-identical and were not re-extracted.
- The application interface now uses the Stage 2 historical genus engine and Stage 3 concept reconciliation. The retained legacy engine remains available for source/regression comparison but no longer drives the user-facing ranking.
- The project is now a Git repository with `main` tracking `https://github.com/Themoojuice/Identification-aid.git`. The initial public import is commit `b812ed3c5dc3514df4caf181fd27815c5190702d`; private reference images, the local source archive, dependencies and build output are excluded by policy and remain intact locally.

## Baseline verified before Stage 2

- Stage 1 package checksum was `2161a7c371e8658df807870558b1bf13e9ee165208112b8743690dc98b105b63`.
- `npm test`: passed — 23 source/foundation tests and 23 application tests.
- `npm run build`: passed — TypeScript and Vite production build, 1,828 modules transformed.
- The Stage 1 package reconstructed the exact 86 × 296 Lucid matrix and contained 85 non-root genus entities, 99 scored characters within 15 groups (114 key nodes), 296 states, 23 concepts and 36 open review issues.

## Stage 2 changes — explainable historical genus engine

- Added `src/lib/genus-engine.ts`, a deterministic React-independent domain API over the Stage 1 scientific package. The old UI engine remains available and unchanged.
- Added distinct observation states for observed, not sure, cannot see, skipped and user-declared inapplicable. Context applicability is separately three-valued: applicable, inapplicable and applicability unknown.
- Added per-specimen validation, single-state, OR-alternative and explicitly declared joint-state semantics. Cross-specimen observations, cross-character states, duplicate observation IDs and undeclared joint sets fail explicitly.
- Added reviewed sex, adult-stage and preparation applicability overlays with provenance. AU02/F030 is explicitly male/adult; unknown sex or stage suspends rather than fabricating applicability. Context-invalid answers are retained and reversibly suspended without mutation.
- Added qualitative evidence outcomes and bands. Common is support; rare is qualified support; source uncertainty is neutral retention; apparent/misinterpreted codes are not biological support; applicable zero is a graded contradiction. Zero active/assessed evidence is unassessed, and a strong result requires three independent support groups plus at least 60% assessed coverage.
- Added explicit evidence grouping, contradiction-sensitive ranking, coverage, per-observation explanations/citations and conflict-recovery suggestions. Reordering answers is deterministic; removal or revision restores affected candidates.
- Preserved all 122 AU01 taxon–character profiles and every original zero byte. The reviewed policy interprets these profiles as source-unreported for exclusion protection; the literal-source comparison policy continues to expose the zero-code contradiction.
- Added machine-readable, versioned genus-engine interpretations to the compiled scientific contract. Curator overlays and AU01 protection remain distinguishable from source facts and from the literal-source path.

## Stage 3 changes — typed concept reconciliation

- Added `src/lib/concept-reconciliation.ts`, which returns historical Lucid results and contemporary concept hypotheses separately. It does not mutate the historical evaluation or matrix.
- Strengthened normalized crosswalk records with stable component IDs, all target relations (including `not_equivalent`), basis, rationale, notes, confidence and packet provenance. Raw crosswalk records remain embedded unchanged.
- Equivalent routes may carry a scoped historical compatibility result while remaining distinguishable from independent concept evidence.
- Split and partial-overlap routes create possible destinations only. They do not copy score profiles or transfer universal absence. Multiple historical routes to one concept do not add duplicate support.
- LTX043 exposes TC0004, TC0005, TC0006, TC0007, TC0008, TC0011, TC0012 and TC0015 as eight possible destinations and retains unresolved residue.
- Saitis→TC0010 and Salpesia→TC0021 `not_equivalent` edges remain visible negative facts and are excluded from positive routing.
- Servaea is retained as a reviewed unresolved historical result with no fabricated destination. The other 75 Lucid genera without reviewed mappings are labelled unreviewed rather than equivalent by name.
- Added an independent concept-evidence input so a later concept can remain reachable without inheriting a legacy route. Preferred names and thesis nomenclatural qualifications remain presentation/provenance fields; all routing joins use persistent IDs.
- Added a machine-readable reconciliation policy to the compiled package: non-equivalence is non-positive, split copying and partial-overlap absence transfer are disabled, and unmapped historical entities are retained.
- Added `docs/sol/STAGE2_3_ENGINE.md` documenting the API boundaries and interpretation rules.

## Stage 4 changes — mobile genus flow

- Replaced the legacy compatibility-score interface with a mobile-first, one-question genus workflow driven by `evaluateGenusIdentification` under the reviewed policy. No source-selection gate or probability-style score is shown.
- Added progressive specimen context for sex, life stage and cleared-epigyne preparation. Context changes retain and reversibly suspend incompatible observations through the engine rather than deleting them.
- Added distinct observed, not-sure, cannot-see and skipped controls; OR alternatives; certainty editing; an evidence log; removal/revision; suspended-evidence explanations; and useful stopping states.
- Added qualitative historical candidate cards, assessed coverage, support/conflict counts, candidate evidence detail, recheck guidance and two-to-four candidate comparison. Genus remains the primary result.
- Added reviewed contemporary interpretation to each historical result. Equivalent, split/partial-overlap, unresolved and unreviewed outcomes remain visibly distinct; legacy Maratus can expose its eight possible destinations without copied score evidence.
- Kept equipment mode and expert-detail mode as separate controls. Stage 4 question order uses applicable, lower-effort unanswered Lucid characters and explicitly states that Stage 5 information-gain ranking is not yet applied.
- Added versioned `australian-salticidae-session@2` local sessions with autosave, manual save and JSON export. Legacy v1 numeric observations are migrated to persistent IDs where possible; unconvertible records are retained as non-scoring history and included in exports.
- Added rights-safe media handling in the identification flow. The app reports when archived illustrations exist but withholds them pending reuse review, and retains fully usable text choices/placeholders without relabelling questionable figures.
- Reworked responsive navigation and touch layouts for question, evidence, comparison and specimen-context views, including dark theme and reduced-motion handling.

## Stage 4 verification

- `npm test`: passed after the final Stage 4 fixes.
  - Source/foundation: 23 passed, 0 failed.
  - Application/domain/session: 50 passed, 0 failed across four files. The four new session checks cover explicit unknown context, v2 round-trip, persistent-ID migration and retained unconvertible history.
- `npm run build`: passed after the final fixes — deterministic compiler, TypeScript check and Vite production build; 1,830 modules transformed. Scientific package SHA-256 remains `ba21f723cd932b4b3a7b29fee1a95622ce96304941e10e0561fa1aa47785e8b4`.
- Exercised the production build in the Codex in-app browser at the normal desktop viewport and explicit 390 × 844 and 320 × 700 viewports.
- Verified a clean unknown-sex start, observation entry, certainty revision, explicit continue, cannot-see abstention, local restoration, legacy-v1 migration notice, Maratus with eight possible contemporary destinations, female-context Servaea with a reviewed unresolved destination, mobile context/question/results navigation, candidate comparison access and rights-safe missing-image fallbacks.
- Browser testing found and fixed two Stage 4 functional/layout defects: state selection previously advanced before certainty could be edited, and the 320 px layout had horizontal overflow.
- WCAG-oriented review found and fixed sub-44-pixel primary touch targets and candidate-dialog focus containment. The final modal receives focus on open, cycles focus across its controls, closes with Escape and restores focus to its opener. Save/progress changes have polite live regions.
- Key light-theme contrast ratios measured from runtime tokens: body text 13.26:1, muted text 4.75–5.05:1, green text 6.32:1, blue status text 5.14:1 and red status text 5.09:1. Corresponding dark-theme pairs measured 5.11:1 or higher. These pass the 4.5:1 normal-text target for the checked combinations.
- Final 320 px DOM measurement reported no horizontal overflow (`scrollWidth` 305 at a 320 px viewport); checked primary controls and their label targets were at least 44 px after remediation.
- The browser automation environment did not expose working browser zoom controls, so an actual 200% browser-zoom run was not possible. The 320 px reflow pass is a useful proxy, not a claim of completed 200% zoom testing. NVDA/VoiceOver and physical-device testing were also not available; the browser accessibility tree and keyboard behaviour were inspected instead.

## Stage 5 changes — Schubert assertions and question selection

- Added `src/lib/schubert-engine.ts`, a pure parser/evaluator for all 44 Schubert characters, 139 states and 123 scoped assertions. It retains persistent packet identities, source pages, sex/life-stage scope, assertion strength, variation and independent evidence groups.
- Integrated Lucid and Schubert observations in one versioned session while keeping their character ontologies and source evidence separate. Matching Schubert assertions add support or tentative support; a missing assertion is explicitly unscored and never inferred to be absence or contradiction.
- Female-supported assertions remain available to adult females under their stated scope. Male-only and adult-only characters are suspended or withheld when sex/stage is incompatible or unknown.
- Added the complete published adult-male Saitis-group key as an expert resolver. It is unavailable for females, juveniles and unknown scope; K10 retains its two-state `any` branch and both K11 leads retain their three-condition `all` conjunctions. A terminal contributes scoped independent support only and never universal exclusions.
- AU03 Anablemum, AU04 Hypoblemum and AU05 Tropijotus remain explicitly quarantined in evaluation provenance. The engine preserves the conflicting assertion/key facts and creates no generic exclusion evidence from them.
- Added transparent next-question ranking for Lucid and Schubert evidence. Pair separation is counted only when both candidates have explicitly positive/reported, non-overlapping state sets; source-uncertain and missing profiles are not converted into probabilities. Coverage, specimen applicability, available equipment/view, effort, error risk and correlated evidence groups adjust utility.
- Dynamic Schubert activation begins only when active Lucid evidence has a positive reviewed route into a Schubert-covered concept. Once active, applicable source-reported questions remain manually reachable even at zero estimated pair-separation utility.
- Added indirect context-question value through the stopping state: unknown sex or life stage directs the user to context because resolving it may unlock scoped questions. Abstention remains available for every question and is retained without scoring.
- Added a manual question chooser and useful stopping state. Near-equal raw separation (within three percentage points) favours lower effort; users may override the recommendation, review evidence or stop with an unresolved ranked set.
- Observation feasibility fields in the Schubert packet are all null. The displayed effort, error-risk and usable-equipment annotations are therefore versioned `curator_product_judgment` values, not source facts; each carries a rationale in the runtime model.
- Upgraded local sessions to `australian-salticidae-session@3`, adding Schubert observations and published-key history. Stage 4 v2 sessions restore into v3 without losing Lucid observations; v1 numeric migration remains supported.

## Stage 5 verification

- `npm test`: passed after Stage 5 integration.
  - Source/foundation: 23 passed, 0 failed.
  - Application/domain/session: 63 passed, 0 failed across six files.
- New semantic checks cover packet cardinality, adult-male resolver scope, female assertions, exact K10 OR and K11 AND reconstruction, scoped terminal support, missing-as-unscored behaviour, AU03–AU05 non-exclusion, view/equipment filtering, deterministic utility, conservative overlapping-state treatment, correlation penalties, and v2→v3 session preservation.
- `npm run build`: passed — deterministic compiler, TypeScript check and Vite production build; 1,832 modules transformed. Scientific package SHA-256 remains `ba21f723cd932b4b3a7b29fee1a95622ce96304941e10e0561fa1aa47785e8b4`.
- Exercised the production build in the Codex in-app browser at the normal desktop viewport and 390 × 844. The recommended/manual question chooser, utility-driven Lucid question, equipment controls, existing-session migration, evidence/results layout and mobile bottom navigation rendered without horizontal clipping or console warnings.
- The Schubert assertion outcomes and resolver paths were exercised by deterministic domain tests rather than by a real specimen. Scientific accuracy, actual observation costs and question usability still require expert/real-specimen evaluation.

## Post-Stage-5 prototype enhancement — graphical discriminator coverage

- Enabled 241 directly associated Lucid illustrations plus 18 curated representative illustrations in the private local prototype instead of displaying rights placeholders. Captions are rendered as plain text and the source records remain unchanged.
- Added deterministic, scalable anatomical pictograms for every option without an image: 37 remaining Lucid states and all 139 Schubert states. The same renderer also provides a fallback for every one of the 435 source-state records. Diagram families cover eyes, carapace profile, abdomen, body size/form, legs, chelicerae, male palps, epigynes, distribution and behaviour.
- Replaced the initial broad-family Schubert fallback with character-ID/state-ID-specific comparative diagrams for all 44 Schubert characters. Palpal apex form, embolus course, spermathecal configuration, duct course, fossae/opening placement, leg formula/ornament, posture, profile, pattern and colour now use separate character logic; multi-state genital characters use state-specific geometry instead of repeating one generic drawing.
- “Other”, source-undocumented and inadequately diagnosed states now carry a neutral question mark rather than an incorrect present/absent mark. Relevant states such as the ventral spinneret lip, front-eye scales and male chelicera colour now use the appropriate view instead of a generic dorsal spider.
- Pictograms are explicitly labelled “Illustrated guide” and “not a specimen image”. They are usability aids, not new scientific assertions or expert-verified diagnostic plates.
- Added collapsible labelled anatomy references using the six user-supplied local files. Originals were copied unchanged into `public/media/private-reference/` and remain private-local assets.
- Added seven graphical-coverage tests. They render every Lucid and Schubert option, verify character-specific Schubert routing, explicit visual focus for all 44 characters, neutral treatment of unreported/other states, accessible SVG output, direct-image selection and visibly distinct total-size choices.
- Final checks after the Schubert illustration correction: all 23 source/foundation tests and 70 application tests passed; the production build passed with 1,834 modules transformed and the scientific package checksum remained unchanged (`ba21f723cd932b4b3a7b29fee1a95622ce96304941e10e0561fa1aa47785e8b4`). The complete 44-character/139-state audit sheet was visually inspected at desktop and 390 × 844 mobile widths; mobile option cards were stacked so diagrams retain a usable width.

## Stage 6 changes — reliable offline packages

- Replaced the opportunistic runtime cache with a versioned offline package. The production build now enumerates the complete core shell and diagnostic data, records SHA-256 and byte length for every asset, derives a content-addressed package ID, and verifies the emitted package before completing the build.
- The service worker stages every core asset in an isolated package cache and verifies its hash before writing the active-package pointer. Failed or interrupted staging deletes the partial cache and leaves the prior pointer unchanged. Fetches use only records marked complete; offline navigation and arbitrary deep links resolve to the verified shell.
- Complete previous packages are retained for rollback, while session package IDs are pinned in IndexedDB. The UI can verify an update or switch back to a previous complete package. Cache Storage and IndexedDB are intentionally not treated as one transaction: pointer activation occurs only after cache verification.
- Upgraded sessions to `australian-salticidae-session@4`. The current observation log is stored in IndexedDB with a local-storage recovery copy; Stage 4 and Stage 5 formats remain migratable. Portable JSON export/import now retains scientific, interpretation, engine, Schubert, question-policy and offline-package pins.
- Requested persistent browser storage where supported, exposed storage usage/readiness, and added explicit warnings plus export recovery when durable or quota-constrained storage fails. The specimen screen distinguishes core readiness, local-only optional media and browser-reported connectivity.
- Removed the external web-font dependency so the shell does not require a third-party request. Optional source images now fall back to deterministic explanatory diagrams when unavailable.
- Separated private local media from the distributable build. The six user-supplied references remain served by the local development server, while `dist/` and the core manifest explicitly exclude `media/private-reference`, the Lucid archive and all optional media packs. No AU06–AU12 association was promoted or used as a reviewed example.

## Stage 6 verification

- `npm test`: passed after Stage 6.
  - Source/foundation/offline contracts: 26 passed, 0 failed.
  - Application/domain/session: 73 passed, 0 failed across seven files.
- Offline contract checks verify activation ordering after hashing/cache completion, rejection and cleanup of partial staging, complete-package-only fetches, deep-link shell fallback and exclusion of unreviewed private media. Session checks cover Stage 5 migration, full version-pin export/import and invalid-import rejection.
- `npm run build`: passed — deterministic compiler, TypeScript check, Vite build, offline package generation and package verification; 1,836 modules transformed. Final core package `core-76ad4abac59e84db7679` contains eight verified assets totalling 4,736,448 bytes. Scientific package SHA-256 remains `ba21f723cd932b4b3a7b29fee1a95622ce96304941e10e0561fa1aa47785e8b4`.
- Browser verification used an isolated production origin and a new arbitrary deep link. It installed the core, reported Offline ready, recorded an observation, then the test server was stopped completely. Both an existing-tab cold reload and a second new deep link opened with the server unavailable; the IndexedDB observation, 13 compatible results and core diagnostic data were restored.
- The offline recovery panel was inspected at desktop and 390 × 844. The mobile DOM reported `scrollWidth` equal to `clientWidth` (375 px) and no browser warnings/errors. The test browser declined persistent-storage protection, and the UI correctly displayed an export recommendation.
- A live rollback between two distinct complete releases was not performed because only one reviewed package exists. Rollback and interrupted-update invariants are implemented and contract-tested; a future second package should exercise the full browser transition before release. File-picker import was unit-tested at the session boundary but not completed through a native chooser in this pass.

## Pre-Stage-7/8 cleanup — provenance and repository continuity

- Added `data/scientific/provenance-corrections.json`, a versioned curator-interpretation layer for the 21 assertion citations identified by passage-level thesis review. The eleven immutable packet files remain byte-identical and the raw assertion locators remain embedded unchanged.
- Eleven Maratus assertions retain their packet locator at PDF page 176 and now expose reviewed diagnosis page 178. Eight Prostheclina assertions retain page 198 and expose page 200; two retain page 199 and expose page 201.
- Each correction targets a stable assertion JSON pointer and validates the original concept, character, state, page and section before compilation. A mismatch now fails the scientific build instead of applying a stale correction.
- Normalized character assertions expose both `locator` and `reviewedLocator`. The Schubert runtime uses the reviewed page in user-facing provenance while retaining the original packet page, correction ID, interpretation version and review record.
- Updated the scientific package version to `pre-stage7-provenance-2026-09-28`. The compiled package SHA-256 is `60d3e21355f6dfc98956b0bd6f6dcf8e38756793867e51e26c7a969482c9c835`.
- Updated repository documentation to distinguish the complete runnable public checkout from the locally preserved, redistribution-restricted source and private-media collections.

## Pre-Stage-7/8 cleanup verification

- `npm test`: passed — 27 source/foundation/offline tests and 74 application tests, 0 failures.
- New tests verify all 21 corrections, the 11/10 genus split, immutable raw packet pages, corrected runtime citations and recoverable correction provenance.
- `npm run build`: passed — deterministic compiler, TypeScript check, Vite production build and offline verification; 1,836 modules transformed.
- Offline core `core-c3292ac3bec585426d31` contains eight verified assets totalling 4,770,678 bytes; private media remain excluded.

## Stage 7 changes — optional selective species suggestions

- Added `src/lib/species-suggestions.ts`, a pure downstream service over all 32 records in `07_species_hints.json`. It uses stable provenance identities and supported contemporary concept IDs rather than name-string joins.
- Implemented all five specified outcomes: no suggestion, possible, plausible, strong candidate and diagnostic-if-confirmed. A strong candidate requires certain confirmation of every applicable source-diagnostic hint, adult and resolved sex scope, required preparation/equipment, and at least two selective profiles within the supported genus.
- Limited activation to independently strong, independently compatible or historically compatible contemporary concepts. A split or partial-overlap `possible_destination` alone cannot activate or inherit a species profile.
- Kept locality and habitat as displayed context only. They cannot create, upgrade or settle a suggestion. The interface states that only 32 thesis profiles are represented and the other 195 placements are unscored rather than rejected competitors.
- Applied sex-specific hint scope before coarse profile feasibility. Juveniles receive no adult-diagnosis suggestion, male-only records cannot be suggested for females, and female genitalic confirmation requires suitable preparation where stated.
- Quarantined SP0008 to at most plausible: it is male-only, conditional on supported genus evidence, and carries its angle/lighting-sensitive iridescence warning. Difficult female records retain their association, genital and molecular limitations.
- Added the optional section below the primary genus comparison. It explains supporting/missing hint observations, confidence, specimen scope, microscopy/genital requirements, selective comparison coverage, source pages, localities and thesis-only nomenclatural qualification. It can be disabled without removing genus results.
- Upgraded sessions to `australian-salticidae-session@5` with independent species observations, module preference and a species-policy version pin. Stage 4–6 session formats remain migratable.
- Added a machine-readable Stage 7 interpretation policy to the compiled scientific package. The 11 packet inputs and all source records remain unchanged.
- Fixed desktop Results access found during browser verification: selecting a genus with “Compare” now opens the comparison/results screen, matching the mobile Results navigation.

## Stage 7 verification

- `npm test`: passed — 28 source/foundation/offline checks and 83 application/domain/session checks, 0 failures.
- New tests cover all 32 profiles and five outcomes, stable hint provenance, non-scoring locality, inactive split destinations, male-only and juvenile scope, SP0008's cap, difficult female limitations, strong-status comparison coverage, module removal invariance and v4→v5 session migration.
- `npm run build`: passed — deterministic compiler, TypeScript check, Vite production build and offline-package verification; 1,837 modules transformed. Scientific package SHA-256 is `eaf7dca140505e419120155cc1f92207212563f4d43d3d5bb925f3359c277574`.
- Offline core `core-b4f11a75f0806e4990a8` contains eight verified assets totalling 4,791,010 bytes; private media remain excluded.
- Exercised the current development build in the Codex in-app browser. Desktop comparison opened the downstream species panel; its empty/no-suggestion explanation and enable/disable states rendered correctly while genus results remained present.
- Rechecked the Results view at a 390 × 844 viewport. The primary historical-genus results and optional species section were both present, the bottom Results navigation worked, and the DOM reported `scrollWidth` equal to `clientWidth` (375 px).
- Live species cards with real observations are covered by deterministic domain tests rather than a known specimen browser fixture. Their scientific accuracy and practical field usefulness still require Stage 8 expert and real-specimen evaluation.

## Stage 8 changes — release evaluation and polish

- Added `src/lib/release-evaluation.test.ts`, with an explicit regression for each of the eight supplied examples and adverse scenarios covering poor photographs, juveniles, contradictory answers and recovery, missing or undescribed taxa, historical usages, homoplasy/correlated evidence, changed taxonomy, selective species coverage and all 36 open audit issues.
- Exposed both conflicting Umbrattus type-species statements, their source pages and provenance in the taxonomy summary. The conflict remains unresolved rather than being silently repaired.
- Added an open-world results warning: an unrepresented or undescribed taxon may be outside the source, so insufficient evidence should remain unresolved rather than forcing certainty.
- Improved accessible state and structure with current-navigation and pressed-state semantics, a labelled search field, corrected heading order, labelled comparison removal, visible focus treatment and minimum touch-target sizing for the checked controls.
- Adjusted the light-theme gold text token. Its checked contrast is 4.99:1 on the soft-gold surface and 5.84:1 on the paper surface.
- Cached immutable genus-dataset indexes instead of reconstructing them during every source-score lookup. This removed the identified question-ranking bottleneck without changing scientific results.
- Added `docs/sol/STAGE8_READINESS.md`, which separates implementation evidence from scientific accuracy, unresolved audit issues, media eligibility and the expert/real-specimen work still required.

## Stage 8 verification

- `npm test`: passed after Stage 8 — 28 source/foundation/offline checks and 96 application/domain/session checks, 0 failures across nine application test files.
- The 13 Stage 8 tests include the eight named examples, adverse/open-world cases, all open issue records and a recorded performance fixture. They are semantic/integrity tests, not independently verified specimen identifications.
- `npm run build`: passed — deterministic compiler, TypeScript check, Vite production build and offline-package verification; 1,837 modules transformed. Scientific package SHA-256 remains `eaf7dca140505e419120155cc1f92207212563f4d43d3d5bb925f3359c277574`.
- Final offline core `core-f75aae3025ffcab133b1` contains eight verified assets totalling 4,793,510 bytes; private media remain excluded.
- Performance on the current Codex Windows test host: genus reevaluation median 1.25 ms, p95 5.33 ms, maximum 8.16 ms; next-question ranking median 27.52 ms, p95 46.14 ms, maximum 46.14 ms. The device class is not established as lower-end, so this is not a lower-end-device claim.
- With the isolated production server stopped, an existing tab cold-reloaded successfully and restored its abstention/evidence state. A separately opened arbitrary deep link also loaded the complete app offline. Requesting update verification retained the active verified core.
- Desktop accessibility-tree/DOM review found one main landmark, labelled navigation, no missing image alternatives in the checked views and no horizontal overflow. Responsive checks used 390 × 844 and 320 × 700; the narrower pass is a reflow proxy, not an actual 200% zoom test.
- No expert biological review, independently identified specimen evaluation, NVDA/VoiceOver run, physical-device test, lower-end-device measurement, live two-version rollback or media-rights clearance was performed. The readiness verdict is therefore limited to controlled private field evaluation as a research prototype.

## Verification after Stages 2 and 3

- `npm test`: passed.
  - Source/foundation: 23 passed, 0 failed.
  - Application/domain: 46 passed, 0 failed across the retained legacy tests plus 14 Stage 2 and 9 Stage 3 tests.
- `npm run build`: passed — compiler, TypeScript check and Vite production build; 1,828 modules transformed.
- Deterministic compilation test passed; compiled/public scientific packages remain identical. Current package SHA-256: `ba21f723cd932b4b3a7b29fee1a95622ce96304941e10e0561fa1aa47785e8b4`.
- The Lucid matrix remains 86 × 296 / 25,456 bytes with 15,900 absent, 9,538 common and 18 source-uncertain cells; codes 2, 4 and 5 remain defined but unobserved. Matrix checksum remains `5c3cb0160981bdb54b2969731c5b0f50a0b98b8c62f724346df3259181f5a436`.
- Preservation checks reconfirmed all packet hashes, original/archive Lucid equality, hierarchy and score references, media paths and archived fact sheets.
- Regression coverage includes neutral abstentions, source uncertainty, AU01 literal/reviewed divergence, F030 and preparation applicability, reversible suspension, OR versus joint logic, specimen isolation, deterministic ordering, revision/removal recovery, graded contradictions, sparse coverage, correlated evidence, provenance, explicit unknown-reference failure, all Stage 3 crosswalk edge cases, independent concept reachability and name-independent routing.

## Limitations and unresolved work

- The 36 review issues remain open. No taxonomy, nomenclature, source score, caption, media association or licence issue was silently resolved.
- The 21 reviewed page overlays correct provenance precision only. They do not constitute expert validation of the biological assertions.
- Stage 5 evaluates the supplied Schubert assertion set and Stage 7 evaluates the supplied selective species hints, but both remain source-faithful logic rather than independent evidence of identification accuracy.
- Species coverage is deliberately incomplete: the 32 profiles are thesis-only proposals and 195 other placements are unscored. A suggestion is a qualified downstream aid, not a comprehensive species identification.
- The checked browser flows have no known blocking defect after automated and in-app-browser verification. Actual 200% browser zoom, NVDA/VoiceOver, switch/voice control and physical-device testing remain outstanding release gates.
- No expert scientific review, independently identified specimen study, physical-device test or assistive-technology audit was performed. Automated source-derived checks, schematic review and offline runtime tests are integrity/usability evidence, not identification-accuracy validation.
- Media rights remain unresolved. Archived and user-supplied images are visible only through the private local prototype and are excluded from the distributable core; they are not approved for redistribution, publication or an optional offline media pack. No backend, dependency upgrade, deployment or source re-extraction occurred.
- No explicit joint-compatible Lucid character set is supplied by the packet, so joint observations are rejected until a reviewed declaration is added. OR alternatives work now.
- Performance is measured on the current Codex Windows host and meets the proposed targets there, but has not been measured on a specified lower-end device.

## Stage ledger

| Stage | Status | Verification |
|---|---|---|
| 1 Foundation | Complete | Immutable hashes, exact matrix, persistent aliases, provenance, separated records, open issue register, losslessness inventory and deterministic compile. |
| 2 Genus engine | Complete | Pure historical evaluator, explicit observation/applicability semantics, literal comparison path, qualitative evidence/coverage, conflict recovery and regression tests. |
| 3 Reconciliation | Complete | Typed crosswalk, historical/concept separation, safe split/overlap/non-equivalence handling, unresolved/unreviewed outcomes and independent evidence path. |
| 4 Mobile genus flow | Complete | Full automated suite and build passed; clean/legacy, unknown-sex, Maratus, female unresolved, responsive, contrast and keyboard/modal scenarios exercised in the in-app browser. Actual 200% zoom, assistive-technology and physical-device checks remain deferred. |
| 5 Schubert/questions | Complete | 23 source and 63 application tests pass; complete scoped assertion integration, exact adult-male key logic, AU03–AU05 quarantine, conservative utility/manual selection and desktop/mobile production checks. Expert cost calibration and real-specimen validation remain deferred. |
| 6 Offline reliability | Complete | Hash-verified atomic core staging, IndexedDB sessions/version pins, rollback path, recovery UI and private-media exclusion; real server-offline cold reload, new deep link and restored observation verified. Live two-version rollback remains a release check. |
| Pre-Stage-7/8 cleanup | Complete | Versioned 21-record locator overlay, original/reviewed provenance retention, stale-target compile failures, current Git/public-private documentation, 27 source tests, 74 app tests and production/offline build passed. |
| 7 Species suggestions | Complete | Removable downstream service for all 32 selective profiles, five qualified outcomes, locality exclusion, scope/coverage safeguards, v5 sessions, 28 source tests, 83 app tests, production/offline build and desktop/mobile browser checks passed. |
| 8 Release evaluation | Complete for software/integrity scope | Eight supplied examples and adverse regressions, full tests/build, measured host performance, offline cold start/deep link, accessibility/mobile polish and honest readiness report completed. Expert accuracy, real specimens, assistive technology, physical devices, live two-version rollback and rights clearance remain external release gates. |

## Next work

The implementation plan is complete through Stage 8. The appropriate next activity is a controlled private field evaluation with independently identified specimens, following `docs/sol/STAGE8_READINESS.md`. Broader scientific or media release should wait for expert review, measured specimen outcomes, assistive-technology and physical-device checks, live two-version rollback, and explicit media-rights decisions. Stage 8 itself performed no deployment; the later user-requested prototype publication is recorded below.

## Requested prototype publication

- At the user's separate request after Stage 8, the rights-safe prototype was published through GitHub Pages at `https://themoojuice.github.io/Identification-aid/`.
- The Pages workflow builds from the committed public scientific artifacts, runs the application tests, verifies a subpath-aware offline package, and deploys on changes to `main`.
- The public bundle excludes the Lucid source archive and private-local anatomy references. Option-specific explanatory diagrams remain available for every discriminator option; controls for unavailable private references are omitted from the distributable build.
- Publication does not change the Stage 8 readiness verdict: this remains a research prototype, not a scientifically validated identification authority or a rights-cleared media release.
