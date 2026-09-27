# Stage 2–3 engine contract

## Boundaries

`src/lib/genus-engine.ts` is the pure historical Lucid evaluator. It accepts a compiled scientific package, one specimen context and an observation log. It has no React, browser storage, network or UI dependency. The existing prototype engine remains unchanged for the current interface; Stage 4 may adapt the UI to this API.

`src/lib/concept-reconciliation.ts` consumes the historical result and the normalized reviewed crosswalk. It returns historical results and contemporary concept hypotheses as separate collections. It never changes the Lucid matrix or rewrites a historical candidate.

## Source facts and interpretations

- Original matrix bytes and codes remain source facts.
- Reviewed applicability overlays, AU01 protection and reconciliation transfer rules are curator interpretations compiled under `model.interpretations` with explicit versions and provenance.
- `reviewed_default` applies those interpretations. `literal_source` preserves a comparison path without the reviewed applicability or AU01 protection.
- Source code 3 is source uncertainty: it retains a candidate without adding support. Codes 4–5 represent apparent-observation pathways, not biological presence.
- An AU01 all-zero profile still returns its original zero bytes. Under the reviewed policy it is `source_unreported`, not an asserted absence; under literal comparison it remains a contradiction.

## Observation and applicability semantics

Each observation belongs to one specimen and one character. `not_sure`, `cannot_see`, `skipped` and user-declared `inapplicable` are distinct log states and introduce no evidence. Context applicability is three-valued: applicable, inapplicable or applicability unknown. Context changes suspend answers without mutating them, so later context changes can reinstate the same answer.

Multiple selected states mean OR alternatives unless the observation explicitly says `joint`. Joint presence is accepted only when the exact state set is declared in that character's `jointStateSets`; the packet declares none by default. Different specimen IDs and cross-character state combinations fail explicitly.

Candidate results use qualitative bands, independent evidence-group counts, contradiction counts and assessed/unscored coverage. A strong band requires at least three independent common-support groups and 60% assessed coverage. Zero evidence is unassessed. Conflict recovery identifies observations whose revision/removal would eliminate a candidate's sole strong contradiction.

## Reconciliation semantics

- Equivalence may carry a scoped historical compatibility result, identified as inherited rather than independent evidence.
- Split and partial-overlap routes create possible destinations only. They never copy a Lucid score row or transfer universal absence.
- `not_equivalent` targets are retained as negative crosswalk facts and excluded from positive routing.
- Multiple historical routes do not count as independent concept support.
- Independent concept evidence is a separate input and can make a concept reachable without a Lucid route.
- Empty reviewed destinations remain `reviewed_unresolved`; missing crosswalks remain `unreviewed` historical results.
- Preferred names and qualifications are presentation metadata. All joins use persistent concept/source IDs.

Stage 3 does not integrate Schubert character assertions, dynamic questions, species suggestions or the application UI. Those remain later-stage work.
