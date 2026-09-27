# Local evidence and media

This public repository contains the complete runnable application source, compiled scientific data, documentation, tests, and build configuration. Two local collections are intentionally not published:

- `source/` — archived source payloads, fact sheets, media, and the Schubert thesis used as historical evidence.
- `public/media/private-reference/` — six user-supplied anatomical and taxonomic reference images used only by the private local prototype.

These collections remain in the working project but have unresolved or restricted redistribution rights. Their omission does not remove the compiled scientific package used by the application. The application falls back to its built-in explanatory diagrams when private reference images are unavailable.

The normal application build and app test suite can be run from a clean clone:

```text
npm install
npm run build
npm run test:app
```

The source extraction scripts and source-integrity portion of `npm test` additionally require the preserved local `source/` archive. Do not reconstruct, replace, or publish that archive without a reviewed asset-inclusion and licensing decision.

