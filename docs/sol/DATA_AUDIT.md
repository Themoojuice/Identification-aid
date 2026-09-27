# Scientific audit and issue register

## Evidence inventory

All eleven supplied files were inspected in the architecture task. The original PDF and all image binaries were not independently inspected in that audit. Claims below concern the packet; apparent source conflicts remain subject to passage-level review.

| File | Contents |
|---|---|
| 00 | Scope, semantics, source caveats and intended behaviour. |
| 01 | Lucid ontology: 15 groups, 99 scored features, 296 states, 86 entities including the root. |
| 02 | Sparse matrix: 25,456 cells; 15,900 absent, 9,538 common, 18 uncertain. Codes 2, 4 and 5 defined but unused. |
| 03 | 23 decoded edges from five compressed dependency vectors. |
| 04 | 23 concepts: 18 genera, three informal clades, two unresolved lineages; 227 placements/usages and 29 relationships. |
| 05 | 44 characters, 139 states, 123 assertions; 11-question, 12-terminal adult-male key. |
| 06 | Ten reviewed Lucid mappings: three equivalent, three partial overlaps, three splits, one unresolved. |
| 07 | 32 selective proposed-species profiles and 76 hints. Twenty profiles describe both sexes; twelve males only. |
| 08 | 700 associations: 557 Lucid associations/515 unique paths and 143 Schubert figures. |
| 09 | Eight synthetic behavioural examples, not specimen observations. |
| 10 | Structural checks, curator qualifications, 22 unresolved items and exclusions. |

The matrix totals were independently reproduced in the architecture task. Other inventory figures were inspected in records and the validation report; implement repeatable checks rather than relying on this prose.

The 227 placements are not 227 independent species concepts. They include synonymised usages, unresolved records, a phylogenetic terminal outside a composition list, and the subspecies `Maratus melindae corus`.

## Source meaning

- Common/rare are compatibility classes, not measured occurrence probabilities.
- Code 0 is the verified Lucid sparse default. Do not change historical zeros to unknown.
- Source code 3 is source uncertainty, not the user's inability to answer.
- Source-defined misinterpretation classes describe apparent observations of biologically absent states.
- Schubert's missing assertions are not zeros.
- Female diagnosis availability does not imply a usable female key.
- All 44 Schubert observation-feasibility records contain null values; do not invent source-measured difficulty.
- Thirteen Schubert characters concern genitalia, three behaviour, 23 are male-only, four female-only; 28 assertions are female-scoped.
- Genus-level polymorphism does not establish joint occurrence in one specimen.
- Type localities are not complete ranges or independent diagnoses.

## Taxonomic reconciliation

- Barraina, Frewena and Prostheclina are reviewed as equivalent in circumscription, not universally confirmed in phylogenetic placement.
- Hypoblemum, Jotus and Margaromma partially overlap their later concepts.
- `LTX043` Maratus spans eight destinations: TC0007, TC0004, TC0005, TC0006, TC0008, TC0011, TC0012 and TC0015, with unresolved residues.
- Saitis and Salpesia destination lists contain explicit `not_equivalent` relationships. Those are not positive routing edges.
- Servaea has no resolved destination. Retain its historical result.
- The other 75 Lucid genera are unreviewed here, not proven equivalent to any contemporary concept.
- Keep `cf. Maileus` and `cf. Prostheclina` separate from the named genera.
- Nomenclatural availability and biological support are independent. Preserve thesis qualifications until external publication evidence is reviewed.

## Report issues: preserve all 22

Assign stable register aliases `VR01` through `VR22` to section 11 of `10_validation_report.md`, retaining the original issue text and source locator:

1. Lucid prose totals versus payload.
2. Decoded dependency meaning.
3. Chapter V genus counts.
4. Jotus composition differences.
5. Maratus composition/transfers conflict.
6. Anablemum saxum/lithicum label.
7. Anablemum pilosum sampling contradiction.
8. Tropijotus wondu/wondul spelling.
9. Tropijotus status/year and availability.
10. Umbrattus type-species contradiction.
11. Prostheclina authorship year omission.
12. Historical citation/spelling variants.
13. cf. Maileus identity.
14. cf. Prostheclina identity.
15. Barraina/Frewena untested affinity.
16. Saitis scope.
17. Salpesia scope.
18. Servaea reconciliation.
19. Female identifiability.
20. Media rights.
21. Selective species coverage.
22. Thesis-only nomenclatural availability.

