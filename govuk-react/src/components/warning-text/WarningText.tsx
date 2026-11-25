import { forwardRef, type HTMLAttributes } from "react";
import { content, cx, govukAttributes, type GovukAttributes, type GovukContent } from "../../internal";

/** Props mirror the `govukWarningText` macro options 1:1 (upstream/components/warning-text/macro-options.json). */
export interface WarningTextOptions extends GovukContent {
  /** The fallback text for the icon. Defaults to `"Warning"`. */
  iconFallbackText?: string;
  /** Classes to add to the warning text. */
  classes?: string;
  /** HTML attributes (for example data attributes) to add to the warning text. */
  attributes?: GovukAttributes;
}

export type WarningTextProps = WarningTextOptions &
  Omit<HTMLAttributes<HTMLDivElement>, keyof WarningTextOptions | "className" | "dangerouslySetInnerHTML">;

export const WarningText = forwardRef<HTMLDivElement, WarningTextProps>(function WarningText(
  { text, html, children, iconFallbackText, classes, attributes, ...rest },
  ref,
) {
  return (
    <div ref={ref} {...rest} className={cx("govuk-warning-text", classes)} {...govukAttributes(attributes)}>
      <span className="govuk-warning-text__icon" aria-hidden="true">
        !
      </span>
      <strong className="govuk-warning-text__text">
        <span className="govuk-visually-hidden">{iconFallbackText || "Warning"}</span> {content({ text, html, children })}
      </strong>
    </div>
  );
});
