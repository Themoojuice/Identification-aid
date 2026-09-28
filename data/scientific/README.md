# Stage 1 scientific data

This directory contains versioned interpretation and compiler-control inputs. It does not replace or edit the eleven packet files in the project root.

- `source-manifest.json` locks every packet byte and the two Lucid payload copies by size and SHA-256. Compilation fails on drift.
- `review-register.json` contains open `VR01`–`VR22` and `AU01`–`AU14` issues, their source wording/locator and interim policy.
- `provenance-corrections.json` contains reviewed locator overlays. It validates its stable packet targets and retains both the original packet locator and reviewed source locator.
- `../compiled/scientific-package.json` is deterministic output. It embeds the parsed JSON packets unchanged, adds normalized views, a dense byte matrix, persistent aliases, provenance and validation results.
- `../compiled/id-aliases.json` exposes persistent-ID-to-source-alias mappings independently.
- `../compiled/losslessness-inventory.json` lists every JSON field path and its retention route.

Source facts and curator interpretations remain distinct. A normalized record is an additional view, not a correction to a packet. Names are represented as exact usages and labels; they are never used as biological identity or join keys.

Run `npm run scientific:data` to compile, or `npm run build` to compile both legacy and Stage 1 runtime data.
