# Extraction Audit

## 1. Source inventory

### 1.1 Scope and evidence policy

This audit covers the material presently stored in the project. It does not treat an identical spelling across sources as proof of taxonomic-concept identity, and it does not use the thesis as evidence that a proposed nomenclatural act is formally available.

Evidence is classified here as:

- **Explicit source fact**: stated or encoded directly in a source.
- **Mechanical derivation**: reversible decoding, parsing, counting, hashing, or joining by an explicit source identifier/order.
- **Curator inference**: a judgement such as concept equivalence, diagnostic strength, geographic generalisation, or the interpretation of an all-zero character.
- **Unresolved**: conflicting, incomplete, or insufficiently evidenced.

The source hierarchy that should be retained in the eventual packet is:

1. the original Lucid payload and its original external resources;
2. the archived Lucid player/help material used to decode the payload;
3. the Schubert thesis as a source of explicitly qualified biological and taxonomic assertions;
4. mechanically normalised project data;
5. curator-authored overlays and future reconciliations.

The layers must remain separable. In particular, the original Lucid taxonomy must not be rewritten to resemble Schubert's taxonomy.

### 1.2 Lucid sources

Primary and supporting Lucid material is present under `source/lucid-original/`:

- `source/lucid-original/salticidae.json`: archival copy of the original JavaScript-wrapped Lucid payload. SHA-256: `cea9492cd5649764482748e88be2d6cfab91344c573b3dada2f85b9d4aa6b4c8`.
- `salticidae.json` at project root: byte-identical source copy.
- `source/lucid-original/metadata/lz-string.min.js`: decoder required for compressed score and dependency values.
- `source/lucid-original/metadata/player.nocache.js` and three browser-specific `.cache.js` bundles: evidence for generic player behaviour and labels, but not key-specific taxonomy.
- `source/lucid-original/help/`: archived Lucid documentation for categorical scores, options, and dependencies.
- `source/lucid-original/html/key.html`, `index.html`, and `about.html`: key configuration, citation, explanatory text, and source limitations.
- `source/lucid-original/media/`: full and thumbnail image trees and entity fact-sheet HTML/PDF resources.
- `source/lucid-original/fact-sheets/index.htm`: an independently discovered fact-sheet index not referenced by the main payload.

The archive contains 1,546 files: 1,348 JPG, 86 PDF, 89 HTM, 8 HTML, 5 PNG, 5 JS, 3 CSS, and 2 JSON files. The unified manifest reports 1,604 unique discovered resources: 1,544 downloaded, 5 broken references, 2 HTTP errors, 4 inaccessible, 24 observed-live-not-archived, and 25 reachable-but-intentionally-not-archived. The non-downloaded items are largely generic player/external resources; the 1,116 unique resources referenced directly by the Lucid JSON were downloaded successfully.

Derived project material includes:

- `data/normalized/key.json`: reversible structural expansion of the Lucid payload.
- `data/normalized/fact_sheets.json`: 86 entity sheets, retaining section HTML and derived plain text (426 sections total).
- `data/manifests/assets.json`, `html_assets.json`, `player_assets.json`, and `references.json`: resource/provenance inventories.
- `data/curated/character_metadata.json`: explicitly labelled provisional UX metadata; its difficulty, reliability, method, and view fields are not Lucid source data.
- `data/curated/state_media.json`: explicitly labelled representative-image assignments; these are not original Lucid state-media associations.
- `docs/SCHEMA_REPORT.md`, `SCORING_SEMANTICS.md`, `LUCID_COMPLETENESS_AUDIT.md`, `ASSET_MANIFEST.md`, `LICENSING_AND_PROVENANCE_NOTES.md`, and `COMPARATOR_AUDIT.md`: useful prior audits, but secondary to the preserved source and tests.

The existing validation suite passes all 11 source-integrity tests, including source/archive byte identity, source-record preservation, referential integrity, exact matrix reconstruction, dependency reconstruction, JSON-reference coverage, fact-sheet extraction, and selected semantic spot checks.

### 1.3 Schubert thesis

The thesis is `source/Schubert-2025-integrative-systematics-of-the-australian-thesis.pdf`, 304 PDF pages, SHA-256 `4a7c978c52b5e27a5a33e21b574c7c01ea841098169d51394533c074adbb5092`. The PDF is not tagged. Its printed page numbering differs from PDF page numbering after the front matter; both values should be retained in locators.

The disclaimer on PDF page 6 (printed page v) is decisive: new taxon names and nomenclatural changes proposed in the thesis are not considered published under the fourth edition of the ICZN. Consequently, `gen. nov.`, `sp. nov.`, `comb. nov.`, `stat. rev.`, proposed synonymies, lectotype designations, and proposed nomina dubia in the thesis are source assertions and biological/nomenclatural proposals, not evidence of formal availability by virtue of the thesis.

Relevant chapter spans and structures are:

