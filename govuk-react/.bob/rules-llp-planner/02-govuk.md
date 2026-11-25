# This repository: GOV.UK React component library

Follow `docs/component-conventions.md`. For each changed component, the plan
names these files (create or change):

- `upstream/components/<name>/*`: produced by `npm run upstream:sync -- <name> --version <v>`, never edited by hand
- `src/components/<name>/<Name>.tsx`: props interface (1:1 with macro-options.json, JSDoc from the descriptions) and JSX (mirrors template.njk)
- `src/components/<name>/index.ts` and `src/index.ts`: exports (new components only)
- `test/registry.ts`: registry entry (new components only)
- `src/components/<name>/<Name>.test.tsx`: behaviour tests (JS components, or React-only behaviour)
- `src/types/govuk-frontend.d.ts`: declaration for any upstream JS class used
- `CHANGELOG.md`: entry under Unreleased

For every macro option, say which prop it becomes and how the template's
logic for it maps to JSX. Point out template whitespace that is significant
(text next to inline elements), because the conformance test checks it.
