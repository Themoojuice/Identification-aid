# Validation Report

## 1. Lucid structural validation

The extracted Lucid payload, rather than the stale prose count in its About page, is the structural reference.

| Structure | Expected from payload | Observed in `01_lucid_schema.json` | Result |
|---|---:|---:|---|
| Feature groups | 15 | 15 | Pass |
| Scored features | 99 | 99 | Pass |
| States | 296 | 296 | Pass |
| Taxa/entities | 86 | 86 | Pass |
| Root entities | 1 | 1 (`LTX001`, `Salticidae`) | Pass |
| Non-root genera | 85 | 85 | Pass |

- Duplicate synthetic feature-group, feature, state or taxon IDs: **0**.
- Orphan states: **0**.
- Orphan features: **0**.
- Features whose `state_ids` disagree with the state records: **0**.
- Invalid feature-group, feature, state or parent references: **0**.
- Original ordering and original numeric IDs are retained where present.
- Source discrepancy: the Lucid About page says 98 characters and 294 states; the payload has 99 scored features and 296 states. No scientific data were removed to make the prose total fit.

## 2. Lucid matrix validation

- Matrix dimensions: **86 taxa × 296 states**.
- Total reconstructed cells: **25,456**.
- Source vectors represented: **296**, one for every state.

| Score class | Original code | Count |
|---|---:|---:|
| `absent` | 0 | 15,900 |
| `common` | 1 | 9,538 |
| `rare` | 2 | 0 |
| `uncertain` | 3 | 18 |
| `common_misinterpreted` | 4 | 0 |
| `rare_misinterpreted` | 5 | 0 |

The matrix is sparse with `absent`/code 0 as the declared default. Each non-default taxon reference is valid and appears at most once per state. Re-expansion produces all 25,456 cells and exactly the stored category totals. `reconstruction_verified` is **true**, and the reconstructed state vectors were verified against the original extraction when `02_lucid_matrix.json` was produced.

Codes 2, 4 and 5 are source-defined but unobserved; they remain represented so their semantics are not collapsed. The generic Lucid “Not Scoped” facility is not a matrix score in this packet: the source `scopes` object is empty.

## 3. Lucid dependency validation

- Dependency edges: **23**.
- Encoded source dependency vectors: **5**.
- Effects: **17** `disable_feature_group`, **4** `disable_feature`, **2** `enable_feature`.
- Invalid feature-group, feature or state references: **0**.
- Raw dependency fragments unaccounted for: **0**.
- `ambiguous` interpretations: **0**.
- `unresolved` interpretations: **0**.
- `decoded_high_confidence` interpretations: **23**.

The edge total is larger than the five source records because each compressed vector can contain several targets. Raw encoded vectors, decoded vectors, fragments, original IDs and original codes are retained. Although no edge is marked ambiguous, the English effect labels are high-confidence decoding rather than explicit prose supplied by the key author; this remains a review caveat.

## 4. Schubert concept extraction

`04_taxon_concepts.json` contains **23 concept nodes**:

- **18** genus-rank concepts;
- **3** informal clades: the Saitis group, Jotus group and Maratus group;
- **2** unresolved genus-level sampled lineages: `cf. Maileus sp.` and `cf. Prostheclina sp.`.

The genus concepts contain **227 species placements/name usages**, all with an enclosing concept record. Their structured relationship totals are:

- **120** unchanged placements;
- **32** proposed new species;
- **23** proposed new combinations;
- **2** proposed restored combinations;
- **2** synonymised names;
- **32** incertae-sedis placements;
- **14** nomina dubia;
- **1** explicitly unresolved placement;
- **1** phylogenetic terminal present outside a composition list.

There are **29** concept relationships: **15** `member_of`, **4** `sister_to`, **2** `close_to` and **8** `placement_uncertain`. Excluding the informal subgroup nodes themselves, the higher-classification fields place four named genera plus `cf. Prostheclina` in the Jotus group, and eight named genera plus `cf. Maileus` in the Maratus group. The 12 confidently keyed named genera are represented without forcing either `cf.` lineage into a genus.

Provisional or problematic coverage includes Barraina and Frewena as unverified genera for consideration; Lauharulla, Maileus, Margaromma and Salpesia as qualified/problematic concepts; Saitis sensu stricto as provisionally restricted; and the two unresolved sampled lineages. All relationship endpoints are valid concept IDs.

The combination and synonymy counts combine unique structured proposals across Chapters III–V. Every thesis-only proposed act retains a nomenclatural-status caveat rather than being converted into an available name.

## 5. Schubert identification characters

