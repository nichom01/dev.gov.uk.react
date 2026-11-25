# This repository: GOV.UK React component library

Test layers here:

- **Conformance (component layer):** `test/conformance.test.tsx` already
  renders every upstream fixture and compares normalised HTML. You do not
  write new conformance tests; plan that each AC about markup is proven by
  "all fixtures for <name> pass", and list any fixture that needs a `skip`
  entry in `test/registry.ts`, with its reason.
- **Behaviour (unit/component):** Vitest + Testing Library in
  `src/components/<name>/<Name>.test.tsx` for things fixtures cannot show:
  upstream JS is initialised (`data-<module>-init`), `children`/`html`
  precedence, native props and refs pass through, events.
- **Smoke:** `npm run build` succeeds and the component is exported from
  `src/index.ts`.

Prefer fixtures over hand-written markup assertions: upstream maintains them.
