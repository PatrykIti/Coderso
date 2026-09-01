// @vitest-environment happy-dom

// TASK-505-03 (Item A): SECTION inspector unit coverage — the pure
// `buildSectionLayoutPatch` (read-current → merge → prune, byte-stable) and the
// `ScreenSectionInspector` render (Columns EnumRow + gap Input; null → dashed
// placeholder; an unset section emits NO patch on mount).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  buildSectionLayoutPatch,
  ScreenSectionInspector,
  SCREEN_SECTION_COLUMNS_DEFAULT_OPTION,
} from "../../../core/admin/ui/custom-screens/ScreenBlockInspector";
import type { ScreenSectionV1 } from "../../../core/services/customScreens/customScreenSchemas";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

const section = (style?: ScreenSectionV1["style"]): ScreenSectionV1 => ({
  id: "section-1",
  type: "section",
  label: "Details",
  data: { title: "Details" },
  ...(style ? { style } : {}),
  blocks: [],
});

// --- buildSectionLayoutPatch (pure) ---------------------------------------

test("buildSectionLayoutPatch: columns sentinel and unknown preset PRUNE the key", () => {
  expect(
    buildSectionLayoutPatch(
      { columns: "2" },
      { kind: "columns", value: SCREEN_SECTION_COLUMNS_DEFAULT_OPTION }
    )
  ).toBeUndefined();
  // unknown preset also prunes (harmless — mirrors the coerce-not-throw normalizer)
  expect(
    buildSectionLayoutPatch({ columns: "2" }, { kind: "columns", value: "9-9" })
  ).toBeUndefined();
});

test("buildSectionLayoutPatch: a valid preset SETS columns", () => {
  expect(buildSectionLayoutPatch(undefined, { kind: "columns", value: "3-1" })).toEqual({
    columns: "3-1",
  });
});

test("buildSectionLayoutPatch: columnGap blank/non-finite prunes, in-range floors+clamps 0..64", () => {
  expect(
    buildSectionLayoutPatch({ columnGap: 20 }, { kind: "columnGap", value: "" })
  ).toBeUndefined();
  expect(
    buildSectionLayoutPatch({ columnGap: 20 }, { kind: "columnGap", value: "abc" })
  ).toBeUndefined();
  expect(buildSectionLayoutPatch(undefined, { kind: "columnGap", value: "40.9" })).toEqual({
    columnGap: 40,
  });
  // clamp above max
  expect(buildSectionLayoutPatch(undefined, { kind: "columnGap", value: "999" })).toEqual({
    columnGap: 64,
  });
  // clamp below min
  expect(buildSectionLayoutPatch(undefined, { kind: "columnGap", value: "-5" })).toEqual({
    columnGap: 0,
  });
});

test("buildSectionLayoutPatch: empty style prunes to undefined (byte-stable guard)", () => {
  // Setting a gap then clearing it returns to ABSENT, not `{}`.
  expect(
    buildSectionLayoutPatch({ columnGap: 12 }, { kind: "columnGap", value: "" })
  ).toBeUndefined();
});

test("buildSectionLayoutPatch: read-current merge keeps a prior columns when editing gap", () => {
  expect(buildSectionLayoutPatch({ columns: "2" }, { kind: "columnGap", value: "24" })).toEqual({
    columns: "2",
    columnGap: 24,
  });
});

// --- ScreenSectionInspector (render) --------------------------------------

test("ScreenSectionInspector renders the Columns control + gap input for a section", () => {
  const view = mount(<ScreenSectionInspector section={section()} onPatchSection={vi.fn()} />);
  try {
    expect(view.container.querySelector("[data-screen-section-layout-group]")).not.toBeNull();
    expect(view.container.querySelector("[data-screen-section-gap]")).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("ScreenSectionInspector: choosing a Columns preset commits the style via onPatchSection", () => {
  const onPatchSection = vi.fn();
  const view = mount(
    <ScreenSectionInspector section={section()} onPatchSection={onPatchSection} />
  );
  try {
    const trigger = view.container.querySelector<HTMLElement>('[aria-label="Columns"]');
    expect(trigger).not.toBeNull();
    React.act(() => {
      trigger?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      trigger?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      trigger?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    const option = Array.from(document.body.querySelectorAll<HTMLElement>("[role='option']")).find(
      (node) => node.textContent?.trim() === "2 equal"
    );
    expect(option).not.toBeNull();
    React.act(() => {
      option?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      option?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(onPatchSection).toHaveBeenCalledWith({ style: { columns: "2" } });
  } finally {
    view.cleanup();
  }
});

test("ScreenSectionInspector: null section → dashed placeholder, no controls", () => {
  const view = mount(<ScreenSectionInspector section={null} onPatchSection={vi.fn()} />);
  try {
    expect(view.container.querySelector("[data-screen-section-layout-group]")).toBeNull();
    expect(view.container.querySelector("[data-screen-section-gap]")).toBeNull();
    expect(view.container.textContent).toContain("Select a section");
  } finally {
    view.cleanup();
  }
});

test("ScreenSectionInspector: an unset section shows blank gap and emits NO patch on mount", () => {
  const onPatchSection = vi.fn();
  const view = mount(
    <ScreenSectionInspector section={section()} onPatchSection={onPatchSection} />
  );
  try {
    const gap = view.container.querySelector<HTMLInputElement>("[data-screen-section-gap]");
    expect(gap?.value).toBe("");
    expect(onPatchSection).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ScreenSectionInspector: editing the gap input commits the merged style via onPatchSection", () => {
  const onPatchSection = vi.fn();
  const view = mount(
    <ScreenSectionInspector section={section({ columns: "2" })} onPatchSection={onPatchSection} />
  );
  try {
    const gap = view.container.querySelector<HTMLInputElement>("[data-screen-section-gap]")!;
    React.act(() => {
      gap.focus();
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(gap), "value")?.set;
      setter?.call(gap, "24");
      gap.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onPatchSection).toHaveBeenCalledWith({ style: { columns: "2", columnGap: 24 } });
  } finally {
    view.cleanup();
  }
});
