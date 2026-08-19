import React from "react";
import { expect } from "vitest";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  type PageEditorControlDefinition,
  type PageEditorControlPanel,
} from "../../../core/services/pages/pageEditorControlRegistry";
import { resolvePageEditorControlUiModel } from "../../../core/services/pages/pageEditorControlUiModel";
import {
  clickButtonByLabel,
  createDocument,
  createPage,
  findColorSwatchGroup,
  findSegmentedGroup,
  flush,
  getCommandGroupButtons,
  mediaLibraryState,
  pageEditorState,
} from "./pageEditorV2Fixtures";

const readCanvasSectionTypes = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-page-editor-section]")).map((element) =>
    element.getAttribute("data-page-editor-section")
  );

const findInlineEditRegion = (container: ParentNode, blockId: string, propPath: string) => {
  const region = container.querySelector(
    `[data-page-editor-block-id="${blockId}"] [data-page-editor-inline-edit-prop="${propPath}"]`
  );
  expect(region).toBeTruthy();
  return region as HTMLElement;
};

const dblClickElement = (element: Element | null) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  });
};

const blurElement = (element: HTMLElement) => {
  React.act(() => {
    element.blur();
  });
};

const setInlineRegionText = (element: HTMLElement, value: string) => {
  React.act(() => {
    element.textContent = value;
  });
};

const setInlineRegionHtml = (element: HTMLElement, value: string) => {
  React.act(() => {
    element.innerHTML = value;
  });
};

const openResponsivePanel = (container: ParentNode) => {
  clickButtonByLabel(container, "Responsive panel");
  const panel = container.querySelector('[data-page-editor-toolbar-panel="responsive"]');
  expect(panel).toBeTruthy();
  return panel as HTMLElement;
};

const lastSavedDocument = (): PageDocumentV2 =>
  pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;

const floatingPanelButtonLabels: Partial<Record<PageEditorControlPanel, string>> = {
  layout: "Layout panel",
  content: "Content panel",
  typography: "Typography panel",
  style: "Style panel",
  spacing: "Spacing panel",
  background: "Background panel",
  responsive: "Responsive panel",
  visibility: "Visibility panel",
};

const openFloatingPanel = async (container: ParentNode, panel: PageEditorControlPanel) => {
  if (container.querySelector(`[data-page-editor-toolbar-panel="${panel}"]`)) return;
  clickButtonByLabel(container, floatingPanelButtonLabels[panel] ?? `${panel} panel`);
  await flush();
};

/** Reads the value a rendered floating-panel control currently presents. */

const readControlDisplayValue = (
  container: ParentNode,
  control: PageEditorControlDefinition
): string => {
  const model = resolvePageEditorControlUiModel(control);
  if (model.kind === "segmented") {
    const group = findSegmentedGroup(container, control.label);
    const active = group.querySelector(
      '[data-page-editor-segmented-option][aria-pressed="true"]'
    ) as HTMLElement | null;
    return active?.dataset.pageEditorSegmentedOption ?? "";
  }
  if (model.kind === "select") {
    const select = Array.from(container.querySelectorAll('[data-page-editor-control="select"]'))
      .find((entry) => entry.textContent?.includes(control.label))
      ?.querySelector("select");
    expect(select, control.id).toBeTruthy();
    return (select as HTMLSelectElement).value;
  }
  if (model.kind === "slider" || model.kind === "sliderStepper") {
    const slider = container.querySelector(
      `input[type="range"][data-page-editor-slider="${control.label}"]`
    );
    expect(slider, control.id).toBeTruthy();
    return (slider as HTMLInputElement).value;
  }
  if (model.kind === "toggle") {
    const toggle = Array.from(container.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === control.label
    );
    expect(toggle, control.id).toBeTruthy();
    return toggle?.getAttribute("aria-checked") === "true" ? "yes" : "no";
  }
  if (model.kind === "swatch") {
    const group = findColorSwatchGroup(container, control.label);
    const transparent = group.querySelector('[data-page-editor-color-swatch="transparent"]');
    if (transparent?.getAttribute("aria-pressed") === "true") return "";
    const hex = group.querySelector(`input[data-page-editor-color-hex="${control.label}"]`);
    expect(hex, control.id).toBeTruthy();
    return (hex as HTMLInputElement).value;
  }
  if (model.kind === "media") {
    const host = container.querySelector(
      `[data-page-editor-media-control="${control.label}"] [data-media-picker-value]`
    );
    expect(host, control.id).toBeTruthy();
    return host?.getAttribute("data-media-picker-value") ?? "";
  }
  const field = Array.from(container.querySelectorAll('[data-page-editor-control="text"]'))
    .find((entry) => entry.textContent?.includes(control.label))
    ?.querySelector("input");
  expect(field, control.id).toBeTruthy();
  return (field as HTMLInputElement).value;
};

