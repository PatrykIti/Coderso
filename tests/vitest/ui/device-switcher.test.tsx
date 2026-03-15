// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    className,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} data-variant={variant} className={className} {...props}>
      {children}
    </button>
  ),
}));

import { DeviceSwitcher } from "../../../core/admin/ui/pages/DeviceSwitcher";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("DeviceSwitcher renders buttons and updates uncontrolled state", () => {
  const onChange = vi.fn();
  const view = mount(<DeviceSwitcher onChange={onChange} className="custom-switcher" />);

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const desktopButton = buttons.find((button) => button.getAttribute("aria-label") === "Desktop");
    const tabletButton = buttons.find((button) => button.getAttribute("aria-label") === "Tablet");
    const mobileButton = buttons.find((button) => button.getAttribute("aria-label") === "Mobile");

    expect(desktopButton).toBeDefined();
    expect(tabletButton).toBeDefined();
    expect(mobileButton).toBeDefined();
    expect(view.container.firstElementChild?.className).toContain("custom-switcher");
    expect(desktopButton?.getAttribute("data-variant")).toBe("secondary");
    expect(tabletButton?.getAttribute("data-variant")).toBe("ghost");

    act(() => {
      (tabletButton as HTMLButtonElement).click();
    });

    expect(onChange).toHaveBeenCalledWith("tablet");
    expect(tabletButton?.getAttribute("data-variant")).toBe("secondary");
    expect(desktopButton?.getAttribute("data-variant")).toBe("ghost");
    expect(mobileButton?.getAttribute("data-variant")).toBe("ghost");
  } finally {
    view.cleanup();
  }
});

test("DeviceSwitcher respects controlled value without mutating internal state", () => {
  const onChange = vi.fn();
  const view = mount(<DeviceSwitcher value="mobile" onChange={onChange} />);

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const tabletButton = buttons.find((button) => button.getAttribute("aria-label") === "Tablet");
    const mobileButton = buttons.find((button) => button.getAttribute("aria-label") === "Mobile");

    act(() => {
      (tabletButton as HTMLButtonElement).click();
    });

    expect(onChange).toHaveBeenCalledWith("tablet");
    expect(mobileButton?.getAttribute("data-variant")).toBe("secondary");
    expect(tabletButton?.getAttribute("data-variant")).toBe("ghost");
    expect(mobileButton?.className).toContain("shadow-sm");
  } finally {
    view.cleanup();
  }
});

test("DeviceSwitcher updates internal state without external callback and preserves controlled visual state", () => {
  const uncontrolledView = mount(<DeviceSwitcher />);

  try {
    const buttons = Array.from(uncontrolledView.container.querySelectorAll("button"));
    const mobileButton = buttons.find((button) => button.getAttribute("aria-label") === "Mobile");
    const desktopButton = buttons.find((button) => button.getAttribute("aria-label") === "Desktop");

    act(() => {
      (mobileButton as HTMLButtonElement).click();
    });

    expect(mobileButton?.getAttribute("data-variant")).toBe("secondary");
    expect(desktopButton?.getAttribute("data-variant")).toBe("ghost");
  } finally {
    uncontrolledView.cleanup();
  }

  const ControlledHarness = () => {
    const [value, setValue] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
    return (
      <div>
        <DeviceSwitcher value={value} onChange={() => undefined} />
        <button type="button" onClick={() => setValue("tablet")}>
          force-tablet
        </button>
      </div>
    );
  };

  const controlledView = mount(<ControlledHarness />);

  try {
    const tabletButton = Array.from(controlledView.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Tablet"
    );

    act(() => {
      Array.from(controlledView.container.querySelectorAll("button"))
        .find((button) => button.textContent === "force-tablet")
        ?.click();
    });

    expect(tabletButton?.getAttribute("data-variant")).toBe("secondary");
  } finally {
    controlledView.cleanup();
  }
});
