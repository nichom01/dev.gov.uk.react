import { forwardRef, type HTMLAttributes } from "react";
import { content, cx, govukAttributes, type GovukAttributes, type GovukContent } from "../../internal";

/**
 * Props mirror the `govukInsetText` macro options 1:1
 * (upstream/components/inset-text/macro-options.json). Upstream's `caller`
 * block is `children` here.
 */
export interface InsetTextOptions extends GovukContent {
  /** ID attribute to add to the inset text container. */
  id?: string;
  /** Classes to add to the inset text container. */
  classes?: string;
  /** HTML attributes (for example data attributes) to add to the inset text container. */
  attributes?: GovukAttributes;
}

export type InsetTextProps = InsetTextOptions &
  Omit<HTMLAttributes<HTMLDivElement>, keyof InsetTextOptions | "className" | "dangerouslySetInnerHTML">;

export const InsetText = forwardRef<HTMLDivElement, InsetTextProps>(function InsetText(
  { text, html, children, id, classes, attributes, ...rest },
  ref,
) {
  return (
    <div ref={ref} {...rest} {...(id ? { id } : {})} className={cx("govuk-inset-text", classes)} {...govukAttributes(attributes)}>
      {content({ text, html, children })}
    </div>
  );
});
