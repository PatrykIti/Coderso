// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const mediaPickerState = vi.hoisted(() => ({
  lastProps: null as Record<string, unknown> | null,
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: (props: Record<string, unknown>) => {
    mediaPickerState.lastProps = props;
    return <div data-shared-media-picker="true">Shared media picker</div>;
  },
}));

import { ColorSwatchControl } from "../../../core/admin/ui/pages/editorControls/ColorSwatchControl";
import {
  editorDarkButtonClass,
  editorDarkGhostButtonClass,
} from "../../../core/admin/ui/pages/editorControls/controlChrome";
import { MediaPickerControl } from "../../../core/admin/ui/pages/editorControls/MediaPickerControl";
import { SegmentedControl } from "../../../core/admin/ui/pages/editorControls/SegmentedControl";
import { SliderControl } from "../../../core/admin/ui/pages/editorControls/SliderControl";
import { SliderStepperControl } from "../../../core/admin/ui/pages/editorControls/SliderStepperControl";
import { ToggleSwitch } from "../../../core/admin/ui/pages/editorControls/ToggleSwitch";
import { getPageEditorColorPalette } from "../../../core/services/pages/pageEditorControlUiModel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mounted: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const render = (element: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(element);
  });
  mounted.push({ root, container });
  return container;
};