- **Chapter III**, PDF pages 51–113 (printed 42–104): a submitted manuscript on `Tropijotus`, containing molecular methods and trees, a generic diagnosis and composition, eleven proposed new species, one proposed new combination, species diagnoses/descriptions, material examined, distributions, courtship notes, figures, and supplementary sequence data.
- **Chapter IV**, PDF pages 114–144 (printed 105–135): a manuscript prepared for submission on `Jotus`, containing a COI phylogeny, revised generic evidence, four proposed new species, three proposed new combinations, a mixed syntype-series analysis, a proposed lectotype, species diagnoses/descriptions, and figures.
- **Chapter V**, PDF pages 145–276 (printed 136–267): a manuscript prepared for submission giving a 404-taxon, three-locus phylogeny; an explicitly male-only dichotomous key; genus remarks, diagnoses, type species, and compositions; six proposed new genera; one proposed restored genus; seventeen proposed new species; twenty-one proposed new/restored combinations; two proposed synonymies; proposed nomina dubia and incertae-sedis placements; courtship, distribution, and morphology; an “Other genera for consideration” section; and supplementary data.

Chapters are expressly standalone. Repeated or inconsistent assertions between them must therefore be stored with chapter-level provenance rather than collapsed into one apparently unanimous thesis assertion.

No machine-readable Newick tree, character matrix, specimen table, or separate thesis-media package is present in the project. The thesis PDF contains figures and tables, but exact tree topology extraction from page artwork would require separate validation and should not be inferred from prose alone.

## 2. Existing Lucid data structures

### 2.1 Directly represented structures

The original payload directly represents:

| Structure | Direct source fields | Audited count/notes |
|---|---|---|
| Key metadata | `title`, `basePath`, `keyType`, `retainUncerts`, `allowMisints`, `matchType` | Numeric enum meanings are not self-describing. |
| Feature hierarchy | `features[].id`, `uid`, `name`, `parent`, `type`, `children`, optional `text` | 114 records: 15 groups and 99 scored characters. |
| Character behaviour | `inc_best`, `match_type`, `weight`, `single_choice`, ordered `states[]` | Present on all 99 scored characters. |
| States | `states[].id`, `uid`, `name`, `type`, `feature`, optional `images[]` | 296 states. Names are non-unique. |
| Taxon/entity hierarchy | `entities[].id`, `uid`, `name`, `type`, `children`, `parent`, `text[]`, `images[]` | 86 entities: Salticidae root plus 85 terminal genus-labelled entities. |
| Matrix | `scores[state_id]` compressed vectors | 296 vectors × 86 ordered entity positions = 25,456 cells. |
| Dependencies | `dependencies[controlling_state_id]` compressed vectors | 5 vectors, mechanically decoded to 23 edges. |
| Optional Lucid structures | `measures`, `scopes`, `subsets` | Explicitly empty. No numeric features. |
| Media references | image caption, optional comments, full path, thumbnail path, numeric type | 241 state-image records and 316 entity-image records. |
| Fact-sheet references | caption, path, numeric type | One on each entity plus one anomalous duplicate on feature group 1. |

All original numeric IDs, UUIDs, source order, path strings, encoded values, decoded values, and vector offsets are available in the normalized extraction. Feature names and state names are not unique: there are 11 duplicated feature-label sets (mostly male/female leg characters) and 43 duplicated state names. IDs, not display names, are therefore required for source joins.

### 2.2 Score semantics

The categorical code set supported by the archived player/documentation is:

- `0`: absent;
- `1`: common/present;
- `2`: rare;
- `3`: uncertain;
- `4`: common/present by misinterpretation;
- `5`: rare by misinterpretation.

The payload contains 15,900 zeroes, 9,538 ones, and 18 threes; codes 2, 4, and 5 are unobserved but must remain in the schema. The original options retain uncertain scores and allow misinterpretations. Sparse storage is safe only if an omitted cell is defined as original code `0`, the original vector/entity order is retained, and exact reconstruction is tested. An omitted cell must never be re-labelled “unknown” merely for convenience.

There is a separate interpretive problem: for a few taxon-character combinations every state is zero. The prototype comparator treats such combinations as “not scored in source” rather than as a contradiction for every possible state. That is a defensible curator/engine inference, not an explicit Lucid value. It must be represented separately from the lossless matrix. Known all-zero coverage includes several leg characters for Australoneon and female leg characters for Capeyorkia, Maddisonia, Parahelpis, and Pristobaeus.

### 2.3 Dependencies and applicability

Sex and female-genital preparation are encoded through ordinary states and dependencies, not dedicated sex/life-stage fields. Five controlling states decode to 23 feature edges. The interpreted edge types are negative (hide/remove) and positive (unfold/show), supported by player behaviour and Lucid documentation; raw controlling state, raw dependent feature, raw dependency code, encoded vector, and decoded vector must all be retained.

No explicit life-stage structure is present. The Salticidae fact sheet warns that immature specimens are generally unsuitable and young males may show female states; this is prose guidance, not a matrix applicability rule.

### 2.4 Existing extraction issues and normalisation cautions

The core logical extraction appears complete and internally consistent, but the following must remain visible:

