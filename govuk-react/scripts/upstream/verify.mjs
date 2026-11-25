#!/usr/bin/env node
// Fails if any vendored file in upstream/components/ differs from the
// published govuk-frontend package at the version in its lock.json. Stops
// anyone (or any agent) "fixing" a fixture by editing it.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { COMPONENTS_DIR, fetchPackage, hashComponent, readLock, trackedComponents, vendoredFiles } from "./lib.mjs";

let failed = 0;
for (const component of trackedComponents()) {
  const lock = readLock(component);
  const govuk = fetchPackage(lock.version);
  const problems = [];
  for (const file of vendoredFiles(component)) {
    const ours = join(COMPONENTS_DIR, component, file);
    const theirs = join(govuk, "components", component, file);
    if (existsSync(ours) !== existsSync(theirs)) problems.push(`${file} ${existsSync(ours) ? "should not exist" : "is missing"}`);
    else if (existsSync(ours) && !readFileSync(ours).equals(readFileSync(theirs))) problems.push(`${file} was edited`);
  }
  if (JSON.stringify(hashComponent(govuk, component)) !== JSON.stringify(lock.hashes)) problems.push("lock.json hashes are wrong");
  if (problems.length) {
    failed++;
    console.error(`✖ ${component}@${lock.version}: ${problems.join("; ")}. Re-run: npm run upstream:sync -- ${component} --version ${lock.version}`);
  } else console.log(`✔ ${component}@${lock.version}`);
}
process.exit(failed ? 1 : 0);
