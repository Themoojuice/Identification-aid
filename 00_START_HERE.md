# Australian Salticidae Identification App — Architecture Dataset

## Goal

This dataset supports later design of a mobile-first, offline-capable identification tool for Australian Salticidae. Identification is genus-first. A species may be suggested only after a genus-level result and only when the available evidence supports a useful, explicitly conditional hypothesis.

This packet describes source data and behavioural constraints. It does not prescribe a final software architecture.

## Source layers

### Lucid

The Lucid layer supplies the broad Australian genus-level morphological key: its original feature hierarchy, labels, states, 86 entities, complete score matrix, dependencies, fact-sheet associations and image associations. Its taxonomy is a legacy source layer and remains unchanged. Lucid names and evidence must not be silently replaced with later names or circumscriptions.

Files `01_lucid_schema.json`, `02_lucid_matrix.json` and `03_lucid_dependencies.json` are a mutually linked representation of this source. Lucid media associations are indexed in `08_media_manifest.json`.

### Schubert 2025

Joseph Schubert's thesis, *Integrative systematics of the Australian peacock spiders and their allies*, supplies a newer, phylogenetically informed treatment of the Saitis group. The packet represents taxon concepts, the Jotus-group/Maratus-group framework, genus diagnoses, the published male genus key, species placements, taxonomic proposals, selected species-level hints and figure metadata.

Files `04_taxon_concepts.json` and `05_schubert_genus_characters.json` keep biological concepts separate from names and from Lucid evidence. `06_taxon_crosswalk.json` reconciles affected Lucid entities with later concepts without assuming that identical spelling means identical circumscription. `07_species_hints.json` is selective, not a comprehensive species key.

## Critical conceptual rules

1. Taxon names are not permanent identifiers.
2. Taxon concepts are separable from nomenclature.
3. Lucid identification evidence must remain separable from later taxonomy.
4. Source provenance must be preserved.
5. Conflicting source assertions may coexist.
6. Unknown/not-sure user answers must be supported and must not be converted into false absences.
7. Sex and life stage affect character applicability.
8. Genus identification is primary.
9. Species suggestion is secondary.
10. Species suggestions must not imply certainty unsupported by evidence.
11. Taxonomic updates should not require rewriting original Lucid evidence.
12. Morphological similarity used for identification is not necessarily equivalent to phylogenetic relationship.

## Verified Lucid dataset totals

- Entities: **86**, including one explicit `Salticidae` root entity.
- Non-root genera: **85**.
- Feature groups: **15**.
- Scored features: **99**.
- Character states: **296**.
- Matrix dimensions: **86 taxa × 296 states**.
- Matrix score cells: **25,456**.
- Score totals: **15,900 absent**, **9,538 common**, **0 rare**, **18 uncertain**, **0 common-misinterpreted**, **0 rare-misinterpreted**.
- Dependency edges: **23**, expanded from five encoded Lucid dependency vectors.
- Lucid media associations: **557**, referring to **515 unique full-size image paths**. Thumbnail derivatives are not indexed separately.

The Lucid About page states 98 characters and 294 states, but the extracted payload contains 99 scored features and 296 states. The payload totals govern this dataset; the prose discrepancy remains a documented source conflict.

## Lucid score semantics

The sparse matrix uses `absent` as its verified default. Every omitted state–taxon cell reconstructs to original code `0`.

- `0 — absent`: the state does not occur for the entity. Selecting it normally discards that entity.
- `1 — common`: the state normally or always occurs for the entity; it remains a normal match.
- `2 — rare`: the state occurs rarely; it remains possible but ranks below a common match. This code is defined by Lucid but is not observed in this key.
- `3 — uncertain`: the key author does not know whether the state occurs. With the source's retain-uncertains behaviour, the entity remains possible. This is source uncertainty, not the same thing as a user answering “not sure.”
- `4 — common_misinterpreted`: the state is absent but may commonly appear present through user misinterpretation. Defined but not observed here.
- `5 — rare_misinterpreted`: the state is absent but may rarely appear present through user misinterpretation. Defined but not observed here.

The generic Lucid documentation also describes “Not Scoped,” but the extracted key has an empty scopes object and no such matrix records. Applicability logic present in this key is retained separately in `03_lucid_dependencies.json`.

## Schubert nomenclatural caveat

The thesis explicitly states that new taxon names and nomenclatural changes proposed in the thesis are not considered published under the International Code of Zoological Nomenclature merely by appearing there. The packet therefore separates biological `concept_status` from `nomenclatural_status`. Thesis proposals must not be presented as formally available acts without evidence of a separate qualifying publication.

## Intended identification behaviour

The future engine should accept incomplete observations, retain compatible alternatives and select useful characters dynamically rather than force a fixed sequence. Schubert characters should become available automatically when the candidate set enters the Saitis-group region; users should not have to switch manually between source keys.

Question choice should eventually balance discriminating value with observation difficulty. A nearly as informative dorsal or field-visible character should normally be offered before a character requiring palp examination, microscopy, dissection or clearing. Applicability must follow sex, life stage and dependency constraints.

A Lucid result is a legacy-source result until the crosswalk is applied. Crosswalk relations may be equivalent, overlapping, split or unresolved. The primary output remains the best-supported genus concept or ranked set of concepts. Species hints are conditional follow-up evidence, with limitations and required confirmation made explicit.

Use `09_examples.json` as behavioural guidance and `10_validation_report.md` for exact integrity results, unresolved issues and exclusions.