- Reusable characters: **44**.
- Taxon-character assertions: **123**.
- Male-only characters by applicability: **23**.
- Female-only characters by applicability: **4**.
- Assertions explicitly scoped to females: **28**; female evidence also uses some broadly applicable somatic characters.
- Characters requiring genitalia: **13**.
- Behavioural characters: **3**.
- Character definitions marked `source_explicit`: **44**.
- Character definitions marked `curator_inference`: **0**.

All 44 observation-feasibility subfields remain null because the thesis does not systematically establish live visibility, macro-photo sufficiency, microscope need or dissection need at reusable-character level. The extraction does not invent those values.

The 123 assertions comprise 76 diagnostic, 10 supportive, 19 typical, 7 variable, 6 exception, 4 absent and 1 unknown assertion. The biological statements are source-grounded, but decomposing prose into reusable characters and assigning controlled assertion strength/variation are structured curator decisions and should not be mistaken for experimental measurements.

All 12 named genera terminal in the male key have diagnosis-derived assertions. Three broader Saitis-group assertions are also present. The thesis's female limitations are explicitly retained.

## 6. Published key validation

- Key: `SCHUBERT_SAITIS_MALE_GENUS_2025`.
- Scope: adult males of the Saitis group.
- Root node: **K1**.
- Total nodes: **23**.
- Question nodes: **11**.
- Terminal nodes/taxa: **12**.
- Unreachable nodes: **0**.
- Broken branch targets: **0**.
- Invalid character or state references: **0**.
- Invalid terminal concept IDs: **0**.
- Omitted terminals: **0**.

Every question branch retains its source lead text, character/state linkage, next node and source page. All nodes are reachable from K1, so the original male key is reconstructable. The graph does not imply that the key applies to females.

## 7. Taxon crosswalk

The crosswalk reviews the **10 Lucid genus entities materially affected by or relevant to Schubert's Saitis-group work**. It is intentionally not a blanket identical-name mapping for all 85 Lucid genera.

- Mapping records: **10**.
- Trivial/equivalent mappings: **3**.
- Non-trivial mappings: **7**.
- One-to-many `split_into` mappings: **3**.
- `partially_overlaps` mappings: **3**.
- Unresolved mappings: **1**.
- Invalid Lucid taxon references: **0**.
- Invalid Schubert concept references: **0**.
- Lucid name snapshots inconsistent with their referenced IDs: **0**.

The non-trivial records cover Hypoblemum, Jotus, Maratus, Margaromma, Saitis, Salpesia and Servaea. Lucid Maratus (`LTX043`) maps to eight later concept destinations rather than being equated with Schubert Maratus sensu stricto. Servaea remains unresolved rather than receiving a fabricated destination.

## 8. Species hints

- Species included: **32**.
- Species with at least one useful field-visible/non-microscopic hint: **30**.
- Species containing at least one genital/microscopic hint: **28**.
- Species whose overall feasibility assessment says microscopy is likely required: **10**.
- Species for which genitalic confirmation is recommended: **10**.
- Species supported only by distribution: **0**.
- Sex coverage: **20** with male and female descriptions; **12** male-only.
- Diagnostic hints: **76**: 69 source-diagnostic, 6 supportive and 1 explicitly uncertain.

All 32 are newly diagnosed species in the focal revisions and are recorded as thesis proposals not formally published under the ICZN by virtue of the thesis. Field and macro-photo feasibility values are explicitly labelled `curator_inference_from_source_diagnosis`.

The concept graph has **195 other species placements intentionally absent from `07_species_hints.json`**: 120 unchanged, 23 new-combination, 2 restored-combination, 2 synonymised, 32 incertae sedis, 14 nomina dubia, 1 unresolved and 1 source-list anomaly. Their exclusion is deliberate: the file is not a comprehensive species key, and no species was included solely because a locality was available. This means the packet cannot support comprehensive species identification.

## 9. Media

- Total indexed media records: **700**.
- Lucid associations: **557**, covering **515** unique full-size image paths.
- Schubert figures: **143**: 40 from Chapter III, 19 from Chapter IV and 84 from Chapter V.
- Duplicate media IDs: **0**.
- Missing Lucid files: **0**.
- Invalid taxon, concept, character, state or species links: **0**.
- Explicit licence/copyright field present: **598**.
- Licence field unknown/null: **102**.
- `permission_required`: **591**.
- `usable_in_app: unknown`: **109**.
- Unconditionally marked reusable (`yes`): **0**.

All 557 Lucid records require permission because the package states copyright/all rights reserved and no open licence is supplied. Schubert captions produce 41 records with some explicit rights information and 102 with none; “used with permission” is treated as permission for thesis reproduction, not automatic permission for the app. Creative Commons conditions are preserved, with non-commercial or mixed-panel cases left `unknown` for app reuse. Nine broad Schubert figures have no single defensible subject link; these are intentional unlinked broad-scope records, not orphan references.