const readDocumentPath = (source: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>(
    (current, key) =>
      current && typeof current === "object" && !Array.isArray(current)
        ? (current as Record<string, unknown>)[key]
        : undefined,
    source
  );

/**
 * The expected display: the document's stored value at the control path,
 * falling back to the effective render default (`pageBlockRenderDefaults`,
 * for block targets), then to the registry schema default, with the
 * per-widget honest empty states (no pressed option, slider at clamp
 * minimum, transparent swatch for null colors).
 */

const expectedControlDisplayValue = (
  target: unknown,
  control: PageEditorControlDefinition,
  renderDefault?: string | number
): string => {
  const stored = readDocumentPath(target, control.path);
  const model = resolvePageEditorControlUiModel(control);
  if (model.kind === "toggle") {
    const effective = typeof stored === "boolean" ? stored : control.fallback === true;
    return effective ? "yes" : "no";
  }
  if (model.kind === "slider" || model.kind === "sliderStepper") {
    const effective =
      typeof stored === "number"
        ? stored
        : typeof renderDefault === "number"
          ? renderDefault
          : typeof control.fallback === "number"
            ? control.fallback
            : model.min;
    return String(Math.min(model.max, Math.max(model.min, effective)));
  }
  if (model.kind === "swatch") return typeof stored === "string" ? stored : "";
  if (model.kind === "media") {
    if (typeof stored !== "string" || stored.length === 0) return "";
    return mediaLibraryState.items.find((item) => item.url === stored)?.id ?? "";
  }
  if (typeof stored === "string") return stored;
  if (typeof stored === "number" || typeof stored === "boolean") return String(stored);
  if (typeof renderDefault === "string") return renderDefault;
  return typeof control.fallback === "string" ? control.fallback : "";
};

const clickPaletteBlock = (container: ParentNode, label: string) => {
  const button = getCommandGroupButtons(container, "Blocks").find((entry) =>
    entry.textContent?.includes(label)
  );
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const canvasBlockIdOrder = (container: ParentNode, sectionId: string) =>
  Array.from(
    container.querySelectorAll(`[data-section-id="${sectionId}"] [data-page-editor-block-id]`)
  ).map((element) => element.getAttribute("data-page-editor-block-id"));

const createDefaultHeroPage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero-default",
          name: "Hero",
          variant: "default",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-hero-heading",
              props: { text: "Build with Coderso", level: "h1", align: "center" },
            }),
            createPageBlockV2("text", {
              id: "blk-hero-copy",
              props: {
                text: "Compose sections and atomic blocks directly on the canvas.",
                format: "plain",
                align: "center",
              },
            }),
            createPageBlockV2("button", {
              id: "blk-hero-cta",
              props: {
                label: "Primary action",
                href: "/",
                target: "self",
                variant: "primary",
                size: "md",
              },
            }),
          ],
        }),
      ],
    }),
  });

const createTwoColumnPage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-grid",
          name: "Grid",
          layout: { columns: 2, align: "start", justify: "start", maxWidth: 1100 },
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-left",
              props: { text: "Left heading", level: "h2", align: "left" },
            }),
            createPageBlockV2("text", {
              id: "blk-right",
              props: { text: "Right copy.", format: "plain", align: "left" },
            }),
          ],
        }),
      ],
    }),
  });

const openPageSettingsPanel = (container: ParentNode) => {
  const trigger = container.querySelector('button[aria-label="Page settings"]');
  expect(trigger).toBeTruthy();
  React.act(() => {
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const panel = container.querySelector(
    '[data-page-editor-settings-panel="true"]'
  ) as HTMLElement | null;
  expect(panel).toBeTruthy();
  return panel as HTMLElement;
};

export {
  readCanvasSectionTypes,
  findInlineEditRegion,
  dblClickElement,
  blurElement,
  setInlineRegionText,
  setInlineRegionHtml,
  openResponsivePanel,
  lastSavedDocument,
  floatingPanelButtonLabels,
  openFloatingPanel,
  readControlDisplayValue,
  readDocumentPath,
  expectedControlDisplayValue,
  clickPaletteBlock,
  canvasBlockIdOrder,
  createDefaultHeroPage,
  createTwoColumnPage,
  openPageSettingsPanel,
};
