# This repository: GOV.UK React component library

React components built from GOV.UK Frontend (govuk-frontend). Read
`docs/component-conventions.md` before planning.

Most issues are opened by the upstream watcher and carry a hidden
`<!-- upstream-watch {...} -->` marker. For those:

- The issue already lists the acceptance criteria (AC-1, AC-2, ...). Adopt
  them as they are, with the same ids and wording. Add criteria only for
  risks the issue misses; never drop or weaken one.
- The definition of done is the conformance test: every fixture in
  `upstream/components/<name>/fixtures.json` must render identically from
  the React component. Plan around making those fixtures pass.
- Read the template and option diffs in the issue, and the vendored files in
  `upstream/components/<name>/`, to decide which props and JSX change.
- Removed or retyped macro options are breaking changes for consumers. Call
  that out under Risks and say how CHANGELOG.md will describe it.
- "Dependencies on other issues": list the issues the body names (the
  govuk-frontend bump issue, or components this one uses).