Thumbnail derivatives and thesis image binaries are not duplicated.

## 10. Explicit-source vs curator-inference audit

The following are mechanically derived or curator-modelled rather than direct source fields:

1. **Synthetic IDs and joins:** all `FG`, `F`, `S`, `LTX`, `TC`, `SC`, `CW`, `SP` and `M` identifiers are packet constructs. Original IDs are retained separately where available.
2. **Lucid hierarchy normalisation:** separating feature groups from scored features, deriving root/rank fields and counting fact-sheet/media availability are mechanical transformations of the payload.
3. **Sparse matrix representation:** choosing code 0 as the implicit value is a storage decision justified by Lucid's documented default and verified reconstruction.
4. **Dependency interpretation:** the 23 edge effects are high-confidence decoding of five compressed records. Raw source forms are retained.
5. **Taxon concepts:** concept boundaries, preferred-name selection, controlled biological/nomenclatural statuses and genus-level phylogenetic graph abstraction require curator modelling from explicit thesis assertions.
6. **Phylogenetic relationships:** collapsing specimen-terminal trees or prose to genus-level `member_of`, `sister_to` and `close_to` relations is an abstraction; qualified or conflicting topology is retained in notes rather than forced into a complete tree.
7. **Diagnostic character decomposition:** splitting prose diagnoses into 44 reusable characters, minimising duplicates, and assigning assertion type, strength and variation are curator structuring decisions. Observation-feasibility values were not inferred in this file.
8. **Crosswalks:** relationship labels, confidence, evidence basis and rationales are curator reconciliation judgments supported by species composition, types, transfers and source statements.
9. **Species feasibility:** the 32 field/macro/microscopy/genitalic feasibility assessments are curator inferences and are labelled as such. Diagnostic morphology, sex, locality and source pages remain source facts or close paraphrases.
10. **Media classification:** `content_type`, view/sex extraction, normalized creator/licence strings and `usable_in_app` are mechanical or rights-conservative interpretations of source indices and captions. Taxon/state associations themselves come from explicit Lucid ownership or thesis captions.
11. **Examples:** every record in `09_examples.json` is explicitly synthetic behavioural guidance, not a source observation.

No curator-inferred field is used to silently alter a source score, taxon label or nomenclatural act.

## 11. Ambiguities requiring human review

1. **Lucid prose totals:** the About page says 98 characters/294 states; the payload contains 99/296.
2. **Lucid dependency semantics:** all 23 edges are high-confidence decodings, but the effect labels should be independently checked if exact Lucid-player parity is safety-critical.
3. **Chapter V genus count:** the introduction says 13 genera, the contained-genera list and male key contain 12, and nearby prose refers to approximately 15.
4. **Jotus composition:** Chapter IV includes additions and transfers omitted from Chapter V's shorter composition list, although some remain used in Chapter V figures and remarks.
5. **Maratus composition:** Chapter V lists `M. expolitus`, `M. griseus` and `M. scutulatus` while the same chapter proposes their placement in Variattus or Hypoblemum.
6. **Anablemum species label:** a phylogeny label uses `Anablemum saxum`; the treatment, abstract, type statement and composition use `A. lithicum`.
7. **Anablemum sampled taxon:** prose says female-only `A. pilosum` lacks molecular data but elsewhere says it was recovered in the phylogeny; the intended terminal is unclear.
8. **Tropijotus spelling:** one Chapter III composition entry says `T. wondu`; the species treatment and Chapter V say `T. wondul`.
9. **Tropijotus status/year:** the thesis alternates among `gen. nov.`, “in review” and “Schubert, 2025”; none establishes ICZN availability.
10. **Umbrattus type species:** the genus heading names `U. spectabilis`, while the composition marks `U. bimaculatus` as type species.
11. **Prostheclina authorship:** the Chapter V composition omits the year for `P. boreoaitha`.
12. **Historical citation variants:** Hypoblemum 1885/1886 usage and spelling/diacritic differences require name-usage review rather than silent normalisation.
13. **`cf. Maileus`:** the sampled lineage is not confidently Maileus sensu stricto and remains separate.
14. **`cf. Prostheclina`:** the sampled lineage may be an undescribed genus and remains separate from Prostheclina sensu stricto.
15. **Barraina and Frewena:** possible Saitis-group affinity and monophyly were not molecularly tested in the thesis.
16. **Saitis scope:** Lucid's Australian Saitis holding entity is not equivalent to the thesis's provisional Mediterranean Saitis sensu stricto.
17. **Salpesia scope:** the Lucid Australian holding entity is not equivalent to the type-species-anchored Salpesia concept.
18. **Servaea reconciliation:** the affected Lucid entity has no defensible resolved Schubert destination in the current crosswalk.
19. **Female identifiability:** Schubert explicitly considers a female Saitis-group key impractical; many female outcomes must remain multi-candidate.
20. **Media rights:** 102 figure records lack a licence statement, “used with permission” may not extend to the app, and no item is marked unconditionally reusable.
21. **Selective species layer:** only 32 explicitly diagnosed new species have hint records; older, transferred and unresolved species are not comprehensively keyed.
22. **Nomenclatural availability:** every thesis-only proposed name, combination, restoration and synonymy requires a qualifying publication or other ICZN-compliant evidence before presentation as formally available.

