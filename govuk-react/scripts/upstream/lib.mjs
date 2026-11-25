// Shared helpers for tracking govuk-frontend releases, component by component.
//
// Source of truth for "what upstream looks like" is the published npm package:
// it contains, for every component, the Nunjucks template, the macro options
// (the component's public API) and fixtures.json (every example's params and
// the exact HTML upstream renders for them). We vendor those three files per
// component into upstream/components/<name>/ and record their hashes in
// lock.json, so any change upstream shows up as a hash mismatch.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const UPSTREAM_DIR = join(ROOT, "upstream");
export const COMPONENTS_DIR = join(UPSTREAM_DIR, "components");
export const CACHE_DIR = join(ROOT, ".cache", "upstream");
export const PACKAGE = "govuk-frontend";

/**
 * How each upstream file is classified. The category decides what kind of
 * work a change needs:
 *  - markup:    the React component must change (template, API or fixtures changed)
 *  - behaviour: upstream JS changed; the React wrapper may need new config/props
 *  - style:     Sass only; bumping govuk-frontend is enough
 * Anything else (README, bundles, source maps, preview .html) is ignored.
 */
export function classify(file, component) {
  if (["template.njk", "macro.njk", "macro-options.json", "fixtures.json"].includes(file)) return "markup";
  if (file === `${component}.mjs`) return "behaviour";
  if (file.endsWith(".scss")) return "style";
  return null;
}

/** Files copied into upstream/components/<name>/ so PR diffs show exactly what changed. */
export function vendoredFiles(component) {
  return ["template.njk", "macro-options.json", "fixtures.json", `${component}.mjs`];
}

export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export function npm(args) {
  return execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** All published versions, oldest first, excluding pre-releases. */
export function publishedVersions() {
  return JSON.parse(npm(["view", PACKAGE, "versions", "--json"])).filter((v) => !v.includes("-"));
}

export function latestVersion() {
  return npm(["view", PACKAGE, "dist-tags.latest"]);
}

/** The govuk-frontend version the library currently builds against (package.json devDependency). */
export function installedVersion() {
  const pkg = readJson(join(ROOT, "package.json"), {});
  return String(pkg.devDependencies?.[PACKAGE] ?? "").replace(/^[^\d]*/, "");
}

/** Download and unpack govuk-frontend@version (cached). Returns the dist/govuk directory. */
export function fetchPackage(version) {
  const dir = join(CACHE_DIR, version);
  const govuk = join(dir, "package", "dist", "govuk");
  if (existsSync(join(govuk, "components"))) return govuk;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const tarball = npm(["pack", `${PACKAGE}@${version}`, "--pack-destination", dir, "--silent"]).split("\n").pop();
  execFileSync("tar", ["-xzf", join(dir, tarball), "-C", dir]);
  rmSync(join(dir, tarball));
  return govuk;
}

export function upstreamComponents(govukDir) {
  return readdirSync(join(govukDir, "components"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** sha256 per category over the component's classified files. */
export function hashComponent(govukDir, component) {
  const dir = join(govukDir, "components", component);
  const buckets = { markup: [], behaviour: [], style: [] };
  for (const file of readdirSync(dir).sort()) {
    const category = classify(file, component);
    if (category) buckets[category].push(file);
  }
  const hashes = {};
  for (const [category, files] of Object.entries(buckets)) {
    if (!files.length) continue;
    const h = createHash("sha256");
    for (const file of files) h.update(file).update("\0").update(hashInput(join(dir, file), file)).update("\0");
    hashes[category] = h.digest("hex").slice(0, 16);
  }
  return hashes;
}

/**
 * fixtures.json also carries test-runner metadata (screenshot flags, page
 * template options) that changes without the component changing. Only hash
 * what the conformance test uses: each fixture's name, options and HTML.
 */
function hashInput(path, file) {
  const raw = readFileSync(path);
  if (file !== "fixtures.json") return raw;
  const { fixtures = [] } = JSON.parse(raw.toString("utf8"));
  return JSON.stringify(fixtures.map(({ name, options, html }) => ({ name, options, html })));
}

/** Components implemented in this library = those with a lock file. */
export function trackedComponents() {
  if (!existsSync(COMPONENTS_DIR)) return [];
  return readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(COMPONENTS_DIR, d.name, "lock.json")))
    .map((d) => d.name)
    .sort();
}

export function readLock(component) {
  return readJson(join(COMPONENTS_DIR, component, "lock.json"), null);
}

/** Which categories differ between the lock and an upstream hash set. */
export function changedCategories(lockHashes = {}, upstreamHashes = {}) {
  const categories = new Set([...Object.keys(lockHashes), ...Object.keys(upstreamHashes)]);
  return [...categories].filter((c) => lockHashes[c] !== upstreamHashes[c]).sort();
}

/** Copy a component's upstream files into upstream/components/<name>/ and write lock.json. */
export function vendorComponent(govukDir, component, version) {
  const src = join(govukDir, "components", component);
  if (!existsSync(src)) throw new Error(`${component} does not exist in ${PACKAGE}@${version}`);
  const dest = join(COMPONENTS_DIR, component);
  mkdirSync(dest, { recursive: true });
  const copied = [];
  for (const file of vendoredFiles(component)) {
    const from = join(src, file);
    const to = join(dest, file);
    if (existsSync(from)) {
      copyFileSync(from, to);
      copied.push(file);
    } else if (existsSync(to)) {
      rmSync(to); // removed upstream
    }
  }
  writeJson(join(dest, "lock.json"), {
    component,
    package: PACKAGE,
    version,
    hashes: hashComponent(govukDir, component),
  });
  return copied;
}

/** PascalCase name used for the React component, e.g. "error-summary" → "ErrorSummary". */
export function reactName(component) {
  return component.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}

export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [key, inline] = a.slice(2).split("=");
      const next = argv[i + 1];
      if (inline !== undefined) args[key] = inline;
      else if (next !== undefined && !next.startsWith("--")) args[key] = argv[++i];
      else args[key] = true;
    } else args._.push(a);
  }
  return args;
}
