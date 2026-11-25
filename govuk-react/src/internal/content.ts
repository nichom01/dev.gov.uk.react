import type { ReactNode } from "react";

/**
 * Most GOV.UK macros take `text` (plain string) or `html` (markup string).
 * In this library `html` is a ReactNode (JSX), and `children` is an alias for
 * it. Precedence matches upstream, where `html` wins over `text`:
 *   children > html > text
 */
export interface GovukContent {
  /** Plain text content. Ignored if `html` or `children` is set. */
  text?: string;
  /** Rich content (JSX). Upstream's `html` option. Ignored if `children` is set. */
  html?: ReactNode;
  /** Alias for `html`, so components can be used idiomatically. */
  children?: ReactNode;
}

export function content({ children, html, text }: GovukContent): ReactNode {
  if (hasContent(children)) return children;
  if (hasContent(html)) return html;
  return text;
}

export function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}