## Additional audit issues

These IDs are handoff register identifiers, not original scientific identifiers. Initially mark them open. Validate the exact records before implementing an interpretation.

| ID | Evidence | Interim policy |
|---|---|---|
| AU01 | 122 non-root taxon-feature combinations have every state scored zero. Examples include female profiles for Maddisonia and Parahelpis. | Preserve zeros; mark the profile anomalous/under review. Default inference must not automatically hard-exclude on these profiles. Do not assert the author meant unknown. |
| AU02 | F030 is explicitly male-specific, within a general ventral group, without corresponding female/unknown-sex disabling edges. | Add a separately sourced applicability interpretation; do not rewrite dependencies. |
| AU03 | Anablemum has SC003_A in diagnosis assertions, but the published key reaches it through the crescent-band-absent branch. | Keep both; quarantine contradictory path-derived exclusion pending source review. |
| AU04 | Hypoblemum SC002_E allows leg I or III longest; the key route excludes leg-I-longest specimens. H. unicum specifically has III longest. | Review scope and exceptions. Do not infer a universal leg formula from one route. |
| AU05 | Tropijotus assertion SC029_G is invariant two apices; T. cavernus hint describes three. | Preserve the contradiction; do not hard-exclude the species from its genus or let species hints directly alter runtime genus scores. |
| AU06 | M0566 caption depicts T. fortiniae but links to SP0018 T. fuchsia. | Quarantine species association; likely following-heading contamination. |
| AU07 | M0606 depicts J. chlorophthalmus but links to SP0006 J. citreus. | Same policy. |
| AU08 | M0612 depicts female J. michaelseni but links to male-only SP0007 J. rubripes. | Same policy; test sex/subject consistency. |
| AU09 | M0640 depicts several female Micromaratus but links to male-only SP0008 M. bluey. | Require panel-level associations; do not display as female M. bluey. |
| AU10 | M0680 depicts female Tropijotus but links to TC0014/SP0029 Umbrattus spectabilis; captured text includes following heading. | Quarantine both subject associations pending caption-boundary review. |
| AU11 | M0633 is unlinked despite explicitly describing Jotus females; other unlinked records also warrant review. | Do not assume every unlinked figure is intentionally broad scope. |
| AU12 | Captions contain truncation and following treatment text; M0653 normalized licence omits the CC BY-NC-ND condition retained in its caption. | Preserve raw text; review boundaries and rights per panel; no inferred distribution permission. |
| AU13 | Species-wide photo/microscopy flags can contradict female-specific limitations. | Store feasibility by sex and observation route; apply the stricter supported limitation. |
| AU14 | Prostheclina SC025_B says females and juveniles, but sex=female and stage=[adult,juvenile] can imply female-only juveniles. | Support disjunctive applicability; retain source sentence and unresolved interpretation until reviewed. |

Media findings are semantic mismatches in packet text, not verified reidentifications of image binaries. Correct through new reviewed associations without altering the packet.

## Schema risks to avoid

- Use persistent IDs plus packet/original aliases; source order is not durable identity.
- Separate name usage, placement, biological status and nomenclatural event.
- Give assertions, conflicts, interpretations and crosswalk components their own IDs.
- Separate source knowledge from biological states: SC030_K is missing diagnosis, not morphology.
- Split “absent or not reported” semantics; avoid negating an already absence-labelled state.
- Preserve overlap/implication between states; SC002 categories are not disjoint.
- Model compound diagnoses and exceptions explicitly; do not atomize away conjunctions.
- Keep phylogenetic support attached to the actual analysis/node claim. UFBoot is not identification confidence or necessarily support for a genus-wide membership edge.
- Keep observation instructions found in media notes available independently of image availability.
- Model assets separately from associations and multi-panel figures; retain raw captions and source licences.

## Coverage limits

No comprehensive species key, complete occurrence dataset, terminal-level phylogenetic reconstruction or complete literature history can be recovered from this packet. All 32 species-hint profiles concern thesis proposals. Another 195 placements intentionally lack hint profiles.

No media item is marked unconditionally reusable: 591 permission_required, 109 unknown. Local archival availability does not establish redistribution permission.
