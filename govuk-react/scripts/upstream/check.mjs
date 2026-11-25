#!/usr/bin/env node
// The upstream watcher. Compares this library with the latest govuk-frontend
// release and opens GitHub issues for the pipeline to work through:
//
//   - one "bump" issue per release (dependency update + style-only components)
//   - one issue per implemented component whose markup or JS changed
//   - "add component" issues for upstream components not implemented yet
//     (a few at a time, dependencies first)
//   - an issue for any implemented component removed upstream
//
// It is stateless and safe to re-run: issues carry a hidden marker, and
// nothing is filed twice. Older open issues for the same component are closed
// as superseded when a newer release changes it again.
//
//   node scripts/upstream/check.mjs --dry-run            # print the plan, write bodies to .cache/upstream/dry-run
//   node scripts/upstream/check.mjs                       # file issues in the current repo (needs gh auth / GH_TOKEN)
//   node scripts/upstream/check.mjs --version 6.7.0       # target a specific release instead of latest

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CACHE_DIR, UPSTREAM_DIR, compareVersions, latestVersion, parseArgs, publishedVersions, readJson } from "./lib.mjs";
import { buildPlan } from "./plan.mjs";
import { bumpIssue, componentUpdateIssue, newComponentIssue, parseMarker, removedIssue } from "./issues.mjs";
import { createGitHub, currentRepo } from "./github.mjs";

const args = parseArgs(process.argv.slice(2));
const dryRun = Boolean(args["dry-run"]);
const config = readJson(join(UPSTREAM_DIR, "watch.config.json"), {});
const base = config.labels?.base ?? "upstream";
const startLabel = config.labels?.start ?? "bob:start";

const version = args.version || latestVersion();
console.log(`govuk-frontend target: v${version}`);
const plan = buildPlan({ version, config });

console.log(`installed: v${plan.installed}; tracked components: ${plan.tracked.length}/${plan.upstream.length}`);
console.log(`  up to date:     ${plan.upToDate.join(", ") || "-"}`);
console.log(`  need React work: ${plan.updates.map((u) => `${u.component} (${u.changed.join("+")})`).join(", ") || "-"}`);
console.log(`  style/lock only: ${plan.styleOnly.map((s) => s.component).join(", ") || "-"}`);
console.log(`  removed upstream: ${plan.removed.map((r) => r.component).join(", ") || "-"}`);
console.log(`  not implemented: ${plan.missing.length}`);

// Every published version after `from`, up to and including `to`.
const versionsBetween = (from, to) =>
  publishedVersions().filter((v) => compareVersions(v, from) > 0 && compareVersions(v, to) <= 0);

// --- GitHub (or a stand-in for --dry-run) ------------------------------------

let nextFake = 1000;
const github = dryRun
  ? {
      listIssues: () => (args["existing-issues"] ? readJson(args["existing-issues"], []) : []),
      createIssue: (i) => ({ number: nextFake++, ...i }),
      comment: () => {},
      close: () => {},
      ensureLabels: () => {},
      milestone: () => 1,
      addBlockedBy: () => {},
      releaseNotes: () => "",
    }
  : createGitHub(currentRepo());

const dryDir = join(CACHE_DIR, "dry-run");
if (dryRun) {
  rmSync(dryDir, { recursive: true, force: true });
  mkdirSync(dryDir, { recursive: true });
}

const releaseNotesCache = new Map();
function notesFor(versions, component) {
  const out = [];
  for (const v of versions) {
    if (!releaseNotesCache.has(v)) releaseNotesCache.set(v, github.releaseNotes(v));
    const text = extractMentions(releaseNotesCache.get(v), component);
    if (text) out.push({ version: v, text });
  }
  return out;
}

