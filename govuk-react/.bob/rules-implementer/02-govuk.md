# This repository: GOV.UK React component library

- Read `docs/component-conventions.md` first and follow it exactly.
- Step one for any upstream issue is the sync command in the issue, e.g.
  `npm run upstream:sync -- button --version 6.7.0`. Never hand-edit files
  in `upstream/components/`; re-run the sync instead.
- Run `npx vitest run test/conformance.test.tsx -t "<name>"` to iterate.
  The failure output is a normalised diff: `-` is what upstream renders,
  `+` is what React rendered.
- Do not change `test/normalise-html.ts` or `test/fixture-props.ts` to make
  a fixture pass. If a fixture genuinely cannot be matched, add a `skip`
  entry with the reason in `test/registry.ts` and record it in deviations.md.
- No `dangerouslySetInnerHTML`. `html` options are `ReactNode`.
- Add the CHANGELOG.md entry. Do not change the package version.
- Finish with `npm run check && npm run build` passing.