- The live About page says 98 characters and 294 states; the payload has 99 and 296. The payload counts control the data layer; the stale prose remains a conflicting source statement.
- Feature group 1 (“Sex of specimens”) contains a fact-sheet link to the Mopsolodes entity. This appears anomalous but intent is unprovable.
- The JSON points to `australoneon_richardson_2024.htm`; the fact-sheet index points to a 2025 filename. Both pages exist and display “Australoneon Richardson 2025”; the 2025 page still points to 2024 PDF/media paths.
- Original spelling, diacritics, punctuation, spacing, capitalization, and apparent filename/label errors are not consistently normalised and should not be silently repaired. Examples include `Zabka`/`Żabka`, varying author punctuation, and misspelled media filenames.
- Of 296 states, 241 have source images. Excluding the six setup states for sex/epigyne preparation, 49 of 290 identification states lack a Lucid illustration. The curated substitute images are explicitly representative overlays, not source associations.
- The normalized fact sheets successfully preserve 85 repeated sections each for Taxonomy, Description, Biology, Distribution, and References, plus one Salticidae “Using the key” section. Section labels do not turn free text into atomic facts.
- The asset archive includes broken/malformed external links. Four AFD links omit `:` after `http`, a Servaea DOI is `https://doi/`, and some non-core page resources are unavailable. These strings are source evidence and should not be repaired without a separate corrected-value field.
- Every inspected fact sheet says “Copyright 2025. All Rights Reserved.” Almost all Lucid image captions contain creator/copyright credits, but local possession does not establish app reuse permission.
- `data/curated/character_metadata.json` and `data/curated/state_media.json` are consistently labelled as curator overlays. They must not be copied into the Lucid source layer without that status.

## 3. Schubert data structures relevant to the app

### 3.1 Taxonomic concept evidence

Chapters III–V provide explicit, source-locatable assertions for:

- genus headings and name usages;
- type species statements and designation modes where stated;
- composition lists;
- proposed new/restored combinations;
- proposed synonymies;
- incertae-sedis and nomen-dubium lists, often with reasons;
- proposed new genera and species;
- historic combinations and synonymies in synonymic lists;
- genus remarks and delimitations;
- phylogenetic membership, sister relationships, clade names, and support values in prose/figures;
- uncertainty language such as “possibly,” “likely,” “putatively,” “requires re-examination,” or “not tested.”

These are assertions made by a particular chapter/manuscript at a particular stage. They do not by themselves establish current nomenclatural acceptance or ICZN availability.

Chapter V proposes two major internal subgroups, the Jotus group and Maratus group. It reports strong support for all constituent genera under the proposed framework, but also records important exceptions and unresolved lineages. `cf. Prostheclina`, `cf. Maileus`, Barraina, Frewena, Lauharulla, Margaromma, Salpesia, and numerous species-level placements require qualified status rather than ordinary membership edges.

### 3.2 Genus-identification evidence

Chapter V supplies a male-only key with 11 numbered couplets and 12 terminal genus determinations. The graph is explicit and appears structurally reachable:

- couplet 1 routes to 2 or 3;
- 2 to Prostheclina or 8;
- 3 to Hypoblemum or 4;
- 4 to Anablemum or 5;
- 5 to Salinatus or 6;
- 6 to 9 or 7;
- 7 to Striattus or 10;
- 8 to Jotus or Tropijotus;
- 9 to Micromaratus or Maratus sensu stricto;
- 10 to 11 or Umbrattus;
- 11 to Variattus or Saitis sensu stricto.

Lossless extraction requires the exact lead text, lead order, punctuation/qualifiers, destination, key scope (“males”), and source locator. The negative lead is not always a logical universal complement; it is the authored alternative within that couplet.

Chapter V also contains genus diagnoses for the 12 keyed genera, generally framed as combinations of characters. Saitis is an exception: the author explicitly declines a formal rediagnosis, provides only general male recognition characters, and states that females need examination. Genus-diagnosis assertions include somatic morphology, male palps, female epigynes, leg formula/ornamentation, courtship behaviour, distribution, and explicit variation or exceptions.

The discussion warns that secondary sexual characters are labile and homoplastic. Examples include Variattus expolitus lacking the modified leg III typical of congeners and Tropijotus species independently acquiring opisthosomal display traits. Therefore, individual diagnosis clauses must not be promoted to necessary-and-sufficient rules unless the source says so; conjunction/group structure and exceptions are materially important.

### 3.3 Species-level evidence

Chapters III–V repeatedly use structured taxonomic-section headings such as Material examined, Etymology, Diagnosis, Description, Male, Female, Variation, Courtship display, and Distribution. This is a strong source for optional species hints, especially:

- Tropijotus species in Chapter III;
- Jotus species in Chapter IV;
- the proposed new species and selected historical taxa redescribed or discussed in Chapter V;
- type locality, specimen/voucher, sex, and preparation evidence;
- externally visible versus genitalic discriminators;
- known-female/known-male limitations;
- behaviour, habitat, and geographic restriction;
- uncertainty and “known only from” statements.

This material is not a comprehensive species key. “Unknown,” “known only from the type locality,” and “preliminary unpublished data” occur frequently and need explicit evidence-status fields.

### 3.4 Media evidence

The thesis supplies figure number, panel letters, captions, taxon identifications, live/preserved context, sex, view, specimen repository/registration in some captions, scale bars, creators, iNaturalist observation IDs, and licences for some images. Other captions say only “used with permission” or identify the author.

