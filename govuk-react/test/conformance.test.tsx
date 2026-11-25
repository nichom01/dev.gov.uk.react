/**
 * Conformance: every React component must render the same HTML as the
 * GOV.UK Frontend Nunjucks macro, for every upstream fixture.
 *
 * Fixtures come from upstream/components/<name>/fixtures.json, vendored from
 * the govuk-frontend npm package by `npm run upstream:sync`. When upstream
 * changes a component, syncing the new fixtures makes these tests fail until
 * the React component is updated. That is the contract the pipeline works to.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureProps } from "./fixture-props";
import { normaliseHtml } from "./normalise-html";
import { registry } from "./registry";

interface Fixture {
  name: string;
  options: Record<string, unknown>;
  html: string;
  hidden?: boolean;
}

const UPSTREAM = join(__dirname, "..", "upstream", "components");
const vendored = readdirSync(UPSTREAM).filter((d) => existsSync(join(UPSTREAM, d, "lock.json")));

describe("registry", () => {
  it("has a React component for every vendored upstream component", () => {
    const missing = vendored.filter((name) => !registry[name]);
    expect(missing, "add these to test/registry.ts and src/index.ts").toEqual([]);
  });

  it("has vendored fixtures for every registered component", () => {
    const missing = Object.keys(registry).filter((name) => !vendored.includes(name));
    expect(missing, "run: npm run upstream:sync -- <name>").toEqual([]);
  });
});

for (const [name, entry] of Object.entries(registry)) {
  const file = join(UPSTREAM, name, "fixtures.json");
  if (!existsSync(file)) continue;
  const { fixtures } = JSON.parse(readFileSync(file, "utf8")) as { fixtures: Fixture[] };

  describe(`conformance: ${name}`, () => {
    for (const fixture of fixtures) {
      const reason = entry.skip?.[fixture.name];
      const test = reason ? it.skip : it;
      test(`${fixture.name}${reason ? ` (skipped: ${reason})` : ""}`, () => {
        const html = renderToStaticMarkup(createElement(entry.component, fixtureProps(fixture.options)));
        expect(normaliseHtml(html)).toBe(normaliseHtml(fixture.html));
      });
    }
  });
}
