// Issue bodies written by the upstream watcher. Each issue is a complete brief
// for the pipeline: what changed upstream, exact commands, and acceptance
// criteria (AC-n) the high-level plan can adopt as they are.

import { reactName } from "./lib.mjs";

const MAX_DIFF = 12000;
const DOCS = "https://design-system.service.gov.uk/components";
const RELEASES = "https://github.com/alphagov/govuk-frontend/releases/tag";

export function marker(data) {
  return `<!-- upstream-watch ${JSON.stringify(data)} -->`;
}

export function parseMarker(body = "") {
  const m = body.match(/<!-- upstream-watch (\{.*?\}) -->/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

const human = (component) => component.replace(/-/g, " ");
const title = (component) => human(component).replace(/^./, (c) => c.toUpperCase());
const fence = (lang, text) => {
  const body = text.length > MAX_DIFF ? text.slice(0, MAX_DIFF) + `\n… (truncated; run the sync command and see git diff)` : text;
  return "```" + lang + "\n" + body + "\n```";
};

function releaseLinks(versions) {
  const link = (v) => `[v${v}](${RELEASES}/v${v})`;
  if (versions.length <= 6) return versions.map(link).join(", ");
  return `${versions.slice(0, 2).map(link).join(", ")} … ${versions.slice(-3).map(link).join(", ")} (${versions.length} releases)`;
}

function releaseNotesSection(notes) {
  if (!notes?.length) return "";
  return `### Release notes that mention this\n\n${notes.map((n) => `> **v${n.version}**\n>\n${n.text.split("\n").map((l) => `> ${l}`).join("\n")}`).join("\n\n")}\n`;
}

function optionsSection({ added, removed, changed }) {
  if (!added.length && !removed.length && !changed.length) return "No changes to macro options (the public API).\n";
  const lines = [];
  for (const o of added) lines.push(`- **Added** \`${o.path}\` (${o.type}${o.required ? ", required" : ""}): ${o.description}`);
  for (const o of changed) lines.push(`- **Changed** \`${o.path}\`: ${o.what.join("; ")}. Now: ${o.description}`);
  for (const o of removed) lines.push(`- **Removed** \`${o.path}\` (${o.type}). ⚠️ Breaking for consumers of this library.`);
  return lines.join("\n") + "\n";
}

function fixturesSection({ added, removed, changed }) {
  const fmt = (names) => names.map((n) => `\`${n}\``).join(", ");
  const lines = [];
  if (added.length) lines.push(`- Added: ${fmt(added)}`);
  if (changed.length) lines.push(`- Changed (params or expected HTML): ${fmt(changed)}`);
  if (removed.length) lines.push(`- Removed: ${fmt(removed)}`);
  return lines.length ? lines.join("\n") + "\n" : "No fixture changes.\n";
}

export function componentUpdateIssue(update, { versions, notes, bumpIssue }) {
  const { component, from, to, changed, details } = update;
  const Name = reactName(component);
  const breaking = details.options.removed.length > 0 || details.options.changed.some((c) => c.what.some((w) => w.startsWith("type")));
  const behaviour = changed.includes("behaviour");

  const body = `${marker({ kind: "component", component, version: to })}
## Upstream change

GOV.UK Frontend changed the **${title(component)}** component. This library implements it from v${from}; upstream is now v${to}.

| | |
|---|---|
| Upstream component | \`${component}\` ([design system guidance](${DOCS}/${component}/)) |
| React component | \`src/components/${component}/${Name}.tsx\` |
| Version | ${from} → **${to}** |
| What changed | ${changed.join(", ")} |
| Releases | ${releaseLinks(versions)} |
${breaking ? "| Breaking? | ⚠️ Probably: options were removed or changed type |\n" : ""}${bumpIssue ? `| Depends on | #${bumpIssue} (govuk-frontend ${to} bump) |\n` : ""}
${releaseNotesSection(notes)}
### Macro options (component API)

${optionsSection(details.options)}
### Fixtures

${fixturesSection(details.fixtures)}
${details.templateDiff ? `### Template diff\n\n${fence("diff", details.templateDiff)}\n` : ""}
${behaviour && details.scriptDiff ? `### JavaScript diff\n\nThe React component initialises upstream's JS with \`useGovukModule\`, so most behaviour changes come for free with the version bump. Check for new config options, new data attributes or new markup the JS expects.\n\n${fence("diff", details.scriptDiff)}\n` : ""}
## How to do it

1. Vendor the new upstream files (this makes the conformance tests fail until the component matches):
   \`\`\`sh
   npm run upstream:sync -- ${component} --version ${to}
   \`\`\`
2. Update \`src/components/${component}/${Name}.tsx\` until \`npm test\` passes. The diff in \`upstream/components/${component}/\` shows exactly what changed.
3. Keep props 1:1 with \`upstream/components/${component}/macro-options.json\`: same names, types from the option types, and JSDoc copied from the option descriptions. Follow \`docs/component-conventions.md\`.
4. Add an entry to \`CHANGELOG.md\` under **Unreleased**${breaking ? " in the **Breaking changes** section" : ""}.

## Acceptance criteria

- **AC-1** \`upstream/components/${component}/lock.json\` records version \`${to}\`, and the vendored files are the ones from govuk-frontend ${to}.
- **AC-2** Every fixture in \`upstream/components/${component}/fixtures.json\` passes in \`test/conformance.test.tsx\`, with no new \`skip\` entries in \`test/registry.ts\` (any unavoidable skip has a reason and is called out in the PR).
- **AC-3** \`${Name}\` props match the macro options: every added, changed or removed option listed above is reflected in the props interface and its JSDoc.
${behaviour ? `- **AC-4** Behaviour tests in \`src/components/${component}/${Name}.test.tsx\` cover any changed JavaScript behaviour or config.\n` : ""}- **AC-${behaviour ? 5 : 4}** \`CHANGELOG.md\` describes the change for consumers${breaking ? ", flagged as breaking" : ""}.
- **AC-${behaviour ? 6 : 5}** \`npm run check\` and \`npm run build\` pass.
`;
  return { title: `[upstream] Update ${Name} to govuk-frontend v${to}`, body, labels: ["upstream:component"] };
}

export function bumpIssue(plan, { versions, notes, componentIssues }) {
  const { from, to, styleOnly } = plan.bump;
  const syncList = styleOnly.map((s) => s.component);
  const body = `${marker({ kind: "bump", version: to })}
## Upstream release

govuk-frontend **v${to}** is out. This library builds against v${from}.

Releases: ${releaseLinks(versions)}

${notes?.length ? releaseNotesSection(notes) : ""}
### Components in this release

${
  componentIssues.length
    ? `These need React changes and have their own issues, which wait for this one:\n\n${componentIssues.map((i) => `- #${i.number} ${i.component}`).join("\n")}\n`
    : "No implemented component needs React changes.\n"
}
${
  syncList.length
    ? `These only changed styles (or not at all), so only their lock files move forward in this issue:\n\n${styleOnly.map((s) => `- \`${s.component}\`${s.changed.length ? ` (${s.changed.join(", ")})` : " (no changes)"}`).join("\n")}\n`
    : ""
}
## How to do it

\`\`\`sh
npm install --save-dev --save-exact govuk-frontend@${to}
${syncList.length ? `npm run upstream:sync -- ${syncList.join(" ")} --version ${to}\n` : ""}npm run check
\`\`\`

Then set \`peerDependencies["govuk-frontend"]\` in \`package.json\` to \`^${to}\` and add a \`CHANGELOG.md\` entry under **Unreleased**.

Do **not** sync components that have their own issue above. Their vendored fixtures stay at the old version until their issue is done, so the conformance tests stay green here.

## Acceptance criteria

- **AC-1** \`devDependencies["govuk-frontend"]\` is exactly \`${to}\`, \`peerDependencies["govuk-frontend"]\` is \`^${to}\`, and \`package-lock.json\` is updated.
${syncList.length ? `- **AC-2** Lock files for ${syncList.map((c) => `\`${c}\``).join(", ")} record version \`${to}\`.\n` : ""}- **AC-${syncList.length ? 3 : 2}** \`CHANGELOG.md\` notes the govuk-frontend version bump.
- **AC-${syncList.length ? 4 : 3}** \`npm run check\` and \`npm run build\` pass.
`;
  return { title: `[upstream] Update govuk-frontend to v${to}`, body, labels: ["upstream:bump"] };
}