“Used with permission” documents use in the thesis, not necessarily reuse in the future app. CC licences in captions must be stored with exact version/URI and restrictions (including NC/ND/SA), and each composite panel must be assessed separately. Page/figure/panel references are presently more reliable than invented filesystem paths for thesis media.

## 4. Field-by-field source mapping

| Target file / required field | Direct Lucid source | Schubert source | Inference or present limitation |
|---|---|---|---|
| `00_START_HERE.md`: project goal and genus-first/species-second behaviour | User requirements; Lucid Salticidae “Using the key” fact sheet supports genus-level behaviour | Male-key/female-limit statements in Ch. V | Final wording is curator-authored. |
| Source layers and provenance | Payload, archive paths, hashes, manifests, extraction provenance | Thesis file/hash, disclaimer, chapter manuscript status | Source precedence policy is curator-defined and must not imply taxonomic precedence. |
| Lucid score meanings/options | Raw numeric values and top-level options; player/help corroboration | None | Human-readable enum labels are a documented interpretation; raw code remains authoritative. |
| Nomenclatural caveats | Lucid fact-sheet taxonomy prose contains historical usages | Thesis disclaimer and chapter-specific proposed acts | Formal/current status after the thesis cannot be established from present sources alone. |
| `01_lucid_schema.json`: feature groups, features, states, entities | Directly present | None | None beyond enum interpretation. |
| Original identifiers/order | Numeric IDs, UUIDs, array order, vector offsets | None | Must be preserved even when display names are corrected elsewhere. |
| Source metadata | Payload title/base path/options; About citation; file hash | None | Exact Lucid release/version/publication date is not a single self-consistent field. |
| `02_lucid_matrix.json`: all cells and score categories | Compressed vectors and entity order | None | Sparse zeros are safe only with exact reconstruction contract and tests. |
| Coverage/missingness interpretation | No dedicated field | None | All-zero taxon-character meaning is curator inference; store separately. |
| `03_lucid_dependencies.json`: raw and interpreted relationships | Compressed maps, controlling state IDs, dependent feature IDs/codes | None | `negative`/`positive` labels are documented interpretation; keep raw code/text. |
| `04_taxon_concepts.json`: concept nodes and opaque IDs | Lucid provides source entities/name usages, not modern biological concepts | Chs. III–V genus treatments, compositions, type species, remarks, trees | Concept boundaries and packet IDs are curator-created. |
| Preferred names | Lucid has display labels only | Thesis proposes/reuses name usages | A single unqualified “preferred/current” name is not safely derivable without a nomenclatural authority and date. |
| Type species | Sometimes in Lucid fact-sheet prose | Explicit in genus treatments | Missing or conflicting authorship/year/designation data require source-specific assertions. |
| Species composition | Free-text lists in some Lucid fact sheets | Explicit composition lists | Lists conflict within/between thesis chapters; do not merge silently. |
| Phylogenetic subgroup/relationships | Coarse related-genera prose in fact sheets | Ch. III/V prose, figures, support values | Exact full tree requires machine-readable tree data or separately validated figure transcription. |
| New/restored combinations, synonymies, incertae sedis, nomina dubia | Historical prose | Explicit lists and synonymic histories | Thesis-only acts must have `proposed_unavailable_in_thesis`, not ordinary accepted status. |
| Biological versus nomenclatural status | Not separated | Evidence exists for both | The separation is a schema/curatorial act; status must be assertion-scoped. |
| `05_schubert_genus_characters.json`: male-key graph | None | Ch. V printed p.147 / PDF p.156 | Exact graph can be extracted; adult/stage is not explicitly encoded by the key heading. |
| Genus diagnostic assertions | Lucid matrix/fact-sheet descriptions may be retained as a separate source layer | Ch. III Tropijotus diagnosis; Ch. IV Jotus; Ch. V genus diagnoses | Atomisation, ontology alignment, and diagnostic/supportive classification require curation. |
| Sex, preparation, applicability, exceptions | Lucid dependencies and prose | Explicit male/female/unknown and exceptions in treatments | Never generalise male-key claims to females. |
| `06_taxon_crosswalk.json`: Lucid-to-Schubert relations | Lucid entity UUID/name/fact-sheet species usage | Thesis historic combinations, compositions, synonymies, remarks | Relation type and concept scope require curator judgement; many mappings are one-to-many overlaps. |
| `07_species_hints.json`: species evidence | Entity captions and fact-sheet species prose offer limited hints | Species Diagnosis/Distribution/Courtship/Material/Variation sections in Chs. II–V | Inclusion threshold and confidence are curator decisions. |
| `08_media_manifest.json`: Lucid media | Direct path, thumbnail, caption, comment, state/entity association; resource manifest | Figure/panel/caption/page; creator/licence where stated | View/sex can be inferred only when caption or image supports it; reuse permission is often unknown. |
| `09_examples.json`: behavioural scenarios | Can cite matrix/dependency/source limitations | Can cite male key, female limitations, conflicts | Scenarios and expected responses are synthetic curator artifacts, not extracted facts. |
| `10_validation_report.md`: Lucid counts/integrity | Existing tests and exact counts | Extraction totals, key graph, conflict counts to be computed | “Completeness” must be defined per source section and include unresolved assertions. |

## 5. Required curator inferences

The following cannot be presented as direct extraction:

