# This repository: GOV.UK React component library

Issues from the upstream watcher already have "blocked by" links on GitHub:
component updates wait for the govuk-frontend bump issue of the same
release, and new components wait for components they use. Treat those as
known. Look for anything else: two issues editing the same component,
the same `src/internal/` helper, or `src/types/govuk-frontend.d.ts`.
CHANGELOG.md overlaps on every issue and is not a conflict.
