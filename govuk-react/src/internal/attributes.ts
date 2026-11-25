/**
 * React equivalent of govuk-frontend's `govukAttributes` Nunjucks macro
 * (dist/govuk/macros/attributes.njk). Every component's `attributes` option
 * goes through this so behaviour matches upstream exactly:
 *
 * - `{ name: value }`           → ` name="value"` (null/undefined → `name=""`, booleans → "true"/"false")
 * - `{ name: { value, optional: true } }`
 *     - value `true`              → ` name` (boolean attribute)
 *     - value null/undefined/false → attribute omitted
 */
export type GovukAttributeScalar = string | number | boolean | null | undefined;
export type GovukAttributeValue = GovukAttributeScalar | { value?: GovukAttributeScalar; optional?: boolean };
export type GovukAttributes = Record<string, GovukAttributeValue>;

/** HTML attribute names that React expects in camelCase (or renamed). */
const REACT_NAMES: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  autocapitalize: "autoCapitalize",
  spellcheck: "spellCheck",
  inputmode: "inputMode",
  enterkeyhint: "enterKeyHint",
  contenteditable: "contentEditable",
  novalidate: "noValidate",
  accesskey: "accessKey",
  crossorigin: "crossOrigin",
  formaction: "formAction",
  formmethod: "formMethod",
  formnovalidate: "formNoValidate",
  formtarget: "formTarget",
  enctype: "encType",
  colspan: "colSpan",
  rowspan: "rowSpan",
  srcset: "srcSet",
  usemap: "useMap",
  datetime: "dateTime",
};

/** React drops these when given "" so pass `true` instead to keep the attribute. */
const REACT_BOOLEANS = new Set([
  "hidden", "disabled", "readOnly", "required", "autoFocus", "multiple",
  "checked", "selected", "open", "noValidate", "formNoValidate", "inert",
]);

function toString(value: GovukAttributeScalar): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function govukAttributes(attributes?: GovukAttributes | null): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  if (!attributes) return out;

  for (const [rawName, item] of Object.entries(attributes)) {
    const isObject = item !== null && typeof item === "object";
    const value = isObject ? item.value : item;
    const optional = isObject ? item.optional === true : false;
    const name = REACT_NAMES[rawName.toLowerCase()] ?? rawName;

    if (optional && value === true) {
      out[name] = REACT_BOOLEANS.has(name) ? true : "";
    } else if (optional && (value === null || value === undefined || value === false)) {
      continue;
    } else {
      const str = toString(value);
      out[name] = REACT_BOOLEANS.has(name) && str === "" ? true : str;
    }
  }
  return out;
}
