// @vitest-environment happy-dom
//
// TASK-105-05 page editor wave, LEAF B2 — PageEditorCommandPalette branch
// closure. Covers the sections-hidden state, the templates group with the
// description fallback, active-index offsets, and every click callback.

import React from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { PageEditorCommandPalette } from "../../../core/admin/ui/pages/editor/PageEditorCommandPalette";
import type {
  BlockOption,
  SectionOption,
} from "../../../core/admin/ui/pages/editor/pageEditorOptions";

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

const sections: SectionOption[] = [{ type: "hero", label: "Hero", description: "Hero section" }];
const blocks: BlockOption[] = [{ type: "heading", label: "Heading", description: "Section title" }];
const templates = [
  { id: "tpl-1", name: "Landing", description: "Full landing page" },
  { id: "tpl-2", name: "About", description: null },
];

const renderPalette = (overrides: Partial<Parameters<typeof PageEditorCommandPalette>[0]> = {}) => {
  const callbacks = {
    onQueryChange: vi.fn(),
    onKeyDown: vi.fn(),
    onAddSection: vi.fn(),
    onAddBlock: vi.fn(),
    onInsertTemplate: vi.fn(),
    onClose: vi.fn(),
  };
  const view = mount(
    <PageEditorCommandPalette
      commandQuery=""
      commandActiveIndex={0}
      canInsertSections
      sections={sections}
      blocks={blocks}
      templates={templates}
      showTemplates
      {...callbacks}
      {...overrides}
    />
  );
  return { view, callbacks };
};

test("renders the templates group with a fallback description and active offsets", () => {
  const html = renderToStaticMarkup(
    <PageEditorCommandPalette
      commandQuery=""
      commandActiveIndex={3}
      canInsertSections
      sections={sections}
      blocks={blocks}
      templates={templates}
      showTemplates
      onQueryChange={vi.fn()}
      onKeyDown={vi.fn()}
      onAddSection={vi.fn()}
      onAddBlock={vi.fn()}
      onInsertTemplate={vi.fn()}
      onClose={vi.fn()}
    />
  );

  expect(html).toContain("Page templates");
  expect(html).toContain("Landing");
  expect(html).toContain("Full landing page");
  expect(html).toContain("Insert template sections");
  expect(html.match(/data-page-editor-command-active="true"/g)).toHaveLength(1);
});

test("hides the sections group when insertion is disabled and still renders blocks", () => {
  const html = renderToStaticMarkup(
    <PageEditorCommandPalette
      commandQuery=""
      commandActiveIndex={0}
      canInsertSections={false}
      sections={sections}
      blocks={blocks}
      templates={templates}
      showTemplates
      onQueryChange={vi.fn()}
      onKeyDown={vi.fn()}
      onAddSection={vi.fn()}
      onAddBlock={vi.fn()}
      onInsertTemplate={vi.fn()}
      onClose={vi.fn()}
    />
  );

  expect(html).not.toContain("Sections");
  expect(html).not.toContain("Hero section");
  expect(html).toContain("Blocks");
  expect(html).toContain("Heading");
});

test("omits the templates group when showTemplates is false or the list is empty", () => {
  const noShow = renderToStaticMarkup(
    <PageEditorCommandPalette
      commandQuery=""
      commandActiveIndex={0}
      canInsertSections
      sections={sections}
      blocks={blocks}
      templates={templates}
      showTemplates={false}
      onQueryChange={vi.fn()}
      onKeyDown={vi.fn()}
      onAddSection={vi.fn()}
      onAddBlock={vi.fn()}
      onInsertTemplate={vi.fn()}
      onClose={vi.fn()}
    />
  );
  expect(noShow).not.toContain("Page templates");

  const empty = renderToStaticMarkup(
    <PageEditorCommandPalette
      commandQuery=""
      commandActiveIndex={0}
      canInsertSections
      sections={sections}
      blocks={blocks}
      templates={[]}
      showTemplates
      onQueryChange={vi.fn()}
      onKeyDown={vi.fn()}
      onAddSection={vi.fn()}
      onAddBlock={vi.fn()}
      onInsertTemplate={vi.fn()}
      onClose={vi.fn()}
    />
  );
  expect(empty).not.toContain("Page templates");
});

test("the query input forwards change and keydown events", () => {
  const { view, callbacks } = renderPalette();
  try {
    const input = view.container.querySelector(
      'input[aria-label="Search sections and blocks"]'
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    React.act(() => {
      descriptor?.set?.call(input, "hero");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(callbacks.onQueryChange).toHaveBeenCalledWith("hero");

    React.act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    expect(callbacks.onKeyDown).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("section, block, template, and close buttons dispatch their callbacks", () => {
  const { view, callbacks } = renderPalette();
  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const sectionButton = buttons.find((button) => button.textContent?.includes("Hero"));
    const blockButton = buttons.find((button) => button.textContent?.includes("Heading"));
    const templateButton = buttons.find((button) => button.textContent?.includes("Landing"));
    const closeButton = buttons.find((button) => button.textContent === "Close");

    React.act(() => {
      sectionButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(callbacks.onAddSection).toHaveBeenCalledWith("hero");

    React.act(() => {
      blockButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(callbacks.onAddBlock).toHaveBeenCalledWith("heading");

    React.act(() => {
      templateButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(callbacks.onInsertTemplate).toHaveBeenCalledWith("tpl-1");

    React.act(() => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(callbacks.onClose).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