1. **Minting concept IDs.** Opaque, permanent IDs must be created independently of taxon names. A Lucid entity UUID may identify that source entity, but it must not be reused as the global ID for a later biological concept.
2. **Selecting a preferred/current name.** The thesis supplies proposals and usages, not proof that thesis-only acts became available elsewhere. Preferred-name selection requires an explicit taxonomic authority, date/cut-off, and evidence of effective publication.
3. **Defining concept boundaries.** A genus name in Lucid and the same spelling in Chapter V may have different species circumscription. Equality, inclusion, overlap, split, and exclusion are curator assertions.
4. **Atomic character modelling.** Splitting prose diagnoses into subject–character–value assertions; retaining conjunctions; mapping synonyms such as “conductor” versus “embolic process/apex”; identifying polarity; and marking diagnostic versus supportive status all require curation.
5. **Applying diagnostic strength.** “Can be distinguished by the following combination” does not make each clause independently diagnostic. “Usually,” “often,” “typically,” exceptions, and comparison sets must be retained.
6. **Interpreting all-zero Lucid characters.** Treating these as “unscored” rather than 0/absent across every state is a useful derived coverage rule, not encoded source semantics.
7. **Geographic normalisation.** Converting prose localities/distributions to controlled regions or geometry, and deciding whether “known only from” is true absence or sampling limitation, requires inference.
8. **Species-hint eligibility.** Deciding that evidence is useful enough for a suggestion is a curator policy. It must not be confused with the thesis's diagnostic wording.
9. **Phylogenetic graph abstraction.** Converting specimen-terminal figures and prose into genus-level relationships requires decisions about support thresholds, collapsed nodes, `cf.` terminals, and conflicting analyses.
10. **Media interpretation and rights decisions.** Inferring sex/view from an image, assigning a composite figure to multiple characters, or declaring downstream reuse permitted requires review beyond basic extraction.
11. **Difficulty/reliability/method fields.** Existing values in `data/curated/character_metadata.json` are provisional UX judgements, not Lucid or Schubert evidence.
12. **Worked-example outcomes.** Scenarios in `09_examples.json` should be explicitly synthetic, with cited source assertions and a stated taxonomic snapshot.

Every inferred record should identify the curator/model, date, method/rule, evidence inputs, and review status. Numeric confidence should not be invented where the source only supplies verbal qualification.

## 6. Missing or uncertain data

### 6.1 Not presently reliable

- **Current formal nomenclatural status of thesis proposals.** The project contains no post-thesis publication-status audit against an authoritative current catalogue and the effectively published papers. This blocks an unqualified current/preferred-name layer.
- **Exact publication identity of chapter manuscripts.** Chapters III and V refer to submitted/in-review work, and Chapter IV to work prepared for submission. The thesis is not evidence that later publications retained identical text, names, acts, or compositions.
- **Complete, machine-readable phylogeny.** Tree images and prose are present; Newick/branch metadata are not found in the project.
- **Reliable female identification for all Saitis-group genera.** Chapter V says a female key is impractical; several females are unknown or poorly known, and Saitis females require further examination.
- **Juvenile identification.** Lucid prose cautions against it, but no complete stage applicability/scoring layer exists.
- **Complete species-level identification coverage.** The thesis treats selected groups and species, not all Australian Salticidae.
- **Complete distribution/range evidence.** Many statements are preliminary, unpublished, museum-sample-limited, type-locality-only, or observational.
- **Reusable rights for most media.** Credits and thesis-use permissions do not establish app-reuse permission. Lucid pages are all-rights-reserved.
- **Exact taxon association for every thesis figure panel without manual review.** Composite figures and tree labels are poorly suited to unattended PDF text extraction.
- **Intent behind source errors.** The audit can identify inconsistencies but cannot decide the intended correction.

### 6.2 Extraction-quality cautions

The PDF text layer is usable for prose but not lossless for layout. It intermixes labels from dense phylogeny figures, occasionally substitutes encoding characters, and does not preserve all visual relationships. Figure- and key-heavy pages require visual verification. Page locators should include PDF page, printed page, chapter, section, figure, and panel/couplet where applicable.

No Schubert-derived structured files presently exist in the project. Therefore, Schubert extraction totals, key transcription tests, concept counts, and crosswalk completeness have not yet been established.

## 7. Taxonomic reconciliation risks

### 7.1 High-risk Lucid entities

