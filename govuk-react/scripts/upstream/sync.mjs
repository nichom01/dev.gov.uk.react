#!/usr/bin/env node
// Vendor upstream files for one or more components at a govuk-frontend version
// and update their lock.json. This is the first step of every component issue.
//
//   npm run upstream:sync -- button tag --version 6.7.0
//   npm run upstream:sync -- --all --version 6.7.0     # every tracked component
//   npm run upstream:sync -- accordion                   # add a new component (version from package.json)

import { fetchPackage, installedVersion, latestVersion, parseArgs, trackedComponents, vendorComponent } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const version = args.version === "latest" ? latestVersion() : args.version || installedVersion();
const components = args.all ? trackedComponents() : args._;

if (!components.length) {
  console.error("Usage: npm run upstream:sync -- <component...> [--version X] | --all [--version X]");
  process.exit(1);
}

const govuk = fetchPackage(version);
for (const component of components) {
  const files = vendorComponent(govuk, component, version);
  console.log(`✔ ${component}@${version}: ${files.join(", ")}`);
}