## 12. Intentionally excluded source material

- **Long taxonomic descriptions and redescription prose:** replaced by compact concept relations and identification assertions. Full text remains in the thesis for specialist review.
- **Etymologies:** omitted except where a short ecological statement directly supports a species-hint limitation. Etymology does not identify genera.
- **Full bibliographies and synonymic citation histories:** omitted because the architecture task needs provenance and relationship type, not a duplicate reference database.
- **Raw fact-sheet HTML duplication:** not copied into the packet. Availability and media paths are indexed, while original files remain in the source tree.
- **Thumbnail binaries:** excluded as derivatives of 515 indexed full-size Lucid images.
- **Thesis image binaries:** not extracted or duplicated; numbered figure references and rights metadata are indexed.
- **Specimen-by-specimen material examined:** reduced to selected type-locality evidence in species hints. A future occurrence or collections dataset would need the complete records, dates, vouchers and spatial uncertainty.
- **Complete phylogenetic matrices and terminal-level trees:** represented only by source-aware concept relationships and figure records. The packet does not claim to reproduce all branch lengths, terminals or support values.
- **Full courtship, natural-history and distribution narratives:** retained only when they contribute a structured genus assertion, selected species hint or media record.
- **Comprehensive species diagnoses:** intentionally excluded. `07_species_hints.json` supports optional suggestions, not species-key completeness.
- **Provisional UX difficulty metadata from the existing project:** not treated as Lucid or Schubert fact. Observation-cost optimisation remains future curator/product work.

These exclusions do not impair reconstruction of the Lucid genus matrix or Schubert's male genus key. They do limit comprehensive species identification, specimen mapping, bibliographic work and full phylogenetic reanalysis, all outside this packet's stated purpose.

## 13. Information-loss assessment

### Genus identification

No known Lucid genus-level scoring information has been omitted: ontology, all 25,456 cells, defined score categories, dependencies and source media associations are represented. Schubert's 12-terminal male key is reconstructable, and reusable genus-diagnosis assertions are present. Long prose, microscopic technique and unmeasured observation difficulty remain external; female genus identification is inherently limited by the source.

### Taxon reconciliation

The principal affected Lucid concepts and all structured Schubert placements are represented with opaque IDs and provenance. No uncertain mapping was forced to equivalence. Some source contradictions lack a generic first-class conflict-ID mechanism and instead live in statuses, notes and parallel records; the numbered review list must travel with the packet.

### Species suggestions

The layer deliberately omits 195 other species placements and cannot function as a comprehensive species key. For the 32 included species, compact morphology, sex limitations, type-locality context, feasibility and confirmation needs are retained. Locality is never the sole evidence. This is acceptable only under the genus-first, optional-suggestion scope.

### Provenance

Source IDs and page/figure references are present across the Schubert layers; original Lucid IDs, labels, ordering, raw dependency records and file paths are preserved. Short structured paraphrases replace long prose but point back to the source.

### Future taxonomy updates

Original Lucid evidence is independent of the Schubert concept and crosswalk layers, and names are not permanent IDs. Later concepts and mappings can therefore be added without rewriting the historical matrix. A future expansion would benefit from first-class name-usage, assertion and conflict identifiers, but this does not require mutation of the existing Lucid layer.

## 14. Final readiness

# READY WITH CAVEATS

The packet is internally coherent: all eight scientific data files parse, synthetic IDs are unique, cross-file references are valid, the Lucid matrix reconstructs exactly, all dependency fragments are represented, and the Schubert male key is complete and reachable. It is suitable for handoff to an architecture-design model provided that the model also receives `00_START_HERE.md` and this report.

The caveats are material and must remain explicit: thesis-only nomenclatural acts are not formally published by the thesis; several thesis assertions conflict; dependency meanings are decoded rather than author-labelled; female Saitis-group identification is limited; species hints are selective; and media redistribution is not currently cleared. These issues do not justify modifying the scientific data merely to obtain a cleaner validation result.
