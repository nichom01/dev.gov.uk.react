# Upstream watcher

`scripts/upstream/check.mjs` turns govuk-frontend releases into GitHub issues
for the pipeline. It runs on weekdays from `.github/workflows/upstream-watch.yml`,
and you can run it by hand.

## What it compares

For each component in `upstream/components/*/lock.json`, it hashes three groups
of files in the target govuk-frontend npm package:

| Category | Files | Means |
|---|---|---|
| markup | `template.njk`, `macro.njk`, `macro-options.json`, `fixtures.json` (name, options and html only) | the React component must change |
| behaviour | `<name>.mjs` | upstream JS changed; the wrapper may need new config |
| style | `*.scss` | the dependency bump is enough |

## State

There is no database. State is the lock files plus the issues themselves:

- The lock file says which upstream version a component's port matches. It
  moves forward only when a PR that syncs it is merged.
- Each issue body starts with `<!-- upstream-watch {"kind":…,"component":…,"version":…} -->`.
  The watcher lists every issue labelled `upstream` (open and closed) and never
  files the same kind, component and version twice.
- Closing an *Add component* issue as "not planned" stops it being filed again. To
  ignore a component for good, add it to `newComponents.ignore`.

## Ordering

- Component issues are blocked by the release's bump issue (GitHub issue
  dependencies), and the pipeline's implement stage waits for blockers
  (`wait_for_blockers: true`).
- New components are filed in dependency order, worked out from template imports.
  A component is only filed once everything it uses is implemented or has an open
  issue, and it is blocked by those issues.
- Component PRs don't depend on each other: conformance uses each component's own
  vendored fixtures, not the installed govuk-frontend.

## Config: `upstream/watch.config.json`

| Key | Default | |
|---|---|---|
| `labels.base` | `upstream` | label on every watcher issue |
| `labels.start` | `bob:start` | label that starts the pipeline |
| `autoStart` | `true` | add `labels.start`; set `false` to triage issues by hand first |
| `milestonePerRelease` | `true` | group a release's issues in a `govuk-frontend vX` milestone |
| `componentIssuesBlockedByBump` | `true` | record component → bump "blocked by" links |
| `supersede` | `close` | `close` or `comment` on older open issues for the same component |
| `newComponents.enabled` | `true` | file *Add component* issues |
| `newComponents.maxOpen` | `2` | how many can be open at once |
| `newComponents.ignore` | `[]` | upstream names never to add |
| `assignees` | `[]` | GitHub logins to assign |

## Running it by hand

```sh
npm run upstream:status                          # read-only summary
npm run upstream:check -- --dry-run              # write would-be issues to .cache/upstream/dry-run/
npm run upstream:check -- --version 6.7.0        # file issues for a specific release (needs gh auth)
```

To rehearse a release, sync a component to an older version on a branch
(`npm run upstream:sync -- tag --version 5.10.0`) and dry-run against the latest.