export function newComponentIssue(item, { version, tracked, openIssueFor }) {
  const { component, dependencies, hasJavaScript, options } = item;
  const Name = reactName(component);
  const depLines = dependencies.map((d) =>
    tracked.includes(d) ? `- \`${d}\`: already implemented (\`${reactName(d)}\`), reuse it` : `- \`${d}\`: not implemented yet${openIssueFor(d) ? ` (#${openIssueFor(d)})` : ""}`,
  );
  const optionRows = options.map((o) => `| \`${o.name}\` | ${o.type} | ${o.required ? "yes" : ""} | ${String(o.description ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")} |`);

  const body = `${marker({ kind: "new", component, version })}
## New component

Add the GOV.UK **${title(component)}** component (\`${component}\`, govuk-frontend v${version}) to the library as \`${Name}\`.

Guidance: ${DOCS}/${component}/

${dependencies.length ? `### Uses these components\n\n${depLines.join("\n")}\n` : ""}
${hasJavaScript ? `### JavaScript\n\nUpstream has a JS module for this component. Import it as \`import { ${Name} as Govuk${Name} } from \"govuk-frontend\"\`, initialise it with \`useGovukModule(ref, Govuk${Name})\` (see \`Button\`), and make sure it is declared in \`src/types/govuk-frontend.d.ts\`. Do not re-implement upstream behaviour in React. If the JS restructures the DOM after load, read \"Components with JavaScript\" in \`docs/component-conventions.md\`.\n` : ""}
### Macro options (top level)

| Option | Type | Required | Description |
|---|---|---|---|
${optionRows.join("\n")}

Nested options are in \`upstream/components/${component}/macro-options.json\` after syncing.

## How to do it

1. Vendor the upstream files: \`npm run upstream:sync -- ${component} --version ${version}\`
2. Create \`src/components/${component}/${Name}.tsx\` and \`index.ts\` following \`docs/component-conventions.md\`.
3. Export it from \`src/index.ts\` and register it in \`test/registry.ts\`.
4. Add an entry to \`CHANGELOG.md\` under **Unreleased**.

## Acceptance criteria

- **AC-1** \`upstream/components/${component}/\` is vendored at v${version}.
- **AC-2** \`${Name}\` is exported from the package and registered in \`test/registry.ts\`.
- **AC-3** Every fixture in \`upstream/components/${component}/fixtures.json\` passes in \`test/conformance.test.tsx\`, with no \`skip\` entries unless each is justified in the PR.
- **AC-4** Props mirror the macro options 1:1, including nested options, with JSDoc from the option descriptions. \`html\`/\`*Html\` options are \`ReactNode\`.
${hasJavaScript ? `- **AC-5** The upstream JS module is initialised, with behaviour tests in \`src/components/${component}/${Name}.test.tsx\`.\n` : ""}- **AC-${hasJavaScript ? 6 : 5}** \`CHANGELOG.md\` has an entry, and \`npm run check\` and \`npm run build\` pass.
`;
  return { title: `[upstream] Add ${Name} component`, body, labels: ["upstream:new-component"] };
}

export function removedIssue(item, { version }) {
  const Name = reactName(item.component);
  const body = `${marker({ kind: "removed", component: item.component, version })}
## Removed upstream

govuk-frontend v${version} no longer has the \`${item.component}\` component. This library still ships \`${Name}\` (from v${item.from}).

Check the release notes (${RELEASES}/v${version}) for the replacement, then either deprecate \`${Name}\` (JSDoc \`@deprecated\` pointing at the replacement, kept until the next major) or remove it.

## Acceptance criteria

- **AC-1** \`${Name}\` is marked \`@deprecated\` with a pointer to the replacement, or removed along with \`upstream/components/${item.component}/\` and its registry entry.
- **AC-2** \`CHANGELOG.md\` explains the deprecation or removal, flagged as breaking if removed.
- **AC-3** \`npm run check\` and \`npm run build\` pass.
`;
  return { title: `[upstream] ${Name} was removed in govuk-frontend v${version}`, body, labels: ["upstream:removed"] };
}
