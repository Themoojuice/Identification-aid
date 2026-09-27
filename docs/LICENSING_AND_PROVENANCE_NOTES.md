# Licensing and provenance notes

This is an evidence inventory, not a legal opinion.

## Explicit notices and citation

Every inspected Fact Sheet Fusion page contains a metadata and footer notice stating `Copyright 2025. All Rights Reserved.` No permissive content licence was found on the key pages inspected.

The live About page asks that the key be cited as:

> Richardson, B.J., Whyte, R. and Żabka, M. (2024). A key to the genera of Australian jumping spiders (Aranaea: Salticidae).

The source itself uses `Zabka` in many filenames/names while displayed prose may use `Żabka`; neither has been silently normalized.

## Image and illustration evidence

The payload contains 557 full-image records. Of their captions, 554 explicitly contain `©`/`&copy;`. Credits frequently name:

- B.J. Richardson;
- R. Whyte;
- M. Zabka / M. Żabka;
- I.R. Macaulay;
- J. Otto;
- G. Anderson / G.J. Anderson;
- A. Lance;
- other named photographers or illustrators in individual legends.

Institutional abbreviations in captions include CSIRO, QMB, AMS, WAMP and MP. These appear to describe specimen, illustration, collection or institutional provenance; they do not by themselves establish who owns copyright. The About page separately thanks museum staff for specimen loans and photographers for making images available to the key.

Each caption and comment remains attached to its source entity/state reference in both the normalized data and manifests. The local archive must not be treated as evidence that downstream republication permission has been granted.

## Taxonomic text and bibliographies

Fact sheets contain authored prose covering taxonomy, descriptions, biology and distribution, plus bibliographic entries and occasional links to third-party sites such as the Australian Faunal Directory. The 2025 all-rights-reserved notice applies on those pages. Permission or a documented legal basis may be required before republishing substantial text verbatim.

Bibliographic facts and outbound citations should remain attributed to their underlying publications. The archive does not recursively download those third-party publications.

## Matrix and structured data

The raw entity/feature/state definitions and score matrix are factual and structured, but their copyright and any applicable database rights are not determined by the site pages. The authorship/citation notice should be retained, and permission should be considered before public redistribution of the complete source payload or a near-verbatim derivative.

The normalized dataset deliberately retains the source hash, IDs, UUIDs, raw encoded values and source offsets so provenance can be demonstrated. Normalization is not a claim that rights have changed.

## Software assets

The Lucid player and third-party libraries are software, separate from key content. Only the components needed for format/behaviour forensics were archived. Generic UI libraries found in fact sheets are inventoried but generally not mirrored. Their own embedded licence notices, where present, should govern any reuse; they should not be bundled into a future application merely because they were used by the source site.

## Items to clear before public rehosting

1. The complete Lucid key payload and derived full matrix.
2. Fact-sheet prose and PDF editions.
3. Each photograph, drawing and composite plate, using its caption credit as the first provenance lead.
4. Museum- or institution-associated images and diagrams, with the institution and named creator both checked.
5. The Fact Sheet Fusion styling/template if copied rather than replaced.
6. Lucid player code if distributed rather than retained as a private forensic reference.

Until those questions are resolved, the archive should be treated as a provenance-preserving research copy. A future public application can link back to original pages or use newly licensed/recreated media while still using the normalized records internally as permitted.

## Archive-specific broken or external references

The linked glossary and a landing-page CSS overlay image return HTTP 404. Four malformed Australian Faunal Directory links omit the colon after `http`, and one Servaea DOI link is incomplete (`https://doi/`). These strings remain unchanged in the manifests. A World Spider Catalog search link could not be verified by the local HTTP client because the remote certificate name did not validate; no certificate bypass was attempted.