- **Lucid Maratus is a broad legacy concept, not Maratus sensu stricto.** Its fact sheet explicitly contains a core peacock-spider group plus misplaced species inherited from Lycidas. Across Chapters III–V, species formerly under Maratus are proposed for Anablemum, Hypoblemum, Jotus, Micromaratus, Salinatus, Striattus, and Variattus, while additional Maratus species remain incertae sedis. The appropriate crosswalk is a set of scoped overlaps/splits supported at species level, never a whole-entity equivalence.
- **Lucid Saitis is an Australian legacy assemblage.** Its fact sheet lists eight Australian species. Chapter V restricts Saitis sensu stricto to three Mediterranean species and treats Australian usages as transferred, incertae sedis, or nomina dubia. The Lucid entity cannot be equated with Schubert's Saitis sensu stricto.
- **Lucid Salpesia represents Australian species explicitly said not to match the Seychelles type-species concept.** Chapter V moves `S. bimaculata` to proposed Umbrattus, places `S. squalida` near Servaea, and treats other Australian names as incertae sedis or nomina dubia. This is not equivalence to Salpesia sensu stricto.
- **Lucid Hypoblemum is retained despite a prior proposed synonymy and has a different composition/history.** Its fact sheet discusses confusion among `villosum`, `albovittatum`, `griseum`, and `scutulatum`; Chapter V proposes a restored Hypoblemum with a different explicit composition. Mapping requires name-usage and species-level evidence.
- **Lucid Jotus is narrower and partly discordant.** Its fact sheet lists seven species including taxa Chapter V treats as misplaced. Chapter IV proposes additional combinations/species. Whole-genus equality is unsafe without a dated concept definition.
- **Lucid Margaromma is poorly defined.** Chapter V says the type-series evidence is mixed, the female type species requires re-examination, conspecific males are needed, and many included species are misplaced/unidentifiable.
- **Barraina and Frewena occur in Lucid but are only “genera for consideration” in Chapter V.** Their Saitis-group membership and monophyly are untested/provisional.

New thesis concepts absent as Lucid entities include Anablemum, Micromaratus, Salinatus, Striattus, Tropijotus, Umbrattus, and Variattus. Maileus and Lauharulla are also absent as Lucid entities; the Lucid guidance names Lauharulla among historically used genera excluded from the key. Absence must not be encoded as taxonomic nonexistence.

### 7.2 Explicit thesis contradictions and draft inconsistencies

These require conflict records or author/published-paper verification:

1. **Genus count:** Chapter V introduction says the revised framework recognises 13 genera (PDF p.148), while the “Contained genera” list and male key contain 12 (PDF pp.155–156). Nearby remarks also refer to approximately 200 species across 15 genera. The intended counting scope is unclear.
2. **Jotus composition:** Chapter IV proposes four new Jotus species and three combinations, and Chapter V figures/remarks refer to `J. amandae`, `J. aurora`, `J. rubripes`, `J. remus`, and `J. vittatus`. Yet the Chapter V composition list (PDF p.175) omits those names, including `J. remus` and `J. vittatus`, while listing only ten accepted species. This is a substantive internal conflict, not a formatting issue.
3. **Maratus composition:** Chapter V's Maratus list (PDF pp.178–180) includes `Maratus expolitus`, `M. griseus`, and `M. scutulatus`, although the same chapter proposes `Variattus expolitus`, `Hypoblemum griseum`, and `Hypoblemum scutulatum`. The composition list cannot be treated as a clean post-revision list.
4. **Anablemum species label:** the Chapter V phylogeny figure text contains `Anablemum saxum`, while the treatment, type-species statement, abstract, and composition use `Anablemum lithicum`.
5. **Anablemum phylogenetic wording:** the treatment says `A. pilosum` is known only from a historical female holotype and lacks molecular data, then says `A. pilosum` was recovered in the phylogeny. The sampled taxon appears elsewhere as `A. lithicum`/`A. saxum`; the intended subject is unresolved.
6. **Tropijotus spelling:** Chapter III's composition uses `Tropijotus wondu`, while its figure material and Chapter V composition use `T. wondul`.
7. **Tropijotus status/year:** it appears as `gen. nov.` in Chapter III, `Schubert (in review)` in the Chapter V contained-genera list, and `Schubert, 2025` in the Chapter V composition. The thesis disclaimer prevents treating any of these as proof of availability.
8. **Prostheclina authorship:** Chapter V's composition line for `P. boreoaitha` omits the year. Another source may supply it, but the Chapter V assertion is incomplete as printed.
9. **Historic author/year formatting:** examples include Hypoblemum 1885/1886 usages and spelling/diacritic variants. Raw name usages should be retained separately from any normalised citation.

### 7.3 Qualified rather than contradictory assertions

Some differences are changes in scope or strength and should not be flattened into binary conflict:

- Chapter III calls two earlier sequence identifications likely conspecific with `Tropijotus fuchsia`; “likely” must remain qualified.
- Chapter V describes `cf. Prostheclina` as potentially representing an undescribed genus.
- `cf. Maileus` is not confidently identified as Maileus sensu stricto.
- `Saitis lacustris` possibly belongs to Salinatus based on habitat and external morphology, but the palp needs examination.
- Several Maratus and Saitis species are said to “likely” belong elsewhere without a completed transfer.
- The thesis standardises some adjectival epithet endings to genus gender. These spellings should be stored as source name usages, not substituted into the Lucid layer.

## 8. Species-suggestion considerations

The proposed species layer needs additional fields to avoid turning selective evidence into a false comprehensive key:

