import { forwardRef, type HTMLAttributes } from "react";
import { content, cx, govukAttributes, type GovukAttributes, type GovukContent } from "../../internal";

/** Props mirror the `govukTag` macro options 1:1 (upstream/components/tag/macro-options.json). */
export interface TagOptions extends GovukContent {
  /** Classes to add to the tag, for example `govuk-tag--blue`. */
  classes?: string;
  /** HTML attributes (for example data attributes) to add to the tag. */
  attributes?: GovukAttributes;
}

export type TagProps = TagOptions & Omit<HTMLAttributes<HTMLElement>, keyof TagOptions | "className" | "dangerouslySetInnerHTML">;

export const Tag = forwardRef<HTMLElement, TagProps>(function Tag({ text, html, children, classes, attributes, ...rest }, ref) {
  return (
    <strong ref={ref} {...rest} className={cx("govuk-tag", classes)} {...govukAttributes(attributes)}>
      {content({ text, html, children })}
    </strong>
  );
});
