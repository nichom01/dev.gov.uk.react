import type { ComponentType } from "react";
import * as lib from "../src";

export interface RegistryEntry {
  /** The React component. Its props must mirror the upstream macro options. */
  component: ComponentType<any>;
  /**
   * Fixtures that are knowingly not matched, keyed by fixture name, with the
   * reason. Keep this empty where possible: every entry is a visible gap
   * against GOV.UK and must be justified in the PR.
   */
  skip?: Record<string, string>;
}

/**
 * Every upstream component this library implements, keyed by the upstream
 * folder name (govuk-frontend/dist/govuk/components/<name>). Each one must have
 * vendored fixtures in upstream/components/<name>/ (npm run upstream:sync).
 */
export const registry: Record<string, RegistryEntry> = {
  button: { component: lib.Button },
  "error-message": { component: lib.ErrorMessage },
  hint: { component: lib.Hint },
  "inset-text": { component: lib.InsetText },
  label: { component: lib.Label },
  tag: { component: lib.Tag },
  "warning-text": { component: lib.WarningText },
};