- opaque `species_concept_id` plus separate `name_usage_id`;
- `availability_status` and `nomenclatural_source`, especially for thesis-only proposed names;
- `hint_id`, evidence type (`external_morphology`, `male_palp`, `female_epigyne`, `geography`, `habitat`, `behaviour`, `molecular`, `voucher`, `media`), and polarity;
- exact source locator and, where useful, a short verbatim evidence fragment;
- sex, life stage, specimen condition, required view, magnification, dissection/clearing, and left/right orientation;
- comparison set: the congeners or lookalikes against which a diagnosis was asserted;
- conjunction/group ID so a diagnostic combination is not split into independently decisive hints;
- qualifier/quantifier (`always`, `usually`, `may`, `unknown`, `known_only`, `preliminary_unpublished`) and exceptions/variation;
- evidence status (`explicit`, `explicit_qualified`, `mechanically_derived`, `curator_inference`, `unresolved`);
- voucher/type association and repository/registration where stated;
- geography object containing verbatim locality, normalised region, coordinate source, spatial uncertainty, evidence date, and whether it is a presence record or a range generalisation;
- temporal/source coverage, because “known only from” can become outdated;
- media references at panel level;
- `eligible_for_suggestion` plus curator rationale/review, separate from biological confidence;
- conflict links and alternative concepts/name usages.

Species suggestions should explicitly support “insufficient evidence” and “female/juvenile not distinguishable” outcomes. Geographic or behavioural similarity alone should be a supportive hint unless a source explicitly makes it diagnostic. Molecular terminals labelled `cf.`, `aff.`, or informal names must not be promoted to described species concepts.

Chapter II is also relevant to later species hints for its four Maratus treatments, although this audit concentrated on Chapters III–V as requested. If the eventual species layer is intended to use the whole thesis, Chapter II must be included in the extraction scope and totals.

## 9. Proposed schema amendments, if any

Schema amendment is required before extraction.

### 9.1 Add a common assertion/provenance envelope

Every non-mechanical biological or taxonomic statement should support:

- `assertion_id`;
- opaque subject/object concept IDs where applicable;
- predicate and value/object;
- `source_id` and precise `source_locator` (`file`, PDF page, printed page, chapter, section, figure/panel or key couplet);
- `source_text` or lossless raw statement where copyright policy permits internal storage;
- `evidence_status` (`explicit`, `explicit_qualified`, `mechanically_derived`, `curator_inference`, `unresolved`);
- original qualifier/uncertainty wording;
- assertion scope (sex, life stage, preparation, geography, comparison group, taxonomic snapshot);
- curator/model identity, date, rule/method, and review status for inferred assertions;
- `conflicts_with[]` and `supersedes[]` without forcing a winner.

### 9.2 Separate concepts, names, and acts

`04_taxon_concepts.json` should distinguish:

- `taxon_concepts[]` with opaque IDs and source-defined circumscriptions;
- `name_usages[]` with verbatim spelling, authorship, year, rank, source, and normalised display fields kept separate;
- `nomenclatural_acts[]` with act type, source, target usages, and `availability_status` such as `formally_available`, `proposed_unavailable_in_thesis`, or `unknown`;
- `concept_relations[]` and `phylogenetic_assertions[]` as provenance-bearing assertions;
- separate `biological_concept_status` and `nomenclatural_status`, each source-qualified rather than globally overwritten.

Do not use a taxon name, authorship string, or Lucid UUID as the cross-source concept ID.

### 9.3 Preserve Lucid losslessly while adding derived coverage

`01_lucid_schema.json` should retain the full six-code enum even though three codes are unobserved, explicit empty collections, source order, original IDs/UUIDs, and raw enum values. `02_lucid_matrix.json` should include source vector hashes/encoded values or another exact reconstruction witness. If sparse, `implicit_code: 0` must be explicit. Add a separate derived `character_coverage` structure for all-zero taxon-character cases; never rewrite those cells.

`03_lucid_dependencies.json` should retain encoded vector, decoded raw text, controlling state, raw dependency code, interpreted type, dependent feature, and source order. Interpretation provenance should be separate from raw data.

### 9.4 Represent the Schubert key as authored graph data

For the key portion of `05_schubert_genus_characters.json`, add:

- key ID, taxonomic scope, sex applicability, source chapter/version;
- ordered `couplets[]` and `leads[]`;
- exact lead text;
- destination kind (`couplet` or `taxon_concept`) and destination ID;
- source locator;
- optional parsed character expression linked back to the raw lead;
- reachability/cycle validation results.

For diagnosis assertions, add character ontology IDs, verbatim terminology, polarity, value, quantifier, conjunction group, comparison set, sex/stage/preparation/view, diagnostic role (`key_lead`, `diagnostic_combination_member`, `supportive`, `synapomorphy_claim`), exceptions, variation, and figure references.

### 9.5 Strengthen the crosswalk

`06_taxon_crosswalk.json` should support directional relations including `equivalent_to`, `includes`, `included_in`, `overlaps`, `split_into`, `partially_transferred_to`, `synonymised_with`, `name_recombined_as`, `misapplied_name`, `unresolved_candidate`, and `no_supported_mapping`. Each relation needs concept scope, species-level basis where available, source assertions, availability status, and review state.

### 9.6 Expand media and examples metadata

`08_media_manifest.json` should add PDF figure/panel locators, composite/derived status, live versus preserved/illustration/tree/map, specimen/voucher, observation ID, source caption verbatim, licence URI/version, raw rights statement, permission scope, rights evidence, reuse-decision reviewer/date, and separate full/thumbnail/embedded references.

