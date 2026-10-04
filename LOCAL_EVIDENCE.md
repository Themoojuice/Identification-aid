# Local evidence and media

This public repository contains the complete runnable application source, compiled scientific data, documentation, tests, and build configuration. Since 2026-09-28 it also contains the images the app displays, published with the owner's approval:

- `public/source/lucid-original/media/Images/` — the Lucid key's genus and character images, served on GitHub Pages at the paths the app requests.
- `public/media/private-reference/figure_*.jpg` — the three labelled anatomy references used by the anatomy reference panel.

These remain local only:

- `source/` — archived source payloads, fact sheets, HTML and the Schubert thesis used as historical evidence.
- The other three images in `public/media/private-reference/`, which the app does not use.

Images load online only; the offline core package covers the key data and code. If the images are missing (for example in an older clone), the application falls back to its built-in explanatory diagrams.

The normal application build and app test suite can be run from a clean clone:

```text
npm install
npm run build
npm run test:app
```

The source extraction scripts and source-integrity portion of `npm test` additionally require the preserved local `source/` archive. Publish further parts of that archive only with the owner's approval.

