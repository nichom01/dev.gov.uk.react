# Notes for coding agents

- Conventions: docs/component-conventions.md (required reading).
- Definition of done for any component: `npm run check && npm run build`; the conformance test renders every upstream fixture.
- Never hand-edit `upstream/components/**`; use `npm run upstream:sync -- <name> --version <v>`.
- Never edit `test/normalise-html.ts` or `test/fixture-props.ts` to make a fixture pass.
- Pipeline stage rules live in `.bob/rules-*/`.
