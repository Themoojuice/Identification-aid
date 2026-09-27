# Stage 1 losslessness inventory

## Retention rule

The eleven packet files remain the immutable evidence layer. `data/scientific/source-manifest.json` records their exact byte lengths and SHA-256 hashes, and the compiler refuses changed input. `salticidae.json` and its archived copy are locked separately and must remain byte-identical.

Every JSON packet is also embedded, field-for-field, under `rawSnapshots` in the compiled package. The compiler inventories every encountered JSON field path in `data/compiled/losslessness-inventory.json`. A newly encountered field is therefore retained automatically in the raw snapshot and made visible in the inventory; it is not silently discarded merely because no normalized Stage 1 view uses it yet. Invalid or unresolved references fail compilation.

## Normalized views

| Input | Additional normalized retention |
|---|---|
| `01_lucid_schema.json` | Persistent source entities, character definitions/states, original numeric IDs and UUID aliases, explicit root/leaf roles. |
| `02_lucid_matrix.json` | All 25,456 cells in state-major/taxon-order `Uint8` form, the complete 0–5 legend, dimensions, score totals and checksum. The sparse packet remains embedded. |
| `03_lucid_dependencies.json` | Complete raw and decoded dependency records remain embedded with record provenance. Effects are not reclassified as author text. |
| `04_taxon_concepts.json` | Separate concept, exact name-usage, name-label, placement, nomenclatural-act and phylogenetic-assertion records. Original concept records remain embedded. |
| `05_schubert_genus_characters.json` | Character definitions, states and assertions plus the complete original male key graph. Missing assertions remain missing, never zero. |
| `06_taxon_crosswalk.json` | Typed concept relations with component evidence. `not_equivalent` targets are retained in raw/component evidence but excluded from positive target routes. |
| `07_species_hints.json` | Full raw selective hint records and provenance only at Stage 1; no species classifier or genus-score path is created. |
| `08_media_manifest.json` | All assets, captions, instructions, associations and rights fields remain in raw snapshots. No media is approved or redistributed by compilation. |
| `09_examples.json` | Full synthetic guidance records, explicitly marked as synthetic evidence class. |
| Markdown packet files | Exact bytes remain at their original paths and are locked in the manifest. Review issues are additionally represented in the machine-readable register. |

## Identity and provenance

Lucid persistent IDs use the source UUID, with packet IDs and original numeric IDs retained as aliases. Other packet IDs receive namespaced persistent IDs. Records without a packet ID receive a canonical-content ID, so reordering arrays does not alter identity. Every object contained in a packet array receives a source file, JSON pointer, packet checksum and raw-record checksum.

The compiler deliberately does not infer biological identity from a name string. Each Schubert preferred name, type-species statement, included-taxon usage and previous-name usage has an independently identified usage record. Future reviewed name resolution can link those usages without rewriting the source record.

## Known limitations carried forward

- This is a compiler and scientific-contract foundation, not the Stage 2 identification engine.
- The existing interface still uses the legacy runtime bundle and legacy scoring behaviour.
- Curator decomposition already present in the supplied packet is preserved but is not upgraded to expert validation.
- AU01 profiles are inventoried and linked to their protective interpretation; the Stage 2 engine must implement the actual inference behaviour.
- AU03–AU12 remain quarantined/open. No taxonomy, key-route, caption, subject or rights correction has been applied.
- Media binaries and the thesis PDF were not re-extracted or redistributed.
