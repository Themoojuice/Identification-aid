# Stage 8 release-readiness report

Date: 2026-09-28

Subsequent review: [2026-10-07 robustness review](REVIEW_2026-10-07.md) supersedes the original species-confidence and historical-replay assumptions. Strong species status is now withheld, source-uncertain hints remain neutral, and session pins are explicitly metadata rather than a promise of historical engine replay. The later requested GitHub Pages publication is recorded in STATUS.md; this report's original stage-specific deployment statements are historical.

## Verdict

The application is ready for **controlled private field evaluation as a research prototype**. It is not ready to be represented as a validated identification product, published scientific authority, or distributable media package.

This distinction is important. The software now has broad integrity, regression, recovery, offline and responsive-browser evidence. It does not yet have an independently identified specimen study, expert review of its biological decisions, assistive-technology testing, physical-device testing, or permission to redistribute the archived and user-supplied media.

## Implemented and checked

- The immutable Lucid source reconstruction and all eleven supplied packet files remain protected by checksum and deterministic-compilation checks.
- Historical Lucid evidence, contemporary concept routing, Schubert assertions, taxonomy, optional species suggestions, provenance, applicability and uncertainty remain separate.
- Genus results remain primary. The selective species module can be disabled without changing genus ranking.
- Unknown, not sure, cannot see, skipped, inapplicable, source-uncertain, unreported and absent remain distinguishable.
- Sessions use stable identities and version pins, migrate from earlier formats, restore locally, and round-trip through the portable version-5 export.
- The verified offline core survives a stopped server, including an existing-tab cold reload and a new arbitrary deep link. An offline update check retained the active complete package.
- The release build and full automated suite pass. Performance on the current Codex Windows test host is comfortably below the proposed targets, but the host is not established as a lower-end device.

## Eight supplied examples

| Example | Stage 8 result |
|---|---|
| EX01 — unknown context and poor photographic evidence | Abstentions remain neutral and visible; unknown scope does not fabricate applicability. |
| EX02 — adult-male Schubert evidence | Scoped Schubert evidence remains distinct from Lucid evidence and retains its provenance. |
| EX03 — female specimen | Female-supported evidence remains usable; the adult-male published key remains unavailable. |
| EX04 — historical Maratus split/overlap | Eight possible destinations and unresolved residue remain visible without copying the historical score profile. |
| EX05 — practical next question | A useful field/photo question is preferred over higher-effort microscopy when separation is near-equal. |
| EX06 — SP0008 | Remains secondary, male-only, genus-conditional and at most plausible; locality is neutral and the thesis qualification remains visible. |
| EX07 — saved session after taxonomy/name change | A version-5 export/import retains stable identity and displays the current preferred label. |
| EX08 — Umbrattus source conflict | Both conflicting type-species statements are shown with page-level provenance and an unresolved warning. |

These are hand-authored semantic regressions against the supplied examples. They prove that the intended distinctions are implemented; they are not independent identification-accuracy evidence.

## Adverse and audit regressions

The Stage 8 suite also covers poor photographs, juveniles, contradictory answers and recovery, missing or undescribed taxa, historical source usages, correlated/homoplastic evidence, changed display names, incomplete selective species coverage, and every one of the 36 open audit issues. The interface now explicitly warns that an unrepresented or undescribed taxon can sit outside the source rather than forcing a confident match.

The 36 audit issues remain open. In particular, the Umbrattus conflict is exposed rather than silently reconciled, questionable derived rules remain quarantined, and missing Schubert assertions remain unscored rather than absent.

## Accessibility and mobile review

The Stage 8 WCAG-oriented pass improved navigation state, pressed-state exposure, search labelling, heading order, focus visibility, colour contrast and minimum touch-target sizing. Checked light-theme text pairs meet the 4.5:1 normal-text target; the adjusted gold is 4.99:1 on the soft-gold surface and 5.84:1 on the paper surface. The production UI has one main landmark, labelled navigation, no missing image alternatives in the checked views, and no horizontal overflow at the tested narrow widths.

Keyboard focus order and visible focus styling were inspected in the browser. Responsive checks used 390 × 844 and 320 × 700 viewports, with the narrower pass serving only as a reflow proxy. Actual 200% browser zoom, NVDA/VoiceOver, switch/voice control, physical touch-device use and a formal third-party WCAG audit were not performed.

## Performance

Measured on the current Codex Windows test host using the release-evaluation fixture:

- genus reevaluation: median 1.25 ms, 95th percentile 5.33 ms, maximum 8.16 ms;
- next-question ranking: median 27.52 ms, 95th percentile 46.14 ms, maximum 46.14 ms.

The earlier repeated construction of dataset indexes was replaced with a dataset-scoped cache. These figures are measurements of this host and fixture, not a promise for all devices. A specified lower-end phone still needs measurement.

## Offline and update limits

The core is content-addressed, hash-verified and activated only after complete staging. The browser check demonstrated an offline cold reload, a separately opened offline deep link, restored evidence and continued use of the active package during an offline update verification. Contract tests cover interrupted staging and protection of the previous pointer.

A live transition and rollback between two distinct reviewed production packages has not yet been performed because only one reviewed release package exists. Native file-picker import is covered at the session boundary but still needs a complete user-facing device pass.

## Scientific and media limits

- No expert has reviewed the engine's biological outputs as part of this stage.
- No independently identified specimen set has been run through the application.
- The 32 species profiles are selective thesis-derived aids; the other 195 placements are unscored, not rejected competitors.
- Thesis-only proposals retain their packet qualification.
- Source integrity, semantic examples and synthetic regressions do not establish field-identification accuracy.
- Archived and user-supplied media remain private-local. They are excluded from the distributable core and have not been cleared for redistribution, publication or an optional media pack.

## Required real-world evaluation

Use independently identified specimens spanning males, females, juveniles, photographic and microscopic views, damaged/incomplete specimens, poor images, taxa absent from the source, and close or homoplastic alternatives. Record at minimum:

- recall of the accepted genus within the displayed candidate set at useful stopping points;
- false confident results, especially accepted genera omitted from a short list;
- appropriate abstention or unresolved outcomes for insufficient, contradictory, juvenile, missing and undescribed cases;
- question comprehension, observable-state agreement and time/effort by view and equipment;
- recovery after an intentionally wrong answer is revised or removed;
- downstream species-suggestion outcome and whether the accepted species was even represented;
- failures grouped by sex, life stage, view condition, equipment and taxonomic group.

Those metrics should be reported only after real observations exist; this report intentionally supplies no synthetic accuracy percentage.

## Gates before broader release

1. Independent salticid expert review of rules, examples, explanations and stopping behaviour.
2. A preregistered or otherwise documented specimen evaluation with the measures above.
3. Physical phone/tablet and specified lower-end-device performance testing.
4. NVDA/VoiceOver and actual 200% zoom testing, followed by remediation of any findings.
5. A live two-version update/rollback exercise and native import/export recovery exercise.
6. A per-asset media-rights decision and a distributable inclusion manifest.
7. A fresh release review after any scientific or asset changes.

Deployment and publication are outside Stage 8 and have not been performed.
