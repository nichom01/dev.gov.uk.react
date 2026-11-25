import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

// Behaviour tests. Markup is covered by test/conformance.test.tsx.
describe("Button", () => {
  it("initialises the upstream govuk-button JavaScript once mounted", () => {
    render(<Button text="Save" />);
    expect(screen.getByRole("button")).toHaveAttribute("data-govuk-button-init");
  });

  it("accepts children as an alias for html", () => {
    render(
      <Button>
        Save <em>draft</em>
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("Save draft");
  });

  it("passes native props such as onClick through", async () => {
    const onClick = vi.fn();
    render(<Button text="Go" type="button" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("forwards refs to the rendered element", () => {
    const ref = createRef<HTMLButtonElement | HTMLAnchorElement>();
    render(<Button text="Go" href="/next" ref={ref} />);
    expect(ref.current?.tagName).toBe("A");
  });

  it("prevents double clicks when preventDoubleClick is set (upstream behaviour)", async () => {
    const onSubmit = vi.fn((e: SubmitEvent) => e.preventDefault());
    const { container } = render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
        <Button text="Submit" preventDoubleClick />
      </form>,
    );
    const button = container.querySelector("button")!;
    await userEvent.dblClick(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
