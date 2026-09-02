// @vitest-environment happy-dom
import React from "react";
import { expect, test } from "vitest";

import { createRoot } from "react-dom/client";

import { MenuAppearancePanel } from "../../../core/admin/ui/menus/MenuAppearancePanel";
import type { PageDocumentV2 } from "../../../core/services/pages/pageDocumentV2";
import { createDefaultPageDocumentV2 } from "../../../core/services/pages/pageDocumentV2Normalizer";
import {
  clickFirstSwatch,
  clickSegmented,
  setSliderValue,
  setToggle,
} from "./menuDesignEditorFixtures";

/**
 * TASK-458-03 appearance panel (TASK-105-08-05): every `MenuAppearance`
 * field is exposed through the shared page-editor control primitives. The
 * panel is rendered by the page-editor host surface, so these suites mount
 * it directly with a draft `PageDocumentV2` and assert the draft-discipline
 * writes land on `settings.menuAppearance`.
 */

function AppearanceHarness({
  initial,
  onDocument,
}: {
  initial: PageDocumentV2;
  onDocument: (next: PageDocumentV2) => void;
}) {
  const [document, setDocument] = React.useState(initial);
  const updateDocument = React.useCallback(
    (updater: (current: PageDocumentV2) => PageDocumentV2) => {
      let next: PageDocumentV2 | undefined;
      setDocument((current) => {
        next = updater(current);
        return next;
      });
    },
    []
  );
  // Report the committed draft through an effect so the assertion sees the
  // post-`act` state rather than the updater's provisional value.
  React.useEffect(() => {
    onDocument(document);
  }, [document, onDocument]);
  return (
    <MenuAppearancePanel document={document} device="desktop" updateDocument={updateDocument} />
  );
}

function mountAppearance(initial?: PageDocumentV2) {
  const seed = initial ?? createDefaultPageDocumentV2();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let lastDocument: PageDocumentV2 | undefined;
  React.act(() => {
    root.render(<AppearanceHarness initial={seed} onDocument={(next) => (lastDocument = next)} />);
  });
  const readAppearance = () =>
    lastDocument?.settings?.menuAppearance as Record<string, unknown> | undefined;
  return {
    container,
    readAppearance,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

test("renders every appearance control when unset", () => {
  const { container, readAppearance, cleanup } = mountAppearance();
  const colorLabels = [
    "Surface color",
    "Link color",
    "Link hover color",
    "Link active color",
    "Border color",
  ];
  for (const label of colorLabels) {
    expect(
      Array.from(container.querySelectorAll('[role="group"]')).some(
        (group) =>
          group.getAttribute("aria-label") === label &&
          group.closest('[data-page-editor-control="color-swatch"]')
      ),
      label
    ).toBe(true);
  }
  expect(container.querySelector('[role="switch"][aria-label="Sticky header"]')).toBeTruthy();
  for (const label of [
    "Item gap",
    "Vertical padding",
    "Horizontal padding",
    "Font size",
    "Border width",
  ]) {
    expect(
      container.querySelector(`input[data-page-editor-slider="${label}"]`),
      label
    ).toBeTruthy();
  }
  for (const label of [
    "Alignment",
    "Font weight",
    "Text transform",
    "Shadow",
    "Dropdown direction",
    "Mobile menu",
  ]) {
    expect(
      container.querySelector(
        `[data-page-editor-control="segmented"] [role="group"][aria-label="${label}"]`
      ),
      label
    ).toBeTruthy();
  }
  // Mounting with an unset appearance performs no write.
  expect(readAppearance()).toBeUndefined();
  cleanup();
});
test("writes every control into settings.menuAppearance", () => {
  const { container, readAppearance, cleanup } = mountAppearance();
  clickFirstSwatch(container, "Surface color");
  clickFirstSwatch(container, "Link color");
  clickFirstSwatch(container, "Link hover color");
  clickFirstSwatch(container, "Link active color");
  clickFirstSwatch(container, "Border color");
  clickSegmented(container, "Alignment", "center");
  setSliderValue(container, "Item gap", "24");
  setSliderValue(container, "Vertical padding", "8");
  setSliderValue(container, "Horizontal padding", "20");
  setSliderValue(container, "Font size", "18");
  clickSegmented(container, "Font weight", "600");
  clickSegmented(container, "Text transform", "uppercase");
  setSliderValue(container, "Border width", "3");
  clickSegmented(container, "Shadow", "sm");
  clickSegmented(container, "Dropdown direction", "top");
  clickSegmented(container, "Mobile menu", "inline");
  setToggle(container, "Sticky header", true);
  const appearance = readAppearance();
  expect(appearance).toBeTruthy();
  expect(appearance).toMatchObject({
    alignment: "center",
    itemGap: 24,
    paddingY: 8,
    paddingX: 20,
    fontSize: 18,
    fontWeight: 600,
    textTransform: "uppercase",
    borderWidth: 3,
    shadow: "sm",
    dropdownDirection: "top",
    mobileMode: "inline",
    sticky: true,
  });
  for (const key of [
    "surfaceColor",
    "linkColor",
    "linkHoverColor",
    "linkActiveColor",
    "borderColor",
  ]) {
    expect(typeof appearance?.[key]).toBe("string");
    expect(appearance?.[key]).not.toBe("");
  }
  cleanup();
});

test("transparent stores the first-class transparent value", () => {
  const { container, readAppearance, cleanup } = mountAppearance();
  clickFirstSwatch(container, "Surface color");
  const transparentSwatch = Array.from(
    container.querySelectorAll(
      '[role="group"][aria-label="Surface color"] [data-page-editor-color-swatch]'
    )
  ).find((button) => button.getAttribute("data-page-editor-color-swatch") === "transparent");
  expect(transparentSwatch).toBeTruthy();
  React.act(() => {
    transparentSwatch?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(readAppearance()?.surfaceColor).toBe("transparent");
  cleanup();
});

test("font weight inherit clears the stored key", () => {
  const { container, readAppearance, cleanup } = mountAppearance();
  clickSegmented(container, "Font weight", "600");
  expect(readAppearance()?.fontWeight).toBe(600);
  clickSegmented(container, "Font weight", "inherit");
  expect(readAppearance()?.fontWeight).toBeUndefined();
  cleanup();
});
