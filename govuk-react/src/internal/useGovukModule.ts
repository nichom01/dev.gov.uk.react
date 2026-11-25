import { useEffect, type RefObject } from "react";

/** Shape of a govuk-frontend JavaScript component class (Button, Accordion, …). */
export interface GovukModuleClass<Config = unknown> {
  new ($root: Element, config?: Config): unknown;
  moduleName: string;
}

const warned = new Set<string>();

function isDev(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.NODE_ENV !== "production";
}

/**
 * Initialise a govuk-frontend JavaScript component on the element in `ref`,
 * once, after mount. This is how components get upstream behaviour (for
 * example Button's double-click prevention) without re-implementing it.
 *
 * GOV.UK Frontend only initialises when `<body>` has the class
 * `govuk-frontend-supported`. If it doesn't, the component still renders
 * (progressive enhancement), and we warn once in development.
 */
export function useGovukModule<Config>(
  ref: RefObject<Element | null>,
  Module: GovukModuleClass<Config>,
  config?: Config,
  enabled = true,
) {
  useEffect(() => {
    const $root = ref.current;
    if (!enabled || !$root) return;
    // Already initialised (e.g. React StrictMode double effects).
    if ($root.hasAttribute(`data-${Module.moduleName}-init`)) return;
    try {
      new Module($root, config);
    } catch (error) {
      if (isDev() && !warned.has(Module.moduleName)) {
        warned.add(Module.moduleName);
        console.warn(`[govuk-react] ${Module.moduleName} was not initialised:`, error);
      }
    }
    // Upstream components have no destroy API; config is read once on init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
