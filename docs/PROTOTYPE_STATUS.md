# Prototype status — v0.1

## Working

- Fieldmate-first guided identification in a coherent three-area desktop workspace.
- Compact specimen context and reversible observation history in the left rail.
- Larger archived genus imagery and explicit evidence/source-gap labels in the candidate column.
- Synchronized full character browser available as a secondary workflow.
- Image-led two-to-five-genus end-stage comparison in the main workspace.
- Early male, female or unknown specimen context.
- Lucid dependency handling, including cleared female epigyne anatomy.
- Field mode for accessible characters and microscope mode for all applicable characters.
- Character/state search, visual state choices and multiple states per character.
- Certain, fairly sure and unsure observation confidence.
- Immediate forgiving ranking across all 85 genera.
- Support, conflict and useful-unchecked evidence for every candidate.
- Best-next-character suggestions using separation, coverage and curated effort.
- Automatic differential comparison for two to five plausible genera.
- All 86 normalized fact sheets and all source-linked genus image plates.
- Observation removal, revision, restart and local session restore.
- Responsive mobile navigation and dark theme.
- Static local/offline-capable build.

## Known limitations

- Compatibility weights and the plausible-candidate threshold are heuristic and await expert usability tuning.
- Difficulty/method metadata is intentionally coarse at group level, with only a few character overrides.
- The current next-character calculation uses top candidate signatures and does not reproduce Lucid's proprietary Best tie-breaking.
- Fact-sheet external links are shown as archived plain text rather than active live links.
- The service worker caches all core data immediately, but image plates are cached after first viewing; a completely fresh install must be opened once before going offline.
- Forty-nine of the 290 scored character states have no illustration in the original Lucid payload. The interface labels these “No image” so they are distinguishable from loading errors.
- The interface preserves the source taxonomy and therefore also preserves the dated or provisional taxonomic limitations documented by the original authors.

## Highest-value next improvement

Run a short expert observation session using real specimens or photographs, then tune the difficulty overlay and compatibility labels based on where users hesitate or receive unhelpful next-character suggestions. This is more valuable than adding a more complex inference model at this stage.