const click = (element: Element | null | undefined) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setRangeValue = (input: HTMLInputElement, value: string) => {
  React.act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const pressEnter = (element: Element) => {
  React.act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
};

afterEach(() => {
  for (const { root, container } of mounted) {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
  mounted = [];
  mediaPickerState.lastProps = null;
});

test("SegmentedControl renders contract pills with labels and no native select", () => {
  const onChange = vi.fn();
  const container = render(
    <SegmentedControl
      label="Justify"
      value="between"
      options={["start", "center", "end", "between"]}
      optionLabels={{ start: "Start", center: "Center", end: "End", between: "Between" }}
      onChange={onChange}
    />
  );

  expect(container.querySelector("select")).toBeNull();
  const buttons = Array.from(
    container.querySelectorAll<HTMLButtonElement>("[data-page-editor-segmented-option]")
  );
  expect(buttons.map((button) => button.dataset.pageEditorSegmentedOption)).toEqual([
    "start",
    "center",
    "end",
    "between",
  ]);
  expect(buttons.map((button) => button.textContent)).toEqual([
    "Start",
    "Center",
    "End",
    "Between",
  ]);
  expect(buttons.map((button) => button.getAttribute("aria-pressed"))).toEqual([
    "false",
    "false",
    "false",
    "true",
  ]);
  expect(container.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Justify");

  click(buttons[1]);
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith("center");

  // Clicking the already-active option does not emit a redundant change.
  click(buttons[3]);
  expect(onChange).toHaveBeenCalledTimes(1);
});

test("SegmentedControl renders a horizontally scrollable non-wrapping strip", () => {
  const container = render(
    <SegmentedControl
      label="Level"
      value="h4"
      options={["h1", "h2", "h3", "h4", "h5", "h6"]}
      onChange={() => {}}
    />
  );

  // Wide option sets must scroll inside the strip instead of widening the
  // host panel cell and overlapping the neighboring column.
  expect(container.querySelector('[data-page-editor-control="segmented"]')?.className).toContain(
    "min-w-0"
  );
  const group = container.querySelector('[role="group"]') as HTMLElement;
  expect(group.className).toContain("overflow-x-auto");
  expect(group.className).toContain("flex-nowrap");
  expect(group.className).toContain("snap-x");
  expect(group.className).toContain("[scrollbar-width:thin]");
  for (const button of Array.from(
    group.querySelectorAll<HTMLButtonElement>("[data-page-editor-segmented-option]")
  )) {
    expect(button.className).toContain("shrink-0");
    expect(button.className).toContain("snap-start");
    expect(button.className).toContain("whitespace-nowrap");
  }
});

test("SegmentedControl scrolls the selected option into view on mount and on arrow keys", () => {
  const scrollSpy = vi.fn();
  const hadScrollIntoView = "scrollIntoView" in Element.prototype;
  const originalScrollIntoView = (
    Element.prototype as Element & { scrollIntoView?: (options?: unknown) => void }
  ).scrollIntoView;
  Element.prototype.scrollIntoView = scrollSpy;
  try {
    const container = render(
      <SegmentedControl
        label="Level"
        value="h6"
        options={["h1", "h2", "h3", "h4", "h5", "h6"]}
        onChange={() => {}}
      />
    );

    // Mount scrolls the selected option into view with nearest alignment.
    expect(scrollSpy).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
    const mountTarget = scrollSpy.mock.contexts.at(0) as HTMLElement;
    expect(mountTarget.getAttribute("data-page-editor-segmented-option")).toBe("h6");

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-page-editor-segmented-option]")
    );
    React.act(() => {
      buttons[0]?.focus();
    });
    scrollSpy.mockClear();
    React.act(() => {
      buttons[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(document.activeElement).toBe(buttons[1]);
    expect(scrollSpy).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });

    React.act(() => {
      buttons[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    expect(document.activeElement).toBe(buttons[0]);

    // Arrow keys stop at the strip edges instead of wrapping.
    React.act(() => {
      buttons[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    expect(document.activeElement).toBe(buttons[0]);
  } finally {
    if (hadScrollIntoView) {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    } else {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  }
});

test("SegmentedControl disabled state blocks changes", () => {
  const onChange = vi.fn();
  const container = render(
    <SegmentedControl
      label="Align"
      value="left"
      options={["left", "center", "right"]}
      onChange={onChange}
      disabled
    />
  );
  const button = container.querySelector('[data-page-editor-segmented-option="center"]');
  expect((button as HTMLButtonElement).disabled).toBe(true);
  click(button);
  expect(onChange).not.toHaveBeenCalled();
});

test("ToggleSwitch renders role=switch with aria-checked and emits inverted value", () => {
  const onChange = vi.fn();
  const container = render(<ToggleSwitch label="Visible" value={true} onChange={onChange} />);

  expect(container.querySelector("select")).toBeNull();
  const toggle = container.querySelector('[role="switch"]');
  expect(toggle).toBeTruthy();
  expect(toggle?.getAttribute("aria-checked")).toBe("true");
  expect(toggle?.getAttribute("aria-label")).toBe("Visible");
  expect((toggle as HTMLElement).dataset.pageEditorToggle).toBe("on");

  click(toggle);
  expect(onChange).toHaveBeenCalledWith(false);
});

test("ToggleSwitch disabled state blocks changes", () => {
  const onChange = vi.fn();
  const container = render(
    <ToggleSwitch label="Auth only" value={false} onChange={onChange} disabled />
  );
  const toggle = container.querySelector('[role="switch"]');
  expect(toggle?.getAttribute("aria-checked")).toBe("false");
  click(toggle);
  expect(onChange).not.toHaveBeenCalled();
});

test("SliderControl renders a range input with visible value and clamps changes", () => {
  const onChange = vi.fn();
  const container = render(
    <SliderControl
      label="Radius"
      value={14}
      min={0}
      max={64}
      step={1}
      unit="px"
      onChange={onChange}
    />
  );

  expect(container.querySelector('input[type="number"]')).toBeNull();
  const range = container.querySelector<HTMLInputElement>('input[type="range"]');
  expect(range).toBeTruthy();
  expect(range?.min).toBe("0");
  expect(range?.max).toBe("64");
  expect(range?.step).toBe("1");
  expect(range?.value).toBe("14");
  expect(container.querySelector("output")?.textContent).toBe("14px");

  setRangeValue(range!, "32");
  expect(onChange).toHaveBeenCalledWith(32);
});

test("SliderControl clamps out-of-range incoming values in the readout", () => {
  const container = render(
    <SliderControl
      label="Max width"
      value={99999}
      min={320}
      max={1920}
      step={10}
      unit="px"
      onChange={() => {}}
    />
  );
  expect(container.querySelector("output")?.textContent).toBe("1920px");
  expect(container.querySelector<HTMLInputElement>('input[type="range"]')?.value).toBe("1920");
});

test("SliderStepperControl pairs the range input with clamped stepper buttons", () => {
  const onChange = vi.fn();
  const container = render(
    <SliderStepperControl
      label="Max width"
      value={1910}
      min={320}
      max={1920}
      step={10}
      unit="px"
      onChange={onChange}
    />
  );

  expect(container.querySelector('input[type="number"]')).toBeNull();
  expect(container.querySelector('input[type="range"]')).toBeTruthy();
  expect(container.querySelector('[data-page-editor-slider-stepper="Max width"]')).toBeTruthy();

  const increase = container.querySelector('button[aria-label="Increase Max width"]');
  const decrease = container.querySelector('button[aria-label="Decrease Max width"]');
  expect(increase).toBeTruthy();
  expect(decrease).toBeTruthy();

  click(increase);
  expect(onChange).toHaveBeenCalledWith(1920);
  click(decrease);
  expect(onChange).toHaveBeenCalledWith(1900);
});

test("SliderStepperControl disables steppers at the clamp edges", () => {
  const container = render(
    <SliderStepperControl
      label="Padding top"
      value={0}
      min={0}
      max={240}
      step={4}
      onChange={() => {}}
    />
  );
  const decrease = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Decrease Padding top"]'
  );
  const increase = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Increase Padding top"]'
  );
  expect(decrease?.disabled).toBe(true);
  expect(increase?.disabled).toBe(false);
});

test("ColorSwatchControl renders token swatches, native picker, and hex affordance", () => {
  const onChange = vi.fn();
  const container = render(
    <ColorSwatchControl label="Accent" value="var(--color-accent)" onChange={onChange} />
  );

  const swatches = Array.from(
    container.querySelectorAll<HTMLButtonElement>("[data-page-editor-color-swatch]")
  );
  // Token palette plus the leading "Transparent" swatch.
  expect(swatches).toHaveLength(getPageEditorColorPalette().length + 1);
  expect(swatches[0]?.dataset.pageEditorColorSwatch).toBe("transparent");
  const pressed = swatches.filter((swatch) => swatch.getAttribute("aria-pressed") === "true");
  expect(pressed).toHaveLength(1);
  expect(pressed[0]?.dataset.pageEditorColorSwatch).toBe("accent");

  expect(container.querySelector('input[type="color"]')).toBeTruthy();
  expect(container.querySelector("[data-page-editor-color-hex]")).toBeTruthy();

  click(swatches.find((swatch) => swatch.dataset.pageEditorColorSwatch === "primary"));
  expect(onChange).toHaveBeenCalledWith("var(--color-primary)");
});

test("ColorSwatchControl previews the passed (live-token) palette, not the default (TASK-477-02)", () => {
  // A custom palette stands in for the live site palette threaded from PageEditor;
  // the swatch must preview the palette's previewValue, not a hardcoded default.
  const palette = [
    {
      id: "accent",
      label: "Accent",
      value: "var(--color-accent)",
      previewValue: "var(--test-accent)",
    },
  ];
  const container = render(
    <ColorSwatchControl
      label="Text color"
      value=""
      palette={palette}
      allowTransparent={false}
      allowCustom={false}
      onChange={vi.fn()}
    />
  );

  const swatch = container.querySelector<HTMLElement>('[data-page-editor-color-swatch="accent"]');
  expect(swatch).toBeTruthy();
  expect(swatch?.getAttribute("style") ?? "").toContain("var(--test-accent)");
});

test("ColorSwatchControl keeps unknown values as a non-mutating custom state", () => {
  const onChange = vi.fn();
  const container = render(
    <ColorSwatchControl label="Background" value="rebeccapurple" onChange={onChange} />
  );
  const pressed = container.querySelectorAll(
    '[data-page-editor-color-swatch][aria-pressed="true"]'
  );
  expect(pressed).toHaveLength(0);
  // The stored value must not be rewritten on mount.
  expect(onChange).not.toHaveBeenCalled();
  // The native picker still shows a safe color without mutating state.
  const picker = container.querySelector<HTMLInputElement>('input[type="color"]');
  expect(picker?.value).toBe("#000000");
});

test("ColorSwatchControl hex affordance commits valid hex and rejects invalid input", () => {
  const onChange = vi.fn();
  const container = render(
    <ColorSwatchControl label="Border" value="#aabbcc" onChange={onChange} />
  );
  const hexInput = container.querySelector<HTMLInputElement>("[data-page-editor-color-hex]");
  expect(hexInput).toBeTruthy();
  expect(hexInput?.value).toBe("#aabbcc");

  React.act(() => {
    hexInput!.value = "#FF8800";
  });
  pressEnter(hexInput!);
  expect(onChange).toHaveBeenCalledWith("#ff8800");

  React.act(() => {
    hexInput!.value = "not-a-color";
  });
  pressEnter(hexInput!);
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(hexInput?.value).toBe("#aabbcc");
});

test("ColorSwatchControl transparent swatch clears the value and tracks empty state", () => {
  const onChange = vi.fn();
  const container = render(
    <ColorSwatchControl label="Background" value="#fef3c7" onChange={onChange} />
  );

  const transparent = container.querySelector<HTMLButtonElement>(
    '[data-page-editor-color-swatch="transparent"]'
  );
  expect(transparent).toBeTruthy();
  expect(transparent?.getAttribute("aria-label")).toBe("Background: Transparent");
  expect(transparent?.getAttribute("aria-pressed")).toBe("false");

  // Selecting "Transparent" clears the stored value with an explicit null.
  click(transparent);
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith(null);
});

test("ColorSwatchControl shows transparent as selected for empty values without redundant writes", () => {
  const onChange = vi.fn();
  const container = render(<ColorSwatchControl label="Text color" value="" onChange={onChange} />);

  const transparent = container.querySelector<HTMLButtonElement>(
    '[data-page-editor-color-swatch="transparent"]'
  );
  expect(transparent?.getAttribute("aria-pressed")).toBe("true");
  // Clicking the already-active transparent swatch must not rewrite the value.
  click(transparent);
  expect(onChange).not.toHaveBeenCalled();
});

test("ColorSwatchControl hides the transparent swatch when allowTransparent is false", () => {
  const container = render(
    <ColorSwatchControl
      label="Accent"
      value="var(--color-accent)"
      onChange={() => {}}
      allowTransparent={false}
    />
  );
  expect(container.querySelector('[data-page-editor-color-swatch="transparent"]')).toBeNull();
});

test("ColorSwatchControl without custom affordance renders preset swatches only", () => {
  const container = render(
    <ColorSwatchControl
      label="Tone"
      value="var(--color-surface)"
      onChange={() => {}}
      allowCustom={false}
    />
  );
  expect(container.querySelectorAll("[data-page-editor-color-swatch]").length).toBeGreaterThan(0);
  expect(container.querySelector('input[type="color"]')).toBeNull();
  expect(container.querySelector("[data-page-editor-color-hex]")).toBeNull();
});

test("MediaPickerControl wraps the shared MediaPicker and never offers a bare URL input", () => {
  const onChange = vi.fn();
  const container = render(
    <MediaPickerControl label="Source" value="asset-123" onChange={onChange} accept={["image/*"]} />
  );

  expect(container.querySelector('[data-page-editor-media-control="Source"]')).toBeTruthy();
  expect(container.querySelector("[data-shared-media-picker]")).toBeTruthy();
  // No raw text/url input is rendered by the control itself as a primary path.
  expect(container.querySelector('input[type="text"]')).toBeNull();
  expect(container.querySelector('input[type="url"]')).toBeNull();

  // The dark floating-toolbar surface forwards the shared dark chrome so the
  // "Browse media" trigger and remove action never use the inverted
  // admin-theme hover (owner finding #4).
  expect(mediaPickerState.lastProps).toMatchObject({
    value: "asset-123",
    multiple: false,
    accept: ["image/*"],
    triggerButtonClassName: editorDarkButtonClass,
    removeButtonClassName: editorDarkGhostButtonClass,
  });
  expect(typeof mediaPickerState.lastProps?.onChange).toBe("function");
  (mediaPickerState.lastProps?.onChange as (value: unknown) => void)("asset-456");
  expect(onChange).toHaveBeenCalledWith("asset-456");
});
