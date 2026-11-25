import { forwardRef, type HTMLAttributes } from "react";
import { content, cx, govukAttributes, type GovukAttributes, type GovukContent } from "../../internal";

/** Props mirror the `govukErrorMessage` macro options 1:1 (upstream/components/error-message/macro-options.json). */
export interface ErrorMessageOptions extends GovukContent {
  /** ID attribute to add to the error message `<p>` tag. */
  id?: string;
  /** Classes to add to the error message `<p>` tag. */
  classes?: string;
  /** HTML attributes (for example data attributes) to add to the error message `<p>` tag. */
  attributes?: GovukAttributes;
  /** A visually hidden prefix used before the error message. Defaults to `"Error"`. Pass `""` or `false` to remove it. */
  visuallyHiddenText?: string | false;
}

export type ErrorMessageProps = ErrorMessageOptions &
  Omit<HTMLAttributes<HTMLParagraphElement>, keyof ErrorMessageOptions | "className" | "dangerouslySetInnerHTML">;

export const ErrorMessage = forwardRef<HTMLParagraphElement, ErrorMessageProps>(function ErrorMessage(
  { text, html, children, id, classes, attributes, visuallyHiddenText = "Error", ...rest },
  ref,
) {
  const body = content({ text, html, children });
  return (
    <p ref={ref} {...rest} {...(id ? { id } : {})} className={cx("govuk-error-message", classes)} {...govukAttributes(attributes)}>
      {visuallyHiddenText ? (
        <>
          <span className="govuk-visually-hidden">{visuallyHiddenText}:</span> {body}
        </>
      ) : (
        body
      )}
    </p>
  );
});
