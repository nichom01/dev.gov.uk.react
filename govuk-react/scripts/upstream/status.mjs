#!/usr/bin/env node
// How far behind govuk-frontend is the library? Read-only; no GitHub access.
//   npm run upstream:status [-- --version 6.7.0]

import { join } from "node:path";
import { UPSTREAM_DIR, latestVersion, parseArgs, reactName, readJson } from "./lib.mjs";
import { buildPlan } from "./plan.mjs";

const args = parseArgs(process.argv.slice(2));
const version = args.version || latestVersion();
const plan = buildPlan({ version, config: readJson(join(UPSTREAM_DIR, "watch.config.json"), {}) });

console.log(`govuk-frontend latest v${version}, library builds against v${plan.installed}\n`);
const rows = [
  ...plan.upToDate.map((c) => [c, "up to date", ""]),
  ...plan.updates.map((u) => [u.component, `needs update (${u.changed.join(", ")})`, `${u.from} → ${version}`]),
  ...plan.styleOnly.map((s) => [s.component, s.changed.length ? "styles only" : "lock only", `${s.from} → ${version}`]),
  ...plan.removed.map((r) => [r.component, "removed upstream", r.from]),
].sort((a, b) => a[0].localeCompare(b[0]));
for (const [c, state, v] of rows) console.log(`  ${reactName(c).padEnd(22)} ${state.padEnd(34)} ${v}`);
console.log(`\nNot implemented (${plan.missing.length}): ${plan.missing.map((m) => m.component).join(", ")}`);
