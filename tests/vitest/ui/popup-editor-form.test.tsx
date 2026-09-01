// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children?: React.ReactNode;
  }) => (
    <select
      data-testid={`select-${value}`}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {/* options are irrelevant; the controlled value + change contract is what matters */}
      <option value={value}>{value}</option>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value }: { value: string }) => <option value={value}>{value}</option>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    />
  ),
}));

import { PopupEditorForm } from "../../../core/admin/ui/popups/components/PopupEditorForm";
import {
  createEmptyPopupDraft,
  type PopupEditorDraft,
} from "../../../core/admin/ui/popups/popupEditorModel";

function Host({ initial }: { initial?: Partial<PopupEditorDraft> }) {
  const [draft, setDraft] = React.useState({ ...createEmptyPopupDraft(), ...initial });
  return (
    <PopupEditorForm
      draft={draft}
      onPatch={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
    />
  );
}

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

const setValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  React.act(() => {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const setSelectValue = (select: HTMLSelectElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  if (!setter) throw new Error("value setter unavailable");
  setter.call(select, value);
  React.act(() => {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

describe("PopupEditorForm", () => {
  it("renders the editor chrome with the untitled badge and default preview copy", () => {
    const view = mount(<Host />);
    expect(view.container.textContent).toContain("Popup editor");
    expect(view.container.textContent).toContain("Untitled · draft");
    expect(view.container.textContent).toContain("Popup title");
    expect(view.container.querySelector("[data-testid='popup-backdrop']")).not.toBeNull();
    // rail affordances render
    for (const label of ["Heading", "Text", "Input", "Button", "Image"]) {
      expect(view.container.textContent).toContain(label);
    }
    view.unmount();
  });

  it("reflects identity and content edits into the live preview", () => {
    const view = mount(<Host initial={{ name: "Promo" }} />);
    expect(view.container.textContent).toContain("Promo · draft");

    const titleInput = Array.from(view.container.querySelectorAll("input")).find(
      (candidate) => candidate.placeholder === "Get 10% off your first order"
    ) as HTMLInputElement;
    expect(titleInput).toBeDefined();
    setValue(titleInput, "Flash sale");
    expect(view.container.textContent).toContain("Flash sale");

    const textareas = view.container.querySelectorAll("textarea");
    setValue(textareas[0] as HTMLTextAreaElement, "/shop\n/blog");
    setValue(textareas[1] as HTMLTextAreaElement, "/checkout");

    const ctaLabelInput = Array.from(view.container.querySelectorAll("input")).find(
      (candidate) => candidate.placeholder === "Claim offer"
    ) as HTMLInputElement;
    setValue(ctaLabelInput, "Buy now");
    // CTA button appears in the preview with the typed label
    expect(
      Array.from(view.container.querySelectorAll("button")).some(
        (candidate) => candidate.textContent === "Buy now"
      )
    ).toBe(true);
    view.unmount();
  });

  it("shows placeholder fallbacks when content is empty", () => {
    const view = mount(<Host />);
    expect(view.container.textContent).toContain("Popup title");
    expect(view.container.textContent).toContain("Popup body copy…");
    // empty CTA label renders no CTA button in the preview card
    view.unmount();
  });

  it.each([
    ["top_banner", "max-w-full self-start"],
    ["bottom_right", "ml-auto max-w-xs self-end"],
  ])("places the preview card for the %s placement", (placement, expectedClass) => {
    const view = mount(
      <Host initial={{ placement: placement as PopupEditorDraft["placement"] }} />
    );
    expect(view.container.innerHTML).toContain(expectedClass);
    view.unmount();
  });

  it("hides the backdrop when the overlay switch is off", () => {
    const view = mount(<Host initial={{ showOverlay: false }} />);
    expect(view.container.querySelector("[data-testid='popup-backdrop']")).toBeNull();

    const overlaySwitch = view.container.querySelector("button[aria-label='Overlay']")!;
    React.act(() => {
      (overlaySwitch as HTMLElement).click();
    });
    expect(view.container.querySelector("[data-testid='popup-backdrop']")).not.toBeNull();
    view.unmount();
  });

  it("toggles the dismissible switch through onCheckedChange", () => {
    const view = mount(<Host initial={{ dismissible: false }} />);
    const switchButton = view.container.querySelector<HTMLButtonElement>(
      "button[aria-label='Dismissible']"
    )!;
    expect(switchButton.getAttribute("aria-checked")).toBe("false");
    // dismissible=false hides the "No thanks" escape link
    expect(view.container.textContent).not.toContain("No thanks");
    React.act(() => {
      switchButton.click();
    });
    expect(
      view.container.querySelector("button[aria-label='Dismissible']")!.getAttribute("aria-checked")
    ).toBe("true");
    expect(view.container.textContent).toContain("No thanks");
    view.unmount();
  });

  it("swaps trigger-specific fields with the trigger type selection", () => {
    const view = mount(<Host />);
    // default time_delay exposes the delay field
    expect(
      Array.from(view.container.querySelectorAll("input")).some(
        (candidate) => candidate.type === "number"
      )
    ).toBe(true);

    const scrollView = mount(<Host initial={{ triggerType: "scroll_depth" }} />);
    expect(scrollView.container.innerHTML).toContain("Scroll depth");
    scrollView.unmount();

    const ctaView = mount(<Host initial={{ triggerType: "cta_click" }} />);
    const selectorInput = Array.from(ctaView.container.querySelectorAll("input")).find(
      (candidate) => candidate.value === ".cta-trigger"
    );
    expect(selectorInput).toBeDefined();
    ctaView.unmount();

    view.unmount();
  });
});

describe("PopupEditorForm inspector bindings", () => {
  it("round-trips slug edits and drives the status badge through the status select", () => {
    const view = mount(<Host initial={{ name: "Promo" }} />);

    const slugInput = view.container.querySelector<HTMLInputElement>(
      "input[placeholder='winter-promo-popup']"
    )!;
    setValue(slugInput, "winter-promo");
    // the controlled slug field keeps the patched value from the host draft
    expect(
      (view.container.querySelector("input[placeholder='winter-promo-popup']") as HTMLInputElement)
        .value
    ).toBe("winter-promo");

    setSelectValue(
      view.container.querySelector<HTMLSelectElement>("select[data-testid='select-draft']")!,
      "published"
    );
    // the chrome badge reflects the new status next to the name
    expect(view.container.textContent).toContain("Promo · published");
    view.unmount();
  });

  it("swaps trigger-specific inputs through the trigger type select and round-trips their values", () => {
    const view = mount(<Host />);
    const triggerSelect = () =>
      view.container.querySelector<HTMLSelectElement>("select[data-testid='select-time_delay']")!;

    // scroll_depth swaps the delay field for the percent field
    setSelectValue(triggerSelect(), "scroll_depth");
    expect(view.container.querySelector("input[type='number'][max='3600']")).toBeNull();
    const percentInput = view.container.querySelector<HTMLInputElement>(
      "input[type='number'][max='100']"
    )!;
    setValue(percentInput, "75");
    expect(
      (view.container.querySelector("input[type='number'][max='100']") as HTMLInputElement).value
    ).toBe("75");

    // cta_click exposes the CSS selector binding instead
    setSelectValue(
      view.container.querySelector<HTMLSelectElement>("select[data-testid='select-scroll_depth']")!,
      "cta_click"
    );
    const selectorInput = view.container.querySelector<HTMLInputElement>(
      "input[placeholder='.open-popup']"
    )!;
    setValue(selectorInput, ".hero-cta");
    expect(
      (view.container.querySelector("input[placeholder='.open-popup']") as HTMLInputElement).value
    ).toBe(".hero-cta");

    // exit_intent renders no numeric or selector follow-up at all
    setSelectValue(
      view.container.querySelector<HTMLSelectElement>("select[data-testid='select-cta_click']")!,
      "exit_intent"
    );
    expect(view.container.querySelector("input[type='number'][max='3600']")).toBeNull();
    expect(view.container.querySelector("input[type='number'][max='100']")).toBeNull();
    expect(view.container.querySelector("input[placeholder='.open-popup']")).toBeNull();

    // back to time_delay: the delay input is editable again
    setSelectValue(
      view.container.querySelector<HTMLSelectElement>("select[data-testid='select-exit_intent']")!,
      "time_delay"
    );
    const delayInput = view.container.querySelector<HTMLInputElement>(
      "input[type='number'][max='3600']"
    )!;
    setValue(delayInput, "12");
    expect(
      (view.container.querySelector("input[type='number'][max='3600']") as HTMLInputElement).value
    ).toBe("12");
    view.unmount();
  });

  it("patches audience, frequency strategy, and cooldown through their controls", () => {
    const view = mount(<Host />);

    setSelectValue(
      view.container.querySelector<HTMLSelectElement>("select[data-testid='select-all']")!,
      "logged_in"
    );
    expect(view.container.querySelector("select[data-testid='select-logged_in']")).not.toBeNull();

    setSelectValue(
      view.container.querySelector<HTMLSelectElement>("select[data-testid='select-session_once']")!,
      "daily_once"
    );
    expect(view.container.querySelector("select[data-testid='select-daily_once']")).not.toBeNull();

    const cooldownInput = view.container.querySelector<HTMLInputElement>(
      "input[placeholder='optional']"
    )!;
    setValue(cooldownInput, "120");
    expect(
      (view.container.querySelector("input[placeholder='optional']") as HTMLInputElement).value
    ).toBe("120");
    view.unmount();
  });

  it("reflects body copy in the preview and round-trips template id and CTA URL edits", () => {
    const view = mount(<Host />);

    // body is the third textarea: include paths, exclude paths, then body copy
    const bodyArea = view.container.querySelectorAll("textarea")[2] as HTMLTextAreaElement;
    setValue(bodyArea, "Members-only drop");
    // visible effect: the preview paragraph shows the typed body
    expect(view.container.textContent).toContain("Members-only drop");

    const templateInput = view.container.querySelector<HTMLInputElement>(
      "input[placeholder='template-hero-popup']"
    )!;
    setValue(templateInput, "tpl-winter");
    expect(
      (view.container.querySelector("input[placeholder='template-hero-popup']") as HTMLInputElement)
        .value
    ).toBe("tpl-winter");

    const hrefInput = view.container.querySelector<HTMLInputElement>(
      "input[placeholder='/promo']"
    )!;
    setValue(hrefInput, "/sale-2026");
    expect(
      (view.container.querySelector("input[placeholder='/promo']") as HTMLInputElement).value
    ).toBe("/sale-2026");
    view.unmount();
  });

  it("moves the preview card through the placement select", () => {
    const view = mount(<Host />);
    expect(view.container.innerHTML).toContain("max-w-sm");

    setSelectValue(
      view.container.querySelector<HTMLSelectElement>("select[data-testid='select-center']")!,
      "top_banner"
    );
    expect(view.container.innerHTML).toContain("max-w-full self-start");

    setSelectValue(
      view.container.querySelector<HTMLSelectElement>("select[data-testid='select-top_banner']")!,
      "bottom_right"
    );
    expect(view.container.innerHTML).toContain("ml-auto max-w-xs self-end");
    view.unmount();
  });
});

describe("PopupEditorForm identity binding", () => {
  it("round-trips name edits into the chrome badge with a visible effect", () => {
    const view = mount(<Host />);
    // the untitled placeholder badge precedes any name edit
    expect(view.container.textContent).toContain("Untitled · draft");

    const nameInput = view.container.querySelector<HTMLInputElement>(
      "input[placeholder='Winter Promo Popup']"
    )!;
    expect(nameInput).toBeDefined();
    setValue(nameInput, "Holiday Promo");
    // the chrome badge reflects the patched name next to the current status
    expect(view.container.textContent).toContain("Holiday Promo · draft");
    view.unmount();
  });

  it("renders the slug description helper text for the identity row", () => {
    const view = mount(<Host />);
    expect(view.container.textContent).toContain("Lowercase URL-safe identifier.");
    view.unmount();
  });
});
