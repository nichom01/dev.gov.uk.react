import { forwardRef, type HTMLAttributes } from "react";
import { content, cx, govukAttributes, type GovukAttributes, type GovukContent } from "../../internal";

/** Props mirror the `govukHint` macro options 1:1 (upstream/components/hint/macro-options.json). */
export interface HintOptions extends GovukContent {
  /** ID attribute to add to the hint. */
  id?: string;
  /** Classes to add to the hint. */
  classes?: string;
  /** HTML attributes (for example data attributes) to add to the hint. */
  attributes?: GovukAttributes;
}

export type HintProps = HintOptions & Omit<HTMLAttributes<HTMLDivElement>, keyof HintOptions | "className" | "dangerouslySetInnerHTML">;

export const Hint = forwardRef<HTMLDivElement, HintProps>(function Hint({ text, html, children, id, classes, attributes, ...rest }, ref) {
  return (
    <div ref={ref} {...rest} {...(id ? { id } : {})} className={cx("govuk-hint", classes)} {...govukAttributes(attributes)}>
      {content({ text, html, children })}
    </div>
  );
});