/** Sections of a release note that mention a component (or the whole note if no component given). */
function extractMentions(notes, component) {
  if (!notes) return "";
  if (!component) return notes.length > 4000 ? notes.slice(0, 4000) + "\n…" : notes;
  const name = component.replace(/-/g, "[ -]");
  const re = new RegExp(`\\b${name}s?\\b`, "i");
  const sections = notes.split(/\n(?=#{2,4} )/).filter((s) => re.test(s));
  const text = sections.join("\n\n").trim();
  return text.length > 4000 ? text.slice(0, 4000) + "\n…" : text;
}

// --- Existing issues ---------------------------------------------------------

const existing = github
  .listIssues(base)
  .map((i) => ({ number: i.number, state: i.state, title: i.title, marker: parseMarker(i.body) }))
  .filter((i) => i.marker);

const find = (pred) => existing.find((i) => pred(i.marker, i));
const has = (kind, component, v) => find((m) => m.kind === kind && m.component === component && m.version === v);

const labelsFor = (extra) => [base, ...extra, ...(config.autoStart ? [startLabel] : [])];

const created = [];
function file(issue, { milestone } = {}) {
  const labels = labelsFor(issue.labels);
  if (dryRun) {
    const n = nextFake;
    const name = `${String(created.length + 1).padStart(2, "0")}-${issue.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    writeFileSync(join(dryDir, name), `# ${issue.title}\n\nLabels: ${labels.join(", ")}${milestone ? `\nMilestone: ${milestone}` : ""}\n\n${issue.body}`);
  }
  const result = github.createIssue({ ...issue, labels, milestone: milestone ? github.milestone(milestone, `Catch up with ${milestone}`) : undefined, assignees: config.assignees });
  created.push({ number: result.number, title: issue.title });
  console.log(`${dryRun ? "[dry-run] would open" : "opened"} #${result.number}: ${issue.title}`);
  return result.number;
}

function supersede(kind, component, newNumber) {
  for (const old of existing.filter((i) => i.state === "open" && i.marker.kind === kind && i.marker.component === component && i.marker.version !== version)) {
    github.comment(old.number, `Superseded by #${newNumber}, which covers govuk-frontend v${version}.`);
    if (config.supersede !== "comment") github.close(old.number);
    console.log(`  superseded #${old.number} (${old.marker.version}) → #${newNumber}`);
  }
}

if (!dryRun) {
  github.ensureLabels([
    { name: base, color: "1d70b8", description: "Opened by the govuk-frontend upstream watcher" },
    { name: "upstream:bump", color: "1d70b8", description: "govuk-frontend version bump" },
    { name: "upstream:component", color: "1d70b8", description: "Upstream changed an implemented component" },
    { name: "upstream:new-component", color: "1d70b8", description: "Upstream component not implemented yet" },
    { name: "upstream:removed", color: "d4351c", description: "Component removed upstream" },
    ...(config.autoStart ? [{ name: startLabel, color: "0e8a16", description: "Start the pipeline for this issue" }] : []),
  ]);
}

const milestone = config.milestonePerRelease ? `govuk-frontend v${version}` : undefined;

// 1. Component updates (filed before the bump so the bump issue can list them).
const componentIssues = [];
for (const update of plan.updates) {
  const prior = has("component", update.component, version);
  if (prior) {
    if (prior.state === "open") componentIssues.push({ number: prior.number, component: update.component });
    continue;
  }
  const versions = versionsBetween(update.from, version);
  const number = file(componentUpdateIssue(update, { versions, notes: notesFor(versions, update.component), bumpIssue: null }), { milestone });
  componentIssues.push({ number, component: update.component, isNew: true });
  supersede("component", update.component, number);
}

// 2. The bump issue, and component issues wait for it.
if (plan.bump) {
  let bumpNumber = has("bump", undefined, version)?.number;
  if (!bumpNumber) {
    const versions = versionsBetween(plan.bump.from, version);
    const notes = versions.map((v) => ({ version: v, text: extractMentions(github.releaseNotes(v)) })).filter((n) => n.text);
    bumpNumber = file(bumpIssue(plan, { versions, notes, componentIssues }), { milestone });
    supersede("bump", undefined, bumpNumber);
  }
  if (config.componentIssuesBlockedByBump) for (const c of componentIssues.filter((c) => c.isNew)) github.addBlockedBy(c.number, bumpNumber);
}

// 3. Removed components.
for (const item of plan.removed) {
  if (!has("removed", item.component, version) && !find((m) => m.kind === "removed" && m.component === item.component)) {
    file(removedIssue(item, { version }), { milestone });
  }
}

// 4. New components, a few at a time, dependencies first.
if (config.newComponents?.enabled) {
  const openNew = () => existing.filter((i) => i.state === "open" && i.marker.kind === "new").length + created.filter((c) => c.kind === "new").length;
  const issueFor = (component) => find((m, i) => m.kind === "new" && m.component === component && i.state === "open")?.number ??
    created.find((c) => c.kind === "new" && c.component === component)?.number;
  const max = Number(config.newComponents.maxOpen ?? 2);

  for (const item of plan.missing) {
    if (openNew() >= max) break;
    // Any earlier issue (open, or closed as not planned) means a human has seen it.
    if (find((m) => m.kind === "new" && m.component === item.component)) continue;
    // Only start a component once everything it uses is implemented or under way.
    const blockers = item.dependencies.filter((d) => !plan.tracked.includes(d));
    if (blockers.some((d) => !issueFor(d))) continue;
    const number = file(newComponentIssue(item, { version, tracked: plan.tracked, openIssueFor: issueFor }));
    created[created.length - 1].kind = "new";
    created[created.length - 1].component = item.component;
    for (const d of blockers) github.addBlockedBy(number, issueFor(d));
  }
}

console.log(created.length ? `${dryRun ? "Would open" : "Opened"} ${created.length} issue(s).` : "Nothing to do.");
if (dryRun && created.length) console.log(`Issue bodies written to ${dryDir}`);
