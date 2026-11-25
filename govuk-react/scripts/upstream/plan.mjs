// Works out what the library needs to do to catch up with a govuk-frontend
// release. Pure planning: reads the lock files and the upstream package, and
// returns a plan. scripts/upstream/check.mjs turns the plan into GitHub issues.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createTwoFilesPatch } from "diff";
import {
  COMPONENTS_DIR,
  changedCategories,
  compareVersions,
  fetchPackage,
  hashComponent,
  installedVersion,
  readLock,
  trackedComponents,
  upstreamComponents,
} from "./lib.mjs";

/** Components a component's template imports, e.g. checkboxes → [error-message, fieldset, hint, label]. */
export function templateDependencies(govukDir, component) {
  const file = join(govukDir, "components", component, "template.njk");
  if (!existsSync(file)) return [];
  const src = readFileSync(file, "utf8");
  const deps = new Set();
  for (const m of src.matchAll(/from\s+["']\.\.\/([a-z-]+)\/macro\.njk["']/g)) if (m[1] !== component) deps.add(m[1]);
  return [...deps].sort();
}

/**
 * @param {{ version: string, config: object }} opts
 */
export function buildPlan({ version, config }) {
  const govuk = fetchPackage(version);
  const upstream = upstreamComponents(govuk);
  const tracked = trackedComponents();
  const installed = installedVersion();

  const updates = []; // markup/behaviour changes → one issue per component
  const styleOnly = []; // handled by the bump issue
  const removed = [];
  const upToDate = [];

  for (const component of tracked) {
    const lock = readLock(component);
    if (!upstream.includes(component)) {
      removed.push({ component, from: lock.version });
      continue;
    }
    const hashes = hashComponent(govuk, component);
    const changed = changedCategories(lock.hashes, hashes);
    if (!changed.length) {
      if (lock.version !== version) styleOnly.push({ component, from: lock.version, changed: [], lockOnly: true });
      else upToDate.push(component);
    } else if (changed.includes("markup") || changed.includes("behaviour")) {
      updates.push({ component, from: lock.version, to: version, changed, details: describeChanges(govuk, component, changed) });
    } else {
      styleOnly.push({ component, from: lock.version, changed });
    }
  }

  const ignore = new Set(config.newComponents?.ignore ?? []);
  const missing = upstream
    .filter((c) => !tracked.includes(c) && !ignore.has(c))
    .map((component) => ({
      component,
      dependencies: templateDependencies(govuk, component),
      hasJavaScript: existsSync(join(govuk, "components", component, `${component}.mjs`)),
      options: readJsonSafe(join(govuk, "components", component, "macro-options.json"), []),
    }));

  const bump =
    installed && compareVersions(installed, version) < 0 ? { from: installed, to: version, styleOnly } : null;

  return { version, installed, govuk, tracked, upstream, updates, styleOnly, removed, upToDate, missing: orderByDependencies(missing), bump };
}

function readJsonSafe(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

/** Put components before the components that use them. */
function orderByDependencies(items) {
  const byName = new Map(items.map((i) => [i.component, i]));
  const out = [];
  const seen = new Set();
  const visit = (item) => {
    if (seen.has(item.component)) return;
    seen.add(item.component);
    for (const dep of item.dependencies) if (byName.has(dep)) visit(byName.get(dep));
    out.push(item);
  };
  for (const item of items) visit(item);
  return out;
}

/** Everything an implementer needs to know about what changed, from the vendored copy to upstream. */
function describeChanges(govuk, component, changed) {
  const vendored = join(COMPONENTS_DIR, component);
  const latest = join(govuk, "components", component);
  const read = (dir, file) => (existsSync(join(dir, file)) ? readFileSync(join(dir, file), "utf8") : "");

  const details = {
    options: diffOptions(readJsonSafe(join(vendored, "macro-options.json"), []), readJsonSafe(join(latest, "macro-options.json"), [])),
    fixtures: diffFixtures(readJsonSafe(join(vendored, "fixtures.json"), { fixtures: [] }), readJsonSafe(join(latest, "fixtures.json"), { fixtures: [] })),
    templateDiff: patch("template.njk", read(vendored, "template.njk"), read(latest, "template.njk")),
    scriptDiff: changed.includes("behaviour")
      ? patch(`${component}.mjs`, read(vendored, `${component}.mjs`), read(latest, `${component}.mjs`))
      : "",
    dependencies: templateDependencies(govuk, component),
  };
  return details;
}

function patch(name, a, b) {
  if (a === b) return "";
  return createTwoFilesPatch(`a/${name}`, `b/${name}`, a, b, "", "", { context: 3 })
    .split("\n")
    .slice(2) // drop the "Index"/"====" header lines
    .join("\n")
    .trim();
}

/** Flatten nested macro options into dotted paths: items[].hint.text */
function flattenOptions(options, prefix = "") {
  const out = new Map();
  for (const o of options ?? []) {
    const path = prefix + o.name;
    out.set(path, { type: o.type, required: !!o.required, description: o.description ?? "", isComponent: !!o.isComponent });
    if (o.params) for (const [k, v] of flattenOptions(o.params, path + (o.type === "array" ? "[]." : "."))) out.set(k, v);
  }
  return out;
}

export function diffOptions(before, after) {
  const a = flattenOptions(before);
  const b = flattenOptions(after);
  const added = [];
  const removed = [];
  const changed = [];
  for (const [path, opt] of b) {
    if (!a.has(path)) added.push({ path, ...opt });
    else {
      const old = a.get(path);
      const what = [];
      if (old.type !== opt.type) what.push(`type \`${old.type}\` → \`${opt.type}\``);
      if (old.required !== opt.required) what.push(opt.required ? "now required" : "no longer required");
      if (old.description !== opt.description) what.push("description changed");
      if (what.length) changed.push({ path, what, ...opt });
    }
  }
  for (const [path, opt] of a) if (!b.has(path)) removed.push({ path, ...opt });
  return { added, removed, changed };
}

export function diffFixtures(before, after) {
  const a = new Map((before.fixtures ?? []).map((f) => [f.name, f]));
  const b = new Map((after.fixtures ?? []).map((f) => [f.name, f]));
  const added = [...b.keys()].filter((n) => !a.has(n));
  const removed = [...a.keys()].filter((n) => !b.has(n));
  const changed = [...b.keys()].filter(
    (n) => a.has(n) && (a.get(n).html !== b.get(n).html || JSON.stringify(a.get(n).options) !== JSON.stringify(b.get(n).options)),
  );
  return { added, removed, changed };
}
