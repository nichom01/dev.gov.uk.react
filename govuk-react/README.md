# GOV.UK React components

React components for the [GOV.UK Design System](https://design-system.service.gov.uk),
ported from [govuk-frontend](https://github.com/alphagov/govuk-frontend) and kept
in step with it automatically.

```
govuk-frontend release
  └─▶ upstream watcher (GitHub Action, daily)
        diffs every component in the npm package against upstream/components/*/lock.json
        └─▶ GitHub issues, labelled bob:start, with diffs + acceptance criteria
              └─▶ bob-pipeline: plan → deps → low-level plan → test plan → implement → what changed
                    └─▶ draft PR, green only when the React component renders
                        exactly the HTML upstream publishes for every fixture
```

## Using the library

```sh
npm install @your-org/govuk-react govuk-frontend react react-dom
```

```tsx
import "govuk-frontend/dist/govuk/govuk-frontend.min.css";
import { Button, WarningText } from "@your-org/govuk-react";

<WarningText text="You can be fined up to £5,000 if you do not register." />
<Button isStartButton href="/start">Start now</Button>
```

Props are the [Nunjucks macro options](https://design-system.service.gov.uk/components/button/)
with the same names, so the Design System's guidance applies as written. `html`
options take JSX, and `children` is an alias for `html`. Add the class
`govuk-frontend-supported` to `<body>` (as the GOV.UK page template does) so
that component JavaScript runs.

## How it stays up to date

**Conformance is the definition of done.** The govuk-frontend npm package ships a
`fixtures.json` for every component: each example's macro params and the exact HTML
upstream renders for them. `npm run upstream:sync` vendors that file, with the
template and macro options, into `upstream/components/<name>/`.
`test/conformance.test.tsx` renders every fixture through the React component and
compares normalised HTML. When upstream changes a component, syncing the new
fixtures turns the tests red until the port is updated. The pipeline works to that
signal, and CI (`scripts/upstream/verify.mjs`) checks that nobody edited the
vendored files to get there.

**The watcher** (`scripts/upstream/check.mjs`, run by
`.github/workflows/upstream-watch.yml`) compares each component's lock hashes with
the latest release. It classifies changes as *markup* (template, options or
fixtures), *behaviour* (upstream JS) or *style* (Sass). It then files:

| Issue | When | Notes |
|---|---|---|
| `Update govuk-frontend to vX` | any new release | bumps the dependency; refreshes locks for style-only components |
| `Update <Component> to vX` | markup or JS changed | template diff, option changes, fixture changes, release-note excerpts; blocked by the bump issue |
| `Add <Component> component` | not implemented yet | at most `newComponents.maxOpen` at a time, dependencies first (e.g. Fieldset before Checkboxes) |
| `<Component> was removed` | gone upstream | deprecate or remove |

Every issue carries a hidden marker, so re-runs never duplicate anything. If a later
release changes a component again before its issue is done, the old issue is closed
as superseded. Issues for one release share a milestone. Settings are in
`upstream/watch.config.json`, and details are in [docs/upstream-watcher.md](docs/upstream-watcher.md).

**The pipeline** is [bob-pipeline](tools/bob-pipeline/README.md), with GOV.UK
rules for each stage in `.bob/rules-*/02-govuk.md`. The planning stages run
automatically, because upstream issues arrive with their acceptance criteria
already written. You review the draft PR and the "what changed" document. To review
each plan as well, set `gate: human` on those stages in `tools/bob-pipeline/pipeline.yaml`.

## Setup

1. Push this repo to GitHub. Under *Settings → Actions → General*, allow workflows
   to create issues (or add an `UPSTREAM_WATCH_TOKEN` secret with Issues: read/write).
2. Create the pipeline labels and start it on a machine with Bob Shell (see
   `tools/bob-pipeline/README.md`):
   ```sh
   cd tools/bob-pipeline && npm install
   npm run setup-labels
   npm start -- --auto-poll
   ```
3. Run *Upstream watch* from the Actions tab once with **dry run** ticked, and
   download the `upstream-dry-run` artifact to see what it would file. Then let the
   schedule run. On a fresh repo it starts filing *Add component* issues, so the
   pipeline builds out the rest of the library a couple at a time.

## Commands

| Command | |
|---|---|
| `npm run check` | typecheck + all tests |
| `npm run build` | library build to `dist/` |
| `npm run upstream:status` | which components are behind, and how |
| `npm run upstream:sync -- <name…> --version X` | vendor upstream files and update lock.json |
| `npm run upstream:check -- --dry-run` | what the watcher would file (bodies in `.cache/upstream/dry-run/`) |

## Contributing

Read [docs/component-conventions.md](docs/component-conventions.md). The pipeline
follows the same rules, so a hand-written component and a pipeline-written one look
the same.
