import { forwardRef, useRef, type HTMLAttributes, type ReactNode } from "react";
import { Button as GovukButton } from "govuk-frontend";
import { content, cx, govukAttributes, mergeRefs, useGovukModule, type GovukAttributes, type GovukContent } from "../../internal";

/**
 * Props mirror the `govukButton` macro options 1:1
 * (upstream/components/button/macro-options.json), plus `children` and
 * native HTML props for the root element.
 */
export interface ButtonOptions extends GovukContent {
  /** Type of the button – `"button"`, `"submit"` or `"reset"`. Defaults to `"submit"`. No effect if `href` is set. */
  type?: "button" | "submit" | "reset";
  /** Name of the button, sent when a form is submitted. No effect if `href` is set. */
  name?: string;
  /** Value of the button, sent when a form is submitted. No effect if `href` is set. */
  value?: string;
  /** Whether the button should be disabled. Sets `disabled` and `aria-disabled`. No effect if `href` is set. */
  disabled?: boolean;
  /** The URL that the button should link to. Renders an `<a>` instead of a `<button>`. */
  href?: string;
  /** Classes to add to the button. */
  classes?: string;
  /** HTML attributes (for example data attributes) to add to the button. */
  attributes?: GovukAttributes;
  /** Prevent accidental double clicks on submit buttons from submitting forms multiple times. */
  preventDoubleClick?: boolean;
  /** Use for the main call to action on your service's start page. */
  isStartButton?: boolean;
  /** The ID of the button. */
  id?: string;
}

export type ButtonProps = ButtonOptions &
  Omit<HTMLAttributes<HTMLElement>, keyof ButtonOptions | "className" | "dangerouslySetInnerHTML">;

function StartIcon() {
  return (
    <svg
      className="govuk-button__start-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="17.5"
      height="19"
      viewBox="0 0 33 40"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d="M0 0h13l20 20-20 20H0l20-20z" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(
  {
    text,
    html,
    children,
    type,
    name,
    value,
    disabled,
    href,
    classes,
    attributes,
    preventDoubleClick,
    isStartButton,
    id,
    ...rest
  },
  forwardedRef,
) {
  const localRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  useGovukModule(localRef, GovukButton);

  const body = content({ text, html, children });
  const isRich = children !== undefined || html !== undefined;
  // Start buttons use flexbox, so rich content is wrapped in a <span> upstream.
  const buttonText: ReactNode = isRich && isStartButton ? <span>{body}</span> : body;

  const common = {
    ...rest,
    className: cx("govuk-button", classes, isStartButton && "govuk-button--start"),
    "data-module": "govuk-button",
    ...govukAttributes(attributes),
    ...(id ? { id } : {}),
    ref: mergeRefs(localRef, forwardedRef),
  };

  if (href) {
    return (
      <a href={href} role="button" draggable="false" {...common}>
        {buttonText}
        {isStartButton && <> <StartIcon /></>}
      </a>
    );
  }

  return (
    <button
      type={type || "submit"}
      {...(value ? { value } : {})}
      {...(name ? { name } : {})}
      {...(disabled ? { disabled: true, "aria-disabled": "true" } : {})}
      {...(preventDoubleClick !== undefined ? { "data-prevent-double-click": String(preventDoubleClick) } : {})}
      {...common}
    >
      {buttonText}
      {isStartButton && <> <StartIcon /></>}
    </button>
  );
});
