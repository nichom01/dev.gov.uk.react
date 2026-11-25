import parse from "html-react-parser";

/**
 * Turn upstream fixture options (Nunjucks macro params) into React props.
 * Props mirror macro options 1:1, so the only conversion needed is for HTML
 * strings: any key named `html` or ending in `Html` (e.g. `summaryHtml`)
 * becomes a ReactNode, because components take JSX instead of raw HTML.
 */
export function fixtureProps(options: unknown): Record<string, unknown> {
  return convert(options) as Record<string, unknown>;
}

function convert(value: unknown, key = ""): unknown {
  if (typeof value === "string" && (key === "html" || key.endsWith("Html"))) {
    return parse(value);
  }
  if (Array.isArray(value)) return value.map((v) => convert(v));
  if (value && typeof value === "object") {
    // `attributes` values are HTML attribute values, never JSX.
    if (key === "attributes") return value;
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, convert(v, k)]));
  }
  return value;
}
