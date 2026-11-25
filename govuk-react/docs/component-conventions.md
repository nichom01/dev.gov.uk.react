# Component conventions

Every component in this library is a React port of one GOV.UK Frontend
Nunjucks macro. These rules keep the port mechanical. That matters because
most changes are made by the pipeline, and a reviewer should be able to
check a PR against upstream line by line.

## The contract

1. **Same HTML as upstream.** For every fixture in
   `upstream/components/<name>/fixtures.json`, rendering the React component
   with the fixture's `options` as props produces the fixture's `html`. The
   comparison ignores indentation and attribute order but not text, tags,
   attribute values or significant whitespace (see `test/normalise-html.ts`).
   `test/conformance.test.tsx` checks this for every registered component.
2. **Same API as upstream.** Props mirror `macro-options.json` 1:1: same
   names (including `for`, `classes` and `attributes`), same nesting, and types
   from the option types. Copy each option's description into JSDoc.
3. **Same CSS and JavaScript as upstream.** Styling comes from
   govuk-frontend's own CSS, which consumers import. Behaviour comes from
   govuk-frontend's own JS classes, which components initialise. Nothing is
   re-implemented.

## Files

```
src/components/<name>/          <name> = upstream folder name, e.g. error-summary
  <Name>.tsx                     component + props interface (<Name>Options, <Name>Props)
  <Name>.test.tsx                behaviour tests (only what fixtures can't show)
  index.ts                       export * from "./<Name>"
upstream/components/<name>/     vendored by `npm run upstream:sync`; never edit by hand
  template.njk                   the template to port
  macro-options.json             the API to mirror
  fixtures.json                  the conformance cases
  <name>.mjs                     upstream JS (reference only), if any
  lock.json                      version + hashes the watcher compares
test/registry.ts                 upstream name → React component (+ justified skips)
src/index.ts                     public exports, alphabetical by upstream name
```

## Props

```tsx
export interface TagOptions extends GovukContent {   // text / html / children
  /** Classes to add to the tag. */                   // JSDoc = upstream description
  classes?: string;
  /** HTML attributes (for example data attributes) to add to the tag. */
  attributes?: GovukAttributes;
}
export type TagProps = TagOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof TagOptions | "className" | "dangerouslySetInnerHTML">;
```

- **`text` / `html` / `children`.** `html` and any `*Html` option (`summaryHtml`,
  `titleHtml`, …) are `ReactNode`, not strings. `children` is an alias for
  the main `html`. Precedence is `children > html > text`, using `content()`.
  The conformance harness parses fixture HTML strings into React nodes
  (`test/fixture-props.ts`).
- **`caller`** (Nunjucks call blocks) becomes `children`.
- **`attributes`** always goes through `govukAttributes()`, which copies the
  upstream macro's behaviour (`optional`, boolean attributes, React names).
- **`classes`** is joined with `cx("govuk-x", classes, …modifiers)` in the
  same order the template builds `classNames`.
- **Nested component options** (`hint`, `label`, `errorMessage`, `fieldset`,
  `items[].hint`, …) are typed with the nested component's `Options`
  interface, and rendered with that component (`<Hint {...hint} />`). That is
  what the template does with `govukHint(params.hint)`.
- **Native props.** Spread any remaining props (`onClick`, `aria-*`, …) on
  the root element, then apply component classes and `govukAttributes`.
  Forward refs to the root element.
- **No `dangerouslySetInnerHTML`.** It is excluded from every props type.

## Porting a template

Port `template.njk` line by line into JSX.

| Nunjucks | JSX |
|---|---|
| `{% if params.x %} attr="{{ params.x }}"{% endif %}` | `{...(x ? { attr: x } : {})}` |
| `params.x \| default("y")` | `x ?? "y"`. With `default("y", true)` use `x \|\| "y"`, because falsy values also get the default |
| `{% for item in params.items %}` | `items.map((item, index) => …)`. `loop.index` is `index + 1` |
| `{% set id = params.id if params.id else params.name %}` | `const id = idProp ?? name` |
| `govukAttributes(params.attributes)` | `{...govukAttributes(attributes)}` |
| a text node next to an inline element (`</span> {{ text }}`) | keep the space: `</span> {body}` |
| a macro that renders nothing without content | `return null` |

Whitespace between elements is ignored, but whitespace between an element
and text is not (screen readers announce it). The conformance diff shows a
missing space as `"Start now "` against `"Start now"`.

## Components with JavaScript

When upstream has `<name>.mjs`:

```tsx
import { Accordion as GovukAccordion } from "govuk-frontend";
const ref = useRef<HTMLDivElement>(null);
useGovukModule(ref, GovukAccordion, config);
```

- Declare the class in `src/types/govuk-frontend.d.ts` if it is missing.
- Config options in `macro-options.json` that upstream passes as
  `data-*` attributes stay as rendered attributes, as in the template.
- Upstream JS only runs when `<body>` has the class `govuk-frontend-supported`
  (test/setup.ts adds it). Without it, components still render as static HTML.
- Some upstream modules restructure the DOM after load (Accordion, Tabs,
  Character count, Password input, Header). React must not later re-render
  the nodes they changed. Render those parts once, from props, and give the
  root element a `key` derived from the content-defining props, so a change
  of content remounts the component rather than patching modified DOM.
  Behaviour tests should cover a re-render with changed props.

## Skipping a fixture

Only when matching it is impossible in React, for example a fixture that
relies on Nunjucks-only behaviour. Add it to `skip` in `test/registry.ts`
with a specific reason, and call it out in the PR. Never change the
normaliser or the fixture harness to make a fixture pass.

## Changelog

Every PR adds a line under `## Unreleased` in `CHANGELOG.md`, under
`### Breaking changes`, `### New components` or `### Changes`. Removing or
renaming a prop, or changing its type, is breaking. Include the
govuk-frontend version.
