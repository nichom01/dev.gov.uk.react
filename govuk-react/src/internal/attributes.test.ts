import { describe, expect, it } from "vitest";
import { govukAttributes } from "./attributes";

// Mirrors the documented behaviour of govuk-frontend's govukAttributes macro.
describe("govukAttributes", () => {
  it("renders scalars as strings", () => {
    expect(govukAttributes({ "data-a": "x", "aria-hidden": true, "data-n": 3, "aria-x": false })).toEqual({
      "data-a": "x",
      "aria-hidden": "true",
      "data-n": "3",
      "aria-x": "false",
    });
  });

  it("renders empty values as empty attributes", () => {
    expect(govukAttributes({ "data-a": null, "data-b": undefined })).toEqual({ "data-a": "", "data-b": "" });
  });

  it("omits optional empty values and renders optional true as a boolean attribute", () => {
    expect(govukAttributes({ hidden: { value: true, optional: true }, "data-x": { value: false, optional: true } })).toEqual({ hidden: true });
  });

  it("maps HTML attribute names to React prop names", () => {
    expect(govukAttributes({ autocomplete: "off", tabindex: "-1" })).toEqual({ autoComplete: "off", tabIndex: "-1" });
  });
});
