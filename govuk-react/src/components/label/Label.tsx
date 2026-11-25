import { forwardRef, type LabelHTMLAttributes } from "react";
import { content, cx, govukAttributes, hasContent, type GovukAttributes, type GovukContent } from "../../internal";

/** Props mirror the `govukLabel` macro options 1:1 (upstream/components/label/macro-options.json). */
export interface LabelOptions extends GovukContent {
  /** The value of the `for` attribute: the ID of the input the label is associated with. */
  for?: string;
  /** Whether the label also acts as the heading for the page. Wraps it in an `<h1>`. */
  isPageHeading?: boolean;
  /** Classes to add to the label tag. */
  classes?: string;
  /** HTML attributes (for example data attributes) to add to the label tag. */
  attributes?: GovukAttributes;
}

export type LabelProps = LabelOptions &
  Omit<LabelHTMLAttributes<HTMLLabelElement>, keyof LabelOptions | "className" | "htmlFor" | "dangerouslySetInnerHTML">;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { text, html, children, for: htmlFor, isPageHeading, classes, attributes, ...rest },
  ref,
) {
  // Upstream renders nothing when there is no content.
  if (!hasContent(children) && !hasContent(html) && !text) return null;

  const label = (
    <label ref={ref} {...rest} className={cx("govuk-label", classes)} {...govukAttributes(attributes)} {...(htmlFor ? { htmlFor } : {})}>
      {content({ text, html, children })}
    </label>
  );

  return isPageHeading ? <h1 className="govuk-label-wrapper">{label}</h1> : label;
});
