# Lucid completeness audit

## Answer

**The payload contains the complete key-specific logical dataset.** After applying the documented Lucid decoding and matching semantics, it is sufficient to reconstruct the characters, states, taxa, hierarchy, compatibility matrix, default filtering options, Best eligibility, weights, match modes, and all sex/dissection dependencies.

It is not a self-contained publication package: fact-sheet text, images, thumbnails, glossary material and captions rendered within fact sheets live in external files. It is also not a standalone executable specification: the `.json` file is a JavaScript assignment, its score/dependency values require LZString, and generic Lucid algorithms live in the player JavaScript. The required decoder/player bundle and relevant official documentation have therefore been archived.

In short:

- **Key-specific logical reconstruction: YES.**
- **All descriptive text and visual content embedded in the JSON: NO; those are linked assets.**
- **Pixel/UI-identical Lucid player reproducible from the JSON alone: NO, and that is not required for a new engine.**

## Behavioural reconstruction checklist

| Behaviour/input | Present? | Evidence |
|---|---|---|
| Available characters | Yes | 99 `type: 1` features under 15 groups. |
| Character states | Yes | 296 state records and ordered feature `states` arrays. |
| Entity/taxon list | Yes | Salticidae root plus 85 genus leaves. |
| Taxon-state compatibility | Yes | 296 vectors × 86 positional cells, fully decoded and tested. |
| Taxon hierarchy | Yes | Entity `parent` and `children`. |
| Feature hierarchy | Yes | Feature `parent` and `children`. |
| Filtering defaults | Yes | `retainUncerts`, `allowMisints`, `matchType`; score codes are decoded. |
| Ranking inputs | Yes | Raw score types and weights. No Rare scores occur. |
| Best-character inputs | Yes | `inc_best`, weights, state matrix and dependencies. |
| Dependencies | Yes | Five compressed controlling-state records, 23 decoded edges. |
| Scopes | Explicitly none | Empty `scopes` object. |
| Numeric scoring | Explicitly none | No numeric features and empty `measures`. |
| Subsets | Explicitly none | Empty `subsets`. |
| Sex applicability | Yes | Encoded through states 1–5 and dependency edges. |
| Life-stage applicability | No explicit structure | No life-stage field or dependency was found. |

## Resource classification

| Resource | Classification | Needed for logical parity? | Local archive |
|---|---|---:|---|
| `salticidae.json` | CORE LOGIC | Yes | `source/lucid-original/salticidae.json` |
| LZString decoder | CORE LOGIC | Yes, to read compressed values | `source/lucid-original/metadata/lz-string.min.js` |
| Lucid Player 2.2.9 compiled bundles | CORE LOGIC reference / PLAYER-ONLY runtime | Only for exact algorithm forensics, not for new data model | `source/lucid-original/metadata/*.cache.js` |
| `key.html` configuration | CORE LOGIC configuration | Useful: thumbnail/gallery settings | `source/lucid-original/html/key.html` |
| Entity fact sheets | TAXONOMIC TEXT | No for filtering; yes for faithful content | Mirrored under `source/lucid-original/Media/Html/entities/` |
| Fact-sheet PDF editions | TAXONOMIC TEXT | No | Inventoried/mirrored where accessible |
| `about.html` | HELP / DOCUMENTATION | No | `source/lucid-original/html/about.html` |
| Fact-sheet index and glossary | HELP / DOCUMENTATION | No | Inventoried/mirrored where accessible |
| State diagnostic images | MEDIA | No for matrix filtering; important for usable identification | Mirrored under `source/lucid-original/Media/Images/features/` |
| Entity plates/photos/drawings | MEDIA | No for matrix filtering; important for diagnosis | Mirrored under `source/lucid-original/Media/Images/entities/` |
| Player thumbnails and fact-sheet thumbnails | MEDIA | No | Mirrored where accessible |
| Generic jQuery/Materialize/gallery runtime | PLAYER-ONLY / NOT NEEDED | No | Inventoried; generally not mirrored |
| Lucid official scoring/dependency help | HELP / DOCUMENTATION | No at runtime; used to confirm semantics | `source/lucid-original/help/` |
| External bibliography/AFD links in sheets | TAXONOMIC TEXT reference | No | Inventoried, not recursively rehosted |
| Cloudflare challenge/email scripts | PLAYER-ONLY / NOT NEEDED | No | Not mirrored |

## External player dependencies inspected

The live `key.html` loads the payload, Base64 support, jQuery, Fancybox, LZString, Snackbar and `player.nocache.js`. The GWT bootstrap selects one of three browser-specific `.cache.js` bundles. All three bundles were archived because the score decoder and generic matching/dependency implementation reside there.

The player bundle reports build `2.2.9 20240920`. It directly calls `LZString.decompressFromBase64` for compressed score, measure and dependency data. The relevant data formats are documented in `SCHEMA_REPORT.md` and `SCORING_SEMANTICS.md`.

## Content completeness observations

- All 86 entities link an HTML fact sheet; the feature-group anomaly adds a 87th occurrence but not a new sheet.
- The landing-page fact-sheet index is not referenced by the JSON and was separately discovered.
- Fact sheets contain useful text absent from the JSON: taxonomy/species notes, descriptions, biology, distribution and bibliographies.
- Fact sheets also link PDF editions and a second thumbnail tree (`Images/entities/.../thumbs/..._sml.jpg`) not represented by JSON `thumb_path` values.
- The JSON itself carries rich captions/comments for its directly linked images, so these are not dependent on HTML.
- The site About page’s character/state counts are two records behind the current payload and should not override the structured data.
- The fact-sheet index and JSON agree on all 86 taxa, but use different Australoneon filenames (`..._2025.htm` versus `..._2024.htm`). Both pages were archived; the canonical entity retains the JSON reference.
- Every one of the 1,116 unique JSON-referenced URLs downloaded successfully. There are no broken or orphaned JSON references. Broken links found only during HTML/CSS crawling are retained in the unified manifest.
