// Shared DOM interaction helpers for the page editor vitest waves (TASK-105).
//
// Extracted from `pageEditorV2Fixtures.tsx` so every shared fixture file stays
// under the repository 1,000-line gate while preserving the same exports and
// behavior. This module is pure DOM + React act tooling and must not depend on
// the fixture mock state.

import React from "react";
import { expect } from "vitest";

import type {
  PageBlockV2,
  PageBlockType,
  PageSectionType,
} from "../../../core/services/pages/pageDocumentV2";

const findButton = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  );

const clickButton = (container: ParentNode, text: string) => {
  const button = findButton(container, text);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

/**
 * Toolbar icon buttons carry their metadata label as `aria-label`; the hover
 * description renders through the shared tooltip component, not `title`.
 */
const clickButtonByLabel = (container: ParentNode, label: string) => {
  const button = container.querySelector(`button[aria-label="${label}"]`);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const dispatchDocumentKey = (key: string, init: KeyboardEventInit = {}) => {
  React.act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });
};

const dispatchElementKey = (
  element: Element | Document | null,
  key: string,
  init: KeyboardEventInit = {}
) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });
};

const clickSelector = (container: ParentNode, selector: string) => {
  const element = container.querySelector(selector);
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const pageEditorBlockLabels: Record<PageBlockType, string> = {
  heading: "Heading",
  text: "Text",
  badge: "Badge",
  button: "Button",
  image: "Image",
  video: "Video",
  gallery: "Gallery",
  form: "Form",
  list: "List",
  card: "Card",
  collection: "Collection",
  filters: "Filters",
  embed: "Embed",
  divider: "Divider",
  spacer: "Spacer",
  statistic: "Statistic",
  icon: "Icon",
  quote: "Quote",
  container: "Container",
  columns: "Columns",
  group: "Group",
  // TASK-522-01-L01: the custom-SVG block is editor-insertable — its palette
  // label mirrors blockOptionCopy.customSvg.
  customSvg: "Custom SVG",
  // ── TASK-534 ── switcher + scrollHint palette labels (mirror blockOptionCopy).
  switcher: "Switcher",
  scrollHint: "Scroll hint",
  // ── TASK-580-03-L01 ── legacy-widget (migration-only read-only placeholder).
  "legacy-widget": "Legacy widget",
};

const pageEditorSectionLabels: Record<PageSectionType, string> = {
  template: "Template",
  navigation: "Navigation",
  hero: "Hero",
  content: "Content",
  "feature-grid": "Feature grid",
  "media-split": "Media split",
  timeline: "Timeline",
  gallery: "Gallery",
  collection: "Collection",
  comparison: "Comparison",
  filters: "Filters",
  "lead-form": "Lead form",
  faq: "FAQ",
  testimonials: "Testimonials",
  cta: "CTA",
  embed: "Embed",
  custom: "Custom",
};

const getCommandGroupButtons = (container: ParentNode, title: string) => {
  const heading = Array.from(container.querySelectorAll("p")).find(
    (entry) => entry.textContent === title
  );
  expect(heading).toBeTruthy();
  return Array.from(heading?.parentElement?.querySelectorAll("button") ?? []);
};

const changeField = (container: ParentNode, labelText: string, value: string) => {
  const label = Array.from(container.querySelectorAll("label")).find((entry) =>
    entry.textContent?.includes(labelText)
  );
  const field = label?.querySelector("input,select") as HTMLInputElement | HTMLSelectElement | null;
  expect(field).toBeTruthy();
  React.act(() => {
    if (!field) return;
    const setterOwner =
      field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(setterOwner, "value")?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

/** Structured list-items rows label their inputs via aria-label, not <label>. */
const changeInputByAriaLabel = (container: ParentNode, ariaLabel: string, value: string) => {
  const field = container.querySelector(
    `input[aria-label="${ariaLabel}"]`
  ) as HTMLInputElement | null;
  expect(field).toBeTruthy();
  React.act(() => {
    if (!field) return;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const findFieldControl = (container: ParentNode, labelText: string) => {
  const label = Array.from(container.querySelectorAll("label")).find((entry) =>
    entry.textContent?.includes(labelText)
  );
  const field = label?.querySelector("input,select,textarea");
  expect(field).toBeTruthy();
  return field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
};

const findResponsiveField = (container: ParentNode, labelText: string) => {
  const field = Array.from(container.querySelectorAll("[data-page-editor-responsive-field]")).find(
    (entry) =>
      entry.querySelector(`[aria-label="${labelText}"]`) ||
      Array.from(entry.querySelectorAll("label, span")).some(
        (node) => node.textContent === labelText
      )
  );
  expect(field).toBeTruthy();
  return field as HTMLElement;
};

const findSegmentedGroup = (container: ParentNode, label: string) => {
  const group = Array.from(
    container.querySelectorAll('[data-page-editor-control="segmented"] [role="group"]')
  ).find((entry) => entry.getAttribute("aria-label") === label);
  expect(group).toBeTruthy();
  return group as HTMLElement;
};

const clickSegmentedOption = (container: ParentNode, label: string, option: string) => {
  const group = findSegmentedGroup(container, label);
  const button = group.querySelector(`[data-page-editor-segmented-option="${option}"]`);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findColorSwatchGroup = (container: ParentNode, label: string) => {
  const group = Array.from(
    container.querySelectorAll('[data-page-editor-control="color-swatch"] [role="group"]')
  ).find((entry) => entry.getAttribute("aria-label") === label);
  expect(group).toBeTruthy();
  return group as HTMLElement;
};

const clickColorSwatch = (container: ParentNode, label: string, swatchId: string) => {
  const swatch = findColorSwatchGroup(container, label).querySelector(
    `[data-page-editor-color-swatch="${swatchId}"]`
  );
  expect(swatch).toBeTruthy();
  React.act(() => {
    swatch?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setToggleField = (container: ParentNode, label: string, next: boolean) => {
  const toggle = Array.from(container.querySelectorAll('[role="switch"]')).find(
    (entry) => entry.getAttribute("aria-label") === label
  );
  expect(toggle).toBeTruthy();
  if (toggle?.getAttribute("aria-checked") === String(next)) return;
  React.act(() => {
    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setSliderField = (container: ParentNode, label: string, value: string) => {
  const slider = container.querySelector(
    `input[type="range"][data-page-editor-slider="${label}"]`
  ) as HTMLInputElement | null;
  expect(slider).toBeTruthy();
  React.act(() => {
    if (!slider) return;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(slider, value);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const commitColorHex = (container: ParentNode, label: string, hex: string) => {
  const input = container.querySelector(
    `input[data-page-editor-color-hex="${label}"]`
  ) as HTMLInputElement | null;
  expect(input).toBeTruthy();
  React.act(() => {
    if (!input) return;
    input.value = hex;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
};

const selectMediaAsset = (container: ParentNode, label: string, assetId: string) => {
  const control = container.querySelector(`[data-page-editor-media-control="${label}"]`);
  const option = control?.querySelector(`[data-media-picker-option="${assetId}"]`);
  expect(option).toBeTruthy();
  React.act(() => {
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickResponsiveReset = (container: ParentNode, labelText: string) => {
  const field = findResponsiveField(container, labelText);
  const button = Array.from(field.querySelectorAll("button")).find((entry) =>
    entry.textContent?.includes("Reset")
  );
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findEditorSectionContent = (container: ParentNode, sectionId: string) => {
  const section = container.querySelector(
    `[data-page-editor-section][data-section-id="${sectionId}"]`
  );
  const content = section?.querySelector("[data-page-section-content]");
  expect(content).toBeTruthy();
  return content as HTMLElement;
};

const findEditorBlock = (container: ParentNode, blockId: string) => {
  const block = container.querySelector(`[data-page-editor-block-id="${blockId}"]`);
  expect(block).toBeTruthy();
  return block as HTMLElement;
};

const collectPageBlockIds = (blocks: readonly PageBlockV2[]): string[] =>
  blocks.flatMap((block) => [
    block.id,
    ...Object.values(block.slots ?? {}).flatMap((children) => collectPageBlockIds(children ?? [])),
  ]);

export {
  changeField,
  changeInputByAriaLabel,
  clickButton,
  clickButtonByLabel,
  clickColorSwatch,
  clickResponsiveReset,
  clickSegmentedOption,
  clickSelector,
  collectPageBlockIds,
  commitColorHex,
  dispatchDocumentKey,
  dispatchElementKey,
  findButton,
  findColorSwatchGroup,
  findEditorBlock,
  findEditorSectionContent,
  findFieldControl,
  findResponsiveField,
  findSegmentedGroup,
  getCommandGroupButtons,
  pageEditorBlockLabels,
  pageEditorSectionLabels,
  selectMediaAsset,
  setSliderField,
  setToggleField,
};
