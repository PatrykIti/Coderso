import React from "react";
import { createRoot } from "react-dom/client";
import { expect } from "vitest";

import type { EntryVisibility } from "../../../../core/admin/services/entriesClient";
import type { EntryStatus } from "../../../../core/admin/ui/entries/EntryMetadataPanel";

/**
 * The stubbed metadata panel and the DOM plumbing for the entry-editor integration lanes.
 * They live outside the lane file because that file's value is its service mocks and its
 * scenarios, and all of it together does not fit under the 1000-line limit.
 *
 * The real panel renders outside the editor's isLoading gate and disables only its own
 * Save button, so every control below is live while a read OR a save is in flight. The
 * stub keeps exactly that surface: each control calls the same prop the real Select /
 * Input / Textarea calls, and every resolved value is ALSO mirrored as text, so an
 * assertion reads React state rather than the uncontrolled DOM value of an input the
 * editor never rewrites.
 */

// Only the props the stub exercises; the editor passes more.
type MetadataPanelStubProps = {
  status: EntryStatus;
  onStatusChange: (status: EntryStatus) => void;
  visibility: EntryVisibility;
  onVisibilityChange: (visibility: EntryVisibility) => void;
  accessPassword: string;
  onAccessPasswordChange: (value: string) => void;
  title: string;
  slug: string;
  seoDescription: string;
  onSeoDescriptionChange: (value: string) => void;
  taxonomy: { selectedCategoryId: string | null } | null;
  onCategoryChange: (categoryId: string | null) => void;
  onSave: () => void;
  isSaving: boolean;
};

export const EntryMetadataPanelStub = ({
  status,
  onStatusChange,
  visibility,
  onVisibilityChange,
  accessPassword,
  onAccessPasswordChange,
  title,
  slug,
  seoDescription,
  onSeoDescriptionChange,
  taxonomy,
  onCategoryChange,
  onSave,
  isSaving,
}: MetadataPanelStubProps) => (
  <div data-metadata-panel="true">
    <span data-metadata-status-value="true">{status}</span>
    <span data-metadata-seo-value="true">{seoDescription}</span>
    <span data-metadata-title-value="true">{title}</span>
    <span data-metadata-slug-value="true">{slug}</span>
    <span data-metadata-visibility-value="true">{visibility}</span>
    <span data-metadata-password-value="true">{accessPassword}</span>
    <span data-metadata-category-value="true">{taxonomy?.selectedCategoryId ?? ""}</span>
    <button type="button" data-metadata-publish="true" onClick={() => onStatusChange("published")}>
      Set published
    </button>
    <button
      type="button"
      data-metadata-private="true"
      onClick={() => onVisibilityChange("private")}
    >
      Make private
    </button>
    <button
      type="button"
      data-metadata-password-mode="true"
      onClick={() => onVisibilityChange("password")}
    >
      Require a password
    </button>
    <button type="button" data-metadata-category="true" onClick={() => onCategoryChange("cat-2")}>
      Pick the second category
    </button>
    <input
      data-metadata-password-input="true"
      defaultValue={accessPassword}
      onChange={(event) => onAccessPasswordChange(event.target.value)}
    />
    <textarea
      data-metadata-seo-input="true"
      defaultValue={seoDescription}
      onChange={(event) => onSeoDescriptionChange(event.target.value)}
    />
    <button type="button" data-metadata-save="true" disabled={isSaving} onClick={onSave}>
      Save metadata
    </button>
  </div>
);

export const mount = (node: React.ReactNode) => {
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

export const flushMicrotasks = async () => {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
};

// React's input-value tracker suppresses a change event when the assigned value equals
// the one it last saw, so a test that clears a field has to type something first.
const typeIntoElement = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

const requireTextarea = (container: HTMLElement, selector: string) => {
  const area = container.querySelector(selector);
  if (!(area instanceof HTMLTextAreaElement)) throw new Error(`${selector} textarea is absent`);
  return area;
};

const requireInput = (container: HTMLElement, selector: string) => {
  const input = container.querySelector(selector);
  if (!(input instanceof HTMLInputElement)) throw new Error(`${selector} input is absent`);
  return input;
};

// The title composer is the first textarea the editor renders (Content card, above the
// metadata panel in both DOM order and the grid).
export const typeTitle = (container: HTMLElement, value: string) =>
  typeIntoElement(requireTextarea(container, "textarea"), value);

export const typeSlug = (container: HTMLElement, value: string) =>
  typeIntoElement(requireInput(container, '[data-slug-input="true"]'), value);

export const typeSeoDescription = (container: HTMLElement, value: string) =>
  typeIntoElement(requireTextarea(container, 'textarea[data-metadata-seo-input="true"]'), value);

export const typeAccessPassword = (container: HTMLElement, value: string) =>
  typeIntoElement(requireInput(container, '[data-metadata-password-input="true"]'), value);

const panels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-metadata-panel="true"]'));

// The editor renders the metadata panel twice (sidebar + details sheet); both are fed
// from the same state, so every copy must agree and either one can be driven.
export const readPanelValue = (container: HTMLElement, marker: string): string => {
  const values = panels(container).map(
    (panel) => panel.querySelector(`[${marker}="true"]`)?.textContent ?? ""
  );
  const first = values[0];
  if (first === undefined) throw new Error("metadata panel is absent");
  values.forEach((value) => expect(value).toBe(first));
  return first;
};

export const readMetadataState = (
  container: HTMLElement
): { status: string; seoDescription: string } => ({
  status: readPanelValue(container, "data-metadata-status-value"),
  seoDescription: readPanelValue(container, "data-metadata-seo-value"),
});

export const clickMetadataAction = (container: HTMLElement, marker: string) => {
  const action = container.querySelector(`button[${marker}="true"]`);
  if (!(action instanceof HTMLButtonElement)) throw new Error(`${marker} button is absent`);
  expect(action.disabled).toBe(false);
  action.click();
};

export const findSaveDraft = (container: HTMLElement) => {
  const matches = Array.from(container.querySelectorAll("button")).filter(
    (button) => button.textContent === "Save draft"
  );
  expect(matches).toHaveLength(1);
  const save = matches[0];
  if (!(save instanceof HTMLButtonElement)) throw new Error("Save draft button is absent");
  return save;
};