`09_examples.json` should identify each scenario as synthetic, declare the taxonomy/source snapshot, reference observations by source IDs, distinguish expected data behaviour from UI design, and include unresolved/conflicting-source outcomes without prescribing an application interface.

### 9.7 Expand validation requirements

`10_validation_report.md` should validate:

- file hashes and source registry;
- exact Lucid record counts and byte/vector reconstruction;
- uniqueness and referential integrity of all opaque IDs;
- sparse-matrix equivalence including zeroes and code 3;
- dependency raw/decoded equivalence and reachability;
- fact-sheet/media occurrence preservation;
- thesis extraction counts by chapter and section type;
- 11-couplet/12-terminal key reachability and exact lead-text checks;
- every assertion's source locator and evidence status;
- every thesis-only act's unavailable/unknown formal status;
- crosswalk coverage by Lucid entity and by species used as mapping evidence;
- explicit conflict/unresolved counts, including the contradictions in section 7.2;
- rights/reuse coverage and unknowns;
- intentionally excluded source structures and information-loss risks.

## 10. Information-loss risks

The proposed bundle is broadly capable of preserving genus-identification evidence, but it would lose material information unless amended as above.

Highest risks are:

1. **Collapsing source taxonomies into one name list.** This would erase Lucid's legacy concepts, the thesis's proposed concepts, and the ICZN availability distinction.
2. **Using names as IDs.** Recombination, synonymy, homonymy/misapplication, spelling correction, and future taxonomic change would break identity.
3. **Flattening diagnoses into independent binary characters.** Many diagnoses rely on combinations, comparison groups, sex, preparation, and exceptions.
4. **Treating the male key as universal.** It does not identify females, and it is limited to the thesis's Saitis-group concept.
5. **Discarding zeroes in a sparse matrix without a reconstruction rule.** This would destroy exact Lucid score meaning and obscure the separate all-zero coverage issue.
6. **Conflating `absent` with `not scored`.** The source does not encode a separate missing-data symbol; any derived neutrality rule must remain separate.
7. **Dropping raw dependency encodings or order.** Interpretation may need revision, and source parity must remain testable.
8. **Keeping only normalised labels.** Diacritics, authorship, year, historical combination, original spelling, and source errors are necessary for audit and reconciliation.
9. **Representing phylogeny as a single unqualified parent tree.** Chapters use different datasets and sampling, include `cf.`/informal terminals, and report variable support.
10. **Ignoring negative and uncertain taxonomic statements.** Incertae sedis, nomina dubia, untested monophyly, possible placements, missing types, juvenile types, and lost material are central evidence.
11. **Omitting source terminology aliases.** Schubert explicitly changes usage from “conductor” to embolic process/apex and standardises other anatomical terms; careless normalisation could merge non-equivalent structures.
12. **Reducing distribution to a single range string.** Preliminary/unpublished, type-locality, observation, museum, and inferred range claims have different evidential force.
13. **Treating media availability as reuse permission.** Lucid material is all-rights-reserved, thesis permissions may be purpose-limited, and composite panels can have different creators/licences.
14. **Ignoring source artwork/layout.** Dense tree topology, figure-panel association, and dichotomous-key routing are not always preserved correctly by PDF text extraction.
15. **Excluding useful Lucid prose.** The 86 fact sheets contain genus composition, descriptions, biology, distribution, and caveats absent from the matrix. Even if not copied into production, their assertions/references should be inventoried as a distinct source layer.
16. **Omitting difficult/easy provenance.** Existing difficulty/reliability data are heuristic. If retained, their curator status must be visible so they are not mistaken for source biology.

With the proposed assertion, concept/name/act, key-graph, coverage, rights, and conflict additions, no further major category of genus-level identification information is obviously absent from the packet design. Exact phylogenetic tree data and complete species coverage remain outside what the current sources can reliably supply and should be declared exclusions rather than approximated.

## 11. Recommendation: safe to begin extraction? yes/no/conditional

**Conditional.**

It is safe to begin a lossless mechanical extraction of the Lucid schema, matrix, dependencies, source references, and media metadata now: the preserved payload is complete for key-specific logic, its decoder and semantic documentation are archived, and current tests prove reconstruction.

It is also safe to begin extracting Schubert material as **chapter-specific, source-qualified assertions** and to transcribe the male key as a lossless graph. It is not safe to produce a unified “current taxonomy,” preferred-name layer, or whole-genus crosswalk yet.

Before production extraction, the schemas should be amended to:

1. add the common assertion/provenance and conflict model;
2. separate concepts, name usages, and nomenclatural acts;
3. encode thesis-only acts as proposed and unavailable by virtue of the thesis;
4. preserve diagnostic conjunctions, sex/preparation/applicability, qualifiers, and exceptions;
5. add matrix reconstruction and derived-coverage fields;
6. add species-hint comparison, evidence, and eligibility fields;
7. add panel-level media rights evidence;
8. record the thesis contradictions listed in section 7.2 as unresolved;
9. define an external authoritative nomenclatural source and cut-off date before assigning “current” or “preferred” status;
10. obtain the effectively published chapter papers or curator/author clarification before resolving conflicting compositions and draft names.

Until those conditions are met, extraction should proceed only into source-preserving staging records, not the final production JSON bundle.
